// FULL SYNC: All clients × All months × All sections
// Uses REAL verified data from Windsor.ai and Paystack APIs

const SRK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bGZtcXB3dWFwaXl2dWJsdmFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTE2NDQwOCwiZXhwIjoyMDkwNzQwNDA4fQ.iy29-rZSnFfKvyGANlxWhgB6ypW238VEqsOXEYLSkEA";
const BASE = "https://xwlfmqpwuapiyvublvaa.supabase.co/rest/v1";
const headers = { "apikey": SRK, "Authorization": `Bearer ${SRK}`, "Content-Type": "application/json" };

const PERIODS = { jan: "afea8d89-40b4-4365-9e2e-1dd8670e90ec", feb: "b3e06b4e-848f-4dcc-a8fb-bd99fe011dbf", mar: "11971982-7a97-48ae-8a3e-b97e34c02c54" };

async function upsert(clientId, periodId, section, data) {
  const patchRes = await fetch(`${BASE}/dashboard_data?client_id=eq.${clientId}&period_id=eq.${periodId}&section=eq.${section}`, {
    method: "PATCH", headers: { ...headers, "Prefer": "return=representation" },
    body: JSON.stringify({ data, updated_at: new Date().toISOString() }),
  });
  const patchData = await patchRes.json();
  if (Array.isArray(patchData) && patchData.length > 0) return "updated";
  const postRes = await fetch(`${BASE}/dashboard_data`, {
    method: "POST", headers,
    body: JSON.stringify({ client_id: clientId, period_id: periodId, section, data }),
  });
  return postRes.status === 201 ? "created" : `err:${postRes.status}`;
}

function fmt(n) { return n >= 1000000 ? `${(n/1000000).toFixed(2)}M` : n >= 10000 ? `${(n/1000).toFixed(1)}K` : n.toLocaleString(); }
function fmtR(n) { return `R ${n.toLocaleString()}`; }
function pct(a, b) { return b === 0 ? "—" : `${a > b ? "+" : ""}${(((a-b)/b)*100).toFixed(0)}%`; }

// ===================== VERIFIED DATA =====================

const data = {
  // Client IDs
  csi: "0a9476d1-5a5a-4f4b-b213-8c9528587b37",
  awa: "5529a26b-fe9f-4e8c-967c-12828dcbba7d",
  link: "e5555d53-77ed-43fe-995b-d96ce6e772a7",
  pal: "9bd71d9b-e419-46a8-bb29-6155174b5d46",
  pur: "33d1c611-d00f-4f32-b3ad-2a4e94a9437c",
  ww: "eb1d354f-d57f-4730-9cfb-6f057b83ee08",
  gibs: "bccee066-354d-4bcd-b46c-bd44da65f016",

  // Instagram followers (current)
  igFollowers: { csi: "18,095", awa: "74,475", link: "113,759", pal: "19,372", pur: "1,103", ww: "162,070" },

  // Facebook Organic: { client: { month: { fans, impressions, engagements } } }
  fb: {
    csi: { jan: { fans: 2915, imp: 9017, eng: 665 }, feb: { fans: 2970, imp: 4433, eng: 303 }, mar: { fans: 2990, imp: 76433, eng: 3465 } },
    awa: { jan: { fans: 6555, imp: 255844, eng: 10047 }, feb: { fans: 6761, imp: 251361, eng: 11939 }, mar: { fans: 6890, imp: 240789, eng: 10410 } },
    link: { jan: { fans: 8231, imp: 614011, eng: 12148 }, feb: { fans: 8580, imp: 747882, eng: 14853 }, mar: { fans: 8981, imp: 685871, eng: 12340 } },
    pal: { jan: { fans: 15651, imp: 940647, eng: 22098 }, feb: { fans: 16063, imp: 1896178, eng: 37497 }, mar: { fans: 16626, imp: 1829680, eng: 38319 } },
    pur: { jan: { fans: 142, imp: 536, eng: 114 }, feb: { fans: 143, imp: 249, eng: 36 }, mar: { fans: 145, imp: 400, eng: 22 } },
    ww: { jan: { fans: 109, imp: 19, eng: 0 }, feb: { fans: 109, imp: 214, eng: 0 }, mar: { fans: 204, imp: 43725, eng: 2260 } },
  },

  // Instagram Reach: { client: { month: reach } }
  ig: {
    csi: { jan: 29576, feb: 22054, mar: 54394 },
    awa: { jan: 73593, feb: 69129, mar: 112210 },
    link: { jan: 400828, feb: 517267, mar: 490993 },
    pal: { jan: 277901, feb: 217964, mar: 250290 },
    pur: { jan: 20579, feb: 4142, mar: 7323 },
    ww: { jan: 481661, feb: 921554, mar: 2353016 },
  },

  // Meta Ads: { client: { month: { spend, impressions, clicks, reach } } }
  ads: {
    csi: { jan: null, feb: null, mar: { spend: 4290, imp: 52889, clicks: 3588, reach: 28451, campaigns: [{ name: "Content Day March 2026", spend: 2250 }, { name: "Content Day April 2026", spend: 2041 }] } },
    awa: {
      jan: { spend: 8742, imp: 245909, clicks: 10811, reach: 130011 },
      feb: { spend: 11122, imp: 240301, clicks: 13201, reach: 93825 },
      mar: { spend: 6340, imp: 130112, clicks: 8227, reach: 55242, campaigns: [{ name: "New Engagement campaign", spend: 3928 }, { name: "New Sales campaign Direct to Web", spend: 2412 }] },
    },
    link: {
      jan: { spend: 9238, imp: 141275, clicks: 5450, reach: 58366 },
      feb: { spend: 12989, imp: 180013, clicks: 7221, reach: 91119 },
      mar: { spend: 13395, imp: 152700, clicks: 7609, reach: 79876, campaigns: [{ name: "December 2025 Ads", spend: 3883 }, { name: "AirBnB Ad Campaign", spend: 3230 }, { name: "Dining Set Ad Campaign", spend: 3143 }, { name: "February Ads 2026", spend: 3139 }] },
    },
    pal: {
      jan: { spend: 22647, imp: 1091440, clicks: 26698, reach: 754112 },
      feb: { spend: 20103, imp: 974182, clicks: 23606, reach: 645752 },
      mar: { spend: 39160, imp: 1246408, clicks: 28566, reach: 769393, campaigns: [{ name: "Free Speaking Challenge", spend: 10010 }, { name: "Speak to get Promoted", spend: 7752 }, { name: "7 Day Challenge", spend: 7754 }, { name: "Unignorable Presence webinar", spend: 6414 }, { name: "Webinar English", spend: 5049 }, { name: "Brand awareness", spend: 1557 }, { name: "Retarget Confidence to speak", spend: 623 }] },
    },
    ww: { jan: null, feb: null, mar: null },
  },

  // Paystack: { client: { month: { revenue, successTxns, failedTxns, abandonedTxns, reversedTxns } } }
  ps: {
    csi: {
      jan: { rev: 18736, success: 64, failed: 123, abandoned: 14, reversed: 0, members: 62, memberBreakdown: "17×R149 + 45×R349" },
      feb: { rev: 21292, success: 54, failed: 110, abandoned: 3, reversed: 2, members: 56, memberBreakdown: "18×R149 + 38×R349" },
      mar: { rev: 24486, success: 59, failed: 128, abandoned: 15, reversed: 0, members: 57, memberBreakdown: "15×R149 + 42×R349" },
      subs: { active: 214, attention: 156, nonRenewing: 26, cancelled: 183 },
      plans: "103×R149 + 111×R349 (memberships only)",
    },
    pal: {
      jan: { rev: 106513, success: 118, failed: 29, abandoned: 114, reversed: 4 },
      feb: { rev: 134438, success: 101, failed: 25, abandoned: 137, reversed: 17 },
      mar: { rev: 116037, success: 112, failed: 32, abandoned: 121, reversed: 4 },
      subs: { active: 28, attention: 20, nonRenewing: 1, cancelled: 22 },
      plans: "31×R2200 IC + 30×R2200 Mastery + 10×R3200 + 9×R2466 + others",
    },
    ww: {
      jan: { rev: 232738, success: 1527, failed: 319, abandoned: 473, reversed: 13, members: 1562, memberBreakdown: "1,562 × R149" },
      feb: { rev: 200554, success: 870, failed: 309, abandoned: 151, reversed: 19, members: 1346, memberBreakdown: "1,346 × R149" },
      mar: { rev: 180886, success: 1193, failed: 419, abandoned: 106, reversed: 13, members: 1214, memberBreakdown: "1,214 × R149" },
      subs: { active: 1550, attention: 422, nonRenewing: 36, cancelled: 2799 },
      plans: "1,550 × R149/month",
    },
  },

  // GHL (Ghutte) Revenue: { client: { month: { rev, txns, label } } }
  ghl: {
    csi: {
      jan: { rev: 61572, txns: 32, label: "32 txns (memberships + invoices)" },
      feb: { rev: 20028, txns: 26, label: "26 txns (memberships + invoices)" },
      mar: { rev: 125145, txns: 34, label: "34 txns (memberships + invoices)" },
    },
    awa: { jan: { rev: 0, txns: 0, label: "" }, feb: { rev: 0, txns: 0, label: "" }, mar: { rev: 0, txns: 0, label: "" } },
    link: {
      jan: { rev: 199520, txns: 16, label: "16 txns (design projects + orders)" },
      feb: { rev: 1047024, txns: 18, label: "18 txns (incl. R700K project)" },
      mar: { rev: 808728, txns: 27, label: "27 txns (projects + orders)" },
    },
    pal: { jan: { rev: 0, txns: 0, label: "" }, feb: { rev: 0, txns: 0, label: "" }, mar: { rev: 0, txns: 0, label: "" } },
    pur: { jan: { rev: 0, txns: 0, label: "" }, feb: { rev: 0, txns: 0, label: "" }, mar: { rev: 0, txns: 0, label: "" } },
    ww: {
      jan: { rev: 150937, txns: 1013, label: "1,013 new subscribers × R149", isNewSubs: true },
      feb: { rev: 45594, txns: 306, label: "306 new subscribers × R149", isNewSubs: true },
      mar: { rev: 30396, txns: 204, label: "204 new subscribers × R149", isNewSubs: true },
    },
    gibs: { jan: { rev: 0, txns: 0, label: "" }, feb: { rev: 0, txns: 0, label: "" }, mar: { rev: 0, txns: 0, label: "" } },
  },
};

function buildOverview(clientKey, month, prevMonth) {
  const c = clientKey;
  const fb = data.fb[c]?.[month];
  const ig = data.ig[c]?.[month];
  const igPrev = prevMonth ? data.ig[c]?.[prevMonth] : null;
  const fbPrev = prevMonth ? data.fb[c]?.[prevMonth] : null;
  const ads = data.ads[c]?.[month];
  const adsPrev = prevMonth ? data.ads[c]?.[prevMonth] : null;
  const ps = data.ps[c]?.[month];
  const psPrev = prevMonth ? data.ps[c]?.[prevMonth] : null;
  const ghl = data.ghl[c]?.[month];
  const igF = data.igFollowers[c];

  const kpis = [];

  // Revenue (Paystack if available)
  if (ps) {
    kpis.push({ label: "Paystack Revenue", value: fmtR(ps.rev), badge: `↑ ${ps.success} successful payments`, direction: "up", icon: "dollar" });
  }

  // Ghutte Revenue or New Subscribers
  if (ghl && ghl.rev > 0) {
    if (ghl.isNewSubs) {
      kpis.push({ label: "New Subscribers", value: fmt(ghl.txns), badge: `↑ ${ghl.label}`, direction: "up", icon: "user-plus" });
    } else {
      kpis.push({ label: "Ghutte Revenue", value: fmtR(ghl.rev), badge: `↑ ${ghl.label}`, direction: "up", icon: "dollar" });
    }
  }

  // Ad spend
  if (ads) {
    const badge = adsPrev ? pct(ads.spend, adsPrev.spend) : "→ " + month.charAt(0).toUpperCase() + month.slice(1);
    kpis.push({ label: "Total Ad Spend", value: fmtR(ads.spend), badge, direction: ads.spend > 0 ? "neutral" : "neutral", icon: "target" });
  }

  // Paystack failed
  if (ps && ps.failed > 0) {
    kpis.push({ label: "Failed Payments", value: `${ps.failed} txns`, badge: "↓ Recovery opportunity", direction: "down", icon: "alert-triangle" });
  }

  // Instagram followers
  if (igF) kpis.push({ label: "Instagram Followers", value: igF, badge: "▲ Current", direction: "up", icon: "instagram" });

  // Facebook fans
  if (fb) kpis.push({ label: "Facebook Followers", value: fmt(fb.fans), badge: fbPrev ? pct(fb.fans, fbPrev.fans) : "▲ Page fans", direction: "up", icon: "users" });

  // FB Organic Reach
  if (fb && fb.imp > 0) kpis.push({ label: "FB Organic Reach", value: fmt(fb.imp), badge: fbPrev ? pct(fb.imp, fbPrev.imp) : `▲ ${month} impressions`, direction: "up", icon: "globe" });

  // IG Reach
  if (ig) kpis.push({ label: "IG Monthly Reach", value: fmt(ig), badge: igPrev ? pct(ig, igPrev) : `▲ ${month} total`, direction: "up", icon: "instagram" });

  // Email Leads (Palesa only - Systeme.io total)
  if (c === "pal") kpis.push({ label: "Email Leads", value: "37,145", badge: "↑ Systeme.io total", direction: "up", icon: "mail" });

  const result = { kpis };

  // Paystack section
  if (ps) {
    const psSubs = data.ps[c]?.subs;
    result.paystack = {
      revenue: ps.rev, revenueFormatted: fmtR(ps.rev),
      revenueBadge: `↑ ${ps.success} successful payments`,
      activeMemberships: ps.members || psSubs?.active,
      membershipBreakdown: ps.memberBreakdown || data.ps[c]?.plans || (psSubs ? `${psSubs.active} active` : undefined),
      failedAmount: 0, failedFormatted: `${ps.failed} failed txns`, failedBadge: "↓ Recovery opportunity",
      abandonedAmount: 0, abandonedFormatted: `${ps.abandoned} abandoned`, abandonedBadge: "↓ Checkout not completed",
    };
    result.revenueVsFailedChart = { successful: ps.rev, failed: Math.round(ps.rev * (ps.failed / (ps.success || 1))), abandoned: Math.round(ps.rev * (ps.abandoned / (ps.success || 1))) };
  }

  // Performance trend (3-month)
  const months = ["jan", "feb", "mar"];
  result.performanceTrend = {
    labels: ["Jan 2026", "Feb 2026", "Mar 2026"],
    adSpend: months.map(m => data.ads[c]?.[m]?.spend || 0),
    newContacts: months.map(m => data.ps[c]?.[m]?.success || 0),
    revenue: months.map(m => (data.ps[c]?.[m]?.rev || 0) + (data.ghl[c]?.[m]?.rev || 0)),
  };

  // Campaign spend
  if (ads?.campaigns) result.campaignSpend = ads.campaigns;

  // Social highlights
  if (fb || ig) {
    result.socialHighlights = {
      instagramFollowers: { value: igF || "N/A", badge: "▲ Current followers" },
      facebookFans: { value: fmt(fb?.fans || 0), badge: `▲ ${month} page fans` },
      fbOrganicReach: { value: fmt(fb?.imp || 0), badge: `▲ ${month} impressions` },
      fbEngagements: { value: fmt(fb?.eng || 0), badge: `▲ ${month} engagements` },
      igMonthlyReach: { value: fmt(ig || 0), badge: `▲ ${month} total` },
      engagementRate: { value: fb && fb.imp > 0 ? `${((fb.eng / fb.imp) * 100).toFixed(1)}%` : "0%", badge: "▲" },
    };
  }

  return result;
}

function buildMeta(clientKey, month, prevMonth) {
  const ads = data.ads[clientKey]?.[month];
  if (!ads || ads.spend === 0) return null;
  const prev = prevMonth ? data.ads[clientKey]?.[prevMonth] : null;
  const ctr = ads.imp > 0 ? ((ads.clicks / ads.imp) * 100).toFixed(2) : "0";
  const cpc = ads.clicks > 0 ? (ads.spend / ads.clicks).toFixed(2) : "0";
  return {
    kpis: [
      { label: "Ad Spend", value: fmtR(ads.spend), change: prev ? pct(ads.spend, prev.spend) : "—", direction: "up" },
      { label: "Impressions", value: fmt(ads.imp), change: prev ? pct(ads.imp, prev.imp) : "—", direction: "up" },
      { label: "Clicks", value: fmt(ads.clicks), change: prev ? pct(ads.clicks, prev.clicks) : "—", direction: "up" },
      { label: "CTR", value: `${ctr}%`, change: "—", direction: "neutral" },
      { label: "CPC", value: `R${cpc}`, change: "—", direction: "neutral" },
      { label: "Reach", value: fmt(ads.reach), change: prev ? pct(ads.reach, prev.reach) : "—", direction: "up" },
    ],
    trend: {
      labels: ["Jan 2026", "Feb 2026", "Mar 2026"],
      spend: ["jan", "feb", "mar"].map(m => data.ads[clientKey]?.[m]?.spend || 0),
      impressions: ["jan", "feb", "mar"].map(m => data.ads[clientKey]?.[m]?.imp || 0),
      clicks: ["jan", "feb", "mar"].map(m => data.ads[clientKey]?.[m]?.clicks || 0),
    },
    campaigns: ads.campaigns || [],
  };
}

function buildSocial(clientKey, month) {
  const fb = data.fb[clientKey]?.[month];
  const ig = data.ig[clientKey]?.[month];
  const igF = data.igFollowers[clientKey];
  if (!fb && !ig) return null;
  return {
    kpis: [
      { label: "Instagram Followers", value: igF || "N/A", badge: "▲ Current", direction: "up" },
      { label: "Facebook Followers", value: fmt(fb?.fans || 0), badge: "▲ Page fans", direction: "up" },
      { label: "IG Monthly Reach", value: fmt(ig || 0), badge: `▲ ${month} total`, direction: "up" },
      { label: "FB Organic Reach", value: fmt(fb?.imp || 0), badge: `▲ ${month} impressions`, direction: "up" },
      { label: "FB Engagements", value: fmt(fb?.eng || 0), badge: `▲ ${month} engagements`, direction: "up" },
      { label: "Engagement Rate", value: fb && fb.imp > 0 ? `${((fb.eng / fb.imp) * 100).toFixed(1)}%` : "0%", badge: "▲", direction: "up" },
    ],
    trend: {
      labels: ["Jan 2026", "Feb 2026", "Mar 2026"],
      instagramReach: ["jan", "feb", "mar"].map(m => data.ig[clientKey]?.[m] || 0),
      facebookReach: ["jan", "feb", "mar"].map(m => data.fb[clientKey]?.[m]?.imp || 0),
      followers: ["jan", "feb", "mar"].map(m => data.fb[clientKey]?.[m]?.fans || 0),
    },
  };
}

function buildPaystack(clientKey, month) {
  const ps = data.ps[clientKey]?.[month];
  if (!ps) return null;
  const subs = data.ps[clientKey]?.subs;
  return {
    revenue: ps.rev, revenueFormatted: fmtR(ps.rev),
    kpis: [
      { label: "Paystack Revenue", value: fmtR(ps.rev), badge: `↑ ${ps.success} successful payments`, direction: "up" },
      { label: "Active Memberships", value: ps.members ? fmt(ps.members) : (subs ? fmt(subs.active) : "—"), badge: ps.memberBreakdown || data.ps[clientKey]?.plans || "→ Currently active", direction: "neutral" },
      { label: "Needs Attention", value: subs ? fmt(subs.attention) : "—", badge: "↓ Failed billing", direction: "down" },
      { label: "Failed Payments", value: `${ps.failed} txns`, badge: "↓ Declined transactions", direction: "down" },
      { label: "Abandoned", value: `${ps.abandoned} txns`, badge: "↓ Incomplete checkouts", direction: "down" },
      { label: "Reversed", value: `${ps.reversed} txns`, badge: "→ Reversals", direction: "neutral" },
    ],
    activeMemberships: subs ? { total: subs.active, plans: [] } : undefined,
    transactions: {
      successful: { count: ps.success, amount: ps.rev },
      failed: { count: ps.failed, amount: 0 },
      abandoned: { count: ps.abandoned, amount: 0 },
      reversed: { count: ps.reversed, amount: 0 },
    },
    trend: {
      labels: ["Jan 2026", "Feb 2026", "Mar 2026"],
      revenue: ["jan", "feb", "mar"].map(m => data.ps[clientKey]?.[m]?.rev || 0),
      transactions: ["jan", "feb", "mar"].map(m => data.ps[clientKey]?.[m]?.success || 0),
    },
  };
}

function buildInsights(clientKey, month, prevMonth) {
  const wins = [];
  const alerts = [];
  const fb = data.fb[clientKey]?.[month];
  const fbPrev = prevMonth ? data.fb[clientKey]?.[prevMonth] : null;
  const ig = data.ig[clientKey]?.[month];
  const igPrev = prevMonth ? data.ig[clientKey]?.[prevMonth] : null;
  const ads = data.ads[clientKey]?.[month];
  const ps = data.ps[clientKey]?.[month];

  if (ps && ps.rev > 0) wins.push({ icon: "dollar-sign", text: `Paystack revenue of ${fmtR(ps.rev)} from ${ps.success} successful payments.` });
  if (ig && igPrev && ig > igPrev * 1.1) wins.push({ icon: "trending-up", text: `Instagram reach grew ${pct(ig, igPrev)} to ${fmt(ig)}.` });
  if (fb && fbPrev && fb.imp > fbPrev.imp * 1.1) wins.push({ icon: "trending-up", text: `Facebook reach grew ${pct(fb.imp, fbPrev.imp)} to ${fmt(fb.imp)}.` });
  if (ads && ads.spend > 0) wins.push({ icon: "trending-up", text: `Meta Ads delivered ${fmt(ads.reach)} reach at R${(ads.spend / ads.clicks).toFixed(2)} CPC.` });

  if (ps && ps.failed > ps.success * 0.5) alerts.push({ icon: "alert-triangle", text: `${ps.failed} failed payments — high failure rate vs ${ps.success} successful. Investigate card issues.` });
  if (ps && ps.abandoned > 20) alerts.push({ icon: "alert-circle", text: `${ps.abandoned} abandoned checkouts — optimize checkout flow.` });
  if (ig && igPrev && ig < igPrev * 0.9) alerts.push({ icon: "alert-circle", text: `Instagram reach declined ${pct(ig, igPrev)} — review content strategy.` });

  if (wins.length === 0) wins.push({ icon: "trending-up", text: "Data synced for this period." });

  return { wins, alerts };
}

function buildNextMonth(clientKey, month) {
  const ps = data.ps[clientKey]?.[month];
  const ads = data.ads[clientKey]?.[month];
  const psSubs = data.ps[clientKey]?.subs;

  const focusAreas = [];
  if (psSubs && psSubs.attention > 10) focusAreas.push({ priority: "high", area: "Payment Recovery", recommendation: `${psSubs.attention} subscriptions need attention — set up dunning emails and card retry.` });
  if (ps && ps.abandoned > 20) focusAreas.push({ priority: "high", area: "Checkout Optimization", recommendation: `${ps.abandoned} abandoned checkouts last month — simplify payment flow.` });
  if (!ads || ads.spend === 0) focusAreas.push({ priority: "medium", area: "Paid Ads", recommendation: "No active Meta Ads — consider launching campaigns to drive growth." });
  if (ads && ads.spend > 0) focusAreas.push({ priority: "medium", area: "Ad Optimization", recommendation: "Review ad performance and test new creatives." });
  focusAreas.push({ priority: "low", area: "Content", recommendation: "Maintain organic posting schedule for consistent reach growth." });

  return { focusAreas, targets: [] };
}

async function main() {
  const clients = [
    { key: "csi", id: data.csi, name: "Club She Is" },
    { key: "awa", id: data.awa, name: "Awahome" },
    { key: "link", id: data.link, name: "Link Interiors" },
    { key: "pal", id: data.pal, name: "Palesa Dooms" },
    { key: "pur", id: data.pur, name: "Purpose for Impact" },
    { key: "ww", id: data.ww, name: "Wisdom & Wellness" },
    { key: "gibs", id: data.gibs, name: "GIBS EDA" },
  ];

  const months = [
    { key: "jan", periodId: PERIODS.jan, prev: null },
    { key: "feb", periodId: PERIODS.feb, prev: "jan" },
    { key: "mar", periodId: PERIODS.mar, prev: "feb" },
  ];

  let total = 0;
  for (const client of clients) {
    console.log(`\n=== ${client.name} ===`);
    for (const month of months) {
      const sections = {};

      // Overview
      sections.overview = buildOverview(client.key, month.key, month.prev);

      // Meta Ads
      const meta = buildMeta(client.key, month.key, month.prev);
      if (meta) sections.meta = meta;

      // Social
      const social = buildSocial(client.key, month.key);
      if (social) sections.social = social;

      // Paystack
      const paystack = buildPaystack(client.key, month.key);
      if (paystack) sections.paystack = paystack;

      // Insights
      sections.insights = buildInsights(client.key, month.key, month.prev);

      // Next Month
      sections.nextMonth = buildNextMonth(client.key, month.key);

      // Upsert all sections
      for (const [section, sData] of Object.entries(sections)) {
        const r = await upsert(client.id, month.periodId, section, sData);
        process.stdout.write(`.`);
        total++;
      }
      console.log(` ${month.key}: ${Object.keys(sections).length} sections`);
    }
  }

  console.log(`\nDone! Upserted ${total} sections total.`);
}

main().catch(console.error);
