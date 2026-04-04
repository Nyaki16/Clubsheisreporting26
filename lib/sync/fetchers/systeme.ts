import { getServiceClient } from "@/lib/supabase";
import { SystemeRevenueData } from "../types";

const SYSTEME_BASE = "https://api.systeme.io/api";

async function systemeFetch<T>(endpoint: string, apiKey: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${SYSTEME_BASE}${endpoint}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { "X-API-Key": apiKey },
  });
  if (!res.ok) throw new Error(`Systeme.io API error ${res.status}`);
  return res.json();
}

export async function getSystemeKey(clientId: string): Promise<string | null> {
  const supabase = getServiceClient();
  const { data: rows } = await supabase
    .from("dashboard_data")
    .select("data")
    .eq("client_id", clientId)
    .eq("section", "api_keys")
    .is("period_id", null);

  for (const row of rows || []) {
    const d = row.data as Record<string, string>;
    if (d?.systemeio_api_key) return d.systemeio_api_key;
  }
  return null;
}

export async function fetchSystemeContacts(
  apiKey: string,
  from: string,
  to: string
): Promise<number> {
  // Systeme.io API is limited — contacts endpoint doesn't reliably filter by date
  // Return 0 for now; actual contact counts come from other sources
  try {
    let count = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const result = await systemeFetch<{ items: { createdAt: string }[]; hasMore: boolean }>(
        "/contacts",
        apiKey,
        { page: String(page), limit: "100" }
      );

      for (const contact of result.items) {
        const created = contact.createdAt;
        if (created >= from && created <= to) {
          count++;
        }
      }

      hasMore = result.hasMore;
      // Stop after a reasonable number of pages to avoid timeout
      if (page >= 50) break;
      page++;
    }

    return count;
  } catch (e) {
    console.error("fetchSystemeContacts error:", e);
    return 0;
  }
}

// Note: Systeme.io API does NOT have an orders/sales endpoint.
// Revenue data must come from CSV uploads or webhooks.
// This function returns null — revenue is handled via otherRevenue section or CSV import.
export async function fetchSystemeRevenue(): Promise<SystemeRevenueData | null> {
  return null;
}
