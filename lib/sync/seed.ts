import { getServiceClient } from "@/lib/supabase";
import { CLIENT_ACCOUNTS } from "@/lib/clients";

export async function seedDemoData() {
  const supabase = getServiceClient();

  // Ensure clients exist
  for (const client of CLIENT_ACCOUNTS) {
    await supabase.from("clients").upsert({
      id: client.uuid,
      name: client.name,
      slug: client.slug,
      is_active: true,
    }, { onConflict: "id" });
  }

  // Create March 2026 period
  const { data: period } = await supabase
    .from("reporting_periods")
    .upsert({ period_key: "2026-03", label: "March 2026", start_date: "2026-03-01", end_date: "2026-03-31", is_current: true }, { onConflict: "period_key" })
    .select()
    .single();

  if (!period) throw new Error("Failed to create period");

  const clubSheIsId = "0a9476d1-5a5a-4f4b-b213-8c9528587b37";
  const palesaId = "9bd71d9b-e419-46a8-bb29-6155174b5d46";

  // Seed Club She Is overview
  await upsert(supabase, clubSheIsId, period.id, "overview", {
    kpis: [
      { label: "Total Revenue", value: "R 107,829", badge: "↑ Ghutte R83,343 + Paystack R24,486", direction: "up", icon: "dollar" },
      { label: "Active Memberships", value: "65", badge: "↑ Paystack 62 + Ghutte", direction: "up", icon: "users" },
      { label: "New Contacts", value: "117", badge: "↑ Ghutte March", direction: "up", icon: "user-plus" },
      { label: "Total Ad Spend", value: "R 4,290", badge: "→ March total", direction: "neutral", icon: "target" },
      { label: "Instagram Followers", value: "18,043", badge: "↑ Current", direction: "up", icon: "instagram" },
      { label: "Organic Reach", value: "78.3K", badge: "↑ Facebook", direction: "up", icon: "globe" },
      { label: "Opportunities Won", value: "3", badge: "↑ R 1,047 value", direction: "up", icon: "check-circle" },
    ],
    paystack: {
      revenue: 24486, revenueFormatted: "R 24,486", revenueBadge: "↑ 64 transactions (Acct 2 + 3)",
      activeMemberships: 62, membershipBreakdown: "15×R149 + 4×R249 + 42×R349 + 1×R997",
      failedAmount: 44876, failedFormatted: "R 44,876", failedBadge: "↓ Recovery opportunity",
      abandonedAmount: 9745, abandonedFormatted: "R 9,745", abandonedBadge: "↓ Abandoned checkouts",
      reversedAmount: 320, reversedFormatted: "R 320", reversedBadge: "→ Refunds & disputes",
    },
    missedRevenue: {
      totalLost: 54941, totalLostFormatted: "R 54,941",
      failedPayments: 44876, failedPaymentsBadge: "▼ Declined cards / insufficient funds",
      abandonedCarts: 9745, abandonedCartsBadge: "▼ Checkout not completed",
      reversedChargebacks: 320, reversedChargebacksBadge: "▼ Refunds & disputes",
      recoveryRate: 30.8, recoveryRateBadge: "▼ R 24,486 of R 79,427 potential",
    },
    revenueVsFailedChart: { successful: 24486, failed: 44876, abandoned: 9745 },
    performanceTrend: {
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      adSpend: [1050, 1070, 1060, 1080],
      newContacts: [28, 32, 25, 32],
      socialReach: [19000, 20000, 19500, 19800],
    },
    campaignSpend: [
      { name: "Content Day March 2026", spend: 2500 },
      { name: "Content Day April 2026", spend: 1790 },
    ],
    socialHighlights: {
      instagramFollowers: { value: "18,042", badge: "▲ Current" },
      facebookFans: { value: "2,989", badge: "▲ Page fans" },
      fbOrganicReach: { value: "78.3K", badge: "▲ March impressions" },
      fbEngagements: { value: "3,897", badge: "▲ Post engagements" },
      igMonthlyReach: { value: "52.0K", badge: "▲ March total" },
      engagementRate: { value: "5.0%", badge: "▲" },
    },
  });

  // Seed Club She Is meta
  await upsert(supabase, clubSheIsId, period.id, "meta", {
    kpis: [
      { label: "Ad Spend", value: "R 4,290", change: "+8.2%", direction: "up" },
      { label: "Impressions", value: "892K", change: "+12.5%", direction: "up" },
      { label: "Clicks", value: "4.2K", change: "+5.1%", direction: "up" },
      { label: "CTR", value: "0.47%", change: "-2.1%", direction: "down" },
      { label: "CPC", value: "R2.95", change: "+3.0%", direction: "up" },
      { label: "Reach", value: "425K", change: "+18.7%", direction: "up" },
    ],
    trend: { labels: ["Jan 2026", "Feb 2026", "Mar 2026"], spend: [3200, 3900, 4290], impressions: [720000, 793000, 892000], clicks: [3800, 4000, 4200] },
    campaigns: [
      { name: "Content Day March 2026", spend: 2500, impressions: 450000, clicks: 2100, ctr: "0.47%", cpc: "R1.19", reach: 210000 },
      { name: "Content Day April 2026", spend: 1790, impressions: 320000, clicks: 1500, ctr: "0.47%", cpc: "R1.19", reach: 150000 },
    ],
  });

  // Seed Club She Is social
  await upsert(supabase, clubSheIsId, period.id, "social", {
    kpis: [
      { label: "Instagram Followers", value: "18,042", badge: "▲ Current", direction: "up" },
      { label: "Facebook Fans", value: "2,989", badge: "▲ Page fans", direction: "up" },
      { label: "FB Organic Reach", value: "78.3K", badge: "▲ March impressions", direction: "up" },
      { label: "FB Engagements", value: "3,897", badge: "▲ Post engagements", direction: "up" },
      { label: "IG Monthly Reach", value: "52.0K", badge: "▲ March total", direction: "up" },
      { label: "Engagement Rate", value: "5.0%", badge: "▲", direction: "up" },
    ],
    trend: { labels: ["Jan 2026", "Feb 2026", "Mar 2026"], instagramReach: [45000, 48000, 52000], facebookReach: [65000, 71000, 78300], followers: [17800, 17920, 18042] },
  });

  // Seed Club She Is insights
  await upsert(supabase, clubSheIsId, period.id, "insights", {
    wins: [
      { icon: "trending-up", text: "Instagram reach increased 20.3% — your Reel content is resonating." },
      { icon: "dollar-sign", text: "Revenue hit R107K — highest month this quarter." },
      { icon: "users", text: "117 new contacts added via Ghutte — lead gen is working." },
    ],
    alerts: [
      { icon: "alert-triangle", text: "R44,876 in failed Paystack transactions — follow up on declined cards." },
      { icon: "alert-circle", text: "179 Systeme.io unsubscribes (6.3% of new) — review email frequency." },
    ],
  });

  // Seed Club She Is next month
  await upsert(supabase, clubSheIsId, period.id, "nextMonth", {
    focusAreas: [
      { priority: "high", area: "Payment Recovery", recommendation: "R44,876 in failed payments — set up automated retry and dunning emails." },
      { priority: "medium", area: "Ad Creative", recommendation: "Test 3 new ad creatives with different hooks to improve CTR." },
      { priority: "low", area: "Instagram", recommendation: "Reach is growing organically — maintain current posting schedule." },
    ],
    targets: [
      { metric: "Revenue", current: "R 107,829", target: "R 120,000", stretch: "R 140,000" },
      { metric: "New Contacts", current: "117", target: "130", stretch: "150" },
      { metric: "Instagram Reach", current: "52.0K", target: "60K", stretch: "70K" },
    ],
  });

  // Seed Club She Is GHL
  await upsert(supabase, clubSheIsId, period.id, "ghl", {
    kpis: [
      { label: "New Contacts", value: "117", badge: "▲ GHL March", direction: "up" },
      { label: "Revenue", value: "R 83,343", badge: "▲ 52 transactions", direction: "up" },
      { label: "Opportunities", value: "3", badge: "→ 3 open", direction: "neutral" },
      { label: "Pipeline Value", value: "R 1,047", badge: "→ Open pipeline", direction: "neutral" },
      { label: "Avg Transaction", value: "R 1,603", badge: "▲ Per transaction", direction: "up" },
      { label: "Total Transactions", value: "52", badge: "▲ March", direction: "up" },
    ],
    contactsBySource: { labels: ["Website Form", "Facebook Ads", "Direct / Other"], values: [52, 40, 25] },
    weeklyContactsRevenue: {
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      contacts: [28, 32, 25, 32],
      revenue: [20000, 22000, 19000, 22343],
    },
    sourceBreakdown: [
      { source: "Website Form", contacts: 52, opportunities: 2, won: 1, revenue: "R 35,200", convRate: "3.8%" },
      { source: "Facebook Ads", contacts: 40, opportunities: 1, won: 1, revenue: "R 28,143", convRate: "2.5%" },
      { source: "Direct / Other", contacts: 25, opportunities: 0, won: 1, revenue: "R 20,000", convRate: "0%" },
    ],
  });

  // Seed Palesa Dooms overview
  await upsert(supabase, palesaId, period.id, "overview", {
    kpis: [
      { label: "Total Revenue", value: "R 171,486", badge: "↑ Ghutte R55,450 + Paystack R116,036", direction: "up", icon: "dollar" },
      { label: "Paystack Revenue", value: "R 116,036", badge: "↑ 122 transactions March", direction: "up", icon: "dollar" },
      { label: "New Contacts", value: "53", badge: "↑ Ghutte March", direction: "up", icon: "user-plus" },
      { label: "Total Ad Spend", value: "R 39,160", badge: "→ March total", direction: "neutral", icon: "target" },
      { label: "Instagram Followers", value: "19,224", badge: "↑ Current", direction: "up", icon: "instagram" },
      { label: "Organic Reach", value: "1.86M", badge: "↑ Facebook", direction: "up", icon: "globe" },
      { label: "FB Engagements", value: "39,509", badge: "↑ Post engagements", direction: "up", icon: "check-circle" },
      { label: "Email Leads", value: "37,145", badge: "↑ Systeme.io total", direction: "up", icon: "mail" },
    ],
    paystack: {
      revenue: 116036, revenueFormatted: "R 116,036", revenueBadge: "↑ 122 transactions in March",
      failedAmount: 73208, failedFormatted: "R 73,208", failedBadge: "↓ 32 failed in March",
      abandonedAmount: 101956, abandonedFormatted: "R 101,956", abandonedBadge: "↓ 126 abandoned in March",
      reversedAmount: 4, reversedFormatted: "R 4", reversedBadge: "→ March",
    },
    missedRevenue: {
      totalLost: 175168, totalLostFormatted: "R 175,168",
      failedPayments: 73208, failedPaymentsBadge: "▼ Declined cards / insufficient funds",
      abandonedCarts: 101956, abandonedCartsBadge: "▼ Checkout not completed",
      reversedChargebacks: 4, reversedChargebacksBadge: "▼ Refunds & disputes",
      recoveryRate: 39.8, recoveryRateBadge: "▼ R 116,036 of R 291,204 potential",
    },
    revenueVsFailedChart: { successful: 116036, failed: 73208, abandoned: 101956 },
    performanceTrend: {
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      adSpend: [9800, 9900, 9700, 9760],
      newContacts: [12, 15, 14, 12],
      socialReach: [460000, 470000, 465000, 465000],
    },
    campaignSpend: [
      { name: "Unforgettable Speakers Webinar", spend: 18500 },
      { name: "7 Day Challenge", spend: 12800 },
      { name: "90 Day Program", spend: 7860 },
    ],
    socialHighlights: {
      instagramFollowers: { value: "19,224", badge: "▲ Current" },
      facebookFans: { value: "12,450", badge: "▲ Page fans" },
      fbOrganicReach: { value: "1.86M", badge: "▲ March impressions" },
      fbEngagements: { value: "39,509", badge: "▲ Post engagements" },
      igMonthlyReach: { value: "180K", badge: "▲ March total" },
      engagementRate: { value: "2.1%", badge: "▲" },
    },
  });

  // Seed Palesa GHL
  await upsert(supabase, palesaId, period.id, "ghl", {
    kpis: [
      { label: "New Contacts", value: "53", badge: "▲ GHL March", direction: "up" },
      { label: "Revenue", value: "R 55,450", badge: "▲ 27 transactions", direction: "up" },
      { label: "Opportunities", value: "1", badge: "→ 1 open", direction: "neutral" },
      { label: "Pipeline Value", value: "R 0", badge: "→ No open pipeline", direction: "neutral" },
      { label: "Avg Transaction", value: "R 2,054", badge: "▲ Per transaction", direction: "up" },
      { label: "Total Transactions", value: "27", badge: "▲ March", direction: "up" },
    ],
    contactsBySource: { labels: ["Unforgettable Junior Speakers", "Direct / Other"], values: [38, 15] },
    weeklyContactsRevenue: {
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      contacts: [12, 15, 14, 12],
      revenue: [12000, 16000, 14000, 13450],
    },
    sourceBreakdown: [
      { source: "Unforgettable Junior Speakers", contacts: 38, opportunities: 1, won: 0, revenue: "R 42,300", convRate: "2.6%" },
      { source: "Direct / Other", contacts: 15, opportunities: 0, won: 0, revenue: "R 13,150", convRate: "0%" },
    ],
  });

  // Seed Palesa Systeme
  await upsert(supabase, palesaId, period.id, "systeme", {
    kpis: [
      { label: "New Contacts", value: "2,844", badge: "▲ March signups", direction: "up" },
      { label: "Active Contacts", value: "2,665", badge: "▲ Engaged subscribers", direction: "up" },
      { label: "Unsubscribed", value: "179", badge: "→ 6.3% unsubscribe rate", direction: "neutral" },
      { label: "Product Sales", value: "103", badge: "▲ Conversions", direction: "up" },
    ],
    productSales: [
      { name: "English Webinar Checkout", count: 92 },
      { name: "90 Day Unforgettable Buyers", count: 11 },
    ],
    topTags: [
      { name: "7 Day Challenge Complete", count: 980 },
      { name: "7 day challenge", count: 450 },
      { name: "90-Day Webinar - 24 Mar", count: 320 },
      { name: "Speak to Get Promoted - 10 Mar", count: 280 },
      { name: "Speak to Get Promoted - 24 Feb", count: 260 },
    ],
    trafficSources: [
      { domain: "unforgettablespeakers.com", contacts: 1350, share: "47.5%" },
      { domain: "Direct", contacts: 820, share: "28.8%" },
      { domain: "Facebook", contacts: 412, share: "14.5%" },
      { domain: "Google", contacts: 162, share: "5.7%" },
      { domain: "Other", contacts: 100, share: "3.5%" },
    ],
  });

  // Seed Palesa insights
  await upsert(supabase, palesaId, period.id, "insights", {
    wins: [
      { icon: "trending-up", text: "Organic reach hit 1.86M — massive brand awareness growth." },
      { icon: "dollar-sign", text: "Revenue hit R171K — strong month across all channels." },
      { icon: "users", text: "2,844 new Systeme.io contacts — funnel is performing well." },
    ],
    alerts: [
      { icon: "alert-triangle", text: "R73,208 in failed Paystack transactions — urgent payment recovery needed." },
      { icon: "alert-circle", text: "R101,956 in abandoned checkouts — optimize checkout flow." },
    ],
  });

  // Seed Palesa next month
  await upsert(supabase, palesaId, period.id, "nextMonth", {
    focusAreas: [
      { priority: "high", area: "Payment Recovery", recommendation: "R175K total lost revenue — implement dunning emails and checkout optimization urgently." },
      { priority: "high", area: "Checkout Optimization", recommendation: "126 abandoned checkouts — simplify payment flow and add trust signals." },
      { priority: "medium", area: "Scaling Ads", recommendation: "Strong ROAS on webinar campaigns — consider increasing budget by 20%." },
    ],
    targets: [
      { metric: "Revenue", current: "R 171,486", target: "R 200,000", stretch: "R 250,000" },
      { metric: "New Contacts", current: "53", target: "70", stretch: "100" },
      { metric: "Systeme Signups", current: "2,844", target: "3,500", stretch: "4,000" },
    ],
  });

  return { success: true, message: "Demo data seeded for Club She Is and Palesa Dooms (March 2026)" };
}

async function upsert(supabase: ReturnType<typeof getServiceClient>, clientId: string, periodId: string, section: string, data: unknown) {
  const { error } = await supabase
    .from("dashboard_data")
    .upsert(
      { client_id: clientId, period_id: periodId, section, data, updated_at: new Date().toISOString() },
      { onConflict: "client_id,period_id,section" }
    );
  if (error) console.error(`Error upserting ${section} for ${clientId}:`, error);
}
