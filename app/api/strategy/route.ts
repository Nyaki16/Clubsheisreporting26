import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServiceClient } from "@/lib/supabase";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const adminCookie = request.cookies.get("admin_session");
    const authHeader = request.headers.get("authorization");
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminPassword && authHeader !== `Bearer ${adminPassword}`) {
      if (adminCookie?.value !== "true") {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { clientId, periodId } = await request.json();
    if (!clientId || !periodId) {
      return Response.json({ error: "clientId and periodId required" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Fetch all sections for this client + period
    const { data: sections } = await supabase
      .from("dashboard_data")
      .select("section, data")
      .eq("client_id", clientId)
      .eq("period_id", periodId);

    if (!sections?.length) {
      return Response.json({ error: "No data found for this client/period" }, { status: 404 });
    }

    // Fetch client name
    const { data: client } = await supabase
      .from("clients")
      .select("name")
      .eq("id", clientId)
      .single();

    // Fetch period label
    const { data: period } = await supabase
      .from("reporting_periods")
      .select("label")
      .eq("id", periodId)
      .single();

    // Also get previous period for comparison
    const { data: prevPeriod } = await supabase
      .from("reporting_periods")
      .select("id, label")
      .lt("start_date", period?.label ? "2099-01-01" : "2099-01-01")
      .neq("id", periodId)
      .order("start_date", { ascending: false })
      .limit(1)
      .single();

    let prevSections: typeof sections = [];
    if (prevPeriod) {
      const { data } = await supabase
        .from("dashboard_data")
        .select("section, data")
        .eq("client_id", clientId)
        .eq("period_id", prevPeriod.id);
      prevSections = data || [];
    }

    // Build the data context
    const sectionMap: Record<string, unknown> = {};
    for (const s of sections) sectionMap[s.section] = s.data;

    const prevSectionMap: Record<string, unknown> = {};
    for (const s of prevSections) prevSectionMap[s.section] = s.data;

    const dataContext = JSON.stringify({
      client: client?.name || "Unknown",
      period: period?.label || "Unknown",
      previousPeriod: prevPeriod?.label || null,
      current: sectionMap,
      previous: prevSectionMap,
    }, null, 2);

    // Call Claude API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are a senior creative strategist at a digital marketing agency in South Africa. You're reviewing a client's monthly performance data to provide strategic recommendations.

Analyze this data and provide actionable, specific insights. Reference actual numbers. Don't be generic — be the strategist who spots the opportunity everyone else misses.

CLIENT DATA:
${dataContext}

Respond in this exact JSON format:
{
  "summary": "2-3 sentence executive summary of the month's performance",
  "revenueOpportunities": [
    {"title": "Short title", "insight": "Specific insight with numbers", "action": "What to do", "impact": "high|medium|low"}
  ],
  "adOptimization": [
    {"title": "Short title", "insight": "Specific insight", "action": "What to do", "impact": "high|medium|low"}
  ],
  "growthPlays": [
    {"title": "Short title", "insight": "Specific insight", "action": "What to do", "impact": "high|medium|low"}
  ],
  "churnPrevention": [
    {"title": "Short title", "insight": "Specific insight", "action": "What to do", "impact": "high|medium|low"}
  ]
}

Keep each array to 2-3 items max. Be specific, not generic. Use South African Rand (R) for currency. If a section has no relevant data, return an empty array.`,
        },
      ],
    });

    // Extract the text content
    const textBlock = message.content.find(b => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json({ error: "No response from AI" }, { status: 500 });
    }

    // Parse the JSON response
    let strategy;
    try {
      // Extract JSON from the response (may have markdown code blocks)
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      strategy = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(textBlock.text);
    } catch {
      return Response.json({ error: "Failed to parse AI response", raw: textBlock.text }, { status: 500 });
    }

    // Store in Supabase
    await supabase
      .from("dashboard_data")
      .upsert(
        {
          client_id: clientId,
          period_id: periodId,
          section: "strategy",
          data: { ...strategy, generatedAt: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id,period_id,section" }
      );

    return Response.json({ success: true, strategy });
  } catch (e) {
    console.error("Strategy generation error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
