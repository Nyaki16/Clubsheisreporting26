import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const { clientId, periodId } = await request.json();
  if (!clientId || !periodId) {
    return Response.json({ error: "clientId and periodId required" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const token = crypto.randomBytes(16).toString("hex");

  // Check if an export already exists for this client+period
  const { data: existing } = await supabase
    .from("dashboard_data")
    .select("data")
    .eq("client_id", clientId)
    .eq("period_id", periodId)
    .eq("section", "report_export")
    .single();

  if (existing?.data) {
    // Update existing export with a fresh token
    await supabase
      .from("dashboard_data")
      .update({
        data: { token, createdAt: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      })
      .eq("client_id", clientId)
      .eq("period_id", periodId)
      .eq("section", "report_export");
  } else {
    // Create new export record
    await supabase.from("dashboard_data").insert({
      client_id: clientId,
      period_id: periodId,
      section: "report_export",
      data: { token, createdAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    });
  }

  const base = new URL(request.url).origin;
  const publicUrl = `${base}/r/${token}`;

  return Response.json({ success: true, url: publicUrl, token });
}
