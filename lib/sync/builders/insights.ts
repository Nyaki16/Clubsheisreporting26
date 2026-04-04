import { FetchedClientData } from "../types";
import { formatCurrency, formatNumber, formatChange } from "@/lib/formatters";
import { calcMoMChange } from "@/lib/calculations";

export function buildInsights(current: FetchedClientData, prev: FetchedClientData | null) {
  const wins: { icon: string; text: string }[] = [];
  const alerts: { icon: string; text: string }[] = [];

  const ps = current.paystack;
  const ig = current.instagram;
  const prevIg = prev?.instagram;
  const fb = current.fbOrganic;
  const prevFb = prev?.fbOrganic;
  const ads = current.metaAds;

  // Wins
  if (ps && ps.revenue > 0) {
    wins.push({ icon: "dollar-sign", text: `Paystack revenue of ${formatCurrency(ps.revenue)} from ${ps.successCount} successful payments.` });
  }
  if (ig && prevIg && ig.reach > prevIg.reach * 1.1) {
    wins.push({ icon: "trending-up", text: `Instagram reach grew ${formatChange(calcMoMChange(ig.reach, prevIg.reach))} to ${formatNumber(ig.reach)}.` });
  }
  if (fb && prevFb && fb.impressions > prevFb.impressions * 1.1) {
    wins.push({ icon: "trending-up", text: `Facebook reach grew ${formatChange(calcMoMChange(fb.impressions, prevFb.impressions))} to ${formatNumber(fb.impressions)}.` });
  }
  if (ads && ads.spend > 0 && ads.clicks > 0) {
    wins.push({ icon: "trending-up", text: `Meta Ads delivered ${formatNumber(ads.reach)} reach at R${(ads.spend / ads.clicks).toFixed(2)} CPC.` });
  }

  // Alerts
  if (ps && ps.failedCount > ps.successCount * 0.5) {
    alerts.push({ icon: "alert-triangle", text: `${ps.failedCount} failed payments — high failure rate vs ${ps.successCount} successful. Investigate card issues.` });
  }
  if (ps && ps.abandonedCount > 20) {
    alerts.push({ icon: "alert-circle", text: `${ps.abandonedCount} abandoned checkouts — optimize checkout flow.` });
  }
  if (ig && prevIg && ig.reach < prevIg.reach * 0.9) {
    alerts.push({ icon: "alert-circle", text: `Instagram reach declined ${formatChange(calcMoMChange(ig.reach, prevIg.reach))} — review content strategy.` });
  }

  if (wins.length === 0) {
    wins.push({ icon: "trending-up", text: "Data synced for this period." });
  }

  return { wins, alerts };
}
