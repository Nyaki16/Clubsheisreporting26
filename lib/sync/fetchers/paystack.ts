import { getServiceClient } from "@/lib/supabase";
import { PaystackTransactionSummary, PaystackMembershipSummary } from "../types";

const PAYSTACK_BASE = "https://api.paystack.co";

async function paystackFetch<T>(endpoint: string, secretKey: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${PAYSTACK_BASE}${endpoint}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!res.ok) throw new Error(`Paystack API error ${res.status}`);
  return res.json();
}

interface PaystackListResponse<T> {
  status: boolean;
  data: T[];
  meta: { total: number; page: number; pageCount: number };
}

interface PaystackTransaction {
  amount: number;
  status: string;
  created_at: string;
}

interface PaystackSubscription {
  status: string;
  plan: { name: string; amount: number };
}

export async function getPaystackKeys(clientId: string): Promise<string[]> {
  const supabase = getServiceClient();
  // Some clients have duplicate api_keys rows — limit defensively, then dedupe.
  const { data: rows } = await supabase
    .from("dashboard_data")
    .select("data")
    .eq("client_id", clientId)
    .eq("section", "api_keys")
    .is("period_id", null)
    .limit(5);

  const keys = new Set<string>();
  for (const row of rows || []) {
    const d = row.data as Record<string, string>;
    if (d?.paystack_secret_key) keys.add(d.paystack_secret_key);
    if (d?.paystack_secret_key_2) keys.add(d.paystack_secret_key_2);
  }
  return Array.from(keys);
}

export async function fetchPaystackTransactions(
  secretKeys: string[],
  from: string,
  to: string,
  membershipAmounts?: number[]  // e.g. [149, 349] for CSI
): Promise<{ summary: PaystackTransactionSummary; membership?: PaystackMembershipSummary }> {
  let totalRevenue = 0;
  let totalSuccess = 0;
  let totalFailed = 0;
  let totalAbandoned = 0;
  let totalReversed = 0;
  const memberAmounts: Record<string, number> = {};

  for (const key of secretKeys) {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await paystackFetch<PaystackListResponse<PaystackTransaction>>(
        "/transaction",
        key,
        { from, to, perPage: "200", page: String(page) }
      );

      for (const txn of result.data) {
        const amount = txn.amount / 100; // Paystack amounts are in kobo/cents

        switch (txn.status) {
          case "success":
            totalRevenue += amount;
            totalSuccess++;
            // Track membership amounts
            if (membershipAmounts?.includes(amount)) {
              const key = `R${amount}`;
              memberAmounts[key] = (memberAmounts[key] || 0) + 1;
            }
            break;
          case "failed":
            totalFailed++;
            break;
          case "abandoned":
            totalAbandoned++;
            break;
          case "reversed":
            totalReversed++;
            break;
        }
      }

      hasMore = result.data.length >= 200;
      page++;
    }
  }

  const summary: PaystackTransactionSummary = {
    revenue: Math.round(totalRevenue),
    successCount: totalSuccess,
    failedCount: totalFailed,
    abandonedCount: totalAbandoned,
    reversedCount: totalReversed,
  };

  let membership: PaystackMembershipSummary | undefined;
  if (membershipAmounts && Object.keys(memberAmounts).length > 0) {
    const totalMembers = Object.values(memberAmounts).reduce((s, c) => s + c, 0);
    const breakdown = Object.entries(memberAmounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${v}×${k}`)
      .join(" + ");

    membership = {
      members: totalMembers,
      memberBreakdown: breakdown,
      activeSubscriptions: 0,
      attentionSubscriptions: 0,
      nonRenewingSubscriptions: 0,
      plans: breakdown,
    };
  }

  return { summary, membership };
}

export async function fetchPaystackSubscriptions(
  secretKeys: string[],
  membershipAmounts?: number[]
): Promise<PaystackMembershipSummary> {
  let active = 0;
  let attention = 0;
  let nonRenewing = 0;
  const planCounts: Record<string, number> = {};

  for (const key of secretKeys) {
    for (const status of ["active", "attention", "non-renewing"] as const) {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const result = await paystackFetch<PaystackListResponse<PaystackSubscription>>(
          "/subscription",
          key,
          { status, perPage: "200", page: String(page) }
        );

        for (const sub of result.data) {
          const amount = sub.plan.amount / 100;
          const isMembership = !membershipAmounts || membershipAmounts.includes(amount);

          if (status === "active" && isMembership) {
            active++;
            const k = `R${amount}`;
            planCounts[k] = (planCounts[k] || 0) + 1;
          }
          if (status === "attention") attention++;
          if (status === "non-renewing") nonRenewing++;
        }

        hasMore = result.data.length >= 200;
        page++;
      }
    }
  }

  const breakdown = Object.entries(planCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${v}×${k}`)
    .join(" + ");

  return {
    members: active,
    memberBreakdown: breakdown || "No active memberships",
    activeSubscriptions: active,
    attentionSubscriptions: attention,
    nonRenewingSubscriptions: nonRenewing,
    plans: breakdown || "—",
  };
}
