import { WindsorMetaAdsData, WindsorFBOrganicData, WindsorInstagramData, GHLRevenueData } from "../types";

const WINDSOR_BASE = "https://connectors.windsor.ai/all";

async function windsorQuery(fields: string, dateFrom: string, dateTo: string): Promise<Record<string, unknown>[]> {
  const apiKey = process.env.WINDSOR_API_KEY;
  if (!apiKey) throw new Error("WINDSOR_API_KEY not set");

  const url = new URL(WINDSOR_BASE);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("fields", fields);
  url.searchParams.set("date_from", dateFrom);
  url.searchParams.set("date_to", dateTo);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Windsor API error ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.data || [];
}

export async function fetchMetaAds(
  accountIds: string[],
  dateFrom: string,
  dateTo: string
): Promise<WindsorMetaAdsData | null> {
  if (!accountIds.length) return null;

  try {
    const rows = await windsorQuery(
      "source,spend,impressions,clicks,reach,campaign,account_id",
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

export async function fetchFacebookOrganic(
  pageId: string,
  dateFrom: string,
  dateTo: string
): Promise<WindsorFBOrganicData | null> {
  if (!pageId) return null;

  try {
    const rows = await windsorQuery(
      "source,page_fans,impressions,engagements,account_id",
      dateFrom,
      dateTo
    );

    // Filter to facebook_organic and our page ID
    // Windsor returns facebook_organic as source, or the data may be mixed — filter by account_id
    const filtered = rows.filter(r => String(r.account_id || "") === pageId);
    if (!filtered.length) return null;

    const fans = Math.max(...filtered.map(r => Number(r.page_fans) || 0));
    const impressions = filtered.reduce((s, r) => s + (Number(r.impressions) || 0), 0);
    const engagements = filtered.reduce((s, r) => s + (Number(r.engagements) || 0), 0);

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
