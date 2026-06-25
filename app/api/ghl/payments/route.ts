import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { authorizeForSlug } from "@/lib/auth";
import { canonicalProduct } from "@/lib/ghl/product-aliases";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Full Ghutte transaction feed for the interactive payments dashboard.
// Returns one row per GHL transaction (client, product, amount, status, date),
// products consolidated via the alias map. Honours a monthly period or a
// custom ?start=&end= range. Gated: admin or matching client session.

const GHL_BASE = "https://services.leadconnectorhq.com";

interface GHLTxn {
  contactName?: string;
  contactEmail?: string;
  contactId?: string;
  amount?: number;
  status?: string;
  createdAt?: string;
  entitySourceName?: string;
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const slug = sp.get("slug");
    const periodParam = sp.get("period");
    const startParam = sp.get("start");
    const endParam = sp.get("end");
    if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });

    const auth = await authorizeForSlug(request, slug);
    if (!auth.ok) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getServiceClient();
    const { data: client } = await supabase.from("clients").select("id").eq("slug", slug).maybeSingle();
    if (!client) return Response.json({ error: "Client not found" }, { status: 404 });

    const { data: keyRows } = await supabase
      .from("dashboard_data")
      .select("data")
      .eq("client_id", client.id)
      .eq("section", "api_keys")
      .is("period_id", null)
      .limit(5);
    const keys: Record<string, string> = {};
    for (const row of keyRows || []) if (row.data) Object.assign(keys, row.data as Record<string, string>);
    const pitKey = keys.ghl_pit_key;
    const locationId = keys.ghl_account_id;
    if (!pitKey || !locationId) {
      return Response.json({ error: "This client has no Ghutte connection configured." }, { status: 400 });
    }

    // Resolve range.
    let start: string;
    let end: string;
    if (startParam && endParam) {
      start = startParam;
      end = endParam;
    } else {
      let pq = supabase.from("reporting_periods").select("start_date, end_date");
      if (periodParam) {
        const isUuid = /^[0-9a-f]{8}-/.test(periodParam);
        pq = isUuid ? pq.eq("id", periodParam) : pq.eq("period_key", periodParam);
      } else {
        pq = pq.eq("is_current", true);
      }
      const { data: period } = await pq.maybeSingle();
      if (!period) return Response.json({ error: "Period not found" }, { status: 404 });
      start = period.start_date;
      end = period.end_date;
    }

    // Page all transactions for the range.
    const txns: GHLTxn[] = [];
    let offset = 0;
    const limit = 100;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const url = `${GHL_BASE}/payments/transactions?altId=${encodeURIComponent(locationId)}&altType=location&startAt=${start}&endAt=${end}&limit=${limit}&offset=${offset}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${pitKey}`, Version: "2021-07-28", Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`GHL payments/transactions error ${res.status}`);
      const body = await res.json();
      const rows: GHLTxn[] = body.data || [];
      txns.push(...rows);
      const total = body.totalCount ?? txns.length;
      offset += limit;
      if (rows.length < limit || offset >= total) break;
    }

    const transactions = txns.map((t) => ({
      date: t.createdAt || "",
      client: t.contactName || "—",
      key: t.contactId || t.contactEmail || (t.contactName || "").toLowerCase(),
      email: t.contactEmail || "",
      product: canonicalProduct(t.entitySourceName),
      amount: Number(t.amount) || 0,
      status: (t.status || "pending").toLowerCase(),
    }));

    return Response.json({ success: true, period: { start, end }, generatedAt: new Date().toISOString(), transactions });
  } catch (e) {
    console.error("GHL payments feed error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
