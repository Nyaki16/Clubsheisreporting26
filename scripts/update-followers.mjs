const SRK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bGZtcXB3dWFwaXl2dWJsdmFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTE2NDQwOCwiZXhwIjoyMDkwNzQwNDA4fQ.iy29-rZSnFfKvyGANlxWhgB6ypW238VEqsOXEYLSkEA";
const BASE = "https://xwlfmqpwuapiyvublvaa.supabase.co/rest/v1";
const headers = { "apikey": SRK, "Authorization": `Bearer ${SRK}`, "Content-Type": "application/json" };
const MAR = "11971982-7a97-48ae-8a3e-b97e34c02c54";

const followers = {
  "0a9476d1-5a5a-4f4b-b213-8c9528587b37": { ig: "18,093", fb: "2,990", igReach: "50.4K", fbReach: "76.3K", fbEngage: "3,600", engRate: "4.7%" },
  "5529a26b-fe9f-4e8c-967c-12828dcbba7d": { ig: "74,474", fb: "6,890", igReach: "112.4K", fbReach: "240.6K", fbEngage: "10,310", engRate: "4.3%" },
  "e5555d53-77ed-43fe-995b-d96ce6e772a7": { ig: "113,760", fb: "8,981", igReach: "490.9K", fbReach: "665.9K", fbEngage: "11,766", engRate: "1.8%" },
  "9bd71d9b-e419-46a8-bb29-6155174b5d46": { ig: "19,366", fb: "16,626", igReach: "246.2K", fbReach: "1.86M", fbEngage: "38,318", engRate: "2.1%" },
  "33d1c611-d00f-4f32-b3ad-2a4e94a9437c": { ig: "1,103", fb: "145", igReach: "7.5K", fbReach: "399", fbEngage: "22", engRate: "5.5%" },
  "eb1d354f-d57f-4730-9cfb-6f057b83ee08": { ig: "162,054", fb: "204", igReach: "2.31M", fbReach: "44K", fbEngage: "2,260", engRate: "5.1%" },
};

async function main() {
  for (const [clientId, d] of Object.entries(followers)) {
    // Build social section with followers
    const social = {
      kpis: [
        { label: "Instagram Followers", value: d.ig, badge: "▲ Current", direction: "up" },
        { label: "Facebook Followers", value: d.fb, badge: "▲ Page fans", direction: "up" },
        { label: "IG Monthly Reach", value: d.igReach, badge: "▲ March total", direction: "up" },
        { label: "FB Organic Reach", value: d.fbReach, badge: "▲ March impressions", direction: "up" },
        { label: "FB Engagements", value: d.fbEngage, badge: "▲ Post engagements", direction: "up" },
        { label: "Engagement Rate", value: d.engRate, badge: "▲", direction: "up" },
      ],
    };

    // Update social section
    let res = await fetch(`${BASE}/dashboard_data?client_id=eq.${clientId}&period_id=eq.${MAR}&section=eq.social`, {
      method: "PATCH", headers: { ...headers, "Prefer": "return=minimal" },
      body: JSON.stringify({ data: social }),
    });
    console.log(`${clientId} social: ${res.status}`);

    // Update overview socialHighlights with followers
    const ovRes = await fetch(`${BASE}/dashboard_data?client_id=eq.${clientId}&period_id=eq.${MAR}&section=eq.overview&select=data`, { headers });
    const rows = await ovRes.json();
    if (rows.length > 0) {
      const current = rows[0].data;
      current.socialHighlights = {
        instagramFollowers: { value: d.ig, badge: "▲ Current followers" },
        facebookFans: { value: d.fb, badge: "▲ Page followers" },
        fbOrganicReach: { value: d.fbReach, badge: "▲ March impressions" },
        fbEngagements: { value: d.fbEngage, badge: "▲ Post engagements" },
        igMonthlyReach: { value: d.igReach, badge: "▲ March total" },
        engagementRate: { value: d.engRate, badge: "▲" },
      };
      res = await fetch(`${BASE}/dashboard_data?client_id=eq.${clientId}&period_id=eq.${MAR}&section=eq.overview`, {
        method: "PATCH", headers: { ...headers, "Prefer": "return=minimal" },
        body: JSON.stringify({ data: current }),
      });
      console.log(`${clientId} overview: ${res.status}`);
    }
  }
  console.log("Done!");
}

main().catch(console.error);
