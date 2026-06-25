import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { authorizeForSlug } from "@/lib/auth";
import { canonicalProduct } from "@/lib/ghl/product-aliases";
import { programBalance } from "@/lib/ghl/program-pricing";

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

    const headers = { Authorization: `Bearer ${pitKey}`, Version: "2021-07-28", Accept: "application/json" };
    async function pageTxns(from: string, to: string): Promise<GHLTxn[]> {
      const out: GHLTxn[] = [];
      let offset = 0;
      const limit = 100;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const url = `${GHL_BASE}/payments/transactions?altId=${encodeURIComponent(locationId)}&altType=location&startAt=${from}&endAt=${to}&limit=${limit}&offset=${offset}`;
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`GHL payments/transactions error ${res.status}`);
        const body = await res.json();
        const rows: GHLTxn[] = body.data || [];
        out.push(...rows);
        const total = body.totalCount ?? out.length;
        offset += limit;
        if (rows.length < limit || offset >= total) break;
      }
      return out;
    }

    const map = (t: GHLTxn) => ({
      date: t.createdAt || "",
      client: t.contactName || "—",
      key: t.contactId || t.contactEmail || (t.contactName || "").toLowerCase(),
      email: t.contactEmail || "",
      product: canonicalProduct(t.entitySourceName, Number(t.amount) || 0),
      amount: Number(t.amount) || 0,
      status: (t.status || "pending").toLowerCase(),
      id: "" as string,
      manual: false,
      method: "" as string,
    });
    type Row = ReturnType<typeof map>;

    // Period feed (what's shown in the tabs) + all-time history (for balances and
    // the per-client drill-down — outstanding is a running balance, not period-bound).
    const balanceFloor = `${Math.max(2024, new Date(end).getFullYear() - 2)}-01-01`;
    const [periodRows, allRows] = await Promise.all([
      pageTxns(start, end),
      pageTxns(balanceFloor, end),
    ]);
    const transactions: Row[] = periodRows.map(map);
    const allTime: Row[] = allRows.map(map);

    // Merge manually-entered payments (EFT etc.) — they count toward totals and
    // outstanding just like Ghutte payments.
    const { data: manualRow } = await supabase
      .from("dashboard_data")
      .select("data")
      .eq("client_id", client.id)
      .is("period_id", null)
      .eq("section", "manualPayments")
      .maybeSingle();
    const manualEntries = ((manualRow?.data as { entries?: Array<Record<string, unknown>> } | null)?.entries) || [];
    const endTs = new Date(`${end}T23:59:59.999Z`).getTime();
    const startTs = new Date(`${start}T00:00:00.000Z`).getTime();
    for (const m of manualEntries) {
      const dateIso = String(m.date || "");
      const t = new Date(dateIso).getTime();
      const row: Row = {
        date: dateIso,
        client: String(m.client || "—"),
        key: String(m.key || `manual:${String(m.client || "").toLowerCase()}`),
        email: "",
        product: canonicalProduct(String(m.product || ""), Number(m.amount) || 0),
        amount: Number(m.amount) || 0,
        status: "succeeded",
        id: String(m.id || ""),
        manual: true,
        method: String(m.method || "EFT"),
      };
      if (!isNaN(t) && t <= endTs) allTime.push(row); // all-time (up to period end) for balances
      if (!isNaN(t) && t >= startTs && t <= endTs) transactions.push(row); // period feed
    }

    // Per-client all-time balances. paid/count use SUCCEEDED payments only.
    const byClient = new Map<string, { name: string; rows: Row[] }>();
    for (const r of allTime) {
      const c = byClient.get(r.key) || { name: r.client, rows: [] };
      c.rows.push(r);
      byClient.set(r.key, c);
    }
    const balances: Record<string, {
      name: string;
      totalPaid: number;
      totalOutstanding: number;
      programs: ReturnType<typeof programBalance>[];
      history: Row[];
    }> = {};
    for (const [key, { name, rows }] of byClient) {
      const byProgram = new Map<string, number[]>();
      for (const r of rows) {
        if (r.status !== "succeeded") continue;
        const list = byProgram.get(r.product) || [];
        list.push(r.amount);
        byProgram.set(r.product, list);
      }
      const programs = [...byProgram.entries()].map(([product, amounts]) => programBalance(product, amounts));
      balances[key] = {
        name,
        totalPaid: programs.reduce((a, p) => a + p.paid, 0),
        totalOutstanding: programs.reduce((a, p) => a + p.outstanding, 0),
        programs,
        history: rows.sort((a, b) => (a.date < b.date ? 1 : -1)),
      };
    }

    // Cohort assignments (intake date per client+program) for cohort-based programs.
    const { data: cohortRow } = await supabase
      .from("dashboard_data")
      .select("data")
      .eq("client_id", client.id)
      .is("period_id", null)
      .eq("section", "cohorts")
      .maybeSingle();
    const cohorts = ((cohortRow?.data as { assignments?: Record<string, { cohort: string }> } | null)?.assignments) || {};

    return Response.json({ success: true, period: { start, end }, generatedAt: new Date().toISOString(), transactions, balances, cohorts });
  } catch (e) {
    console.error("GHL payments feed error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
