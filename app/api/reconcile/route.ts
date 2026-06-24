import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { buildReconciliation } from "@/lib/reconcile";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Paystack ↔ Ghutte payment reconciliation for one client + period.
// Gated like the rest of the app: admin (any client) or a client session
// matching the slug (so it works inside the GHL embed).

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug");
    const periodParam = request.nextUrl.searchParams.get("period");
    if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });

    const isAdmin = request.cookies.get("admin_session")?.value === "true";
    if (!isAdmin) {
      let sessionSlug: string | null = null;
      try {
        const c = request.cookies.get("client_session")?.value;
        sessionSlug = c ? JSON.parse(c).slug : null;
      } catch {
        sessionSlug = null;
      }
      if (sessionSlug !== slug) return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getServiceClient();
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!client) return Response.json({ error: "Client not found" }, { status: 404 });

    // Merge api_keys rows (some clients have duplicates).
    const { data: keyRows } = await supabase
      .from("dashboard_data")
      .select("data")
      .eq("client_id", client.id)
      .eq("section", "api_keys")
      .is("period_id", null)
      .limit(5);
    const keys: Record<string, string> = {};
    for (const row of keyRows || []) if (row.data) Object.assign(keys, row.data as Record<string, string>);

    const paystackKey = keys.paystack_secret_key;
    const pitKey = keys.ghl_pit_key;
    const locationId = keys.ghl_account_id;
    if (!paystackKey || !pitKey || !locationId) {
      return Response.json(
        { error: "This client needs both Paystack and Ghutte (GHL) connected to reconcile." },
        { status: 400 },
      );
    }

    // Resolve period date range.
    let pq = supabase.from("reporting_periods").select("id, start_date, end_date");
    if (periodParam) {
      const isUuid = /^[0-9a-f]{8}-/.test(periodParam);
      pq = isUuid ? pq.eq("id", periodParam) : pq.eq("period_key", periodParam);
    } else {
      pq = pq.eq("is_current", true);
    }
    const { data: period } = await pq.maybeSingle();
    if (!period) return Response.json({ error: "Period not found" }, { status: 404 });

    const data = await buildReconciliation(paystackKey, pitKey, locationId, {
      start: period.start_date,
      end: period.end_date,
    });

    // Cache to dashboard_data so the report/PDF can read it without a live call.
    const { data: existing } = await supabase
      .from("dashboard_data")
      .select("id")
      .eq("client_id", client.id)
      .eq("period_id", period.id)
      .eq("section", "reconciliation")
      .maybeSingle();
    if (existing) {
      await supabase.from("dashboard_data").update({ data, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("dashboard_data").insert({ client_id: client.id, period_id: period.id, section: "reconciliation", data });
    }

    return Response.json({ success: true, data });
  } catch (e) {
    console.error("Reconcile error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
