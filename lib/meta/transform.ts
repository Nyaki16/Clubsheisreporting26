import type {
  MetaInsightsRow,
  MetaAdRow,
  MetaAdSetRow,
  MetaCampaignRow,
} from "./queries";
import { sumAction } from "./queries";
import type {
  AdRow,
  AdSetRow,
  CampaignRow,
  Fatigue,
  AdFormat,
  RowStatus,
} from "./types";

export function classifyFatigue(frequency: number): Fatigue {
  if (frequency > 4) return "red";
  if (frequency >= 2.5) return "amber";
  return "green";
}

export function classifyFormat(creative?: MetaAdRow["creative"]): AdFormat {
  if (!creative) return "unknown";
  if (creative.video_id) return "video";
  const story = creative.object_story_spec as Record<string, unknown> | undefined;
  const linkData = story?.link_data as Record<string, unknown> | undefined;
  if (linkData && Array.isArray(linkData.child_attachments)) return "carousel";
  if (creative.image_url || creative.thumbnail_url) return "static";
  return "unknown";
}

export function normalizeStatus(status: string | undefined): RowStatus {
  if (!status) return "unknown";
  const s = status.toUpperCase();
  if (s === "ACTIVE") return "active";
  if (s === "PAUSED") return "paused";
  if (s === "CAMPAIGN_PAUSED" || s === "ADSET_PAUSED") return "paused";
  if (s === "LEARNING" || s === "IN_PROCESS") return "learning";
  if (s === "PENDING_REVIEW" || s === "IN_REVIEW") return "in_review";
  if (s === "DISAPPROVED" || s === "WITH_ISSUES") return "disapproved";
  return "unknown";
}

interface BuildContext {
  insightsByAdId: Map<string, MetaInsightsRow>;
  ads: MetaAdRow[];
  adSets: MetaAdSetRow[];
  campaigns: MetaCampaignRow[];
  revenueSourceActive: boolean; // true if revenue should be computed (meta) for v1
  conversionEvent: string;
}

function buildAdRow(ad: MetaAdRow, ctx: BuildContext): AdRow {
  const insights = ctx.insightsByAdId.get(ad.id);
  const spend = Number(insights?.spend) || 0;
  const impressions = Number(insights?.impressions) || 0;
  const reach = Number(insights?.reach) || 0;
  const frequency = Number(insights?.frequency) || 0;

  const linkClicks = sumAction(insights?.actions, "link_click");
  const landingPageViews = sumAction(insights?.actions, "landing_page_view");
  const conversions = sumAction(insights?.actions, ctx.conversionEvent);
  const revenue = ctx.revenueSourceActive
    ? sumAction(insights?.action_values, ctx.conversionEvent)
    : null;

  const roas = revenue !== null && spend > 0 ? revenue / spend : null;
  const cpa = conversions > 0 ? spend / conversions : null;

  const format = classifyFormat(ad.creative);
  const hookRate =
    format === "video" && impressions > 0
      ? (sumAction(insights?.video_3_sec_watched_actions, "video_view") || 0) / impressions
      : null;

  return {
    id: ad.id,
    name: ad.name,
    status: normalizeStatus(ad.effective_status),
    format,
    thumbnailUrl: ad.creative?.thumbnail_url || null,
    bodyText: ad.creative?.body || null,
    spend,
    impressions,
    reach,
    frequency,
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

function aggregate(rows: AdRow[]) {
  let spend = 0,
    impressions = 0,
    reach = 0,
    linkClicks = 0,
    landingPageViews = 0,
    conversions = 0,
    revenue = 0;
  let hasRevenue = false;
  let videoImpressions = 0;
  let videoHooks = 0;

  for (const r of rows) {
    spend += r.spend;
    impressions += r.impressions;
    reach += r.reach;
    linkClicks += r.linkClicks;
    landingPageViews += r.landingPageViews;
    conversions += r.conversions;
    if (r.revenue !== null) {
      hasRevenue = true;
      revenue += r.revenue;
    }
    if (r.hookRate !== null) {
      videoImpressions += r.impressions;
      videoHooks += r.hookRate * r.impressions;
    }
  }

  const frequency = reach > 0 ? impressions / reach : 0;
  return {
    spend,
    impressions,
    reach,
    frequency,
    linkClicks,
    landingPageViews,
    conversions,
    revenue: hasRevenue ? revenue : null,
    roas: hasRevenue && spend > 0 ? revenue / spend : null,
    cpa: conversions > 0 ? spend / conversions : null,
    hookRate: videoImpressions > 0 ? videoHooks / videoImpressions : null,
    fatigue: classifyFatigue(frequency),
  };
}

export function buildHierarchy(ctx: BuildContext): CampaignRow[] {
  const adRowsByAdSet = new Map<string, AdRow[]>();
  for (const ad of ctx.ads) {
    const row = buildAdRow(ad, ctx);
    const existing = adRowsByAdSet.get(ad.adset_id) || [];
    existing.push(row);
    adRowsByAdSet.set(ad.adset_id, existing);
  }

  const adSetRowsByCampaign = new Map<string, AdSetRow[]>();
  for (const adSet of ctx.adSets) {
    const ads = adRowsByAdSet.get(adSet.id) || [];
    if (ads.length === 0) continue;
    const agg = aggregate(ads);
    const row: AdSetRow = {
      id: adSet.id,
      name: adSet.name,
      status: normalizeStatus(adSet.effective_status),
      ...agg,
      ads,
    };
    const existing = adSetRowsByCampaign.get(adSet.campaign_id) || [];
    existing.push(row);
    adSetRowsByCampaign.set(adSet.campaign_id, existing);
  }

  const campaignRows: CampaignRow[] = [];
  for (const camp of ctx.campaigns) {
    const adSets = adSetRowsByCampaign.get(camp.id) || [];
    if (adSets.length === 0) continue;
    const allAds = adSets.flatMap((s) => s.ads);
    const agg = aggregate(allAds);
    campaignRows.push({
      id: camp.id,
      name: camp.name,
      status: normalizeStatus(camp.effective_status),
      ...agg,
      adSets,
    });
  }
  return campaignRows;
}
