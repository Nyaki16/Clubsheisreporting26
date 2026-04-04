import { WindsorMetaAdsData, WindsorFBOrganicData, WindsorInstagramData, GHLRevenueData } from "../types";

const WINDSOR_BASE = "https://connectors.windsor.ai/all";

async function windsorQuery(params: Record<string, string>): Promise<Record<string, unknown>[]> {
  const apiKey = process.env.WINDSOR_API_KEY;
  if (!apiKey) throw new Error("WINDSOR_API_KEY not set");

  const url = new URL(WINDSOR_BASE);
  url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
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
    const rows = await windsorQuery({
      connector: "facebook",
      date_from: dateFrom,
      date_to: dateTo,
      fields: "spend,impressions,clicks,reach,campaign_name,account_id",
    });

    // Filter to our account IDs
    const filtered = rows.filter(r => accountIds.includes(String(r.account_id || "")));
    if (!filtered.length) return null;

    const spend = filtered.reduce((s, r) => s + (Number(r.spend) || 0), 0);
    const impressions = filtered.reduce((s, r) => s + (Number(r.impressions) || 0), 0);
    const clicks = filtered.reduce((s, r) => s + (Number(r.clicks) || 0), 0);
    const reach = filtered.reduce((s, r) => s + (Number(r.reach) || 0), 0);

    // Group by campaign
    const campaignMap = new Map<string, { spend: number; impressions: number; clicks: number; reach: number }>();
    for (const r of filtered) {
      const name = String(r.campaign_name || "Unknown");
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
    const rows = await windsorQuery({
      connector: "facebook_organic",
      date_from: dateFrom,
      date_to: dateTo,
      fields: "page_fans,impressions,engagements,account_id",
    });

    const filtered = rows.filter(r => String(r.account_id || "") === pageId);
    if (!filtered.length) return null;

    // page_fans is typically the latest value, not a sum
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
    const rows = await windsorQuery({
      connector: "instagram",
      date_from: dateFrom,
      date_to: dateTo,
      fields: "reach,followers,account_id",
    });

    const filtered = rows.filter(r => String(r.account_id || "") === accountId);
    if (!filtered.length) return null;

    const reach = filtered.reduce((s, r) => s + (Number(r.reach) || 0), 0);
    const followers = Math.max(...filtered.map(r => Number(r.followers) || 0));

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
    const rows = await windsorQuery({
      connector: "gohighlevel",
      date_from: dateFrom,
      date_to: dateTo,
      fields: "revenue,transactions,account_id",
    });

    const filtered = rows.filter(r => String(r.account_id || "") === locationId);
    if (!filtered.length) return null;

    const revenue = filtered.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
    const txnCount = filtered.reduce((s, r) => s + (Number(r.transactions) || 0), 0);

    if (revenue === 0) return null;

    // For W&W, GHL revenue represents new subscribers at R149
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

    const label = txnCount > 0 ? `${txnCount} transactions` : "Aggregated";
    return {
      revenue: Math.round(revenue),
      transactionCount: txnCount,
      label,
    };
  } catch (e) {
    console.error("fetchGHLRevenue error:", e);
    return null;
  }
}
