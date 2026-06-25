import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { authorizeForSlug } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Junior programme info per client: kid's name + level (1/2/3). Stored in
// dashboard_data section "juniorInfo" (period_id NULL), keyed by client key.
// Gated: admin or matching client.

interface JuniorEntry { kidName: string; level: string; client: string; updatedAt: string }
type JuniorMap = Record<string, JuniorEntry>;

async function resolveClient(slug: string) {
  const supabase = getServiceClient();
  const { data } = await supabase.from("clients").select("id").eq("slug", slug).maybeSingle();
  return data?.id as string | undefined;
}
async function loadMap(clientId: string): Promise<JuniorMap> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("dashboard_data")
    .select("data")
    .eq("client_id", clientId)
    .is("period_id", null)
    .eq("section", "juniorInfo")
    .maybeSingle();
  return ((data?.data as { info?: JuniorMap } | null)?.info) || {};
}
async function saveMap(clientId: string, info: JuniorMap) {
  const supabase = getServiceClient();
  const { data: existing } = await supabase
    .from("dashboard_data")
    .select("id")
    .eq("client_id", clientId)
    .is("period_id", null)
    .eq("section", "juniorInfo")
    .maybeSingle();
  const payload = { info };
  if (existing) {
    await supabase.from("dashboard_data").update({ data: payload, updated_at: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await supabase.from("dashboard_data").insert({ client_id: clientId, period_id: null, section: "juniorInfo", data: payload });
  }
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });
  if (!(await authorizeForSlug(request, slug)).ok) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const clientId = await resolveClient(slug);
  if (!clientId) return Response.json({ error: "Client not found" }, { status: 404 });
  return Response.json({ success: true, info: await loadMap(clientId) });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = body.slug;
    if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });
    if (!(await authorizeForSlug(request, slug)).ok) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clientId = await resolveClient(slug);
    if (!clientId) return Response.json({ error: "Client not found" }, { status: 404 });

    const key = String(body.key || "").trim();
    if (!key) return Response.json({ error: "key required" }, { status: 400 });
    const kidName = String(body.kidName || "").trim();
    const level = String(body.level || "").trim();

    const info = await loadMap(clientId);
    if (kidName || level) {
      info[key] = { kidName, level, client: String(body.client || ""), updatedAt: new Date().toISOString() };
    } else {
      delete info[key];
    }
    await saveMap(clientId, info);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
