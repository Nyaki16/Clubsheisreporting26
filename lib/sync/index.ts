import { getServiceClient } from "@/lib/supabase";
import { CLIENT_ACCOUNTS } from "@/lib/clients";
import { buildWindsorDateRange } from "@/lib/windsor";
import { FetchedClientData, MonthData } from "./types";
import { fetchMetaAds, fetchFacebookOrganic, fetchInstagramData, fetchGHLRevenue } from "./fetchers/windsor";
import { getPaystackKeys, fetchPaystackTransactions, fetchPaystackSubscriptions } from "./fetchers/paystack";
import { buildOverview } from "./builders/overview";
import { buildMeta } from "./builders/meta";
import { buildSocial } from "./builders/social";
import { buildPaystackSection } from "./builders/paystack-section";
import { buildInsights } from "./builders/insights";
import { buildNextMonth } from "./builders/next-month";

interface SyncResult {
  client: string;
  sections: string[];
  errors: string[];
}

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Membership plan amounts that count as "members" per client
const MEMBERSHIP_AMOUNTS: Record<string, number[]> = {
  "0a9476d1-5a5a-4f4b-b213-8c9528587b37": [149, 349],  // CSI
  "eb1d354f-d57f-4730-9cfb-6f057b83ee08": [149],         // W&W
};

// Clients where GHL revenue represents new subscribers
const GHL_NEW_SUBS_CLIENTS = ["eb1d354f-d57f-4730-9cfb-6f057b83ee08"]; // W&W

// Periods with verified data from full-sync.mjs — auto-sync must NOT overwrite these
const LOCKED_PERIODS = [
  "january-2026",
  "february-2026",
  "march-2026",
];

export async function runMonthlySync(year: number, month: number): Promise<SyncResult[]> {
  const supabase = getServiceClient();
  const results: SyncResult[] = [];

  // 1. Ensure period exists (use correct period_key format: "march-2026")
  const periodLabel = `${MONTH_LABELS[month - 1]} ${year}`;
  const periodKey = `${MONTH_NAMES[month - 1]}-${year}`;
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  let { data: period } = await supabase
    .from("reporting_periods")
    .select("*")
    .eq("period_key", periodKey)
    .single();

  if (!period) {
    // Set all other periods to not current
    await supabase.from("reporting_periods").update({ is_current: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    const { data: newPeriod } = await supabase
      .from("reporting_periods")
      .insert({ period_key: periodKey, label: periodLabel, start_date: startDate, end_date: endDate, is_current: true })
      .select()
      .single();
    period = newPeriod;
  }

  if (!period) throw new Error("Failed to create period");

  // Check if this period has verified/locked data
  if (LOCKED_PERIODS.includes(periodKey)) {
    return [{
      client: "ALL",
      sections: [],
      errors: [`Period ${periodLabel} is locked (verified data from full-sync). Auto-sync skipped to protect data accuracy. To update this period, run full-sync.mjs manually.`],
    }];
  }

  // 2. Ensure all clients exist in DB
  for (const client of CLIENT_ACCOUNTS) {
    await supabase.from("clients").upsert({
      id: client.uuid,
      name: client.name,
      slug: client.slug,
      is_active: true,
    }, { onConflict: "id" });
  }

  // 3. Get previous 2 periods for trend data
  const { data: allPeriods } = await supabase
    .from("reporting_periods")
    .select("*")
    .order("start_date", { ascending: false })
    .limit(3);

  // 4. For each client, fetch data and build sections
  for (const client of CLIENT_ACCOUNTS) {
    const result: SyncResult = { client: client.name, sections: [], errors: [] };

    try {
      // Fetch all data for current month
      const { dateFrom, dateTo } = buildWindsorDateRange(year, month);
      const isoFrom = `${dateFrom}T00:00:00.000Z`;
      const isoTo = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}T23:59:59.999Z`;
      const isWW = GHL_NEW_SUBS_CLIENTS.includes(client.uuid);

      // Parallel API calls
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
        periodLabel,
        metaAds: metaAds.status === "fulfilled" ? metaAds.value ?? undefined : undefined,
        fbOrganic: fbOrganic.status === "fulfilled" ? fbOrganic.value ?? undefined : undefined,
        instagram: instagram.status === "fulfilled" ? instagram.value ?? undefined : undefined,
        ghl: ghlData.status === "fulfilled" ? ghlData.value ?? undefined : undefined,
      };

      // Add paystack data
      if (paystackData.status === "fulfilled" && paystackData.value) {
        currentData.paystack = paystackData.value.summary;
        currentData.paystackMembership = paystackData.value.membership;
      }

      // Log any fetcher errors
      for (const [name, settled] of [["metaAds", metaAds], ["fbOrganic", fbOrganic], ["instagram", instagram], ["ghl", ghlData], ["paystack", paystackData]] as const) {
        if (settled.status === "rejected") {
          result.errors.push(`${name}: ${settled.reason}`);
        }
      }

      // Get previous month data from DB for MoM calculations
      const prevPeriod = allPeriods?.find(p => p.id !== period!.id);
      let prevData: FetchedClientData | null = null;
      if (prevPeriod) {
        prevData = await loadPreviousPeriodData(client.uuid, prevPeriod.id);
      }

      // Build trend data from last 3 periods
      const trendMonths = await buildTrendData(client.uuid, allPeriods || [], currentData, period!.id);

      // Build all sections
      const overview = buildOverview(currentData, prevData, trendMonths);
      await upsertSection(client.uuid, period!.id, "overview", overview);
      result.sections.push("overview");

      const meta = buildMeta(currentData, prevData, trendMonths);
      if (meta) {
        await upsertSection(client.uuid, period!.id, "meta", meta);
        result.sections.push("meta");
      }

      const social = buildSocial(currentData, trendMonths);
      if (social) {
        await upsertSection(client.uuid, period!.id, "social", social);
        result.sections.push("social");
      }

      const paystack = buildPaystackSection(currentData, trendMonths);
      if (paystack) {
        await upsertSection(client.uuid, period!.id, "paystack", paystack);
        result.sections.push("paystack");
      }

      const insights = buildInsights(currentData, prevData);
      await upsertSection(client.uuid, period!.id, "insights", insights);
      result.sections.push("insights");

      const nextMonth = buildNextMonth(currentData);
      await upsertSection(client.uuid, period!.id, "nextMonth", nextMonth);
      result.sections.push("nextMonth");

    } catch (e) {
      result.errors.push(String(e));
    }

    results.push(result);
  }

  return results;
}

async function fetchPaystackData(clientId: string, from: string, to: string) {
  const keys = await getPaystackKeys(clientId);
  if (!keys.length) return null;

  const memberAmounts = MEMBERSHIP_AMOUNTS[clientId];
  const { summary, membership } = await fetchPaystackTransactions(keys, from, to, memberAmounts);

  // Also get current subscription status
  if (membership) {
    const subData = await fetchPaystackSubscriptions(keys, memberAmounts);
    membership.activeSubscriptions = subData.activeSubscriptions;
    membership.attentionSubscriptions = subData.attentionSubscriptions;
    membership.nonRenewingSubscriptions = subData.nonRenewingSubscriptions;
  }

  return { summary, membership };
}

async function loadPreviousPeriodData(clientId: string, periodId: string): Promise<FetchedClientData | null> {
  const supabase = getServiceClient();

  // Load all stored sections for this period to get actual numbers
  const { data: rows } = await supabase
    .from("dashboard_data")
    .select("section, data")
    .eq("client_id", clientId)
    .eq("period_id", periodId)
    .in("section", ["overview", "social", "paystack", "meta"]);

  if (!rows?.length) return null;

  const sections: Record<string, Record<string, unknown>> = {};
  for (const r of rows) sections[r.section] = r.data as Record<string, unknown>;

  const overview = sections.overview;
  const social = sections.social;
  const paystackSection = sections.paystack;
  const metaSection = sections.meta;

  // Extract from social section trend data (actual numbers, not formatted strings)
  const socialTrend = social?.trend as { instagramReach?: number[]; facebookReach?: number[]; followers?: number[] } | undefined;
  const socialKpis = (social?.kpis as Array<{ label: string; value: string }>) || [];

  // Parse a formatted number string properly
  const parseNum = (s: string) => {
    if (!s) return 0;
    const clean = s.replace(/[R,\s]/g, "");
    if (clean.endsWith("M")) return parseFloat(clean.replace("M", "")) * 1000000;
    if (clean.endsWith("K")) return parseFloat(clean.replace("K", "")) * 1000;
    return parseFloat(clean) || 0;
  };

  const findSocialKpi = (label: string) => socialKpis.find(k => k.label === label)?.value || "";

  // Get Paystack revenue from the paystack section (actual number)
  const psRevenue = (paystackSection?.revenue as number) || (overview?.paystack as { revenue?: number })?.revenue || 0;

  // Get Meta Ads data from meta section
  const metaKpis = (metaSection?.kpis as Array<{ label: string; value: string }>) || [];
  const findMetaKpi = (label: string) => metaKpis.find(k => k.label === label)?.value || "";

  // Get the last entry from trend arrays (most recent month)
  const igReach = socialTrend?.instagramReach?.slice(-1)[0] || parseNum(findSocialKpi("IG Monthly Reach"));
  const fbReach = socialTrend?.facebookReach?.slice(-1)[0] || parseNum(findSocialKpi("FB Organic Reach"));
  const fbFans = socialTrend?.followers?.slice(-1)[0] || parseNum(findSocialKpi("Facebook Followers"));
  const fbEng = parseNum(findSocialKpi("FB Engagements"));

  return {
    clientId,
    clientKey: "",
    periodLabel: "",
    paystack: psRevenue > 0 ? {
      revenue: psRevenue,
      successCount: 0,
      failedCount: 0,
      abandonedCount: 0,
      reversedCount: 0,
    } : undefined,
    metaAds: findMetaKpi("Ad Spend") ? {
      spend: parseNum(findMetaKpi("Ad Spend")),
      impressions: parseNum(findMetaKpi("Impressions")),
      clicks: parseNum(findMetaKpi("Clicks")),
      reach: parseNum(findMetaKpi("Reach")),
      campaigns: [],
    } : undefined,
    fbOrganic: (fbFans > 0 || fbReach > 0) ? {
      fans: fbFans,
      impressions: fbReach,
      engagements: fbEng,
    } : undefined,
    instagram: igReach > 0 ? {
      reach: igReach,
      followers: findSocialKpi("Instagram Followers") || "N/A",
    } : undefined,
  };
}

async function buildTrendData(
  clientId: string,
  periods: { id: string; label: string }[],
  currentData: FetchedClientData,
  currentPeriodId: string
): Promise<MonthData[]> {
  const supabase = getServiceClient();
  const trendMonths: MonthData[] = [];

  // Load previous periods' overview data for trend
  for (const p of periods.reverse()) {
    if (p.id === currentPeriodId) {
      trendMonths.push({ label: currentData.periodLabel, data: currentData });
    } else {
      const prevData = await loadPreviousPeriodData(clientId, p.id);
      if (prevData) {
        trendMonths.push({ label: p.label, data: prevData });
      }
    }
  }

  return trendMonths;
}

export async function upsertSection(
  clientId: string,
  periodId: string,
  section: string,
  data: unknown
) {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("dashboard_data")
    .upsert(
      {
        client_id: clientId,
        period_id: periodId,
        section,
        data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,period_id,section" }
    );
  if (error) throw error;
}
