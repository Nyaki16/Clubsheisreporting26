import { FetchedClientData, MonthData } from "../types";
import { formatCurrency, formatNumber } from "@/lib/formatters";

export function buildPaystackSection(current: FetchedClientData, trendMonths: MonthData[]) {
  const ps = current.paystack;
  if (!ps) return null;

  const mem = current.paystackMembership;

  return {
    revenue: ps.revenue,
    revenueFormatted: formatCurrency(ps.revenue),
    kpis: [
      { label: "Paystack Revenue", value: formatCurrency(ps.revenue), badge: `↑ ${ps.successCount} successful payments`, direction: "up" as const },
      { label: "Active Memberships", value: mem ? formatNumber(mem.members) : "—", badge: mem?.memberBreakdown || "→ Currently active", direction: "neutral" as const },
      { label: "Needs Attention", value: mem ? formatNumber(mem.attentionSubscriptions) : "—", badge: "↓ Failed billing", direction: "down" as const },
      { label: "Failed Payments", value: `${ps.failedCount} txns`, badge: "↓ Declined transactions", direction: "down" as const },
      { label: "Abandoned", value: `${ps.abandonedCount} txns`, badge: "↓ Incomplete checkouts", direction: "down" as const },
      { label: "Reversed", value: `${ps.reversedCount} txns`, badge: "→ Reversals", direction: "neutral" as const },
    ],
    activeMemberships: mem ? { total: mem.members, plans: [] } : undefined,
    transactions: {
      successful: { count: ps.successCount, amount: ps.revenue },
      failed: { count: ps.failedCount, amount: 0 },
      abandoned: { count: ps.abandonedCount, amount: 0 },
      reversed: { count: ps.reversedCount, amount: 0 },
    },
    trend: {
      labels: trendMonths.map(m => m.label),
      revenue: trendMonths.map(m => m.data.paystack?.revenue || 0),
      transactions: trendMonths.map(m => m.data.paystack?.successCount || 0),
    },
  };
}
