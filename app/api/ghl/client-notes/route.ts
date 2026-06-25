import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { authorizeForSlug } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Free-text note per client. Stored in dashboard_data section "clientNotes"
// (period_id NULL), keyed by client key. Gated: admin or matching client.

interface NoteEntry { note: string; client: string; updatedAt: string }
type NoteMap = Record<string, NoteEntry>;

async function resolveClient(slug: string) {
  const supabase = getServiceClient();
  const { data } = await supabase.from("clients").select("id").eq("slug", slug).maybeSingle();
  return data?.id as string | undefined;
}
async function loadNotes(clientId: string): Promise<NoteMap> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("dashboard_data")
    .select("data")
    .eq("client_id", clientId)
    .is("period_id", null)
    .eq("section", "clientNotes")
    .maybeSingle();
  return ((data?.data as { notes?: NoteMap } | null)?.notes) || {};
}
async function saveNotes(clientId: string, notes: NoteMap) {
  const supabase = getServiceClient();
  const { data: existing } = await supabase
    .from("dashboard_data")
    .select("id")
    .eq("client_id", clientId)
    .is("period_id", null)
    .eq("section", "clientNotes")
    .maybeSingle();
  const payload = { notes };
  if (existing) {
    await supabase.from("dashboard_data").update({ data: payload, updated_at: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await supabase.from("dashboard_data").insert({ client_id: clientId, period_id: null, section: "clientNotes", data: payload });
  }
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });
  if (!(await authorizeForSlug(request, slug)).ok) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const clientId = await resolveClient(slug);
  if (!clientId) return Response.json({ error: "Client not found" }, { status: 404 });
  return Response.json({ success: true, notes: await loadNotes(clientId) });
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
    const note = String(body.note ?? "").trim();
    if (!key) return Response.json({ error: "key required" }, { status: 400 });

    const notes = await loadNotes(clientId);
    if (note) notes[key] = { note, client: String(body.client || ""), updatedAt: new Date().toISOString() };
    else delete notes[key];
    await saveNotes(clientId, notes);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
