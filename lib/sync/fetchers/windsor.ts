import { WindsorMetaAdsData, WindsorFBOrganicData, WindsorInstagramData, GHLRevenueData } from "../types";

const WINDSOR_BASE = "https://connectors.windsor.ai/all";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// A single empty response from Windsor isn't fully trustworthy on its own —
// while chasing an empty-`meta`-section bug on 18 Aug 2026 the same exact
// request sometimes came back `data: []` and sometimes didn't (root cause
// there turned out to be field ORDER in one specific query, now fixed in
// fetchMetaAds — but Windsor's aggregator clearly has room for other
// transient blips too). Retry a couple of times before accepting "no data".
async function windsorQuery(fields: string, dateFrom: string, dateTo: string): Promise<Record<string, unknown>[]> {
  const apiKey = process.env.WINDSOR_API_KEY;
  if (!apiKey) throw new Error("WINDSOR_API_KEY not set");

  const url = new URL(WINDSOR_BASE);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("fields", fields);
  url.searchParams.set("date_from", dateFrom);
  url.searchParams.set("date_to", dateTo);

  let lastRows: Record<string, unknown>[] = [];
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Windsor API error ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    lastRows = json.data || [];
    if (lastRows.length > 0) return lastRows;
    if (attempt < 3) await sleep(800 * attempt);
  }
  return lastRows;
}

export async function fetchMetaAds(
  accountIds: string[],
  dateFrom: string,
  dateTo: string
): Promise<WindsorMetaAdsData | null> {
  if (!accountIds.length) return null;

  try {
    // Field order matters to Windsor's `all` aggregator: "...,reach,campaign,..."
    // deterministically returns an empty data:[] (verified by hammering the
    // endpoint with every field present/absent combination) while the same
    // fields with "campaign" ahead of "reach" returns full rows every time.
    // Not a fluke — keep this order.
    const rows = await windsorQuery(
      "source,spend,impressions,clicks,campaign,reach,account_id",
      dateFrom,
      dateTo
    );

    // Filter to facebook source and our account IDs
    const filtered = rows.filter(
      r => String(r.source) === "facebook" && accountIds.includes(String(r.account_id || ""))
    );
    if (!filtered.length) return null;

    const spend = filtered.reduce((s, r) => s + (Number(r.spend) || 0), 0);
    const impressions = filtered.reduce((s, r) => s + (Number(r.impressions) || 0), 0);
    const clicks = filtered.reduce((s, r) => s + (Number(r.clicks) || 0), 0);
    const reach = filtered.reduce((s, r) => s + (Number(r.reach) || 0), 0);

    // Group by campaign
    const campaignMap = new Map<string, { spend: number; impressions: number; clicks: number; reach: number }>();
    for (const r of filtered) {
      const name = String(r.campaign || "Unknown");
      const existing = campaignMap.get(name) || { spend: 0, impressions: 0, clicks: 0, reach: 0 };
      existing.spend += Number(r.spend) || 0;
      existing.impressions += Number(r.impressions) || 0;
      existing.clicks += Number(r.clicks) || 0;
      existing.reach += Number(r.reach) || 0;
      campaignMap.set(name, existing);
    }

    const campaigns = Array.from(campaignMap.entries())
      .filter(([, v]) => v.spend > 0)
      .map(([name, v]) => ({
        name,
        spend: Math.round(v.spend),
        impressions: Math.round(v.impressions),
        clicks: Math.round(v.clicks),
        ctr: v.impressions > 0 ? `${((v.clicks / v.impressions) * 100).toFixed(2)}%` : "0%",
        cpc: v.clicks > 0 ? `R${(v.spend / v.clicks).toFixed(2)}` : "R0",
        reach: Math.round(v.reach),
      }))
      .sort((a, b) => b.spend - a.spend);

    return {
      spend: Math.round(spend),
      impressions: Math.round(impressions),
      clicks: Math.round(clicks),
      reach: Math.round(reach),
      campaigns,
    };
  } catch (e) {
    console.error("fetchMetaAds error:", e);
    return null;
  }
}

export interface WindsorAdRow {
  ad_id: string;
  ad_name: string;
  adset_name: string;
  campaign: string;
  effective_status: string;
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  link_clicks: number;
  landing_page_views: number;
  purchases: number;
  purchase_revenue: number;
  video_3sec_views: number;
}

/**
 * Pulls ad-level Meta data via Windsor for the given accounts and date range.
 * Returns one row per (ad_id × day) — caller should aggregate.
 */
export async function fetchMetaAdLevel(
  accountIds: string[],
  dateFrom: string,
  dateTo: string,
): Promise<WindsorAdRow[]> {
  if (!accountIds.length) return [];
  try {
    const rows = await windsorQuery(
      "source,account_id,ad_id,ad_name,adset_name,campaign,effective_status,spend,impressions,reach,frequency,clicks,link_clicks,landing_page_views,purchases,purchase_revenue,video_3sec_views",
      dateFrom,
      dateTo,
    );
    return rows
      .filter(
        (r) =>
          String(r.source) === "facebook" &&
          accountIds.includes(String(r.account_id || "")) &&
          r.ad_id,
      )
      .map((r) => ({
        ad_id: String(r.ad_id),
        ad_name: String(r.ad_name || "(unnamed)"),
        adset_name: String(r.adset_name || "(unnamed ad set)"),
        campaign: String(r.campaign || "(unnamed campaign)"),
        effective_status: String(r.effective_status || ""),
        spend: Number(r.spend) || 0,
        impressions: Number(r.impressions) || 0,
        reach: Number(r.reach) || 0,
        frequency: Number(r.frequency) || 0,
        clicks: Number(r.clicks) || 0,
        link_clicks: Number(r.link_clicks) || 0,
        landing_page_views: Number(r.landing_page_views) || 0,
        purchases: Number(r.purchases) || 0,
        purchase_revenue: Number(r.purchase_revenue) || 0,
        video_3sec_views: Number(r.video_3sec_views) || 0,
      }));
  } catch (e) {
    console.error("fetchMetaAdLevel error:", e);
    return [];
  }
}

export async function fetchFacebookOrganic(
  pageId: string,
  dateFrom: string,
  dateTo: string
): Promise<WindsorFBOrganicData | null> {
  if (!pageId) return null;

  try {
    const rows = await windsorQuery(
      "source,page_fans,page_impressions,page_post_engagements,account_id",
      dateFrom,
      dateTo
    );

    // Filter to our page ID
    const filtered = rows.filter(r => String(r.account_id || "") === pageId);
    if (!filtered.length) return null;

    const fans = Math.max(...filtered.map(r => Number(r.page_fans) || 0));
    const impressions = filtered.reduce((s, r) => s + (Number(r.page_impressions) || 0), 0);
    const engagements = filtered.reduce((s, r) => s + (Number(r.page_post_engagements) || 0), 0);

    return { fans, impressions, engagements };
  } catch (e) {
    console.error("fetchFacebookOrganic error:", e);
    return null;
  }
}

export async function fetchInstagramData(
  accountId: string,
  dateFrom: string,
  dateTo: string
): Promise<WindsorInstagramData | null> {
  if (!accountId) return null;

  try {
    const rows = await windsorQuery(
      "source,reach,followers_count,account_id",
      dateFrom,
      dateTo
    );

    const filtered = rows.filter(r => String(r.account_id || "") === accountId);
    if (!filtered.length) return null;

    const reach = filtered.reduce((s, r) => s + (Number(r.reach) || 0), 0);
    const followers = Math.max(...filtered.map(r => Number(r.followers_count) || 0));

    return {
      reach,
      followers: followers > 0 ? followers.toLocaleString() : "N/A",
    };
  } catch (e) {
    console.error("fetchInstagramData error:", e);
    return null;
  }
}

export async function fetchGHLRevenue(
  locationId: string,
  dateFrom: string,
  dateTo: string,
  isWW: boolean = false
): Promise<GHLRevenueData | null> {
  if (!locationId) return null;

  try {
    const rows = await windsorQuery(
      "source,transaction_amount,transaction_status,account_id",
      dateFrom,
      dateTo
    );

    // Filter to GHL transactions for this location, only succeeded
    const filtered = rows.filter(
      r => String(r.account_id || "") === locationId && String(r.transaction_status) === "succeeded"
    );
    if (!filtered.length) return null;

    const revenue = filtered.reduce((s, r) => s + (Number(r.transaction_amount) || 0), 0);
    const txnCount = filtered.length;

    if (revenue === 0) return null;

    if (isWW) {
      const newSubs = Math.floor(revenue / 149);
      return {
        revenue: Math.round(revenue),
        transactionCount: txnCount,
        isNewSubs: true,
        newSubCount: newSubs,
        label: `${newSubs.toLocaleString()} new subscribers × R149`,
      };
    }

    return {
      revenue: Math.round(revenue),
      transactionCount: txnCount,
      label: txnCount > 0 ? `${txnCount} transactions` : "Aggregated",
    };
  } catch (e) {
    console.error("fetchGHLRevenue error:", e);
    return null;
  }
}
