// Transform raw Meta MCP exports into the dashboard's metaCampaigns shape and upload to Supabase.
//
// Why this exists:
//   The Meta Ads MCP only works inside a Claude session — it can't be called from a plain
//   node script or from the Vercel runtime. So the flow is:
//     1. In a Claude session, pull ad data via the MCP (ads_get_ad_entities, etc.)
//     2. Save the raw MCP JSON to scripts/meta-mcp-data/<slug>.json
//     3. Run this script to parse + group + upload to dashboard_data (section=metaCampaigns)
//   The dashboard then reads that snapshot — no Graph API token needed.
//
// Usage:
//   node scripts/sync-meta-from-mcp.mjs                 # sync every json file in meta-mcp-data/
//   node scripts/sync-meta-from-mcp.mjs palesa-dooms    # sync one client
//
// Input file shape (scripts/meta-mcp-data/<slug>.json):
//   {
//     "clientId": "<uuid>",
//     "adAccountId": "346283871806094",
//     "dateRange": { "start": "2026-04-29", "end": "2026-05-28" },
//     "revenueSource": "meta",          // or "none"
//     "conversionField": "actions:omni_purchase",
//     "campaigns": [ { "id": "...", "name": "...", "effective_status": "ACTIVE" } ],
//     "adsets":    [ { "id": "...", "name": "...", "campaign_id": "...", "effective_status": "ACTIVE" } ],
//     "ads":       [ <raw MCP ad entities> ]
//   }

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SRK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bGZtcXB3dWFwaXl2dWJsdmFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTE2NDQwOCwiZXhwIjoyMDkwNzQwNDA4fQ.iy29-rZSnFfKvyGANlxWhgB6ypW238VEqsOXEYLSkEA";
const BASE = "https://xwlfmqpwuapiyvublvaa.supabase.co/rest/v1";
const headers = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "meta-mcp-data");

// --- MCP value parsers ----------------------------------------------------
function parseMoney(v) {
  if (v == null || v === "Not available") return 0;
  if (typeof v === "number") return v;
  // "ZAR4,224.07" -> 4224.07
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function parseNum(v) {
  if (v == null || v === "Not available") return 0;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function parseRoas(v) {
  if (v == null || v === "Not available") return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normalizeStatus(s) {
  if (!s) return "unknown";
  const u = String(s).toUpperCase();
  if (u === "ACTIVE") return "active";
  if (u.includes("PAUSED")) return "paused";
  if (u === "LEARNING" || u === "IN_PROCESS") return "learning";
  if (u === "PENDING_REVIEW" || u === "IN_REVIEW") return "in_review";
  if (u === "DISAPPROVED" || u === "WITH_ISSUES") return "disapproved";
  return "unknown";
}

function classifyFatigue(freq) {
  if (freq > 4) return "red";
  if (freq >= 2.5) return "amber";
  return "green";
}

function buildAdRow(ad, conversionField, revenueActive) {
  const spend = parseMoney(ad.amount_spent ?? ad.spend);
  const impressions = parseNum(ad.impressions);
  const reach = parseNum(ad.reach);
  const frequency = parseNum(ad.frequency) || (reach > 0 ? impressions / reach : 0);
  const linkClicks = parseNum(ad["actions:link_click"]);
  const landingPageViews = parseNum(ad["actions:landing_page_view"] ?? ad["actions:omni_landing_page_view"]);
  const conversions = parseNum(ad[conversionField]);
  const roas = revenueActive ? parseRoas(ad.purchase_roas) : null;
  const revenue = roas !== null ? Number((spend * roas).toFixed(2)) : null;
  const cpa = conversions > 0 ? Number((spend / conversions).toFixed(2)) : null;
  const videoPlays = parseNum(ad["3_second_video_plays"]);
  const isVideo = videoPlays > 0;
  const hookRate = isVideo && impressions > 0 ? Number((videoPlays / impressions).toFixed(4)) : null;

  return {
    id: String(ad.id),
    name: ad.name || "(unnamed)",
    status: normalizeStatus(ad.effective_status),
    format: isVideo ? "video" : "static",
    thumbnailUrl: ad.thumbnail_url || null,
    bodyText: ad.body || null,
    adset_id: String(ad.adset_id),
    campaign_id: String(ad.campaign_id),
    spend,
    impressions,
    reach,
    frequency: Number(frequency.toFixed(2)),
    linkClicks,
    landingPageViews,
    conversions,
    revenue,
    roas,
    cpa,
    hookRate,
    fatigue: classifyFatigue(frequency),
  };
}

function aggregate(ads) {
  let spend = 0, impressions = 0, reach = 0, linkClicks = 0, lpv = 0, conversions = 0, revenue = 0;
  let hasRevenue = false, videoImpr = 0, videoHooks = 0;
  for (const r of ads) {
    spend += r.spend;
    impressions += r.impressions;
    reach += r.reach;
    linkClicks += r.linkClicks;
    lpv += r.landingPageViews;
    conversions += r.conversions;
    if (r.revenue !== null) { hasRevenue = true; revenue += r.revenue; }
    if (r.hookRate !== null) { videoImpr += r.impressions; videoHooks += r.hookRate * r.impressions; }
  }
  const frequency = reach > 0 ? impressions / reach : 0;
  return {
    spend, impressions, reach,
    frequency: Number(frequency.toFixed(2)),
    linkClicks, landingPageViews: lpv, conversions,
    revenue: hasRevenue ? Number(revenue.toFixed(2)) : null,
    roas: hasRevenue && spend > 0 ? Number((revenue / spend).toFixed(2)) : null,
    cpa: conversions > 0 ? Number((spend / conversions).toFixed(2)) : null,
    hookRate: videoImpr > 0 ? Number((videoHooks / videoImpr).toFixed(4)) : null,
    fatigue: classifyFatigue(frequency),
  };
}

function buildHierarchy(input) {
  const revenueActive = input.revenueSource === "meta";
  const conversionField = input.conversionField || "actions:omni_purchase";

  const adRows = input.ads.map((a) => buildAdRow(a, conversionField, revenueActive));

  const adsByAdSet = new Map();
  for (const ad of adRows) {
    const arr = adsByAdSet.get(ad.adset_id) || [];
    arr.push(ad);
    adsByAdSet.set(ad.adset_id, arr);
  }

  const adsetMeta = new Map((input.adsets || []).map((s) => [String(s.id), s]));
  const campaignMeta = new Map((input.campaigns || []).map((c) => [String(c.id), c]));

  // Group adsets under campaigns
  const adSetsByCampaign = new Map();
  for (const [adsetId, ads] of adsByAdSet.entries()) {
    if (!ads.length) continue;
    const meta = adsetMeta.get(adsetId);
    const campaignId = ads[0].campaign_id;
    const agg = aggregate(ads);
    const row = {
      id: adsetId,
      name: meta?.name || `Ad set ${adsetId}`,
      status: normalizeStatus(meta?.effective_status) === "unknown" ? ads[0].status : normalizeStatus(meta?.effective_status),
      ...agg,
      ads: ads.map(stripInternal),
    };
    const arr = adSetsByCampaign.get(campaignId) || [];
    arr.push(row);
    adSetsByCampaign.set(campaignId, arr);
  }

  const campaigns = [];
  for (const [campaignId, adSets] of adSetsByCampaign.entries()) {
    const meta = campaignMeta.get(campaignId);
    const allAds = adSets.flatMap((s) => s.ads);
    const agg = aggregate(allAds);
    campaigns.push({
      id: campaignId,
      name: meta?.name || `Campaign ${campaignId}`,
      status: normalizeStatus(meta?.effective_status) === "unknown" ? (adSets[0]?.status || "unknown") : normalizeStatus(meta?.effective_status),
      ...agg,
      adSets,
    });
  }
  campaigns.sort((a, b) => b.spend - a.spend);
  for (const c of campaigns) {
    c.adSets.sort((a, b) => b.spend - a.spend);
    for (const s of c.adSets) s.ads.sort((a, b) => b.spend - a.spend);
  }
  return campaigns;
}

// Remove internal-only fields (adset_id/campaign_id) from ad rows before storing.
function stripInternal(ad) {
  const { adset_id, campaign_id, ...rest } = ad;
  void adset_id; void campaign_id;
  return rest;
}

function computeTotals(campaigns) {
  const t = campaigns.reduce(
    (acc, c) => {
      acc.spend += c.spend;
      acc.impressions += c.impressions;
      acc.conversions += c.conversions;
      if (c.revenue !== null) acc.revenue = (acc.revenue || 0) + c.revenue;
      return acc;
    },
    { spend: 0, impressions: 0, conversions: 0, revenue: null },
  );
  return { ...t, roas: t.revenue !== null && t.spend > 0 ? Number((t.revenue / t.spend).toFixed(2)) : null };
}

async function upload(clientId, payload) {
  const res = await fetch(
    `${BASE}/dashboard_data?client_id=eq.${clientId}&section=eq.metaCampaigns&period_id=is.null&limit=1`,
    { headers },
  );
  const rows = await res.json();
  if (rows[0]) {
    const r = await fetch(`${BASE}/dashboard_data?id=eq.${rows[0].id}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({ data: payload, updated_at: new Date().toISOString() }),
    });
    if (!r.ok) throw new Error(`PATCH failed: ${r.status} ${await r.text()}`);
    return "updated";
  }
  const r = await fetch(`${BASE}/dashboard_data`, {
    method: "POST",
    headers,
    body: JSON.stringify({ client_id: clientId, period_id: null, section: "metaCampaigns", data: payload }),
  });
  if (r.status !== 201) throw new Error(`POST failed: ${r.status} ${await r.text()}`);
  return "created";
}

async function syncFile(slug) {
  const path = join(DATA_DIR, `${slug}.json`);
  const input = JSON.parse(readFileSync(path, "utf8"));
  const campaigns = buildHierarchy(input);
  const payload = {
    campaigns,
    revenueSource: input.revenueSource || "none",
    revenueSourceMock: false,
    totals: computeTotals(campaigns),
    dateRange: input.dateRange,
  };
  const action = await upload(input.clientId, payload);
  const adCount = campaigns.reduce((n, c) => n + c.adSets.reduce((m, s) => m + s.ads.length, 0), 0);
  console.log(`  ${slug.padEnd(20)} ${action} — ${campaigns.length} campaigns, ${adCount} ads, spend R ${Math.round(payload.totals.spend).toLocaleString()}`);
}

async function run() {
  const arg = process.argv[2];
  let slugs;
  if (arg) {
    slugs = [arg.replace(/\.json$/, "")];
  } else {
    slugs = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  }
  if (!slugs.length) {
    console.log("No data files in scripts/meta-mcp-data/. Nothing to sync.");
    return;
  }
  console.log(`Syncing metaCampaigns for: ${slugs.join(", ")}`);
  console.log("-".repeat(60));
  for (const slug of slugs) {
    try {
      await syncFile(slug);
    } catch (e) {
      console.error(`  ${slug.padEnd(20)} ✗ ${e.message}`);
    }
  }
  console.log("-".repeat(60));
  console.log("Done.");
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
