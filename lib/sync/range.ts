import { ClientAccountMapping } from "@/types/dashboard";
import { FetchedClientData } from "./types";
import { fetchMetaAds, fetchFacebookOrganic, fetchInstagramData, fetchGHLRevenue } from "./fetchers/windsor";
import { buildOverview } from "./builders/overview";
import { buildMeta } from "./builders/meta";
import { buildSocial } from "./builders/social";
import { buildPaystackSection } from "./builders/paystack-section";
import { buildInsights } from "./builders/insights";
import { buildNextMonth } from "./builders/next-month";
import { fetchPaystackData, GHL_NEW_SUBS_CLIENTS } from "./index";

// Build dashboard sections for one client over an ARBITRARY date range.
//
// This is the custom-date-range counterpart to runMonthlySync's per-client
// loop. It fetches the same sources for [dateFrom, dateTo] and runs the same
// builders, but returns the sections instead of writing them to a monthly
// period — and skips month-over-month comparisons and trend charts, which only
// make sense for whole months.

export interface RangeSections {
  sections: Record<string, unknown>;
  errors: string[];
}

export async function buildSectionsForRange(
  client: ClientAccountMapping,
  dateFrom: string, // YYYY-MM-DD
  dateTo: string, // YYYY-MM-DD
  label: string,
): Promise<RangeSections> {
  const errors: string[] = [];
  const sections: Record<string, unknown> = {};

  const isoFrom = `${dateFrom}T00:00:00.000Z`;
  const isoTo = `${dateTo}T23:59:59.999Z`;
  const isWW = GHL_NEW_SUBS_CLIENTS.includes(client.uuid);

  const [metaAds, fbOrganic, instagram, ghlData, paystackData] = await Promise.allSettled([
    client.facebookAds?.length ? fetchMetaAds(client.facebookAds, dateFrom, dateTo) : Promise.resolve(null),
    client.facebookOrganic ? fetchFacebookOrganic(client.facebookOrganic, dateFrom, dateTo) : Promise.resolve(null),
    client.instagram ? fetchInstagramData(client.instagram, dateFrom, dateTo) : Promise.resolve(null),
    client.goHighLevel ? fetchGHLRevenue(client.goHighLevel, dateFrom, dateTo, isWW) : Promise.resolve(null),
    fetchPaystackData(client.uuid, isoFrom, isoTo),
  ]);

  const currentData: FetchedClientData = {
    clientId: client.uuid,
    clientKey: client.slug,
    periodLabel: label,
    metaAds: metaAds.status === "fulfilled" ? metaAds.value ?? undefined : undefined,
    fbOrganic: fbOrganic.status === "fulfilled" ? fbOrganic.value ?? undefined : undefined,
    instagram: instagram.status === "fulfilled" ? instagram.value ?? undefined : undefined,
    ghl: ghlData.status === "fulfilled" ? ghlData.value ?? undefined : undefined,
  };
  if (paystackData.status === "fulfilled" && paystackData.value) {
    currentData.paystack = paystackData.value.summary;
    currentData.paystackMembership = paystackData.value.membership;
  }

  for (const [name, settled] of [["metaAds", metaAds], ["fbOrganic", fbOrganic], ["instagram", instagram], ["ghl", ghlData], ["paystack", paystackData]] as const) {
    if (settled.status === "rejected") errors.push(`${name}: ${settled.reason}`);
  }

  // No prev-period / trend context for custom ranges.
  const overview = buildOverview(currentData, null, []);
  if (overview) sections.overview = overview;

  const meta = buildMeta(currentData, null, []);
  if (meta) sections.meta = meta;

  const social = buildSocial(currentData, []);
  if (social) sections.social = social;

  const paystack = buildPaystackSection(currentData, []);
  if (paystack) sections.paystack = paystack;

  const insights = buildInsights(currentData, null);
  if (insights) sections.insights = insights;

  const nextMonth = buildNextMonth(currentData);
  if (nextMonth) sections.nextMonth = nextMonth;

  return { sections, errors };
}
