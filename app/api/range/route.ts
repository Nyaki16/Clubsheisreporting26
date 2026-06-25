import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getClientBySlug } from "@/lib/clients";
import { buildSectionsForRange } from "@/lib/sync/range";
import { getClientSession, isAdminRequest } from "@/lib/auth";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Compute all core dashboard sections for an arbitrary date range, on demand.
// Results are cached per client+range in dashboard_data (section "range:<start>:<end>")
// so re-opening the same range is instant. `refresh=1` forces a recompute.
// Gated like the rest of the app (admin or client session matching slug).

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const slug = sp.get("slug");
    const start = sp.get("start");
    const end = sp.get("end");
    const refresh = sp.get("refresh") === "1";

    if (!slug || !start || !end) return Response.json({ error: "Missing slug/start/end" }, { status: 400 });
    if (!DATE_RE.test(start) || !DATE_RE.test(end)) return Response.json({ error: "Dates must be YYYY-MM-DD" }, { status: 400 });
    if (start > end) return Response.json({ error: "start must be on or before end" }, { status: 400 });

    // Auth: admin (any client) or client session matching slug.
    if (!(await isAdminRequest(request))) {
      const sessionSlug = (await getClientSession(request))?.slug ?? null;
      if (sessionSlug !== slug) return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = getClientBySlug(slug);
    if (!client) return Response.json({ error: "Client not found" }, { status: 404 });

    const supabase = getServiceClient();
    const cacheSection = `range:${start}:${end}`;

    if (!refresh) {
      const { data: cached } = await supabase
        .from("dashboard_data")
        .select("data, updated_at")
        .eq("client_id", client.uuid)
        .is("period_id", null)
        .eq("section", cacheSection)
        .maybeSingle();
      if (cached?.data) {
        return Response.json({ success: true, cached: true, updatedAt: cached.updated_at, data: cached.data });
      }
    }

    const label = `${start} → ${end}`;
    const { sections, errors } = await buildSectionsForRange(client, start, end, label);

    // Cache the computed sections for this range.
    const { data: existing } = await supabase
      .from("dashboard_data")
      .select("id")
      .eq("client_id", client.uuid)
      .is("period_id", null)
      .eq("section", cacheSection)
      .maybeSingle();
    if (existing) {
      await supabase.from("dashboard_data").update({ data: sections, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("dashboard_data").insert({ client_id: client.uuid, period_id: null, section: cacheSection, data: sections });
    }

    return Response.json({ success: true, cached: false, data: sections, errors });
  } catch (e) {
    console.error("Range compute error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
