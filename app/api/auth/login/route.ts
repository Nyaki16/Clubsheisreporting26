import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { slug, password, token } = await request.json();
    if (!slug) {
      return Response.json({ error: "Missing client slug" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data: client } = await supabase
      .from("clients")
      .select("id, slug, name")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (!client) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    // Get access record from dashboard_data
    const { data: accessRow } = await supabase
      .from("dashboard_data")
      .select("data")
      .eq("client_id", client.id)
      .is("period_id", null)
      .eq("section", "client_access")
      .maybeSingle();

    const access = accessRow?.data as { password?: string; isEnabled?: boolean; shareToken?: string } | null;

    // Check if access is enabled
    if (access && access.isEnabled === false) {
      return Response.json({ error: "Access is currently disabled. Please contact your account manager." }, { status: 403 });
    }

    // Authenticate: either by token (direct link) or password
    let authenticated = false;

    if (token && access?.shareToken) {
      // Direct link login
      authenticated = token === access.shareToken;
    } else if (password) {
      // Password login — check Supabase first, then fall back to env vars
      if (access?.password) {
        authenticated = password === access.password;
      } else {
        // Legacy: check env var
        const envKey = `CLIENT_PASSWORD_${slug.replace(/-/g, "_").toUpperCase()}`;
        const expectedPassword = process.env[envKey] || process.env.DEFAULT_CLIENT_PASSWORD || "clubsheis2026";
        authenticated = password === expectedPassword;
      }
    }

    if (!authenticated) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Update last login
    if (access) {
      await supabase.from("dashboard_data")
        .update({
          data: { ...access, lastLogin: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        })
        .eq("client_id", client.id)
        .is("period_id", null)
        .eq("section", "client_access");
    }

    const cookieStore = await cookies();
    cookieStore.set("client_session", JSON.stringify({ clientId: client.id, slug: client.slug }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return Response.json({ success: true, slug: client.slug });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
