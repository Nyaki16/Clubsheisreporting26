const SRK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bGZtcXB3dWFwaXl2dWJsdmFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTE2NDQwOCwiZXhwIjoyMDkwNzQwNDA4fQ.iy29-rZSnFfKvyGANlxWhgB6ypW238VEqsOXEYLSkEA";
const BASE = "https://xwlfmqpwuapiyvublvaa.supabase.co/rest/v1";
const headers = { "apikey": SRK, "Authorization": `Bearer ${SRK}`, "Content-Type": "application/json" };

const PERIODS = {
  jan: "afea8d89-40b4-4365-9e2e-1dd8670e90ec",
  feb: "b3e06b4e-848f-4dcc-a8fb-bd99fe011dbf",
  mar: "11971982-7a97-48ae-8a3e-b97e34c02c54",
};

// GHL Revenue — verified from Windsor API (amounts in Rands)
const ghlRevenue = {
  // Club She Is
  "0a9476d1-5a5a-4f4b-b213-8c9528587b37": {
    jan: { rev: 61572, txns: 32, label: "32 txns (memberships + invoices)" },
    feb: { rev: 20028, txns: 26, label: "26 txns (memberships + invoices)" },
    mar: { rev: 125145, txns: 34, label: "34 txns (memberships + invoices)" },
  },
  // Awahome — no GHL transactions
  "5529a26b-fe9f-4e8c-967c-12828dcbba7d": {
    jan: { rev: 0, txns: 0, label: "No GHL transactions" },
    feb: { rev: 0, txns: 0, label: "No GHL transactions" },
    mar: { rev: 0, txns: 0, label: "No GHL transactions" },
  },
  // Link Interiors
  "e5555d53-77ed-43fe-995b-d96ce6e772a7": {
    jan: { rev: 199520, txns: 16, label: "16 txns (design projects + orders)" },
    feb: { rev: 1047024, txns: 18, label: "18 txns (incl. R700K project)" },
    mar: { rev: 808728, txns: 27, label: "27 txns (projects + orders)" },
  },
  // Palesa Dooms — no succeeded GHL transactions
  "9bd71d9b-e419-46a8-bb29-6155174b5d46": {
    jan: { rev: 0, txns: 0, label: "No GHL transactions" },
    feb: { rev: 0, txns: 0, label: "No GHL transactions" },
    mar: { rev: 0, txns: 0, label: "27 pending (not yet succeeded)" },
  },
  // Purpose for Impact — no GHL transactions
  "33d1c611-d00f-4f32-b3ad-2a4e94a9437c": {
    jan: { rev: 0, txns: 0, label: "No GHL transactions" },
    feb: { rev: 0, txns: 0, label: "No GHL transactions" },
    mar: { rev: 0, txns: 0, label: "No GHL transactions" },
  },
  // Wisdom & Wellness
  "eb1d354f-d57f-4730-9cfb-6f057b83ee08": {
    jan: { rev: 150937, txns: 0, label: "Aggregated (high volume)" },
    feb: { rev: 45594, txns: 0, label: "Aggregated (high volume)" },
    mar: { rev: 30396, txns: 0, label: "Aggregated (high volume)" },
  },
  // GIBS EDA — no GHL
  "bccee066-354d-4bcd-b46c-bd44da65f016": {
    jan: { rev: 0, txns: 0, label: "No GHL account" },
    feb: { rev: 0, txns: 0, label: "No GHL account" },
    mar: { rev: 0, txns: 0, label: "No GHL account" },
  },
};

function fmt(n) {
  if (n >= 1000000) return `R ${(n/1000000).toFixed(2)}M`;
  if (n >= 1000) return `R ${n.toLocaleString()}`;
  return `R ${n}`;
}

async function main() {
  let count = 0;

  for (const [clientId, months] of Object.entries(ghlRevenue)) {
    for (const [monthKey, ghl] of Object.entries(months)) {
      const periodId = PERIODS[monthKey];

      // Fetch current overview
      const res = await fetch(`${BASE}/dashboard_data?client_id=eq.${clientId}&period_id=eq.${periodId}&section=eq.overview&select=data`, { headers });
      const rows = await res.json();
      if (!rows.length) continue;

      const overview = rows[0].data;

      // Add Ghutte Revenue KPI if revenue > 0, insert after first KPI (Paystack Revenue)
      if (ghl.rev > 0) {
        const ghlKpi = {
          label: "Ghutte Revenue",
          value: fmt(ghl.rev),
          badge: `↑ ${ghl.label}`,
          direction: "up",
          icon: "dollar",
        };

        // Check if Ghutte Revenue already exists
        const existingIdx = overview.kpis.findIndex(k => k.label === "Ghutte Revenue");
        if (existingIdx >= 0) {
          overview.kpis[existingIdx] = ghlKpi;
        } else {
          // Insert after Paystack Revenue (index 1) or at start if no Paystack
          const psIdx = overview.kpis.findIndex(k => k.label === "Paystack Revenue");
          overview.kpis.splice(psIdx >= 0 ? psIdx + 1 : 0, 0, ghlKpi);
        }
      }

      // Patch back
      const patchRes = await fetch(`${BASE}/dashboard_data?client_id=eq.${clientId}&period_id=eq.${periodId}&section=eq.overview`, {
        method: "PATCH",
        headers: { ...headers, "Prefer": "return=minimal" },
        body: JSON.stringify({ data: overview, updated_at: new Date().toISOString() }),
      });

      count++;
      process.stdout.write(".");
    }
  }

  console.log(`\nDone! Updated ${count} overviews with Ghutte Revenue.`);
}

main().catch(console.error);
