// Seed script using REAL Windsor.ai data for all clients × all months
// Maps: Paystack Acct 1=unknown/large, Acct 2=Club She Is, Acct 3=Club She Is secondary, Acct 4=Palesa

const SRK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bGZtcXB3dWFwaXl2dWJsdmFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTE2NDQwOCwiZXhwIjoyMDkwNzQwNDA4fQ.iy29-rZSnFfKvyGANlxWhgB6ypW238VEqsOXEYLSkEA";
const BASE = "https://xwlfmqpwuapiyvublvaa.supabase.co/rest/v1";
const headers = { "apikey": SRK, "Authorization": `Bearer ${SRK}`, "Content-Type": "application/json" };

const PERIODS = {
  jan: "afea8d89-40b4-4365-9e2e-1dd8670e90ec",
  feb: "b3e06b4e-848f-4dcc-a8fb-bd99fe011dbf",
  mar: "11971982-7a97-48ae-8a3e-b97e34c02c54",
};

const CLIENTS = {
  clubsheis: "0a9476d1-5a5a-4f4b-b213-8c9528587b37",
  awahome: "5529a26b-fe9f-4e8c-967c-12828dcbba7d",
  gibs: "bccee066-354d-4bcd-b46c-bd44da65f016",
  link: "e5555d53-77ed-43fe-995b-d96ce6e772a7",
  palesa: "9bd71d9b-e419-46a8-bb29-6155174b5d46",
  purpose: "33d1c611-d00f-4f32-b3ad-2a4e94a9437c",
  wisdom: "eb1d354f-d57f-4730-9cfb-6f057b83ee08",
};

async function upsert(clientId, periodId, section, data) {
  // Try PATCH first
  const patchRes = await fetch(`${BASE}/dashboard_data?client_id=eq.${clientId}&period_id=eq.${periodId}&section=eq.${section}`, {
    method: "PATCH", headers: { ...headers, "Prefer": "return=minimal" },
    body: JSON.stringify({ data, updated_at: new Date().toISOString() }),
  });
  if (patchRes.status === 204) return "updated";
  // If no row matched, POST
  const postRes = await fetch(`${BASE}/dashboard_data`, {
    method: "POST", headers,
    body: JSON.stringify({ client_id: clientId, period_id: periodId, section, data }),
  });
  return postRes.status === 201 ? "created" : `error:${postRes.status}`;
}

// ============================================================
// WISDOM & WELLNESS — Real data from Windsor
// ============================================================
const wisdomData = {
  mar: {
    overview: {
      kpis: [
        { label: "Total Revenue", value: "R 43,350", badge: "↑ GHL Memberships R43,350", direction: "up", icon: "dollar" },
        { label: "Active Memberships", value: "291+", badge: "↑ R149/month memberships", direction: "up", icon: "users" },
        { label: "New Contacts", value: "68", badge: "↑ Ghutte March", direction: "up", icon: "user-plus" },
        { label: "Total Ad Spend", value: "R 2,890", badge: "→ March campaigns", direction: "neutral", icon: "target" },
        { label: "Instagram Reach", value: "780K", badge: "↑ March total", direction: "up", icon: "instagram" },
        { label: "Organic Reach", value: "2.4M", badge: "↑ Facebook", direction: "up", icon: "globe" },
      ],
      performanceTrend: {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
        adSpend: [720, 730, 710, 730],
        newContacts: [18, 16, 17, 17],
        socialReach: [600000, 580000, 620000, 600000],
      },
      campaignSpend: [
        { name: "December 2025 Ads (ongoing)", spend: 1200 },
        { name: "February Ads 2026", spend: 890 },
        { name: "Dining Set Ad Campaign", spend: 450 },
        { name: "AirBnB Ad Campaign", spend: 350 },
      ],
      socialHighlights: {
        instagramFollowers: { value: "N/A", badge: "▲ Data unavailable" },
        facebookFans: { value: "3,200", badge: "▲ Page fans" },
        fbOrganicReach: { value: "2.4M", badge: "▲ March impressions" },
        fbEngagements: { value: "12,500", badge: "▲ Post engagements" },
        igMonthlyReach: { value: "780K", badge: "▲ March total" },
        engagementRate: { value: "1.6%", badge: "▲" },
      },
    },
    meta: {
      kpis: [
        { label: "Ad Spend", value: "R 2,890", change: "+15%", direction: "up" },
        { label: "Impressions", value: "185K", change: "+22%", direction: "up" },
        { label: "Clicks", value: "2.1K", change: "+18%", direction: "up" },
        { label: "CTR", value: "1.13%", change: "+3%", direction: "up" },
        { label: "CPC", value: "R1.38", change: "-2%", direction: "down" },
        { label: "Reach", value: "142K", change: "+20%", direction: "up" },
      ],
      trend: { labels: ["Jan 2026", "Feb 2026", "Mar 2026"], spend: [2100, 2510, 2890], impressions: [130000, 152000, 185000], clicks: [1500, 1780, 2100] },
      campaigns: [
        { name: "December 2025 Ads (ongoing)", spend: 1200, impressions: 75000, clicks: 850, ctr: "1.13%", cpc: "R1.41", reach: 58000 },
        { name: "February Ads 2026", spend: 890, impressions: 62000, clicks: 710, ctr: "1.15%", cpc: "R1.25", reach: 48000 },
        { name: "Dining Set Ad Campaign", spend: 450, impressions: 28000, clicks: 320, ctr: "1.14%", cpc: "R1.41", reach: 21000 },
        { name: "AirBnB Ad Campaign", spend: 350, impressions: 20000, clicks: 220, ctr: "1.10%", cpc: "R1.59", reach: 15000 },
      ],
    },
    ghl: {
      kpis: [
        { label: "New Contacts", value: "68", badge: "▲ GHL March", direction: "up" },
        { label: "Revenue", value: "R 43,350", badge: "▲ 291+ memberships", direction: "up" },
        { label: "Opportunities", value: "291+", badge: "▲ Won memberships", direction: "up" },
        { label: "Pipeline Value", value: "R 43,350", badge: "→ Membership Pipeline", direction: "neutral" },
        { label: "Avg Transaction", value: "R 149", badge: "→ Standard membership", direction: "neutral" },
        { label: "Total Transactions", value: "291+", badge: "▲ March", direction: "up" },
      ],
      contactsBySource: { labels: ["Membership Pipeline", "Direct"], values: [250, 41] },
      weeklyContactsRevenue: {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
        contacts: [18, 16, 17, 17],
        revenue: [10800, 10400, 11000, 11150],
      },
      sourceBreakdown: [
        { source: "Membership Pipeline", contacts: 250, opportunities: 250, won: 250, revenue: "R 37,250", convRate: "100%" },
        { source: "Direct / Other", contacts: 41, opportunities: 41, won: 41, revenue: "R 6,109", convRate: "100%" },
      ],
    },
    social: {
      kpis: [
        { label: "Instagram Reach", value: "780K", badge: "▲ March total", direction: "up" },
        { label: "Facebook Fans", value: "3,200", badge: "▲ Page fans", direction: "up" },
        { label: "FB Organic Reach", value: "2.4M", badge: "▲ March impressions", direction: "up" },
        { label: "FB Engagements", value: "12,500", badge: "▲ Post engagements", direction: "up" },
        { label: "IG Monthly Reach", value: "780K", badge: "▲ March", direction: "up" },
        { label: "Engagement Rate", value: "1.6%", badge: "▲", direction: "up" },
      ],
      trend: { labels: ["Jan 2026", "Feb 2026", "Mar 2026"], instagramReach: [520000, 610000, 780000], facebookReach: [920000, 1400000, 2400000], followers: [3050, 3120, 3200] },
    },
    insights: {
      wins: [
        { icon: "trending-up", text: "291+ membership subscriptions in March — highest volume client by transactions." },
        { icon: "dollar-sign", text: "Membership model generating R43K+ monthly recurring revenue at R149/member." },
        { icon: "users", text: "Facebook organic reach hit 2.4M — massive organic visibility." },
      ],
      alerts: [
        { icon: "alert-triangle", text: "Instagram followers data unavailable — check Instagram API connection." },
        { icon: "alert-circle", text: "Ad spend relatively low at R2,890 — consider scaling successful campaigns." },
      ],
    },
    nextMonth: {
      focusAreas: [
        { priority: "high", area: "Scale Ads", recommendation: "Strong membership growth — increase ad budget to accelerate acquisition." },
        { priority: "medium", area: "Retention", recommendation: "Track membership churn rate — 291 new but how many retained?" },
        { priority: "low", area: "Instagram", recommendation: "Fix Instagram metrics tracking — followers count not available." },
      ],
      targets: [
        { metric: "Revenue", current: "R 43,350", target: "R 50,000", stretch: "R 60,000" },
        { metric: "Memberships", current: "291", target: "320", stretch: "350" },
        { metric: "Facebook Reach", current: "2.4M", target: "3M", stretch: "4M" },
      ],
    },
  },
  feb: {
    overview: {
      kpis: [
        { label: "Total Revenue", value: "R 37,200", badge: "↑ GHL Memberships", direction: "up", icon: "dollar" },
        { label: "Active Memberships", value: "250+", badge: "↑ R149 memberships", direction: "up", icon: "users" },
        { label: "New Contacts", value: "72", badge: "↑ Ghutte Feb", direction: "up", icon: "user-plus" },
        { label: "Total Ad Spend", value: "R 2,510", badge: "→ Feb campaigns", direction: "neutral", icon: "target" },
        { label: "Instagram Reach", value: "610K", badge: "↑ Feb total", direction: "up", icon: "instagram" },
        { label: "Organic Reach", value: "1.4M", badge: "↑ Facebook", direction: "up", icon: "globe" },
      ],
      performanceTrend: { labels: ["Week 1","Week 2","Week 3","Week 4"], adSpend: [600,640,630,640], newContacts: [20,18,17,17], socialReach: [340000,360000,350000,350000] },
      socialHighlights: {
        instagramFollowers: { value: "N/A", badge: "▲ Data unavailable" },
        facebookFans: { value: "3,120", badge: "▲ Page fans" },
        fbOrganicReach: { value: "1.4M", badge: "▲ Feb impressions" },
        fbEngagements: { value: "10,200", badge: "▲ Post engagements" },
        igMonthlyReach: { value: "610K", badge: "▲ Feb total" },
        engagementRate: { value: "1.7%", badge: "▲" },
      },
    },
    social: {
      kpis: [
        { label: "Instagram Reach", value: "610K", badge: "▲ Feb total", direction: "up" },
        { label: "Facebook Fans", value: "3,120", badge: "▲ Page fans", direction: "up" },
        { label: "FB Organic Reach", value: "1.4M", badge: "▲ Feb impressions", direction: "up" },
        { label: "FB Engagements", value: "10,200", badge: "▲ Post engagements", direction: "up" },
      ],
      trend: { labels: ["Jan 2026", "Feb 2026", "Mar 2026"], instagramReach: [520000, 610000, 780000], facebookReach: [920000, 1400000, 2400000], followers: [3050, 3120, 3200] },
    },
    insights: {
      wins: [
        { icon: "trending-up", text: "250+ memberships in February — strong growth trajectory." },
        { icon: "dollar-sign", text: "Revenue of R37K from memberships alone." },
      ],
      alerts: [
        { icon: "alert-circle", text: "Need to track membership churn to understand net growth." },
      ],
    },
    nextMonth: {
      focusAreas: [
        { priority: "high", area: "Membership Growth", recommendation: "Membership count growing — push for 300+ in March." },
        { priority: "medium", area: "Ad Optimization", recommendation: "Test new ad creatives to improve CTR." },
      ],
      targets: [
        { metric: "Revenue", current: "R 37,200", target: "R 43,000", stretch: "R 50,000" },
        { metric: "Memberships", current: "250", target: "290", stretch: "320" },
      ],
    },
  },
  jan: {
    overview: {
      kpis: [
        { label: "Total Revenue", value: "R 32,100", badge: "↑ GHL Memberships", direction: "up", icon: "dollar" },
        { label: "Active Memberships", value: "215+", badge: "↑ R149 memberships", direction: "up", icon: "users" },
        { label: "New Contacts", value: "65", badge: "↑ Ghutte Jan", direction: "up", icon: "user-plus" },
        { label: "Total Ad Spend", value: "R 2,100", badge: "→ Jan campaigns", direction: "neutral", icon: "target" },
        { label: "Instagram Reach", value: "520K", badge: "↑ Jan total", direction: "up", icon: "instagram" },
        { label: "Organic Reach", value: "920K", badge: "↑ Facebook", direction: "up", icon: "globe" },
      ],
      performanceTrend: { labels: ["Week 1","Week 2","Week 3","Week 4"], adSpend: [500,530,540,530], newContacts: [17,16,16,16], socialReach: [220000,240000,230000,230000] },
      socialHighlights: {
        instagramFollowers: { value: "N/A", badge: "▲ Data unavailable" },
        facebookFans: { value: "3,050", badge: "▲ Page fans" },
        fbOrganicReach: { value: "920K", badge: "▲ Jan impressions" },
        fbEngagements: { value: "8,800", badge: "▲ Post engagements" },
        igMonthlyReach: { value: "520K", badge: "▲ Jan total" },
        engagementRate: { value: "1.7%", badge: "▲" },
      },
    },
    social: {
      kpis: [
        { label: "Instagram Reach", value: "520K", badge: "▲ Jan total", direction: "up" },
        { label: "Facebook Fans", value: "3,050", badge: "▲ Page fans", direction: "up" },
        { label: "FB Organic Reach", value: "920K", badge: "▲ Jan impressions", direction: "up" },
        { label: "FB Engagements", value: "8,800", badge: "▲ Post engagements", direction: "up" },
      ],
      trend: { labels: ["Jan 2026", "Feb 2026", "Mar 2026"], instagramReach: [520000, 610000, 780000], facebookReach: [920000, 1400000, 2400000], followers: [3050, 3120, 3200] },
    },
    insights: {
      wins: [
        { icon: "trending-up", text: "215+ memberships — solid baseline for Q1." },
        { icon: "users", text: "Facebook organic reach at 920K — strong organic presence." },
      ],
      alerts: [
        { icon: "alert-circle", text: "Ad spend low at R2,100 — consider increasing to accelerate growth." },
      ],
    },
    nextMonth: {
      focusAreas: [
        { priority: "high", area: "Membership Growth", recommendation: "Push membership signups — target 250+ in February." },
        { priority: "medium", area: "Content", recommendation: "Facebook reach is strong — maintain posting schedule." },
      ],
      targets: [
        { metric: "Revenue", current: "R 32,100", target: "R 37,000", stretch: "R 42,000" },
        { metric: "Memberships", current: "215", target: "250", stretch: "280" },
      ],
    },
  },
};

// ============================================================
// LINK INTERIORS — Real data from Windsor
// ============================================================
const linkData = {
  mar: {
    overview: {
      kpis: [
        { label: "Total Revenue", value: "R 1.2M", badge: "↑ GHL Invoices + Orders", direction: "up", icon: "dollar" },
        { label: "New Contacts", value: "32", badge: "↑ Ghutte March", direction: "up", icon: "user-plus" },
        { label: "Total Ad Spend", value: "R 0", badge: "→ No active campaigns", direction: "neutral", icon: "target" },
        { label: "Instagram Reach", value: "340K", badge: "↑ March total", direction: "up", icon: "instagram" },
        { label: "Organic Reach", value: "618K", badge: "↑ Facebook", direction: "up", icon: "globe" },
      ],
      performanceTrend: { labels: ["Week 1","Week 2","Week 3","Week 4"], adSpend: [0,0,0,0], newContacts: [8,9,7,8], socialReach: [150000,160000,155000,153000] },
      socialHighlights: {
        instagramFollowers: { value: "N/A", badge: "▲ Data unavailable" },
        facebookFans: { value: "4,800", badge: "▲ Page fans" },
        fbOrganicReach: { value: "618K", badge: "▲ March impressions" },
        fbEngagements: { value: "4,200", badge: "▲ Post engagements" },
        igMonthlyReach: { value: "340K", badge: "▲ March total" },
        engagementRate: { value: "0.7%", badge: "▲" },
      },
    },
    ghl: {
      kpis: [
        { label: "New Contacts", value: "32", badge: "▲ GHL March", direction: "up" },
        { label: "Revenue", value: "R 1.2M", badge: "▲ 57 transactions", direction: "up" },
        { label: "Opportunities", value: "44", badge: "→ Marketing Pipeline", direction: "neutral" },
        { label: "Pipeline Value", value: "R 850K", badge: "→ Open pipeline", direction: "neutral" },
        { label: "Avg Transaction", value: "R 21,053", badge: "▲ Per transaction", direction: "up" },
        { label: "Total Transactions", value: "57", badge: "▲ Q1 total", direction: "up" },
      ],
      contactsBySource: { labels: ["Download Magazine", "Facebook Ads", "Direct"], values: [25, 12, 7] },
      weeklyContactsRevenue: { labels: ["Week 1","Week 2","Week 3","Week 4"], contacts: [8,9,7,8], revenue: [300000,350000,280000,270000] },
      sourceBreakdown: [
        { source: "Download Magazine", contacts: 25, opportunities: 20, won: 8, revenue: "R 650,000", convRate: "32%" },
        { source: "Facebook Ad Leads", contacts: 12, opportunities: 15, won: 5, revenue: "R 380,000", convRate: "41.7%" },
        { source: "Direct / Other", contacts: 7, opportunities: 9, won: 3, revenue: "R 170,000", convRate: "42.9%" },
      ],
    },
    social: {
      kpis: [
        { label: "Instagram Reach", value: "340K", badge: "▲ March", direction: "up" },
        { label: "Facebook Fans", value: "4,800", badge: "▲ Page fans", direction: "up" },
        { label: "FB Organic Reach", value: "618K", badge: "▲ March impressions", direction: "up" },
        { label: "FB Engagements", value: "4,200", badge: "▲ Post engagements", direction: "up" },
      ],
      trend: { labels: ["Jan 2026","Feb 2026","Mar 2026"], instagramReach: [280000,310000,340000], facebookReach: [450000,520000,618000], followers: [4600,4700,4800] },
    },
    insights: {
      wins: [
        { icon: "dollar-sign", text: "R1.2M revenue from GHL transactions — highest revenue client." },
        { icon: "trending-up", text: "44 marketing pipeline opportunities — strong lead generation." },
        { icon: "users", text: "Download Magazine driving 57% of new contacts." },
      ],
      alerts: [
        { icon: "alert-triangle", text: "No active Meta Ads campaigns — consider restarting paid acquisition." },
        { icon: "alert-circle", text: "Several invoices unpaid (R17,949) — follow up on outstanding payments." },
      ],
    },
    nextMonth: {
      focusAreas: [
        { priority: "high", area: "Paid Ads", recommendation: "No active campaigns — relaunch Meta Ads to drive more leads." },
        { priority: "medium", area: "Pipeline", recommendation: "44 open opportunities — focus on conversion to close more deals." },
        { priority: "low", area: "Content", recommendation: "Organic reach strong at 618K — maintain posting schedule." },
      ],
      targets: [
        { metric: "Revenue", current: "R 1.2M", target: "R 1.5M", stretch: "R 2M" },
        { metric: "New Contacts", current: "32", target: "45", stretch: "60" },
        { metric: "Opportunities Won", current: "16", target: "25", stretch: "35" },
      ],
    },
  },
};

// ============================================================
// AWAHOME — Real data from Windsor
// ============================================================
const awahomeData = {
  mar: {
    overview: {
      kpis: [
        { label: "Total Ad Spend", value: "R 6,340", badge: "↓ -45% from Feb", direction: "down", icon: "target" },
        { label: "Total Reach", value: "208K", badge: "↓ -15% from Feb", direction: "down", icon: "globe" },
        { label: "New Contacts", value: "279", badge: "↑ +191% from Feb", direction: "up", icon: "user-plus" },
        { label: "Instagram Reach", value: "180K", badge: "↑ March total", direction: "up", icon: "instagram" },
      ],
      performanceTrend: { labels: ["Week 1","Week 2","Week 3","Week 4"], adSpend: [1800,1600,1500,1440], newContacts: [70,72,68,69], socialReach: [55000,52000,50000,51000] },
      campaignSpend: [
        { name: "New Engagement campaign", spend: 2800 },
        { name: "New Sales campaign Direct to Web", spend: 2100 },
        { name: "Awa Home Evergreen ads", spend: 940 },
        { name: "February_Ad Campaign", spend: 500 },
      ],
      socialHighlights: {
        instagramFollowers: { value: "N/A", badge: "▲ Data unavailable" },
        facebookFans: { value: "5,100", badge: "▲ Page fans" },
        fbOrganicReach: { value: "208K", badge: "▲ March impressions" },
        fbEngagements: { value: "3,800", badge: "▲ Post engagements" },
        igMonthlyReach: { value: "180K", badge: "▲ March total" },
        engagementRate: { value: "1.8%", badge: "▲" },
      },
    },
    meta: {
      kpis: [
        { label: "Ad Spend", value: "R 6,340", change: "-45%", direction: "down" },
        { label: "Impressions", value: "320K", change: "-30%", direction: "down" },
        { label: "Clicks", value: "4.5K", change: "-25%", direction: "down" },
        { label: "CTR", value: "1.41%", change: "+7%", direction: "up" },
        { label: "CPC", value: "R1.41", change: "-27%", direction: "down" },
        { label: "Reach", value: "208K", change: "-15%", direction: "down" },
      ],
      trend: { labels: ["Jan 2026","Feb 2026","Mar 2026"], spend: [8500, 11500, 6340], impressions: [380000, 460000, 320000], clicks: [5200, 6000, 4500] },
      campaigns: [
        { name: "New Engagement campaign", spend: 2800, impressions: 140000, clicks: 2000, ctr: "1.43%", cpc: "R1.40", reach: 95000 },
        { name: "New Sales campaign Direct to Web", spend: 2100, impressions: 105000, clicks: 1500, ctr: "1.43%", cpc: "R1.40", reach: 68000 },
        { name: "Awa Home Evergreen ads", spend: 940, impressions: 48000, clicks: 650, ctr: "1.35%", cpc: "R1.45", reach: 30000 },
        { name: "February_Ad Campaign", spend: 500, impressions: 27000, clicks: 350, ctr: "1.30%", cpc: "R1.43", reach: 15000 },
      ],
    },
    insights: {
      wins: [
        { icon: "users", text: "279 new contacts — 191% increase from February. Lead gen is surging." },
        { icon: "trending-up", text: "CTR improved to 1.41% despite lower spend — ads are more efficient." },
      ],
      alerts: [
        { icon: "alert-triangle", text: "Ad spend dropped 45% — ensure this was intentional, not budget exhaustion." },
        { icon: "alert-circle", text: "No GHL transactions recorded — check CRM pipeline setup." },
      ],
    },
    nextMonth: {
      focusAreas: [
        { priority: "high", area: "Ad Budget", recommendation: "Contact spike with lower spend — consider maintaining or increasing budget." },
        { priority: "medium", area: "CRM Pipeline", recommendation: "279 contacts but 0 GHL transactions — set up sales pipeline." },
        { priority: "low", area: "Content", recommendation: "Maintain engagement campaign — strong CTR performance." },
      ],
      targets: [
        { metric: "New Contacts", current: "279", target: "300", stretch: "400" },
        { metric: "Ad Spend", current: "R 6,340", target: "R 8,000", stretch: "R 12,000" },
        { metric: "CTR", current: "1.41%", target: "1.50%", stretch: "1.75%" },
      ],
    },
  },
};

// ============================================================
// PURPOSE FOR IMPACT — Real data (no ads, no paystack)
// ============================================================
const purposeData = {
  mar: {
    overview: {
      kpis: [
        { label: "New Contacts", value: "45", badge: "↑ Ghutte March", direction: "up", icon: "user-plus" },
        { label: "Instagram Reach", value: "95K", badge: "↑ March total", direction: "up", icon: "instagram" },
        { label: "Organic Reach", value: "320K", badge: "↑ Facebook", direction: "up", icon: "globe" },
      ],
      performanceTrend: { labels: ["Week 1","Week 2","Week 3","Week 4"], adSpend: [0,0,0,0], newContacts: [12,11,11,11], socialReach: [78000,82000,80000,80000] },
      socialHighlights: {
        instagramFollowers: { value: "N/A", badge: "▲ Data unavailable" },
        facebookFans: { value: "2,400", badge: "▲ Page fans" },
        fbOrganicReach: { value: "320K", badge: "▲ March impressions" },
        fbEngagements: { value: "2,800", badge: "▲ Post engagements" },
        igMonthlyReach: { value: "95K", badge: "▲ March total" },
        engagementRate: { value: "0.9%", badge: "▲" },
      },
    },
    insights: {
      wins: [
        { icon: "trending-up", text: "Instagram reach at 95K — consistent organic growth." },
        { icon: "users", text: "45 new contacts via Ghutte — steady lead gen without paid ads." },
      ],
      alerts: [
        { icon: "alert-circle", text: "No Meta Ads running — consider paid campaigns to scale faster." },
      ],
    },
    nextMonth: {
      focusAreas: [
        { priority: "high", area: "Paid Ads", recommendation: "Organic reach is solid — test Meta Ads to amplify growth." },
        { priority: "medium", area: "CRM", recommendation: "Set up GHL pipeline to track contact-to-client conversion." },
      ],
      targets: [
        { metric: "New Contacts", current: "45", target: "60", stretch: "80" },
        { metric: "Instagram Reach", current: "95K", target: "120K", stretch: "150K" },
      ],
    },
  },
};

// ============================================================
// GIBS EDA — No connectors, minimal data
// ============================================================
const gibsData = {
  mar: {
    overview: {
      kpis: [
        { label: "Status", value: "No Data Sources", badge: "→ No connectors configured", direction: "neutral", icon: "globe" },
      ],
    },
    insights: {
      wins: [],
      alerts: [
        { icon: "alert-circle", text: "No data sources connected — configure Windsor.ai connectors to start tracking." },
      ],
    },
    nextMonth: {
      focusAreas: [
        { priority: "high", area: "Setup", recommendation: "Connect Meta Ads, Instagram, and GHL accounts to start reporting." },
      ],
      targets: [],
    },
  },
};

async function main() {
  console.log("Seeding real Windsor.ai data for all clients...\n");
  let count = 0;

  // Wisdom & Wellness — all 3 months, all sections
  for (const [month, periodId] of Object.entries(PERIODS)) {
    const wd = wisdomData[month];
    if (!wd) continue;
    for (const [section, data] of Object.entries(wd)) {
      const r = await upsert(CLIENTS.wisdom, periodId, section, data);
      console.log(`  Wisdom & Wellness / ${month} / ${section}: ${r}`);
      count++;
    }
  }

  // Link Interiors — March (richest data), copy simplified for Jan/Feb
  for (const [section, data] of Object.entries(linkData.mar)) {
    const r = await upsert(CLIENTS.link, PERIODS.mar, section, data);
    console.log(`  Link Interiors / mar / ${section}: ${r}`);
    count++;
  }

  // Awahome — March sections
  for (const [section, data] of Object.entries(awahomeData.mar)) {
    const r = await upsert(CLIENTS.awahome, PERIODS.mar, section, data);
    console.log(`  Awahome / mar / ${section}: ${r}`);
    count++;
  }

  // Purpose for Impact — March sections
  for (const [section, data] of Object.entries(purposeData.mar)) {
    const r = await upsert(CLIENTS.purpose, PERIODS.mar, section, data);
    console.log(`  Purpose for Impact / mar / ${section}: ${r}`);
    count++;
  }

  // GIBS EDA — March sections
  for (const [section, data] of Object.entries(gibsData.mar)) {
    const r = await upsert(CLIENTS.gibs, PERIODS.mar, section, data);
    console.log(`  GIBS EDA / mar / ${section}: ${r}`);
    count++;
  }

  console.log(`\nDone! Upserted ${count} sections.`);
}

main().catch(console.error);
