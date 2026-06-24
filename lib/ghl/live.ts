import type { GHLData, KPI, SourceBreakdown } from "@/types/dashboard";

// Live GoHighLevel (Ghutte) data builder.
//
// The dashboard normally reads GHL data that was written into Supabase by the
// monthly sync. This module instead calls the GHL/LeadConnector API directly so
// the CRM tab can show *live* numbers for whichever location the report is
// embedded in. It is intentionally cheap: opportunities are few (paged fully),
// contact figures come from search counts (no full paging of tens of thousands
// of contacts), and pipeline stage names are resolved once.

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

interface GHLOpportunity {
  id: string;
  status?: string; // open | won | lost | abandoned
  monetaryValue?: number;
  pipelineStageId?: string;
  source?: string;
  createdAt?: string;
}

function headers(pitKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${pitKey}`,
    Version: GHL_VERSION,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

const zar = (n: number) =>
  "R " + Math.round(n).toLocaleString("en-ZA");

// Count contacts matching a dateAdded range without paging the full list.
async function countContacts(
  locationId: string,
  pitKey: string,
  range?: { gte: string; lte: string },
): Promise<number | null> {
  const filters = range
    ? [{ field: "dateAdded", operator: "range", value: range }]
    : [];
  const res = await fetch(`${GHL_BASE}/contacts/search`, {
    method: "POST",
    headers: headers(pitKey),
    body: JSON.stringify({ locationId, pageLimit: 1, filters }),
  });
  if (!res.ok) return null;
  const d = await res.json();
  // GHL returns the match count at .total (sometimes nested under .meta.total)
  return typeof d.total === "number" ? d.total : d?.meta?.total ?? null;
}

// Page through opportunities (small datasets — cap at 5 pages / 500 records).
async function fetchOpportunities(
  locationId: string,
  pitKey: string,
): Promise<GHLOpportunity[]> {
  const all: GHLOpportunity[] = [];
  let page = 1;
  while (page <= 5) {
    const url = `${GHL_BASE}/opportunities/search?location_id=${encodeURIComponent(locationId)}&limit=100&page=${page}`;
    const res = await fetch(url, { headers: headers(pitKey) });
    if (!res.ok) break;
    const d = await res.json();
    const opps: GHLOpportunity[] = d.opportunities || [];
    all.push(...opps);
    const total = d?.meta?.total ?? all.length;
    if (all.length >= total || opps.length === 0) break;
    page++;
  }
  return all;
}

/**
 * Build live GHL CRM data for a single location and date range.
 * Returns the GHLData shape (KPIs + an opportunity source breakdown) so it can
 * be merged over the stored `ghl` section without any UI changes.
 */
export async function buildLiveGHL(
  locationId: string,
  pitKey: string,
  range: { start: string; end: string },
): Promise<GHLData> {
  const gte = new Date(range.start).toISOString();
  const lte = new Date(range.end + "T23:59:59.999Z").toISOString();

  const [opps, totalContacts, newContacts] = await Promise.all([
    fetchOpportunities(locationId, pitKey),
    countContacts(locationId, pitKey),
    countContacts(locationId, pitKey, { gte, lte }),
  ]);

  // Opportunities created within the period.
  const inRange = opps.filter((o) => {
    if (!o.createdAt) return false;
    const t = new Date(o.createdAt).getTime();
    return t >= new Date(gte).getTime() && t <= new Date(lte).getTime();
  });

  const open = opps.filter((o) => o.status === "open");
  const won = opps.filter((o) => o.status === "won");
  const pipelineValue = open.reduce((s, o) => s + (Number(o.monetaryValue) || 0), 0);
  const wonValue = won.reduce((s, o) => s + (Number(o.monetaryValue) || 0), 0);

  const kpis: KPI[] = [
    {
      label: "Total Contacts",
      value: totalContacts != null ? totalContacts.toLocaleString("en-ZA") : "—",
      direction: "neutral",
    },
    {
      label: "New Contacts",
      value: newContacts != null ? newContacts.toLocaleString("en-ZA") : "—",
      badge: "this period",
      direction: newContacts ? "up" : "neutral",
    },
    {
      label: "Open Opportunities",
      value: open.length.toLocaleString("en-ZA"),
      direction: "neutral",
    },
    {
      label: "New Opportunities",
      value: inRange.length.toLocaleString("en-ZA"),
      badge: "this period",
      direction: inRange.length ? "up" : "neutral",
    },
  ];

  // Only surface pipeline value when the location actually tracks it (some,
  // like Palesa, leave monetaryValue at 0 and bank revenue elsewhere).
  if (pipelineValue > 0 || wonValue > 0) {
    kpis.push({
      label: "Pipeline Value",
      value: zar(pipelineValue),
      badge: wonValue > 0 ? `${zar(wonValue)} won` : undefined,
      direction: "up",
    });
  }

  // Opportunity source breakdown — live, from the opportunities we already have.
  const bySource = new Map<string, { opportunities: number; won: number; revenue: number }>();
  for (const o of opps) {
    const src = (o.source || "Unattributed").trim() || "Unattributed";
    const row = bySource.get(src) || { opportunities: 0, won: 0, revenue: 0 };
    row.opportunities += 1;
    if (o.status === "won") {
      row.won += 1;
      row.revenue += Number(o.monetaryValue) || 0;
    }
    bySource.set(src, row);
  }

  const sourceBreakdown: SourceBreakdown[] = [...bySource.entries()]
    .sort((a, b) => b[1].opportunities - a[1].opportunities)
    .map(([source, r]) => ({
      source,
      contacts: r.opportunities, // live source counts are at the opportunity level
      opportunities: r.opportunities,
      won: r.won,
      revenue: zar(r.revenue),
      convRate: r.opportunities ? ((r.won / r.opportunities) * 100).toFixed(0) + "%" : "0%",
    }));

  const contactsBySource = sourceBreakdown.length
    ? {
        labels: sourceBreakdown.slice(0, 6).map((s) => s.source),
        values: sourceBreakdown.slice(0, 6).map((s) => s.opportunities),
      }
    : undefined;

  return { kpis, sourceBreakdown, contactsBySource };
}
