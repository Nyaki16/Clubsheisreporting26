import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const maxDuration = 30;
const LINK_INTERIORS_SLUG = "link-interiors";
const SECTION = "email_generator";

function checkAuth(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return true;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const adminCookie = request.cookies.get("admin_session");
  return adminCookie?.value === "true";
}

async function getClientId() {
  const supabase = getServiceClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("slug", LINK_INTERIORS_SLUG)
    .single();
  return client?.id as string | undefined;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const clientId = await getClientId();
    if (!clientId) {
      return Response.json({ error: "Link Interiors client not found" }, { status: 404 });
    }
    const supabase = getServiceClient();
    const { data: row } = await supabase
      .from("dashboard_data")
      .select("data, updated_at")
      .eq("client_id", clientId)
      .eq("section", SECTION)
      .is("period_id", null)
      .limit(1)
      .maybeSingle();
    return Response.json({
      data: row?.data || null,
      updatedAt: row?.updated_at || null,
    });
  } catch (e) {
    return Response.json(
      { error: "Load failed: " + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid body" }, { status: 400 });
    }
    const clientId = await getClientId();
    if (!clientId) {
      return Response.json({ error: "Link Interiors client not found" }, { status: 404 });
    }
    const supabase = getServiceClient();
    const { data: existing } = await supabase
      .from("dashboard_data")
      .select("id")
      .eq("client_id", clientId)
      .eq("section", SECTION)
      .is("period_id", null)
      .limit(1)
      .maybeSingle();
    const now = new Date().toISOString();
    if (existing) {
      await supabase
        .from("dashboard_data")
        .update({ data: body, updated_at: now })
        .eq("id", existing.id);
    } else {
      await supabase.from("dashboard_data").insert({
        client_id: clientId,
        period_id: null,
        section: SECTION,
        data: body,
      });
    }
    return Response.json({ success: true, updatedAt: now });
  } catch (e) {
    return Response.json(
      { error: "Save failed: " + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!checkAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const clientId = await getClientId();
    if (!clientId) {
      return Response.json({ error: "Link Interiors client not found" }, { status: 404 });
    }
    const supabase = getServiceClient();
    await supabase
      .from("dashboard_data")
      .delete()
      .eq("client_id", clientId)
      .eq("section", SECTION)
      .is("period_id", null);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json(
      { error: "Clear failed: " + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }
}
