import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { buildGhlSales } from "@/lib/ghl/sales";
import { authorizeForSlug } from "@/lib/auth";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Ghutte sales activity for the Overview page: income per product + GHL
// transaction payment status. Honours either a monthly period or a custom
// ?start=&end= range. Gated: admin or the matching client session.

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
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
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

    // Resolve date range: custom range or monthly period.
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

    const data = await buildGhlSales(locationId, pitKey, { start, end });
    return Response.json({ success: true, data });
  } catch (e) {
    console.error("GHL sales error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
