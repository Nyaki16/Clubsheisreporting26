import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const maxDuration = 60;

const GHL_UPLOAD_URL = "https://services.leadconnectorhq.com/medias/upload-file";
const LINK_INTERIORS_SLUG = "link-interiors";
const MAX_BYTES = 25 * 1024 * 1024;

function checkAuth(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return true;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const adminCookie = request.cookies.get("admin_session");
  return adminCookie?.value === "true";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "image";
}

export async function POST(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file");
    const slotId = form.get("slotId");
    const campaignDate = form.get("campaignDate");
    const productName = form.get("productName");

    if (!(file instanceof File)) {
      return Response.json({ error: "file required" }, { status: 400 });
    }
    if (typeof slotId !== "string" || !slotId) {
      return Response.json({ error: "slotId required" }, { status: 400 });
    }
    if (file.size === 0) {
      return Response.json({ error: "Empty file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "File exceeds 25MB" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return Response.json({ error: "Only image files allowed" }, { status: 400 });
    }

    const supabase = getServiceClient();
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", LINK_INTERIORS_SLUG)
      .single();
    if (!client) {
      return Response.json({ error: "Link Interiors client not found" }, { status: 404 });
    }

    const { data: keyRows } = await supabase
      .from("dashboard_data")
      .select("data")
      .eq("client_id", client.id)
      .eq("section", "api_keys")
      .is("period_id", null)
      .limit(5);

    const keys: Record<string, string> = {};
    for (const row of keyRows || []) {
      const d = row.data as Record<string, string>;
      if (d) Object.assign(keys, d);
    }
    const pitKey = keys.ghl_pit_key;
    const locationId = keys.ghl_account_id;
    if (!pitKey || !locationId) {
      return Response.json(
        { error: "Missing ghl_pit_key or ghl_account_id for Link Interiors" },
        { status: 400 }
      );
    }

    const ext = (file.name.match(/\.[a-z0-9]+$/i)?.[0] || "").toLowerCase() ||
      (file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg");
    const productSlug = typeof productName === "string" && productName ? slugify(productName) : slotId;
    const datePart = typeof campaignDate === "string" && campaignDate ? campaignDate : new Date().toISOString().slice(0, 10);
    const uploadName = `link-interiors-${datePart}-${productSlug}${ext}`;

    const outbound = new FormData();
    outbound.append("locationId", locationId);
    outbound.append("name", uploadName);
    outbound.append("file", file, uploadName);

    const ghlRes = await fetch(GHL_UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pitKey}`,
        Version: "2021-07-28",
        Accept: "application/json",
      },
      body: outbound,
    });

    if (!ghlRes.ok) {
      const errText = await ghlRes.text();
      console.error("GHL media upload error:", ghlRes.status, errText);
      return Response.json({ error: `GHL upload failed: ${ghlRes.status}` }, { status: 502 });
    }

    const body = (await ghlRes.json()) as { fileId?: string; url?: string };
    if (!body.url) {
      return Response.json({ error: "GHL upload returned no URL" }, { status: 502 });
    }

    return Response.json({
      success: true,
      data: {
        slotId,
        url: body.url,
        fileId: body.fileId,
        uploadName,
      },
    });
  } catch (e) {
    console.error("Upload image error:", e);
    return Response.json(
      { error: "Upload failed: " + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }
}
