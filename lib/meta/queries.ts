import { meta, MetaApiError } from "./client";

export interface DateRange {
  start: string;
  end: string;
}

export interface MetaActionRow {
  action_type: string;
  value: string;
}

export interface MetaInsightsRow {
  ad_id: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  frequency?: string;
  actions?: MetaActionRow[];
  action_values?: MetaActionRow[];
  video_3_sec_watched_actions?: MetaActionRow[];
  date_start: string;
  date_stop: string;
}

export interface MetaAdRow {
  id: string;
  name: string;
  effective_status: string;
  adset_id: string;
  campaign_id: string;
  created_time?: string;
  creative?: {
    id: string;
    thumbnail_url?: string;
    body?: string;
    title?: string;
    image_url?: string;
    video_id?: string;
    object_story_spec?: Record<string, unknown>;
  };
}

export interface MetaAdSetRow {
  id: string;
  name: string;
  campaign_id: string;
  effective_status: string;
}

export interface MetaCampaignRow {
  id: string;
  name: string;
  effective_status: string;
  objective?: string;
}

// Build the time_range JSON Meta expects.
function timeRange(range: DateRange): string {
  return JSON.stringify({ since: range.start, until: range.end });
}

function ensureAccountId(accountId: string): string {
  // Meta expects `act_<id>`. Callers may pass either form.
  return accountId.startsWith("act_") ? accountId : `act_${accountId}`;
}

export async function fetchInsightsByAd(
  adAccountId: string,
  range: DateRange,
): Promise<MetaInsightsRow[]> {
  const path = `/${ensureAccountId(adAccountId)}/insights`;
  return meta.paginate<MetaInsightsRow>(path, {
    level: "ad",
    time_range: timeRange(range),
    fields: [
      "ad_id",
      "spend",
      "impressions",
      "reach",
      "frequency",
      "actions",
      "action_values",
      "video_3_sec_watched_actions",
    ].join(","),
    limit: "500",
  });
}

export async function fetchAds(adAccountId: string): Promise<MetaAdRow[]> {
  const path = `/${ensureAccountId(adAccountId)}/ads`;
  return meta.paginate<MetaAdRow>(path, {
    fields: [
      "id",
      "name",
      "effective_status",
      "adset_id",
      "campaign_id",
      "created_time",
      "creative{id,thumbnail_url,body,title,image_url,video_id,object_story_spec}",
    ].join(","),
    limit: "500",
  });
}

export async function fetchAdSets(adAccountId: string): Promise<MetaAdSetRow[]> {
  const path = `/${ensureAccountId(adAccountId)}/adsets`;
  return meta.paginate<MetaAdSetRow>(path, {
    fields: ["id", "name", "campaign_id", "effective_status"].join(","),
    limit: "500",
  });
}

export async function fetchCampaigns(adAccountId: string): Promise<MetaCampaignRow[]> {
  const path = `/${ensureAccountId(adAccountId)}/campaigns`;
  return meta.paginate<MetaCampaignRow>(path, {
    fields: ["id", "name", "effective_status", "objective"].join(","),
    limit: "500",
  });
}

// Helper — sum action values for a given action_type.
export function sumAction(rows: MetaActionRow[] | undefined, type: string): number {
  if (!rows) return 0;
  let total = 0;
  for (const r of rows) {
    if (r.action_type === type) total += Number(r.value) || 0;
  }
  return total;
}

export { MetaApiError };
