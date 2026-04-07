const SRK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bGZtcXB3dWFwaXl2dWJsdmFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTE2NDQwOCwiZXhwIjoyMDkwNzQwNDA4fQ.iy29-rZSnFfKvyGANlxWhgB6ypW238VEqsOXEYLSkEA";
const BASE = "https://xwlfmqpwuapiyvublvaa.supabase.co/rest/v1";
const headers = { "apikey": SRK, "Authorization": `Bearer ${SRK}`, "Content-Type": "application/json" };
const P = { jan: "afea8d89-40b4-4365-9e2e-1dd8670e90ec", feb: "b3e06b4e-848f-4dcc-a8fb-bd99fe011dbf", mar: "11971982-7a97-48ae-8a3e-b97e34c02c54" };

function fmt(n) { return n >= 1000000 ? `${(n/1000000).toFixed(2)}M` : n >= 10000 ? `${(n/1000).toFixed(1)}K` : n.toLocaleString(); }
function pct(a,b) { return b===0 ? "—" : `${a>b?"+":""}${(((a-b)/b)*100).toFixed(0)}%`; }

// All verified campaign data from Windsor
const metaData = {
  // Club She Is
  "0a9476d1-5a5a-4f4b-b213-8c9528587b37": {
    jan: null, feb: null,
    mar: { spend: 4290, imp: 52889, clicks: 3588, reach: 28451, campaigns: [
      { name: "Content Day March 2026", spend: 2250, impressions: 38890, clicks: 2889, ctr: "7.43%", cpc: "R0.78", reach: 23333 },
      { name: "Content Day April 2026", spend: 2041, impressions: 13999, clicks: 699, ctr: "4.99%", cpc: "R2.92", reach: 5118 },
    ]},
  },
  // Awahome
  "5529a26b-fe9f-4e8c-967c-12828dcbba7d": {
    jan: { spend: 8742, imp: 245909, clicks: 10811, reach: 130011, campaigns: [
      { name: "New Engagement campaign", spend: 2552, impressions: 79220, clicks: 3825, ctr: "4.83%", cpc: "R0.67", reach: 43480 },
      { name: "Awa Home Evergreen ads", spend: 2767, impressions: 73960, clicks: 3558, ctr: "4.81%", cpc: "R0.78", reach: 41117 },
      { name: "New Sales campaign Direct to Web", spend: 1565, impressions: 24503, clicks: 1902, ctr: "7.76%", cpc: "R0.82", reach: 10636 },
      { name: "February_Ad Campaign", spend: 1015, impressions: 26278, clicks: 1059, ctr: "4.03%", cpc: "R0.96", reach: 15552 },
      { name: "Sales Season 10 Dec-10 Jan25", spend: 843, impressions: 41948, clicks: 467, ctr: "1.11%", cpc: "R1.81", reach: 19226 },
    ]},
    feb: { spend: 11122, imp: 240301, clicks: 13201, reach: 93825, campaigns: [
      { name: "New Engagement campaign", spend: 6932, impressions: 175618, clicks: 8906, ctr: "5.07%", cpc: "R0.78", reach: 68711 },
      { name: "New Sales campaign Direct to Web", spend: 4190, impressions: 64683, clicks: 4295, ctr: "6.64%", cpc: "R0.98", reach: 25114 },
    ]},
    mar: { spend: 6340, imp: 130112, clicks: 8227, reach: 55242, campaigns: [
      { name: "New Engagement campaign", spend: 3928, impressions: 92149, clicks: 5507, ctr: "5.98%", cpc: "R0.71", reach: 38609 },
      { name: "New Sales campaign Direct to Web", spend: 2412, impressions: 37963, clicks: 2720, ctr: "7.17%", cpc: "R0.89", reach: 16633 },
    ]},
  },
  // Link Interiors
  "e5555d53-77ed-43fe-995b-d96ce6e772a7": {
    jan: { spend: 9238, imp: 141275, clicks: 5450, reach: 58366, campaigns: [
      { name: "December 2025 Ads", spend: 9238, impressions: 141275, clicks: 5450, ctr: "3.86%", cpc: "R1.70", reach: 58366 },
    ]},
    feb: { spend: 12989, imp: 180013, clicks: 7221, reach: 91119, campaigns: [
      { name: "December 2025 Ads", spend: 8381, impressions: 120596, clicks: 4394, ctr: "3.64%", cpc: "R1.91", reach: 56787 },
      { name: "February Ads 2026", spend: 1536, impressions: 22479, clicks: 1174, ctr: "5.22%", cpc: "R1.31", reach: 13685 },
      { name: "Dining Set Ad Campaign", spend: 1537, impressions: 19522, clicks: 950, ctr: "4.87%", cpc: "R1.62", reach: 10647 },
      { name: "AirBnB Ad Campaign", spend: 1535, impressions: 17416, clicks: 703, ctr: "4.04%", cpc: "R2.18", reach: 10000 },
    ]},
    mar: { spend: 13395, imp: 152700, clicks: 7609, reach: 79876, campaigns: [
      { name: "December 2025 Ads", spend: 3883, impressions: 56856, clicks: 2099, ctr: "3.69%", cpc: "R1.85", reach: 29513 },
      { name: "February Ads 2026", spend: 3139, impressions: 37473, clicks: 2419, ctr: "6.46%", cpc: "R1.30", reach: 21727 },
      { name: "Dining Set Ad Campaign", spend: 3143, impressions: 32249, clicks: 1821, ctr: "5.65%", cpc: "R1.73", reach: 15127 },
      { name: "AirBnB Ad Campaign", spend: 3230, impressions: 26122, clicks: 1270, ctr: "4.86%", cpc: "R2.54", reach: 13509 },
    ]},
  },
  // Palesa Dooms
  "9bd71d9b-e419-46a8-bb29-6155174b5d46": {
    jan: { spend: 22647, imp: 1091440, clicks: 26698, reach: 754112, campaigns: [
      { name: "Speak to get Promoted", spend: 7151, impressions: 250421, clicks: 10617, ctr: "4.24%", cpc: "R0.67", reach: 161445 },
      { name: "7 Day Challenge", spend: 7186, impressions: 107223, clicks: 3676, ctr: "3.43%", cpc: "R1.95", reach: 34237 },
      { name: "Webinar English", spend: 4326, impressions: 127951, clicks: 5994, ctr: "4.68%", cpc: "R0.72", reach: 53793 },
      { name: "Brand awareness", spend: 1398, impressions: 427299, clicks: 2212, ctr: "0.52%", cpc: "R0.63", reach: 378161 },
      { name: "Articulate to Get Hired", spend: 1298, impressions: 25732, clicks: 2497, ctr: "9.70%", cpc: "R0.52", reach: 18750 },
      { name: "Whatsapp for English VN", spend: 719, impressions: 15782, clicks: 876, ctr: "5.55%", cpc: "R0.82", reach: 10531 },
      { name: "Retarget Confidence to speak", spend: 569, impressions: 137032, clicks: 826, ctr: "0.60%", cpc: "R0.69", reach: 97195 },
    ]},
    feb: { spend: 20103, imp: 974182, clicks: 23606, reach: 645752, campaigns: [
      { name: "Speak to get Promoted", spend: 6996, impressions: 206776, clicks: 9583, ctr: "4.63%", cpc: "R0.73", reach: 126524 },
      { name: "7 Day Challenge", spend: 6958, impressions: 106083, clicks: 3320, ctr: "3.13%", cpc: "R2.10", reach: 33922 },
      { name: "Webinar English", spend: 3992, impressions: 129398, clicks: 6116, ctr: "4.73%", cpc: "R0.65", reach: 55955 },
      { name: "Brand awareness", spend: 1399, impressions: 423410, clicks: 3922, ctr: "0.93%", cpc: "R0.36", reach: 352162 },
      { name: "Retarget Confidence to speak", spend: 560, impressions: 106179, clicks: 593, ctr: "0.56%", cpc: "R0.94", reach: 75694 },
      { name: "Whatsapp for English VN", spend: 198, impressions: 2336, clicks: 72, ctr: "3.08%", cpc: "R2.74", reach: 1495 },
    ]},
    mar: { spend: 39160, imp: 1246408, clicks: 28566, reach: 769393, campaigns: [
      { name: "Free Speaking Challenge", spend: 10010, impressions: 254793, clicks: 5492, ctr: "2.16%", cpc: "R1.82", reach: 93999 },
      { name: "7 Day Challenge", spend: 7754, impressions: 106008, clicks: 3347, ctr: "3.16%", cpc: "R2.32", reach: 41312 },
      { name: "Speak to get Promoted", spend: 7752, impressions: 209414, clicks: 9336, ctr: "4.46%", cpc: "R0.83", reach: 115513 },
      { name: "Unignorable Presence webinar", spend: 6414, impressions: 61369, clicks: 3684, ctr: "6.00%", cpc: "R1.74", reach: 24911 },
      { name: "Webinar English", spend: 5049, impressions: 60843, clicks: 2268, ctr: "3.73%", cpc: "R2.23", reach: 26067 },
      { name: "Brand awareness", spend: 1557, impressions: 437248, clicks: 3709, ctr: "0.85%", cpc: "R0.42", reach: 384527 },
      { name: "Retarget Confidence to speak", spend: 623, impressions: 116733, clicks: 730, ctr: "0.63%", cpc: "R0.85", reach: 83064 },
    ]},
  },
};

async function upsert(clientId, periodId, section, data) {
  const r = await fetch(`${BASE}/dashboard_data?client_id=eq.${clientId}&period_id=eq.${periodId}&section=eq.${section}`, {
    method: "PATCH", headers: { ...headers, "Prefer": "return=representation" },
    body: JSON.stringify({ data, updated_at: new Date().toISOString() }),
  });
  const d = await r.json();
  if (Array.isArray(d) && d.length > 0) return "updated";
  await fetch(`${BASE}/dashboard_data`, { method: "POST", headers,
    body: JSON.stringify({ client_id: clientId, period_id: periodId, section, data }) });
  return "created";
}

async function main() {
  const allSpend = { jan: [], feb: [], mar: [] };
  const allImp = { jan: [], feb: [], mar: [] };
  const allClicks = { jan: [], feb: [], mar: [] };

  for (const [clientId, months] of Object.entries(metaData)) {
    for (const [mk, d] of Object.entries(months)) {
      if (!d) continue;
      allSpend[mk].push(d.spend);
      allImp[mk].push(d.imp);
      allClicks[mk].push(d.clicks);

      const prev = mk === "feb" ? months.jan : mk === "mar" ? months.feb : null;
      const ctr = d.imp > 0 ? ((d.clicks / d.imp) * 100).toFixed(2) : "0";
      const cpc = d.clicks > 0 ? (d.spend / d.clicks).toFixed(2) : "0";

      const meta = {
        kpis: [
          { label: "Ad Spend", value: `R ${d.spend.toLocaleString()}`, change: prev ? pct(d.spend, prev.spend) : "—", direction: "up" },
          { label: "Impressions", value: fmt(d.imp), change: prev ? pct(d.imp, prev.imp) : "—", direction: "up" },
          { label: "Clicks", value: fmt(d.clicks), change: prev ? pct(d.clicks, prev.clicks) : "—", direction: "up" },
          { label: "CTR", value: `${ctr}%`, change: "—", direction: "neutral" },
          { label: "CPC", value: `R${cpc}`, change: "—", direction: "neutral" },
          { label: "Reach", value: fmt(d.reach), change: prev ? pct(d.reach, prev.reach) : "—", direction: "up" },
        ],
        trend: {
          labels: ["Jan 2026", "Feb 2026", "Mar 2026"],
          spend: ["jan","feb","mar"].map(m => metaData[clientId]?.[m]?.spend || 0),
          impressions: ["jan","feb","mar"].map(m => metaData[clientId]?.[m]?.imp || 0),
          clicks: ["jan","feb","mar"].map(m => metaData[clientId]?.[m]?.clicks || 0),
        },
        campaigns: d.campaigns,
      };

      const r = await upsert(clientId, P[mk], "meta", meta);
      process.stdout.write(".");
    }
    console.log(` ${clientId.slice(0,8)}`);
  }
  console.log("\nDone!");
}

main().catch(console.error);
