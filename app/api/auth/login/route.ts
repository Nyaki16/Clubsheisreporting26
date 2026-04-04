import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { slug, password } = await request.json();
    if (!slug) {
      return Response.json({ error: "Missing client slug" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data: client } = await supabase
      .from("clients")
      .select("id, slug, name")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (!client) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    // Simple password check against env var (format: CLIENT_PASSWORD_<SLUG>)
    const envKey = `CLIENT_PASSWORD_${slug.replace(/-/g, "_").toUpperCase()}`;
    const expectedPassword = process.env[envKey] || process.env.DEFAULT_CLIENT_PASSWORD || "clubsheis2026";

    if (password !== expectedPassword) {
      return Response.json({ error: "Invalid password" }, { status: 401 });
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
