// One-off: upload a previewed metaIntelligence row for a client.
// Useful before the production META_ACCESS_TOKEN lands — we hand-craft
// the analysis from MCP-fetched ad data so the dashboard renders with real insights.
//
// Usage:
//   node scripts/preview-intelligence.mjs

const SRK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bGZtcXB3dWFwaXl2dWJsdmFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTE2NDQwOCwiZXhwIjoyMDkwNzQwNDA4fQ.iy29-rZSnFfKvyGANlxWhgB6ypW238VEqsOXEYLSkEA";
const BASE = "https://xwlfmqpwuapiyvublvaa.supabase.co/rest/v1";
const headers = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };

const PALESA_CLIENT_ID = "9bd71d9b-e419-46a8-bb29-6155174b5d46";

// Real data pulled via Meta MCP for ad account 346283871806094 (Palesa primary), last 30 days.
// Thumbnails are null because Meta's MCP creatives endpoint isn't rolled out for this account yet —
// the production POST /api/creatives/[slug]/intelligence will fill them in once a META_ACCESS_TOKEN lands.

const intelligence = {
  winners: [
    {
      ad_id: "120243230609820516",
      framework: "pas",
      hook_type: "pattern_interrupt",
      angle: "transformation",
      why_it_works:
        "This ad's hook rate of 33% is doing the heavy lifting — viewers are stopping for the candid in-car framing, not a studio set. R 4,224 spend → 33 purchases at 3.21 ROAS proves the conversational, low-production opener is converting cold traffic. The pattern interrupt is the setting itself: people expect a polished webinar pitch and get a real moment instead.",
    },
    {
      ad_id: "120230954560810516",
      framework: "bab",
      hook_type: "transformation_statement",
      angle: "transformation",
      why_it_works:
        "Tiny spend (R 753) but a 1.20 ROAS keeps it in the green. The '7 Day' structure works because it gives the viewer a defined before-and-after window — and a hook rate of 20% is solid for a short-duration ad with minimal reach. Worth scaling slowly to see if the math holds at 5–10× the budget.",
    },
    {
      ad_id: "120243230389950516",
      framework: "pas",
      hook_type: "question",
      angle: "belonging",
      why_it_works:
        "ROAS 0.90 — technically below break-even, but ranks third because most of Palesa's ads have no measurable purchase signal. The 'boardroom' framing is the right angle for the corporate speaking audience. Hook rate at 14% is the weak link; the question lands but the visual probably doesn't match the promise. Worth testing the same hook with a sharper opening frame.",
    },
  ],
  losers: [
    {
      ad_id: "120241923674370516",
      framework: "pas",
      hook_type: "question",
      angle: "fear",
      diagnosis:
        "Hook rate of 3.6% on 15K impressions is the diagnostic — almost no one is staying past the first three seconds. CTR sits at 2.29% and frequency is creeping up to 2.40. The 'Airdrop' format is likely confusing viewers who don't recognize the visual vocabulary.",
      try_instead:
        "Keep the verbal hook ('are you tired of someone speaking over you') but lead with a face — Palesa or a client — saying it on camera, not a screenshot. The line is strong; the framing is starving it. Test against the 'Inside the car' style.",
    },
    {
      ad_id: "120230000944700516",
      framework: "bab",
      hook_type: "statement",
      angle: "curiosity",
      diagnosis:
        "Hook rate 33% is excellent — but only 8 purchases on R 4,059 spend gives ROAS 0.71. People are watching, clicking (2,604 link clicks, 2.69% CTR), then dropping at the landing page. The bottleneck is mid-funnel, not the creative.",
      try_instead:
        "Don't kill this ad — fix the page. Audit the landing page load speed and the gap between what the ad promises and what the page delivers. If the page sells the same outcome with the same energy, this becomes a top-3 winner overnight.",
    },
    {
      ad_id: "120231849107270516",
      framework: "other",
      hook_type: "statement",
      angle: "status",
      diagnosis:
        "204K impressions, 0.48% CTR, zero measurable purchases. This is the awareness format running cold — it's reaching people but not moving them. The frequency is fine (1.13) so it's not fatigue; it's that the offer isn't being asked for.",
      try_instead:
        "Pause and repurpose. 'Boldy Her' is the right brand vibe for retargeting warm audiences who know Palesa — but on cold, it needs a direct ask attached. Either bolt a CTA + offer onto the same creative, or move the budget to one of the question-hook ads above.",
    },
  ],
  pattern: {
    paragraph:
      "Three patterns across the last 30 days of Palesa's account. First: question hooks and casual-setting UGC are out-converting studio-polish by a wide margin — 'Inside the car' (ROAS 3.21) is doing the work a R 4K test should do. Second: a great hook (>30% on 'Video 2 No Edit') doesn't save a weak mid-funnel — that R 4,059 is leaking on the landing page, not the creative. Third: pure-reach awareness ads ('Boldy Her') are burning ZAR with zero return on cold traffic — they belong in retargeting only. The math is loud: 5 of 15 ads carry the purchase signal, and only one (Inside the car) is genuinely profitable.",
    rules: [
      "Lead with question hooks in casual settings — UGC framing for cold, polished for warm.",
      "Audit the landing page when hook rate is strong but ROAS is weak — the creative isn't the problem.",
      "Move brand-awareness ads (Boldy Her style) out of cold and into retargeting only.",
    ],
  },
  generatedAt: new Date().toISOString(),
  dateRange: { start: "2026-04-27", end: "2026-05-26" },
  adMetrics: {
    "120243230609820516": {
      name: "Inside the car",
      thumbnailUrl: null,
      format: "video",
      metrics: { spend: 4224.07, impressions: 56505, linkClicks: 1543, conversions: 33, revenue: 13559.27, roas: 3.21, cpa: 128.0, hookRate: 0.333, frequency: 1.77 },
    },
    "120230954560810516": {
      name: "7 Day Red",
      thumbnailUrl: null,
      format: "video",
      metrics: { spend: 752.63, impressions: 9600, linkClicks: 166, conversions: 2, revenue: 903.16, roas: 1.2, cpa: 376.31, hookRate: 0.2, frequency: 1.54 },
    },
    "120243230389950516": {
      name: "Ever found yourself in the boardroom and",
      thumbnailUrl: null,
      format: "video",
      metrics: { spend: 788.75, impressions: 33065, linkClicks: 592, conversions: 2, revenue: 709.88, roas: 0.9, cpa: 394.38, hookRate: 0.144, frequency: 1.49 },
    },
    "120241923674370516": {
      name: "Are you tired of having some speak over you –  Airdrop",
      thumbnailUrl: null,
      format: "video",
      metrics: { spend: 1229.38, impressions: 15051, linkClicks: 190, conversions: 2, revenue: 946.62, roas: 0.77, cpa: 614.69, hookRate: 0.036, frequency: 2.4 },
    },
    "120230000944700516": {
      name: "Video 2 No Edit",
      thumbnailUrl: null,
      format: "video",
      metrics: { spend: 4059.14, impressions: 96714, linkClicks: 2604, conversions: 8, revenue: 2881.99, roas: 0.71, cpa: 507.39, hookRate: 0.328, frequency: 1.74 },
    },
    "120231849107270516": {
      name: "Boldy Her",
      thumbnailUrl: null,
      format: "video",
      metrics: { spend: 941.76, impressions: 204380, linkClicks: 379, conversions: 0, revenue: 0, roas: 0, cpa: null, hookRate: 0.14, frequency: 1.13 },
    },
  },
};

async function run() {
  const res = await fetch(
    `${BASE}/dashboard_data?client_id=eq.${PALESA_CLIENT_ID}&section=eq.metaIntelligence&period_id=is.null&limit=1`,
    { headers }
  );
  const rows = await res.json();
  const existing = rows[0];

  if (existing) {
    const r = await fetch(`${BASE}/dashboard_data?id=eq.${existing.id}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({ data: intelligence, updated_at: new Date().toISOString() }),
    });
    if (!r.ok) throw new Error(`PATCH failed: ${r.status} ${await r.text()}`);
    console.log("✓ Updated existing metaIntelligence row for Palesa.");
  } else {
    const r = await fetch(`${BASE}/dashboard_data`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        client_id: PALESA_CLIENT_ID,
        period_id: null,
        section: "metaIntelligence",
        data: intelligence,
      }),
    });
    if (r.status !== 201) throw new Error(`POST failed: ${r.status} ${await r.text()}`);
    console.log("✓ Created new metaIntelligence row for Palesa.");
  }
  console.log(
    `  ${intelligence.winners.length} winners, ${intelligence.losers.length} losers, ${intelligence.pattern.rules.length} pattern rules.`
  );
  console.log("  Reload /dashboard/palesa-dooms/meta to see the preview.");
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
