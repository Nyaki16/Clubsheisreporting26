import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import crypto from "crypto";

function checkAdmin(request: NextRequest) {
  const adminCookie = request.cookies.get("admin_session");
  const authHeader = request.headers.get("authorization");
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword && authHeader !== `Bearer ${adminPassword}`) {
    if (adminCookie?.value !== "true") return false;
  }
  return true;
}

// GET: List all clients with their access settings
export async function GET(request: NextRequest) {
  if (!checkAdmin(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, slug, is_active")
    .eq("is_active", true)
    .order("name");

  if (!clients) return Response.json({ clients: [] });

  // Fetch access records for all clients
  const clientIds = clients.map((c) => c.id);
  const { data: accessRows } = await supabase
    .from("dashboard_data")
    .select("client_id, data")
    .in("client_id", clientIds)
    .is("period_id", null)
    .eq("section", "client_access");

  const accessMap: Record<string, Record<string, unknown>> = {};
  for (const row of accessRows || []) {
    accessMap[row.client_id] = row.data as Record<string, unknown>;
  }

  const result = clients.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    password: (accessMap[c.id]?.password as string) || null,
    isEnabled: accessMap[c.id]?.isEnabled !== false,
    shareToken: (accessMap[c.id]?.shareToken as string) || null,
    lastLogin: (accessMap[c.id]?.lastLogin as string) || null,
  }));

  return Response.json({ clients: result });
}

// PATCH: Update a client's access settings
export async function PATCH(request: NextRequest) {
  if (!checkAdmin(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clientId, action, password } = await request.json();
  if (!clientId || !action) {
    return Response.json({ error: "clientId and action required" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Get current access data
  const { data: existing } = await supabase
    .from("dashboard_data")
    .select("data")
    .eq("client_id", clientId)
    .is("period_id", null)
    .eq("section", "client_access")
    .maybeSingle();

  const currentData = (existing?.data as Record<string, unknown>) || {
    password: crypto.randomBytes(4).toString("hex"),
    isEnabled: true,
    shareToken: crypto.randomBytes(16).toString("hex"),
    lastLogin: null,
  };

  switch (action) {
    case "toggle":
      currentData.isEnabled = !currentData.isEnabled;
      break;
    case "resetPassword":
      currentData.password = password || crypto.randomBytes(4).toString("hex");
      break;
    case "regenerateToken":
      currentData.shareToken = crypto.randomBytes(16).toString("hex");
      break;
    default:
      return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  if (existing) {
    await supabase.from("dashboard_data")
      .update({
        data: currentData,
        updated_at: new Date().toISOString(),
      })
      .eq("client_id", clientId)
      .is("period_id", null)
      .eq("section", "client_access");
  } else {
    await supabase.from("dashboard_data").insert({
      client_id: clientId,
      period_id: null,
      section: "client_access",
      data: currentData,
    });
  }

  return Response.json({ success: true, data: currentData });
}
