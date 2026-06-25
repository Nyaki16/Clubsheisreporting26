import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { authorizeForSlug } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Live GHL contact lookup (email + cell) for the client drill-down.
// `key` is the GHL contactId. Manual-only clients (key "manual:...") have no
// GHL contact. Gated: admin or matching client.

export async function GET(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug");
    const key = request.nextUrl.searchParams.get("key");
    if (!slug || !key) return Response.json({ error: "Missing slug/key" }, { status: 400 });
    if (!(await authorizeForSlug(request, slug)).ok) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (key.startsWith("manual:")) return Response.json({ success: true, contact: null });

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
    if (!pitKey) return Response.json({ success: true, contact: null });

    const res = await fetch(`https://services.leadconnectorhq.com/contacts/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${pitKey}`, Version: "2021-07-28", Accept: "application/json" },
    });
    if (!res.ok) return Response.json({ success: true, contact: null });
    const body = await res.json();
    const c = body.contact || body || {};
    return Response.json({
      success: true,
      contact: {
        email: c.email || "",
        phone: c.phone || "",
        name: c.name || [c.firstName, c.lastName].filter(Boolean).join(" "),
      },
    });
  } catch (e) {
    console.error("GHL contact lookup error:", e);
    return Response.json({ success: true, contact: null });
  }
}
