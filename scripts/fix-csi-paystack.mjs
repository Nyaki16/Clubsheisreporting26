const SRK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bGZtcXB3dWFwaXl2dWJsdmFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTE2NDQwOCwiZXhwIjoyMDkwNzQwNDA4fQ.iy29-rZSnFfKvyGANlxWhgB6ypW238VEqsOXEYLSkEA";
const BASE = "https://xwlfmqpwuapiyvublvaa.supabase.co/rest/v1";
const headers = { "apikey": SRK, "Authorization": `Bearer ${SRK}`, "Content-Type": "application/json" };
const CSI = "0a9476d1-5a5a-4f4b-b213-8c9528587b37";

const months = {
  jan: {
    periodId: "afea8d89-40b4-4365-9e2e-1dd8670e90ec",
    activeSubs: 64, r149: 17, r249: 2, r349: 45,
    subRev: 18736, otherTxns: 0, otherRev: 0, totalRev: 18736,
    successTxns: 64, failedTxns: 123, abandonedTxns: 14, reversedTxns: 0,
  },
  feb: {
    periodId: "b3e06b4e-848f-4dcc-a8fb-bd99fe011dbf",
    activeSubs: 52, r149: 17, r249: 2, r349: 33,
    subRev: 14548, otherTxns: 2, otherRev: 4850, totalRev: 21292,
    successTxns: 54, failedTxns: 110, abandonedTxns: 3, reversedTxns: 2,
  },
  mar: {
    periodId: "11971982-7a97-48ae-8a3e-b97e34c02c54",
    activeSubs: 57, r149: 15, r249: 1, r349: 41,
    subRev: 16793, otherTxns: 2, otherRev: 5600, totalRev: 24486,
    successTxns: 59, failedTxns: 128, abandonedTxns: 15, reversedTxns: 0,
  },
};

// Current subscription status (from Paystack API)
const subs = { active: 236, attention: 156, nonRenewing: 26, cancelled: 183 };

async function main() {
  for (const [monthKey, m] of Object.entries(months)) {
    // 1. Update overview — fix Paystack section and active members KPI
    const ovRes = await fetch(`${BASE}/dashboard_data?client_id=eq.${CSI}&period_id=eq.${m.periodId}&section=eq.overview&select=data`, { headers });
    const ovRows = await ovRes.json();
    if (ovRows.length > 0) {
      const ov = ovRows[0].data;

      // Fix the Paystack Revenue KPI
      const psKpiIdx = ov.kpis.findIndex(k => k.label === "Paystack Revenue");
      if (psKpiIdx >= 0) {
        ov.kpis[psKpiIdx] = {
          label: "Paystack Revenue",
          value: `R ${m.totalRev.toLocaleString()}`,
          badge: `↑ ${m.successTxns} successful payments`,
          direction: "up", icon: "dollar",
        };
      }

      // Replace Active Memberships KPI or add it
      const amIdx = ov.kpis.findIndex(k => k.label === "Active Memberships" || k.label === "Active Subscribers");
      const subKpi = {
        label: "Active Subscribers",
        value: `${m.activeSubs}`,
        badge: `${m.r149}×R149 + ${m.r249}×R249 + ${m.r349}×R349`,
        direction: m.activeSubs > 0 ? "up" : "neutral", icon: "users",
      };
      if (amIdx >= 0) {
        ov.kpis[amIdx] = subKpi;
      } else {
        // Insert after Paystack Revenue
        const insertIdx = psKpiIdx >= 0 ? psKpiIdx + 1 : 1;
        ov.kpis.splice(insertIdx, 0, subKpi);
      }

      // Add Other Payments KPI if there are any
      const opIdx = ov.kpis.findIndex(k => k.label === "Other Payments");
      if (m.otherTxns > 0) {
        const opKpi = {
          label: "Other Payments",
          value: `R ${m.otherRev.toLocaleString()}`,
          badge: `${m.otherTxns} non-subscription payments`,
          direction: "up", icon: "dollar",
        };
        if (opIdx >= 0) ov.kpis[opIdx] = opKpi;
        else ov.kpis.splice((amIdx >= 0 ? amIdx : 2) + 1, 0, opKpi);
      } else if (opIdx >= 0) {
        ov.kpis.splice(opIdx, 1);
      }

      // Update paystack section in overview
      ov.paystack = {
        revenue: m.totalRev,
        revenueFormatted: `R ${m.totalRev.toLocaleString()}`,
        revenueBadge: `↑ ${m.successTxns} successful payments`,
        activeMemberships: m.activeSubs,
        membershipBreakdown: `${m.r149}×R149 + ${m.r249}×R249 + ${m.r349}×R349`,
        failedAmount: 0,
        failedFormatted: `${m.failedTxns} failed txns`,
        failedBadge: "↓ Recovery opportunity",
        abandonedAmount: 0,
        abandonedFormatted: `${m.abandonedTxns} abandoned`,
        abandonedBadge: "↓ Checkout not completed",
      };

      // Add product breakdown for the bar chart
      ov.productBreakdown = [
        { name: "R149 Membership", count: m.r149 },
        { name: "R249 Membership", count: m.r249 },
        { name: "R349 Membership", count: m.r349 },
      ];
      if (m.otherTxns > 0) {
        ov.productBreakdown.push({ name: "Other Payments", count: m.otherTxns });
      }

      await fetch(`${BASE}/dashboard_data?client_id=eq.${CSI}&period_id=eq.${m.periodId}&section=eq.overview`, {
        method: "PATCH", headers: { ...headers, "Prefer": "return=minimal" },
        body: JSON.stringify({ data: ov }),
      });
      console.log(`${monthKey} overview: updated`);
    }

    // 2. Update/create paystack section
    const psData = {
      revenue: m.totalRev,
      revenueFormatted: `R ${m.totalRev.toLocaleString()}`,
      kpis: [
        { label: "Total Revenue", value: `R ${m.totalRev.toLocaleString()}`, badge: `↑ ${m.successTxns} successful payments`, direction: "up" },
        { label: "Subscription Revenue", value: `R ${m.subRev.toLocaleString()}`, badge: `↑ ${m.activeSubs} active subscribers`, direction: "up" },
        { label: "Active Subscribers", value: `${m.activeSubs}`, badge: `${m.r149}×R149 + ${m.r249}×R249 + ${m.r349}×R349`, direction: "up" },
        ...(m.otherTxns > 0 ? [{ label: "Other Payments", value: `R ${m.otherRev.toLocaleString()}`, badge: `${m.otherTxns} non-subscription payments`, direction: "up" }] : []),
        { label: "Failed Payments", value: `${m.failedTxns} txns`, badge: "↓ Declined transactions", direction: "down" },
        { label: "Abandoned", value: `${m.abandonedTxns} txns`, badge: "↓ Incomplete checkouts", direction: "down" },
      ],
      activeMemberships: {
        total: m.activeSubs,
        plans: [
          { price: 149, count: m.r149, name: "R149 Membership" },
          { price: 249, count: m.r249, name: "R249 Membership" },
          { price: 349, count: m.r349, name: "R349 Membership" },
        ],
      },
      productBreakdown: [
        { name: "R149 Membership", count: m.r149 },
        { name: "R249 Membership", count: m.r249 },
        { name: "R349 Membership", count: m.r349 },
        ...(m.otherTxns > 0 ? [{ name: "Other Payments", count: m.otherTxns }] : []),
      ],
      transactions: {
        successful: { count: m.successTxns, amount: m.totalRev },
        failed: { count: m.failedTxns, amount: 0 },
        abandoned: { count: m.abandonedTxns, amount: 0 },
        reversed: { count: m.reversedTxns, amount: 0 },
      },
      trend: {
        labels: ["Jan 2026", "Feb 2026", "Mar 2026"],
        revenue: [18736, 21292, 24486],
        transactions: [64, 54, 59],
      },
    };

    // Try patch then post
    const pRes = await fetch(`${BASE}/dashboard_data?client_id=eq.${CSI}&period_id=eq.${m.periodId}&section=eq.paystack`, {
      method: "PATCH", headers: { ...headers, "Prefer": "return=representation" },
      body: JSON.stringify({ data: psData }),
    });
    const pData = await pRes.json();
    if (!Array.isArray(pData) || pData.length === 0) {
      await fetch(`${BASE}/dashboard_data`, {
        method: "POST", headers,
        body: JSON.stringify({ client_id: CSI, period_id: m.periodId, section: "paystack", data: psData }),
      });
      console.log(`${monthKey} paystack: created`);
    } else {
      console.log(`${monthKey} paystack: updated`);
    }
  }

  console.log("\nDone! CSI Paystack data corrected for all 3 months.");
  console.log("\nLogic for future months:");
  console.log("1. Pull successful transactions from both Paystack accounts");
  console.log("2. Filter R149/R249/R349 amounts → count as active subscribers");
  console.log("3. All other amounts → count as 'other payments'");
  console.log("4. Subscription revenue = sum of (count × price) for each tier");
  console.log("5. Other revenue = total revenue - subscription revenue");
  console.log("6. Total = subscription + other");
}

main().catch(console.error);
