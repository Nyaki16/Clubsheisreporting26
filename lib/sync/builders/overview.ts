import { FetchedClientData, MonthData } from "../types";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { calcMoMChange } from "@/lib/calculations";

export function buildOverview(
  current: FetchedClientData,
  prev: FetchedClientData | null,
  trendMonths: MonthData[]  // last 3 months for trend charts
) {
  const kpis: { label: string; value: string; badge: string; direction: "up"|"down"|"neutral"; icon: string }[] = [];

  const ps = current.paystack;
  const ghl = current.ghl;
  const fb = current.fbOrganic;
  const ig = current.instagram;
  const ads = current.metaAds;
  const prevPs = prev?.paystack;
  const prevAds = prev?.metaAds;
  const prevFb = prev?.fbOrganic;
  const prevIg = prev?.instagram;

  // Paystack Revenue
  if (ps) {
    kpis.push({ label: "Paystack Revenue", value: formatCurrency(ps.revenue), badge: `↑ ${ps.successCount} successful payments`, direction: "up", icon: "dollar" });
  }

  // GHL Revenue or New Subscribers
  if (ghl && ghl.revenue > 0) {
    if (ghl.isNewSubs) {
      kpis.push({ label: "New Subscribers", value: formatNumber(ghl.newSubCount || 0), badge: `↑ ${ghl.label}`, direction: "up", icon: "user-plus" });
    } else {
      kpis.push({ label: "Ghutte Revenue", value: formatCurrency(ghl.revenue), badge: `↑ ${ghl.label}`, direction: "up", icon: "dollar" });
    }
  }

  // Systeme.io Revenue
  if (current.systeme && current.systeme.revenue > 0) {
    kpis.push({ label: "Systeme.io Revenue", value: formatCurrency(current.systeme.revenue), badge: `↑ ${current.systeme.label}`, direction: "up", icon: "dollar" });
  }

  // Ad Spend
  if (ads && ads.spend > 0) {
    const badge = prevAds ? `${calcMoMChange(ads.spend, prevAds.spend) > 0 ? "+" : ""}${calcMoMChange(ads.spend, prevAds.spend).toFixed(0)}%` : `→ ${current.periodLabel}`;
    kpis.push({ label: "Total Ad Spend", value: formatCurrency(ads.spend), badge, direction: "neutral", icon: "target" });
  }

  // Failed Payments
  if (ps && ps.failedCount > 0) {
    kpis.push({ label: "Failed Payments", value: `${ps.failedCount} txns`, badge: "↓ Recovery opportunity", direction: "down", icon: "alert-triangle" });
  }

  // Instagram Followers
  if (ig) {
    kpis.push({ label: "Instagram Followers", value: ig.followers, badge: "▲ Current", direction: "up", icon: "instagram" });
  }

  // Facebook Followers
  if (fb) {
    const badge = prevFb ? `${calcMoMChange(fb.fans, prevFb.fans) > 0 ? "+" : ""}${calcMoMChange(fb.fans, prevFb.fans).toFixed(0)}%` : "▲ Page fans";
    kpis.push({ label: "Facebook Followers", value: formatNumber(fb.fans), badge, direction: "up", icon: "users" });
  }

  // FB Organic Reach
  if (fb && fb.impressions > 0) {
    const badge = prevFb ? `${calcMoMChange(fb.impressions, prevFb.impressions) > 0 ? "+" : ""}${calcMoMChange(fb.impressions, prevFb.impressions).toFixed(0)}%` : `▲ impressions`;
    kpis.push({ label: "FB Organic Reach", value: formatNumber(fb.impressions), badge, direction: "up", icon: "globe" });
  }

  // IG Monthly Reach
  if (ig) {
    const badge = prevIg ? `${calcMoMChange(ig.reach, prevIg.reach) > 0 ? "+" : ""}${calcMoMChange(ig.reach, prevIg.reach).toFixed(0)}%` : `▲ total`;
    kpis.push({ label: "IG Monthly Reach", value: formatNumber(ig.reach), badge, direction: "up", icon: "instagram" });
  }

  // Email Leads
  if (current.emailLeads) {
    kpis.push({ label: "Email Leads", value: formatNumber(current.emailLeads), badge: "↑ Systeme.io total", direction: "up", icon: "mail" });
  }

  const result: Record<string, unknown> = { kpis };

  // Product breakdown from Systeme.io
  if (current.systeme?.products?.length) {
    result.productBreakdown = current.systeme.products;
  }

  // Paystack section
  if (ps) {
    const mem = current.paystackMembership;
    result.paystack = {
      revenue: ps.revenue,
      revenueFormatted: formatCurrency(ps.revenue),
      revenueBadge: `↑ ${ps.successCount} successful payments`,
      activeMemberships: mem?.members,
      membershipBreakdown: mem?.memberBreakdown,
      failedAmount: 0,
      failedFormatted: `${ps.failedCount} failed txns`,
      failedBadge: "↓ Recovery opportunity",
      abandonedAmount: 0,
      abandonedFormatted: `${ps.abandonedCount} abandoned`,
      abandonedBadge: "↓ Checkout not completed",
    };
    result.revenueVsFailedChart = {
      successful: ps.revenue,
      failed: Math.round(ps.revenue * (ps.failedCount / (ps.successCount || 1))),
      abandoned: Math.round(ps.revenue * (ps.abandonedCount / (ps.successCount || 1))),
    };
  }

  // Performance Trend (3-month)
  if (trendMonths.length > 0) {
    result.performanceTrend = {
      labels: trendMonths.map(m => m.label),
      adSpend: trendMonths.map(m => m.data.metaAds?.spend || 0),
      newContacts: trendMonths.map(m => m.data.paystack?.successCount || 0),
      revenue: trendMonths.map(m =>
        (m.data.paystack?.revenue || 0) + (m.data.ghl?.revenue || 0) + (m.data.systeme?.revenue || 0)
      ),
    };
  }

  // Campaign Spend
  if (ads?.campaigns?.length) {
    result.campaignSpend = ads.campaigns.map(c => ({ name: c.name, spend: c.spend }));
  }

  // Social Highlights
  if (fb || ig) {
    result.socialHighlights = {
      instagramFollowers: { value: ig?.followers || "N/A", badge: "▲ Current followers" },
      facebookFans: { value: formatNumber(fb?.fans || 0), badge: "▲ Page fans" },
      fbOrganicReach: { value: formatNumber(fb?.impressions || 0), badge: "▲ impressions" },
      fbEngagements: { value: formatNumber(fb?.engagements || 0), badge: "▲ engagements" },
      igMonthlyReach: { value: formatNumber(ig?.reach || 0), badge: "▲ total" },
      engagementRate: {
        value: fb && fb.impressions > 0 ? `${((fb.engagements / fb.impressions) * 100).toFixed(1)}%` : "0%",
        badge: "▲",
      },
    };
  }

  return result;
}
