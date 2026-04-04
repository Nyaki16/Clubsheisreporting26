import { FetchedClientData, MonthData } from "../types";
import { formatCurrency, formatNumber, formatChange } from "@/lib/formatters";
import { calcMoMChange } from "@/lib/calculations";

export function buildMeta(
  current: FetchedClientData,
  prev: FetchedClientData | null,
  trendMonths: MonthData[]
) {
  const ads = current.metaAds;
  if (!ads || ads.spend === 0) return null;

  const prevAds = prev?.metaAds;
  const ctr = ads.impressions > 0 ? ((ads.clicks / ads.impressions) * 100).toFixed(2) : "0";
  const cpc = ads.clicks > 0 ? (ads.spend / ads.clicks).toFixed(2) : "0";

  return {
    kpis: [
      { label: "Ad Spend", value: formatCurrency(ads.spend), change: prevAds ? formatChange(calcMoMChange(ads.spend, prevAds.spend)) : "—", direction: "up" as const },
      { label: "Impressions", value: formatNumber(ads.impressions), change: prevAds ? formatChange(calcMoMChange(ads.impressions, prevAds.impressions)) : "—", direction: "up" as const },
      { label: "Clicks", value: formatNumber(ads.clicks), change: prevAds ? formatChange(calcMoMChange(ads.clicks, prevAds.clicks)) : "—", direction: "up" as const },
      { label: "CTR", value: `${ctr}%`, change: "—", direction: "neutral" as const },
      { label: "CPC", value: `R${cpc}`, change: "—", direction: "neutral" as const },
      { label: "Reach", value: formatNumber(ads.reach), change: prevAds ? formatChange(calcMoMChange(ads.reach, prevAds.reach)) : "—", direction: "up" as const },
    ],
    trend: {
      labels: trendMonths.map(m => m.label),
      spend: trendMonths.map(m => m.data.metaAds?.spend || 0),
      impressions: trendMonths.map(m => m.data.metaAds?.impressions || 0),
      clicks: trendMonths.map(m => m.data.metaAds?.clicks || 0),
    },
    campaigns: ads.campaigns || [],
  };
}
