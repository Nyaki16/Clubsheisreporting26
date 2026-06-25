import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { authorizeForSlug } from "@/lib/auth";
import { canonicalProduct } from "@/lib/ghl/product-aliases";

export const dynamic = "force-dynamic";

// Manually-entered payments (EFT, cash, etc.) that never went through Ghutte.
// Stored in dashboard_data section "manualPayments" (period_id NULL = all-time,
// one row per client). Merged into /api/ghl/payments so they count toward
// totals and reduce outstanding balances. Gated: admin or matching client.

export interface ManualPayment {
  id: string;
  key: string; // client key — use an existing client's key to attach to their history
  client: string;
  product: string;
  amount: number;
  date: string; // ISO
  method: string; // e.g. "EFT"
  note?: string;
  createdAt: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

async function loadEntries(clientId: string): Promise<ManualPayment[]> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("dashboard_data")
    .select("data")
    .eq("client_id", clientId)
    .is("period_id", null)
    .eq("section", "manualPayments")
    .maybeSingle();
  return ((data?.data as { entries?: ManualPayment[] } | null)?.entries) || [];
}

async function saveEntries(clientId: string, entries: ManualPayment[]) {
  const supabase = getServiceClient();
  const { data: existing } = await supabase
    .from("dashboard_data")
    .select("id")
    .eq("client_id", clientId)
    .is("period_id", null)
    .eq("section", "manualPayments")
    .maybeSingle();
  const payload = { entries };
  if (existing) {
    await supabase.from("dashboard_data").update({ data: payload, updated_at: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await supabase.from("dashboard_data").insert({ client_id: clientId, period_id: null, section: "manualPayments", data: payload });
  }
}

async function resolveClient(slug: string) {
  const supabase = getServiceClient();
  const { data } = await supabase.from("clients").select("id").eq("slug", slug).maybeSingle();
  return data?.id as string | undefined;
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });
  if (!(await authorizeForSlug(request, slug)).ok) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const clientId = await resolveClient(slug);
  if (!clientId) return Response.json({ error: "Client not found" }, { status: 404 });
  return Response.json({ success: true, entries: await loadEntries(clientId) });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = body.slug;
    if (!slug) return Response.json({ error: "Missing slug" }, { status: 400 });
    if (!(await authorizeForSlug(request, slug)).ok) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clientId = await resolveClient(slug);
    if (!clientId) return Response.json({ error: "Client not found" }, { status: 404 });

    const client = String(body.client || "").trim();
    const product = canonicalProduct(String(body.product || "").trim());
    const amount = Number(body.amount);
    const date = String(body.date || "").trim();
    if (!client) return Response.json({ error: "Client name required" }, { status: 400 });
    if (!(amount > 0)) return Response.json({ error: "Amount must be greater than 0" }, { status: 400 });
    if (!DATE_RE.test(date)) return Response.json({ error: "Valid date required" }, { status: 400 });

    // Attach to an existing client key when provided (so it merges with their
    // Ghutte history and reduces outstanding); otherwise key off the name.
    const key = String(body.key || "").trim() || `manual:${client.toLowerCase()}`;

    const entry: ManualPayment = {
      id: globalThis.crypto.randomUUID(),
      key,
      client,
      product,
      amount,
      date: new Date(date).toISOString(),
      method: String(body.method || "EFT").trim() || "EFT",
      note: String(body.note || "").trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const entries = await loadEntries(clientId);
    entries.push(entry);
    await saveEntries(clientId, entries);
    return Response.json({ success: true, entry });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const slug = request.nextUrl.searchParams.get("slug");
    const id = request.nextUrl.searchParams.get("id");
    if (!slug || !id) return Response.json({ error: "Missing slug or id" }, { status: 400 });
    if (!(await authorizeForSlug(request, slug)).ok) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const clientId = await resolveClient(slug);
    if (!clientId) return Response.json({ error: "Client not found" }, { status: 404 });

    const entries = (await loadEntries(clientId)).filter((e) => e.id !== id);
    await saveEntries(clientId, entries);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
