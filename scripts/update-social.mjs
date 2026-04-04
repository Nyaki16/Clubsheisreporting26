const SRK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bGZtcXB3dWFwaXl2dWJsdmFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTE2NDQwOCwiZXhwIjoyMDkwNzQwNDA4fQ.iy29-rZSnFfKvyGANlxWhgB6ypW238VEqsOXEYLSkEA";
const BASE = "https://xwlfmqpwuapiyvublvaa.supabase.co/rest/v1";
const headers = { "apikey": SRK, "Authorization": `Bearer ${SRK}`, "Content-Type": "application/json" };
const MAR = "11971982-7a97-48ae-8a3e-b97e34c02c54";

async function patch(clientId, periodId, section, data) {
  const r = await fetch(`${BASE}/dashboard_data?client_id=eq.${clientId}&period_id=eq.${periodId}&section=eq.${section}`, {
    method: "PATCH", headers: { ...headers, "Prefer": "return=minimal" },
    body: JSON.stringify({ data }),
  });
  return r.status;
}

const socialData = {
  // Club She Is
  "0a9476d1-5a5a-4f4b-b213-8c9528587b37": {
    social: {
      kpis: [
        { label: "Instagram Reach", value: "50.4K", badge: "▲ March total", direction: "up" },
        { label: "Facebook Fans", value: "2,990", badge: "▲ Page fans", direction: "up" },
        { label: "FB Organic Reach", value: "76.3K", badge: "▲ March impressions", direction: "up" },
        { label: "FB Engagements", value: "3,600", badge: "▲ Post engagements", direction: "up" },
      ],
    },
    highlights: {
      instagramFollowers: { value: "N/A", badge: "▲ Followers unavailable via API" },
      facebookFans: { value: "2,990", badge: "▲ Page fans" },
      fbOrganicReach: { value: "76.3K", badge: "▲ March impressions" },
      fbEngagements: { value: "3,600", badge: "▲ Post engagements" },
      igMonthlyReach: { value: "50.4K", badge: "▲ March total" },
      engagementRate: { value: "4.7%", badge: "▲" },
    },
  },
  // Awahome
  "5529a26b-fe9f-4e8c-967c-12828dcbba7d": {
    social: {
      kpis: [
        { label: "Instagram Reach", value: "112.4K", badge: "▲ March total", direction: "up" },
        { label: "Facebook Fans", value: "6,890", badge: "▲ Page fans", direction: "up" },
        { label: "FB Organic Reach", value: "240.6K", badge: "▲ March impressions", direction: "up" },
        { label: "FB Engagements", value: "10,310", badge: "▲ Post engagements", direction: "up" },
      ],
    },
    highlights: {
      instagramFollowers: { value: "N/A", badge: "▲ Followers unavailable via API" },
      facebookFans: { value: "6,890", badge: "▲ Page fans" },
      fbOrganicReach: { value: "240.6K", badge: "▲ March impressions" },
      fbEngagements: { value: "10,310", badge: "▲ Post engagements" },
      igMonthlyReach: { value: "112.4K", badge: "▲ March total" },
      engagementRate: { value: "4.3%", badge: "▲" },
    },
  },
  // Link Interiors
  "e5555d53-77ed-43fe-995b-d96ce6e772a7": {
    social: {
      kpis: [
        { label: "Instagram Reach", value: "490.9K", badge: "▲ March total", direction: "up" },
        { label: "Facebook Fans", value: "8,981", badge: "▲ Page fans", direction: "up" },
        { label: "FB Organic Reach", value: "665.9K", badge: "▲ March impressions", direction: "up" },
        { label: "FB Engagements", value: "11,766", badge: "▲ Post engagements", direction: "up" },
      ],
    },
    highlights: {
      instagramFollowers: { value: "N/A", badge: "▲ Followers unavailable via API" },
      facebookFans: { value: "8,981", badge: "▲ Page fans" },
      fbOrganicReach: { value: "665.9K", badge: "▲ March impressions" },
      fbEngagements: { value: "11,766", badge: "▲ Post engagements" },
      igMonthlyReach: { value: "490.9K", badge: "▲ March total" },
      engagementRate: { value: "1.8%", badge: "▲" },
    },
  },
  // Palesa Dooms
  "9bd71d9b-e419-46a8-bb29-6155174b5d46": {
    social: {
      kpis: [
        { label: "Instagram Reach", value: "246.2K", badge: "▲ March total", direction: "up" },
        { label: "Facebook Fans", value: "16,626", badge: "▲ Page fans", direction: "up" },
        { label: "FB Organic Reach", value: "1.86M", badge: "▲ March impressions", direction: "up" },
        { label: "FB Engagements", value: "38,318", badge: "▲ Post engagements", direction: "up" },
      ],
    },
    highlights: {
      instagramFollowers: { value: "N/A", badge: "▲ Followers unavailable via API" },
      facebookFans: { value: "16,626", badge: "▲ Page fans" },
      fbOrganicReach: { value: "1.86M", badge: "▲ March impressions" },
      fbEngagements: { value: "38,318", badge: "▲ Post engagements" },
      igMonthlyReach: { value: "246.2K", badge: "▲ March total" },
      engagementRate: { value: "2.1%", badge: "▲" },
    },
  },
  // Purpose for Impact
  "33d1c611-d00f-4f32-b3ad-2a4e94a9437c": {
    social: {
      kpis: [
        { label: "Instagram Reach", value: "7.5K", badge: "▲ March total", direction: "up" },
        { label: "Facebook Fans", value: "145", badge: "→ Page fans", direction: "neutral" },
        { label: "FB Organic Reach", value: "399", badge: "→ March impressions", direction: "neutral" },
        { label: "FB Engagements", value: "22", badge: "→ Post engagements", direction: "neutral" },
      ],
    },
    highlights: {
      instagramFollowers: { value: "N/A", badge: "▲ Followers unavailable via API" },
      facebookFans: { value: "145", badge: "→ Minimal activity" },
      fbOrganicReach: { value: "399", badge: "→ Very low — page needs content" },
      fbEngagements: { value: "22", badge: "→ March" },
      igMonthlyReach: { value: "7.5K", badge: "▲ March total" },
      engagementRate: { value: "5.5%", badge: "▲" },
    },
  },
  // Wisdom & Wellness
  "eb1d354f-d57f-4730-9cfb-6f057b83ee08": {
    social: {
      kpis: [
        { label: "Instagram Reach", value: "2.31M", badge: "▲ March total", direction: "up" },
        { label: "Facebook Fans", value: "204", badge: "↑ Grew from 109 in Feb", direction: "up" },
        { label: "FB Organic Reach", value: "44K", badge: "▲ March impressions", direction: "up" },
        { label: "FB Engagements", value: "2,260", badge: "▲ Post engagements", direction: "up" },
      ],
    },
    highlights: {
      instagramFollowers: { value: "N/A", badge: "▲ Followers unavailable via API" },
      facebookFans: { value: "204", badge: "↑ Grew from 109" },
      fbOrganicReach: { value: "44K", badge: "▲ March impressions" },
      fbEngagements: { value: "2,260", badge: "▲ Post engagements" },
      igMonthlyReach: { value: "2.31M", badge: "▲ March total" },
      engagementRate: { value: "5.1%", badge: "▲" },
    },
  },
};

async function main() {
  for (const [clientId, data] of Object.entries(socialData)) {
    // Update social section
    const s = await patch(clientId, MAR, "social", data.social);
    console.log(`${clientId} social: ${s}`);

    // Update overview socialHighlights — need to fetch current overview, merge highlights
    const res = await fetch(`${BASE}/dashboard_data?client_id=eq.${clientId}&period_id=eq.${MAR}&section=eq.overview&select=data`, {
      headers,
    });
    const rows = await res.json();
    if (rows.length > 0) {
      const current = rows[0].data;
      current.socialHighlights = data.highlights;
      const s2 = await patch(clientId, MAR, "overview", current);
      console.log(`${clientId} overview highlights: ${s2}`);
    }
  }
  console.log("Done!");
}

main().catch(console.error);
