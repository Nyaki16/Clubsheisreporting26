import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { buildLiveGHL } from "@/lib/ghl/live";
import { getClientSession, isAdminRequest } from "@/lib/auth";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Live GHL data for the CRM tab. Called from the browser on load, so it relies
// on the existing session cookies: an admin can read any client, a client can
// only read their own. Looks up the client's PIT key + location id, calls the
// GHL API live for the period's date range, caches the result to the `ghl`
// section, and returns it.

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug");
    const periodParam = request.nextUrl.searchParams.get("period"); // period_key or uuid
    const startParam = request.nextUrl.searchParams.get("start"); // custom range YYYY-MM-DD
    const endParam = request.nextUrl.searchParams.get("end");
    if (!slug) {
      return Response.json({ error: "Missing slug" }, { status: 400 });
    }

    // --- Auth: admin (any client) or client matching this slug ---
    if (!(await isAdminRequest(request))) {
      const sessionSlug = (await getClientSession(request))?.slug ?? null;
      if (sessionSlug !== slug) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const supabase = getServiceClient();

    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!client) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    // --- API keys (merge duplicate rows, same as email-stats) ---
    const { data: keyRows } = await supabase
      .from("dashboard_data")
      .select("data")
      .eq("client_id", client.id)
      .eq("section", "api_keys")
      .is("period_id", null)
      .limit(5);

    const keys: Record<string, string> = {};
    for (const row of keyRows || []) {
      if (row.data) Object.assign(keys, row.data as Record<string, string>);
    }
    const pitKey = keys.ghl_pit_key;
    const locationId = keys.ghl_account_id;
    if (!pitKey || !locationId) {
      return Response.json(
        { error: "This client has no GHL connection configured." },
        { status: 400 },
      );
    }

    // --- Resolve date range: custom range, or a monthly period ---
    let rangeStart: string;
    let rangeEnd: string;
    let periodId: string | null = null;
    if (startParam && endParam) {
      rangeStart = startParam;
      rangeEnd = endParam;
    } else {
      let periodQuery = supabase.from("reporting_periods").select("id, start_date, end_date");
      if (periodParam) {
        const isUuid = /^[0-9a-f]{8}-/.test(periodParam);
        periodQuery = isUuid
          ? periodQuery.eq("id", periodParam)
          : periodQuery.eq("period_key", periodParam);
      } else {
        periodQuery = periodQuery.eq("is_current", true);
      }
      const { data: period } = await periodQuery.maybeSingle();
      if (!period) {
        return Response.json({ error: "Period not found" }, { status: 404 });
      }
      rangeStart = period.start_date;
      rangeEnd = period.end_date;
      periodId = period.id;
    }

    const live = await buildLiveGHL(locationId, pitKey, { start: rangeStart, end: rangeEnd });

    // Cache to the ghl section for monthly periods (custom ranges aren't cached here).
    if (periodId) {
      const { data: existing } = await supabase
        .from("dashboard_data")
        .select("id")
        .eq("client_id", client.id)
        .eq("period_id", periodId)
        .eq("section", "ghl")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("dashboard_data")
          .update({ data: live, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("dashboard_data")
          .insert({ client_id: client.id, period_id: periodId, section: "ghl", data: live });
      }
    }

    return Response.json({ success: true, data: live, fetchedAt: new Date().toISOString() });
  } catch (e) {
    console.error("Live GHL error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
