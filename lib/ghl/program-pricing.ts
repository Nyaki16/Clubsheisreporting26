// Program pricing for outstanding-balance calculation.
//
// - fixed:        a set total price; outstanding = price − net paid.
// - tiered:       Standard vs VIP price (90-Day); tier inferred from amounts.
// - installments: an N-payment program (Junior, 6 payments).
// - oneoff:       no balance (single purchase).
//
// Keyed by CANONICAL product name (after lib/ghl/product-aliases).

export type ProgramPricing =
  | { type: "fixed"; price: number }
  | { type: "tiered"; standard: number; vip: number }
  | { type: "installments"; payments: number }
  | { type: "oneoff" };

export const PROGRAM_PRICING: Record<string, ProgramPricing> = {
  "90 Days Unforgettable": { type: "tiered", standard: 11200, vip: 13200 },
  "Core Business English Program Course": { type: "fixed", price: 7400 },
  "Unforgettable Junior Academy": { type: "installments", payments: 6 }, // 6-month program
};

export function getPricing(product: string): ProgramPricing {
  return PROGRAM_PRICING[product] || { type: "oneoff" };
}

// Cohort-based programs run in intakes (Core Business English, 90 Days, Junior).
export function isCohortProgram(product: string): boolean {
  return getPricing(product).type !== "oneoff";
}

export interface ProgramBalance {
  product: string;
  type: ProgramPricing["type"];
  paid: number;
  count: number;
  outstanding: number;
  expected?: number; // full price (fixed/tiered)
  tier?: "VIP" | "Standard"; // tiered only
  paymentsMade?: number;
  paymentsExpected?: number;
}

// Compute the balance for one client's payments toward one program.
// `amounts` = succeeded payment amounts; `refunds` = total refunded (subtracted).
export function programBalance(product: string, amounts: number[], refunds = 0): ProgramBalance {
  const paid = amounts.reduce((a, n) => a + n, 0) - refunds;
  const count = amounts.length;
  const pricing = getPricing(product);

  if (pricing.type === "fixed") {
    return { product, type: "fixed", paid, count, expected: pricing.price, outstanding: Math.max(0, pricing.price - paid) };
  }
  if (pricing.type === "tiered") {
    // VIP if they've paid a VIP-sized amount or more than the standard total.
    const vip = amounts.some((a) => a >= pricing.vip) || paid > pricing.standard;
    const full = vip ? pricing.vip : pricing.standard;
    return { product, type: "tiered", tier: vip ? "VIP" : "Standard", paid, count, expected: full, outstanding: Math.max(0, full - paid) };
  }
  if (pricing.type === "installments") {
    const freq = new Map<number, number>();
    for (const a of amounts) freq.set(a, (freq.get(a) || 0) + 1);
    let monthly = 0;
    let best = -1;
    for (const [amt, n] of freq) if (n > best || (n === best && amt > monthly)) { best = n; monthly = amt; }
    const remaining = Math.max(0, pricing.payments - count);
    return { product, type: "installments", paid, count, paymentsMade: count, paymentsExpected: pricing.payments, outstanding: remaining * monthly };
  }
  return { product, type: "oneoff", paid, count, outstanding: 0 };
}
