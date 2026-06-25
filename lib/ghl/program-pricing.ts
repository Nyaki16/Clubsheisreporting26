// Program pricing for outstanding-balance calculation.
//
// - fixed:        a set total price; outstanding = price − total paid.
// - installments: an N-payment program (e.g. 6 monthly payments); outstanding =
//                 remaining payments × the client's monthly amount.
// - oneoff:       no balance (single purchase).
//
// Keyed by CANONICAL product name (after lib/ghl/product-aliases).

export type ProgramPricing =
  | { type: "fixed"; price: number }
  | { type: "installments"; payments: number }
  | { type: "oneoff" };

export const PROGRAM_PRICING: Record<string, ProgramPricing> = {
  "90 Days Unforgettable": { type: "fixed", price: 12000 },
  "Core Business English Program Course": { type: "fixed", price: 7400 },
  "Unforgettable Junior Academy": { type: "installments", payments: 6 }, // 6-month program
};

export function getPricing(product: string): ProgramPricing {
  return PROGRAM_PRICING[product] || { type: "oneoff" };
}

export interface ProgramBalance {
  product: string;
  type: ProgramPricing["type"];
  paid: number;
  count: number;
  outstanding: number;
  // For display: fixed → full price; installments → "x of N payments".
  expected?: number;
  paymentsMade?: number;
  paymentsExpected?: number;
}

// Compute the balance for one client's payments toward one program.
// `amounts` are the succeeded payment amounts (most recent last is fine).
export function programBalance(product: string, amounts: number[]): ProgramBalance {
  const paid = amounts.reduce((a, n) => a + n, 0);
  const count = amounts.length;
  const pricing = getPricing(product);

  if (pricing.type === "fixed") {
    return { product, type: "fixed", paid, count, expected: pricing.price, outstanding: Math.max(0, pricing.price - paid) };
  }
  if (pricing.type === "installments") {
    // Monthly amount = the client's most common payment (falls back to the max).
    const freq = new Map<number, number>();
    for (const a of amounts) freq.set(a, (freq.get(a) || 0) + 1);
    let monthly = 0;
    let best = -1;
    for (const [amt, n] of freq) if (n > best || (n === best && amt > monthly)) { best = n; monthly = amt; }
    const remaining = Math.max(0, pricing.payments - count);
    return {
      product,
      type: "installments",
      paid,
      count,
      paymentsMade: count,
      paymentsExpected: pricing.payments,
      outstanding: remaining * monthly,
    };
  }
  return { product, type: "oneoff", paid, count, outstanding: 0 };
}
