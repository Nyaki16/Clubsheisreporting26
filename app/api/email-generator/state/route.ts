import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getBrand } from "@/lib/email-generator/brand";

export const maxDuration = 30;
const SECTION = "email_generator";

function checkAuth(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return true;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const adminCookie = request.cookies.get("admin_session");
  return adminCookie?.value === "true";
}

function getSlugFromRequest(request: NextRequest): string | null {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  if (typeof slug === "string" && slug.trim()) return slug.trim();
  return null;
}

async function resolveClient(slug: string) {
  const brand = getBrand(slug);
  if (!brand) {
    return { error: `Email generator not configured for "${slug}"`, status: 400 } as const;
  }
  const supabase = getServiceClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("slug", slug)
    .single();
  if (!client) {
    return { error: `Client "${slug}" not found`, status: 404 } as const;
  }
  return { clientId: client.id as string } as const;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const slug = getSlugFromRequest(request);
    if (!slug) {
      return Response.json({ error: "slug required" }, { status: 400 });
    }
    const resolved = await resolveClient(slug);
    if ("error" in resolved) {
      return Response.json({ error: resolved.error }, { status: resolved.status });
    }
    const supabase = getServiceClient();
    const { data: row } = await supabase
      .from("dashboard_data")
      .select("data, updated_at")
      .eq("client_id", resolved.clientId)
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
    const slug = typeof (body as Record<string, unknown>).slug === "string"
      ? ((body as Record<string, unknown>).slug as string).trim()
      : "";
    if (!slug) {
      return Response.json({ error: "slug required in body" }, { status: 400 });
    }
    const resolved = await resolveClient(slug);
    if ("error" in resolved) {
      return Response.json({ error: resolved.error }, { status: resolved.status });
    }
    const { slug: _, ...payload } = body as Record<string, unknown>;
    const supabase = getServiceClient();
    const { data: existing } = await supabase
      .from("dashboard_data")
      .select("id")
      .eq("client_id", resolved.clientId)
      .eq("section", SECTION)
      .is("period_id", null)
      .limit(1)
      .maybeSingle();
    const now = new Date().toISOString();
    if (existing) {
      await supabase
        .from("dashboard_data")
        .update({ data: payload, updated_at: now })
        .eq("id", existing.id);
    } else {
      await supabase.from("dashboard_data").insert({
        client_id: resolved.clientId,
        period_id: null,
        section: SECTION,
        data: payload,
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
    const slug = getSlugFromRequest(request);
    if (!slug) {
      return Response.json({ error: "slug required" }, { status: 400 });
    }
    const resolved = await resolveClient(slug);
    if ("error" in resolved) {
      return Response.json({ error: resolved.error }, { status: resolved.status });
    }
    const supabase = getServiceClient();
    await supabase
      .from("dashboard_data")
      .delete()
      .eq("client_id", resolved.clientId)
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
