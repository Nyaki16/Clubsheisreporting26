import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { authorizeForSlug } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Cohort (intake) assignments for cohort-based programs (Core Business English,
// 90 Days, Junior). Stored in dashboard_data section "cohorts" (period_id NULL),
// keyed by `${clientKey}||${product}`. Gated: admin or matching client.

interface CohortAssignment {
  cohort: string; // ISO date of the intake (YYYY-MM-DD)
  client: string;
  product: string;
  updatedAt: string;
}
type CohortMap = Record<string, CohortAssignment>;

async function resolveClient(slug: string) {
  const supabase = getServiceClient();
  const { data } = await supabase.from("clients").select("id").eq("slug", slug).maybeSingle();
  return data?.id as string | undefined;
}

async function loadMap(clientId: string): Promise<CohortMap> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("dashboard_data")
    .select("data")
    .eq("client_id", clientId)
    .is("period_id", null)
    .eq("section", "cohorts")
    .maybeSingle();
  return ((data?.data as { assignments?: CohortMap } | null)?.assignments) || {};
}

async function saveMap(clientId: string, assignments: CohortMap) {
  const supabase = getServiceClient();
  const { data: existing } = await supabase
    .from("dashboard_data")
    .select("id")
    .eq("client_id", clientId)
    .is("period_id", null)
    .eq("section", "cohorts")
    .maybeSingle();
  const payload = { assignments };
  if (existing) {
    await supabase.from("dashboard_data").update({ data: payload, updated_at: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await supabase.from("dashboard_data").insert({ client_id: clientId, period_id: null, section: "cohorts", data: payload });
  }
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });
  if (!(await authorizeForSlug(request, slug)).ok) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const clientId = await resolveClient(slug);
  if (!clientId) return Response.json({ error: "Client not found" }, { status: 404 });
  return Response.json({ success: true, assignments: await loadMap(clientId) });
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
    const product = String(body.product || "").trim();
    const cohort = String(body.cohort || "").trim(); // empty clears it
    if (!key || !product) return Response.json({ error: "key and product required" }, { status: 400 });

    const mapKey = `${key}||${product}`;
    const assignments = await loadMap(clientId);
    if (cohort) {
      assignments[mapKey] = { cohort, client: String(body.client || ""), product, updatedAt: new Date().toISOString() };
    } else {
      delete assignments[mapKey];
    }
    await saveMap(clientId, assignments);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
