import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Verify admin auth
    const authHeader = request.headers.get("authorization");
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminPassword && authHeader !== `Bearer ${adminPassword}`) {
      const adminCookie = request.cookies.get("admin_session");
      if (adminCookie?.value !== "true") {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { clientId, periodId } = await request.json();
    if (!clientId || !periodId) {
      return Response.json({ error: "Missing clientId or periodId" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Get GHL API key and account ID from dashboard_data (api_keys section, period_id=null)
    const { data: keyRows } = await supabase
      .from("dashboard_data")
      .select("data")
      .eq("client_id", clientId)
      .eq("section", "api_keys")
      .is("period_id", null)
      .limit(5);

    // Merge all api_keys rows (some clients have duplicates)
    const keys: Record<string, string> = {};
    for (const row of keyRows || []) {
      const d = row.data as Record<string, string>;
      if (d) Object.assign(keys, d);
    }

    if (!Object.keys(keys).length) {
      return Response.json({ error: "No API keys configured for this client" }, { status: 400 });
    }
    const ghlPitKey = keys.ghl_pit_key;
    const ghlAccountId = keys.ghl_account_id;

    if (!ghlPitKey || !ghlAccountId) {
      return Response.json({ error: "Missing ghl_pit_key or ghl_account_id in client API keys" }, { status: 400 });
    }

    // Get the period date range
    const { data: period } = await supabase
      .from("reporting_periods")
      .select("start_date, end_date")
      .eq("id", periodId)
      .single();

    if (!period) {
      return Response.json({ error: "Period not found" }, { status: 404 });
    }

    const periodStart = new Date(period.start_date);
    const periodEnd = new Date(period.end_date + "T23:59:59.999Z");

    // Call GHL API to get completed email schedules
    const ghlUrl = `https://services.leadconnectorhq.com/emails/schedule?locationId=${encodeURIComponent(ghlAccountId)}&limit=100&status=complete`;
    const ghlRes = await fetch(ghlUrl, {
      headers: {
        Authorization: `Bearer ${ghlPitKey}`,
        Version: "2021-07-28",
      },
    });

    if (!ghlRes.ok) {
      const errText = await ghlRes.text();
      console.error("GHL API error:", ghlRes.status, errText);
      return Response.json({ error: `GHL API error: ${ghlRes.status}` }, { status: 502 });
    }

    const ghlData = await ghlRes.json();
    const schedules: Array<{
      name?: string;
      subject?: string;
      createdAt?: string;
      totalCount?: number;
      successCount?: number;
      processed?: number;
      failed?: number;
      emailStatus?: string;
    }> = ghlData.schedules || [];

    // Filter to only emails within the period date range
    const filtered = schedules.filter((s) => {
      if (!s.createdAt) return false;
      const created = new Date(s.createdAt);
      return created >= periodStart && created <= periodEnd;
    });

    // Build campaigns list
    const campaigns = filtered.map((s) => {
      const sent = s.totalCount || 0;
      const delivered = s.successCount || 0;
      const failed = s.failed || 0;
      const rate = sent > 0 ? ((delivered / sent) * 100).toFixed(1) + "%" : "0%";
      return {
        name: s.name || "Untitled",
        subject: s.subject || "",
        date: s.createdAt ? new Date(s.createdAt).toISOString().split("T")[0] : "",
        sent,
        delivered,
        failed,
        deliveryRate: rate,
      };
    });

    // Sort by date descending
    campaigns.sort((a, b) => (b.date > a.date ? 1 : -1));

    // Aggregate KPIs
    const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0);
    const totalDelivered = campaigns.reduce((sum, c) => sum + c.delivered, 0);
    const totalFailed = campaigns.reduce((sum, c) => sum + c.failed, 0);
    const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) + "%" : "0%";

    const emailData = {
      kpis: {
        totalSent,
        totalDelivered,
        totalFailed,
        deliveryRate,
        campaignCount: campaigns.length,
      },
      campaigns,
    };

    // Store in dashboard_data
    const { data: existing } = await supabase
      .from("dashboard_data")
      .select("id")
      .eq("client_id", clientId)
      .eq("period_id", periodId)
      .eq("section", "email")
      .single();

    if (existing) {
      await supabase
        .from("dashboard_data")
        .update({ data: emailData, updated_at: new Date().toISOString() })
        .eq("client_id", clientId)
        .eq("period_id", periodId)
        .eq("section", "email");
    } else {
      await supabase
        .from("dashboard_data")
        .insert({
          client_id: clientId,
          period_id: periodId,
          section: "email",
          data: emailData,
        });
    }

    return Response.json({ success: true, data: emailData });
  } catch (e) {
    console.error("Email stats error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
