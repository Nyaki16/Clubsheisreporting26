import type { WindsorAdRow } from "../fetchers/windsor";
import type {
  CampaignsResponse,
  CampaignRow,
  AdSetRow,
  AdRow,
  RowStatus,
  AdFormat,
  Fatigue,
} from "@/lib/meta/types";

function normalizeStatus(s: string): RowStatus {
  const u = s.toUpperCase();
  if (u === "ACTIVE") return "active";
  if (u.includes("PAUSED")) return "paused";
  if (u === "LEARNING" || u === "IN_PROCESS") return "learning";
  if (u === "PENDING_REVIEW" || u === "IN_REVIEW") return "in_review";
  if (u === "DISAPPROVED" || u === "WITH_ISSUES") return "disapproved";
  return "unknown";
}

function classifyFatigue(freq: number): Fatigue {
  if (freq > 4) return "red";
  if (freq >= 2.5) return "amber";
  return "green";
}

// Group multi-day Windsor rows down to one row per ad_id.
function aggregateByAd(rows: WindsorAdRow[]): Map<string, WindsorAdRow & { _days: number }> {
  const byId = new Map<string, WindsorAdRow & { _days: number }>();
  for (const r of rows) {
    const existing = byId.get(r.ad_id);
    if (!existing) {
      byId.set(r.ad_id, { ...r, _days: 1 });
    } else {
      existing.spend += r.spend;
      existing.impressions += r.impressions;
      existing.reach += r.reach; // approximate — Windsor's reach is per-row, total cannot be perfectly de-duped without breakdown call
      existing.clicks += r.clicks;
      existing.link_clicks += r.link_clicks;
      existing.landing_page_views += r.landing_page_views;
      existing.purchases += r.purchases;
      existing.purchase_revenue += r.purchase_revenue;
      existing.video_3sec_views += r.video_3sec_views;
      existing._days += 1;
      // Frequency: weighted avg by impressions
      const totalImpr = existing.impressions;
      if (totalImpr > 0) {
        existing.frequency = totalImpr / Math.max(existing.reach, 1);
      }
      // status + names: last-write-wins (Windsor sends current values consistently)
      existing.effective_status = r.effective_status || existing.effective_status;
      existing.ad_name = r.ad_name || existing.ad_name;
      existing.adset_name = r.adset_name || existing.adset_name;
      existing.campaign = r.campaign || existing.campaign;
    }
  }
  return byId;
}

function buildAdRow(r: WindsorAdRow): AdRow {
  const spend = r.spend;
  const impressions = r.impressions;
  const reach = r.reach;
  const frequency = r.frequency || (reach > 0 ? impressions / reach : 0);
  const conversions = r.purchases;
  const revenue = r.purchase_revenue > 0 ? r.purchase_revenue : null;
  const roas = revenue !== null && spend > 0 ? Number((revenue / spend).toFixed(2)) : null;
  const cpa = conversions > 0 ? Number((spend / conversions).toFixed(2)) : null;
  const isVideo = r.video_3sec_views > 0;
  const hookRate = isVideo && impressions > 0 ? Number((r.video_3sec_views / impressions).toFixed(4)) : null;
  const format: AdFormat = isVideo ? "video" : "static";
  return {
    id: r.ad_id,
    name: r.ad_name,
    status: normalizeStatus(r.effective_status),
    format,
    thumbnailUrl: null, // not available via Windsor; would require Graph API token or MCP creatives
    bodyText: null,
    spend: Number(spend.toFixed(2)),
    impressions,
    reach,
    frequency: Number(frequency.toFixed(2)),
    linkClicks: r.link_clicks,
    landingPageViews: r.landing_page_views,
    conversions,
    revenue,
    roas,
    cpa,
    hookRate,
    fatigue: classifyFatigue(frequency),
  };
}

function aggregateRows(ads: AdRow[]) {
  let spend = 0, impressions = 0, reach = 0, linkClicks = 0, lpv = 0, conversions = 0, revenue = 0;
  let hasRevenue = false, videoImpr = 0, videoHooks = 0;
  for (const a of ads) {
    spend += a.spend;
    impressions += a.impressions;
    reach += a.reach;
    linkClicks += a.linkClicks;
    lpv += a.landingPageViews;
    conversions += a.conversions;
    if (a.revenue !== null) { hasRevenue = true; revenue += a.revenue; }
    if (a.hookRate !== null) { videoImpr += a.impressions; videoHooks += a.hookRate * a.impressions; }
  }
  const frequency = reach > 0 ? impressions / reach : 0;
  return {
    spend: Number(spend.toFixed(2)),
    impressions, reach,
    frequency: Number(frequency.toFixed(2)),
    linkClicks, landingPageViews: lpv, conversions,
    revenue: hasRevenue ? Number(revenue.toFixed(2)) : null,
    roas: hasRevenue && spend > 0 ? Number((revenue / spend).toFixed(2)) : null,
    cpa: conversions > 0 ? Number((spend / conversions).toFixed(2)) : null,
    hookRate: videoImpr > 0 ? Number((videoHooks / videoImpr).toFixed(4)) : null,
    fatigue: classifyFatigue(frequency),
  };
}

/**
 * Build the full CampaignsResponse from raw Windsor ad-level rows.
 */
export function buildMetaCampaigns(
  rows: WindsorAdRow[],
  dateRange: { start: string; end: string },
): CampaignsResponse | null {
  if (!rows.length) return null;

  const aggByAd = aggregateByAd(rows);
  const adRows: AdRow[] = [];
  const adsetMeta = new Map<string, { name: string; campaign: string; status: RowStatus }>();
  const campaignMeta = new Map<string, RowStatus>();
  // Windsor doesn't expose adset_id/campaign_id — group by names. (Not ideal but workable.)
  const adByAdSet = new Map<string, AdRow[]>();
  const adsetByCampaign = new Map<string, string[]>();

  for (const [, raw] of aggByAd) {
    const adRow = buildAdRow(raw);
    adRows.push(adRow);
    const adsetKey = `${raw.campaign}::${raw.adset_name}`;
    const arr = adByAdSet.get(adsetKey) || [];
    arr.push(adRow);
    adByAdSet.set(adsetKey, arr);
    adsetMeta.set(adsetKey, {
      name: raw.adset_name,
      campaign: raw.campaign,
      status: normalizeStatus(raw.effective_status),
    });
    const adsetList = adsetByCampaign.get(raw.campaign) || [];
    if (!adsetList.includes(adsetKey)) adsetList.push(adsetKey);
    adsetByCampaign.set(raw.campaign, adsetList);
    if (!campaignMeta.has(raw.campaign)) {
      campaignMeta.set(raw.campaign, normalizeStatus(raw.effective_status));
    }
  }

  // Build adsets
  const adSetsByCampaign = new Map<string, AdSetRow[]>();
  for (const [adsetKey, ads] of adByAdSet) {
    const meta = adsetMeta.get(adsetKey)!;
    const agg = aggregateRows(ads);
    const row: AdSetRow = {
      id: adsetKey,
      name: meta.name,
      status: meta.status,
      ...agg,
      ads,
    };
    const arr = adSetsByCampaign.get(meta.campaign) || [];
    arr.push(row);
    adSetsByCampaign.set(meta.campaign, arr);
  }

  // Build campaigns
  const campaigns: CampaignRow[] = [];
  for (const [campaignName, adSets] of adSetsByCampaign) {
    const allAds = adSets.flatMap((s) => s.ads);
    const agg = aggregateRows(allAds);
    campaigns.push({
      id: campaignName, // using name as id since Windsor doesn't expose campaign_id
      name: campaignName,
      status: campaignMeta.get(campaignName) || "unknown",
      ...agg,
      adSets,
    });
  }

  // Sort: campaigns by spend desc, adsets by spend desc, ads by spend desc
  campaigns.sort((a, b) => b.spend - a.spend);
  for (const c of campaigns) {
    c.adSets.sort((a, b) => b.spend - a.spend);
    for (const s of c.adSets) s.ads.sort((a, b) => b.spend - a.spend);
  }

  // Determine revenue mode: meta if any ad has revenue > 0
  const hasAnyRevenue = adRows.some((a) => a.revenue !== null && a.revenue > 0);
  const revenueSource: CampaignsResponse["revenueSource"] = hasAnyRevenue ? "meta" : "none";

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
  const roas = totals.revenue !== null && totals.spend > 0 ? Number((totals.revenue / totals.spend).toFixed(2)) : null;

  return {
    campaigns,
    revenueSource,
    revenueSourceMock: false,
    totals: { ...totals, roas },
    dateRange,
    source: "windsor",
  };
}
