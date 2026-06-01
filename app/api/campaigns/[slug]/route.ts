import { NextRequest } from "next/server";
import { authorizeForSlug } from "@/lib/meta/auth";
import { resolveClientBySlug, getMetaClientConfig } from "@/lib/meta/config";
import {
  fetchInsightsByAd,
  fetchAds,
  fetchAdSets,
  fetchCampaigns,
  MetaApiError,
} from "@/lib/meta/queries";
import { buildHierarchy } from "@/lib/meta/transform";
import { getServiceClient } from "@/lib/supabase";
import type { CampaignsResponse, CampaignRow } from "@/lib/meta/types";

export const maxDuration = 60;

const SECTION = "metaCampaigns";

interface RequestBody {
  date_range?: { start: string; end: string };
  status_filter?: "active" | "paused" | "all";
  format_filter?: "video" | "static" | "carousel" | "all";
  search?: string;
}

function applyFilters(campaigns: CampaignRow[], body: RequestBody): CampaignRow[] {
  const status = body.status_filter || "all";
  const format = body.format_filter || "all";
  const search = (body.search || "").trim().toLowerCase();

  return campaigns
    .map((campaign) => {
      const adSets = campaign.adSets
        .map((adSet) => {
          const ads = adSet.ads.filter((ad) => {
            if (status !== "all" && ad.status !== status) return false;
            if (format !== "all" && ad.format !== format) return false;
            if (search) {
              const hay = `${campaign.name} ${adSet.name} ${ad.name}`.toLowerCase();
              if (!hay.includes(search)) return false;
            }
            return true;
          });
          return ads.length ? { ...adSet, ads } : null;
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);
      return adSets.length ? { ...campaign, adSets } : null;
    })
    .filter((c): c is CampaignRow => c !== null);
}

function computeTotals(campaigns: CampaignRow[]) {
  const totals = campaigns.reduce(
    (acc, c) => {
      acc.spend += c.spend;
      acc.impressions += c.impressions;
      acc.conversions += c.conversions;
      if (c.revenue !== null) acc.revenue = (acc.revenue || 0) + c.revenue;
      return acc;
    },
    { spend: 0, impressions: 0, conversions: 0, revenue: null as number | null },
  );
  const roas = totals.revenue !== null && totals.spend > 0 ? totals.revenue / totals.spend : null;
  return { ...totals, roas };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    const auth = authorizeForSlug(request, slug);
    if (!auth.ok) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as RequestBody;

    const client = await resolveClientBySlug(slug);
    if (!client) return Response.json({ error: "Client not found" }, { status: 404 });

    // Live Meta path — only when a working token is present. Otherwise we serve synced data.
    if (process.env.META_ACCESS_TOKEN && body?.date_range?.start && body?.date_range?.end) {
      try {
        return await liveMetaResponse(client.id, body as Required<RequestBody>);
      } catch (e) {
        // If the live call fails (token blocked, etc.), fall through to synced data.
        if (!(e instanceof MetaApiError)) throw e;
        console.warn("Live Meta fetch failed, falling back to synced data:", e.message);
      }
    }

    // Synced path (default): read the metaCampaigns snapshot from Supabase.
    const supabase = getServiceClient();
    const { data: row } = await supabase
      .from("dashboard_data")
      .select("data, updated_at")
      .eq("client_id", client.id)
      .eq("section", SECTION)
      .is("period_id", null)
      .limit(1)
      .single();

    if (!row?.data) {
      return Response.json(
        {
          error:
            "No Meta data synced for this client yet. Run the MCP sync (scripts/sync-meta-from-mcp.mjs) to populate it.",
          notSynced: true,
        },
        { status: 404 },
      );
    }

    const snapshot = row.data as CampaignsResponse;
    const filtered = applyFilters(snapshot.campaigns || [], body);

    const response: CampaignsResponse = {
      campaigns: filtered,
      revenueSource: snapshot.revenueSource,
      revenueSourceMock: snapshot.revenueSourceMock,
      totals: computeTotals(filtered),
      dateRange: snapshot.dateRange,
      synced: true,
      syncedAt: row.updated_at,
    } as CampaignsResponse;

    return Response.json(response);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Campaigns route error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}

// ---- Live Meta path (used only when META_ACCESS_TOKEN works) -------------
async function liveMetaResponse(clientId: string, body: Required<RequestBody>): Promise<Response> {
  const config = await getMetaClientConfig(clientId);
  if (!config.metaAdAccountId) {
    throw new MetaApiError("Meta ad account not configured for this client.", 400);
  }
  const range = { start: body.date_range.start, end: body.date_range.end };

  const [insights, ads, adSets, campaigns] = await Promise.all([
    fetchInsightsByAd(config.metaAdAccountId, range),
    fetchAds(config.metaAdAccountId),
    fetchAdSets(config.metaAdAccountId),
    fetchCampaigns(config.metaAdAccountId),
  ]);
  const insightsByAdId = new Map(insights.map((r) => [r.ad_id, r]));

  const allCampaigns = buildHierarchy({
    insightsByAdId,
    ads,
    adSets,
    campaigns,
    revenueSourceActive: config.revenueSource === "meta",
    conversionEvent: config.conversionEvent,
  });
  allCampaigns.sort((a, b) => b.spend - a.spend);
  for (const c of allCampaigns) {
    c.adSets.sort((a, b) => b.spend - a.spend);
    for (const s of c.adSets) s.ads.sort((a, b) => b.spend - a.spend);
  }

  const filtered = applyFilters(allCampaigns, body);
  const response: CampaignsResponse = {
    campaigns: filtered,
    revenueSource: config.revenueSource,
    revenueSourceMock: config.revenueSource === "ghl" || config.revenueSource === "paystack",
    totals: computeTotals(filtered),
    dateRange: range,
  };
  return Response.json(response);
}
