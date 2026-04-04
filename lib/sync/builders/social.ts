import { FetchedClientData, MonthData } from "../types";
import { formatNumber } from "@/lib/formatters";

export function buildSocial(current: FetchedClientData, trendMonths: MonthData[]) {
  const fb = current.fbOrganic;
  const ig = current.instagram;
  if (!fb && !ig) return null;

  return {
    kpis: [
      { label: "Instagram Followers", value: ig?.followers || "N/A", badge: "▲ Current", direction: "up" as const },
      { label: "Facebook Followers", value: formatNumber(fb?.fans || 0), badge: "▲ Page fans", direction: "up" as const },
      { label: "IG Monthly Reach", value: formatNumber(ig?.reach || 0), badge: "▲ total", direction: "up" as const },
      { label: "FB Organic Reach", value: formatNumber(fb?.impressions || 0), badge: "▲ impressions", direction: "up" as const },
      { label: "FB Engagements", value: formatNumber(fb?.engagements || 0), badge: "▲ engagements", direction: "up" as const },
      { label: "Engagement Rate", value: fb && fb.impressions > 0 ? `${((fb.engagements / fb.impressions) * 100).toFixed(1)}%` : "0%", badge: "▲", direction: "up" as const },
    ],
    trend: {
      labels: trendMonths.map(m => m.label),
      instagramReach: trendMonths.map(m => m.data.instagram?.reach || 0),
      facebookReach: trendMonths.map(m => m.data.fbOrganic?.impressions || 0),
      followers: trendMonths.map(m => m.data.fbOrganic?.fans || 0),
    },
  };
}
