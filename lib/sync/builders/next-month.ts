import { FetchedClientData } from "../types";

export function buildNextMonth(current: FetchedClientData) {
  const ps = current.paystack;
  const ads = current.metaAds;
  const mem = current.paystackMembership;

  const focusAreas: { priority: "high" | "medium" | "low"; area: string; recommendation: string }[] = [];

  if (mem && mem.attentionSubscriptions > 10) {
    focusAreas.push({ priority: "high", area: "Payment Recovery", recommendation: `${mem.attentionSubscriptions} subscriptions need attention — set up dunning emails and card retry.` });
  }
  if (ps && ps.abandonedCount > 20) {
    focusAreas.push({ priority: "high", area: "Checkout Optimization", recommendation: `${ps.abandonedCount} abandoned checkouts last month — simplify payment flow.` });
  }
  if (!ads || ads.spend === 0) {
    focusAreas.push({ priority: "medium", area: "Paid Ads", recommendation: "No active Meta Ads — consider launching campaigns to drive growth." });
  }
  if (ads && ads.spend > 0) {
    focusAreas.push({ priority: "medium", area: "Ad Optimization", recommendation: "Review ad performance and test new creatives." });
  }
  focusAreas.push({ priority: "low", area: "Content", recommendation: "Maintain organic posting schedule for consistent reach growth." });

  return { focusAreas, targets: [] };
}
