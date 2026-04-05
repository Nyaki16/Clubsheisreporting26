import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServiceClient } from "@/lib/supabase";

export const maxDuration = 60;

const SA_BENCHMARKS = `
South African Digital Marketing Benchmarks (2025-2026):
- Facebook Ads average CPC: R3-R8 (varies by industry)
- Facebook Ads average CTR: 0.9-1.5%
- Email delivery rate benchmark: 85-95%
- Email open rate benchmark: 15-25% (membership/coaching: 20-35%)
- Instagram engagement rate: 1-3% (coaching/community: 3-6%)
- Facebook organic reach: 2-5% of followers
- Paystack failed payment rate: <15% is healthy, >25% needs urgent attention
- Membership churn rate: 5-8% monthly is acceptable, >10% is concerning
- Ad spend to revenue ratio (ROAS): 3:1 minimum for profitability
`;

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

    // Fetch client name
    const { data: client } = await supabase
      .from("clients").select("name").eq("id", clientId).single();

    // Fetch period label
    const { data: period } = await supabase
      .from("reporting_periods").select("label").eq("id", periodId).single();

    // Fetch ALL sections for this client + period
    const { data: sections } = await supabase
      .from("dashboard_data")
      .select("section, data")
      .eq("client_id", clientId)
      .eq("period_id", periodId);

    const sectionMap: Record<string, unknown> = {};
    for (const s of sections || []) sectionMap[s.section] = s.data;

    // Also get previous period for comparison
    const { data: allPeriods } = await supabase
      .from("reporting_periods")
      .select("id, label")
      .order("start_date", { ascending: false })
      .limit(4);

    const prevPeriod = allPeriods?.find(p => p.id !== periodId);
    let prevSectionMap: Record<string, unknown> = {};
    if (prevPeriod) {
      const { data: prevSections } = await supabase
        .from("dashboard_data")
        .select("section, data")
        .eq("client_id", clientId)
        .eq("period_id", prevPeriod.id);
      for (const s of prevSections || []) prevSectionMap[s.section] = s.data;
    }

    // Fetch strategy notes from current + past 3 periods for context
    const pastNotes: { period: string; summary?: string; notes?: string; agencyActions?: unknown[]; clientActions?: unknown[] }[] = [];
    for (const p of allPeriods || []) {
      const { data: notesRow } = await supabase
        .from("dashboard_data")
        .select("data")
        .eq("client_id", clientId)
        .eq("period_id", p.id)
        .eq("section", "notes")
        .single();
      if (notesRow?.data) {
        const n = notesRow.data as Record<string, unknown>;
        pastNotes.push({
          period: p.label,
          summary: n.summary as string,
          notes: (n.meetingNotes as string)?.slice(0, 1500),
          agencyActions: n.agencyActions as unknown[],
          clientActions: n.clientActions as unknown[],
        });
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey });

    // Build meeting notes context
    const meetingContext = pastNotes.length > 0
      ? `\n\nMEETING NOTES & STRATEGY SESSIONS:\n${JSON.stringify(pastNotes, null, 2).slice(0, 3000)}`
      : "";

    const dataContext = JSON.stringify({
      client: client?.name,
      period: period?.label,
      previousPeriod: prevPeriod?.label,
      current: sectionMap,
      previous: prevSectionMap,
    }, null, 2);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `You are a senior digital marketing strategist at a South African agency called Club She Is. You're generating section-specific insights for a client's monthly PDF report.

Analyze the data and provide specific, data-driven insights for EACH section. Reference actual numbers. Compare to industry benchmarks. Be direct and actionable — this goes to the client.

IMPORTANT: If meeting notes or strategy session transcripts are provided, reference decisions made, action items discussed, and how the data reflects progress on those commitments. Connect the data to the conversations that were had.

${SA_BENCHMARKS}

CLIENT DATA:
${dataContext.slice(0, 8000)}
${meetingContext}

Respond in this exact JSON format:
{
  "overview": {
    "headline": "One-line performance headline for the month",
    "insights": ["2-3 key insights about overall performance with specific numbers"]
  },
  "revenue": {
    "headline": "Revenue performance headline",
    "insights": ["2-3 insights about revenue trends, opportunities, and concerns"],
    "recommendation": "One key revenue recommendation"
  },
  "metaAds": {
    "headline": "Ad performance headline",
    "insights": ["2-3 insights about ad spend efficiency, CPC, CTR vs benchmarks"],
    "recommendation": "One key ad optimization recommendation"
  },
  "social": {
    "headline": "Social media headline",
    "insights": ["2-3 insights about reach, engagement, follower growth"],
    "recommendation": "One key social media recommendation"
  },
  "email": {
    "headline": "Email performance headline",
    "insights": ["2-3 insights about delivery rates, campaign performance"],
    "recommendation": "One key email recommendation"
  },
  "churn": {
    "headline": "Retention headline",
    "insights": ["2-3 insights about failed payments, abandoned checkouts, churn risk"],
    "recommendation": "One key retention recommendation"
  },
  "nextMonth": {
    "topPriority": "The single most important thing to focus on next month",
    "quickWins": ["2-3 quick wins that can be implemented this week"],
    "bigBets": ["1-2 longer-term strategic plays to start planning"]
  }
}

Be specific to THIS client's data. Use South African Rand (R). If a section has no data, return null for that section. Don't be generic — reference the actual numbers.`,
        },
      ],
    });

    const textBlock = message.content.find(b => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json({ error: "No response from AI" }, { status: 500 });
    }

    let insights;
    try {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      insights = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(textBlock.text);
    } catch {
      return Response.json({ error: "Failed to parse AI response", raw: textBlock.text }, { status: 500 });
    }

    // Store insights
    await supabase
      .from("dashboard_data")
      .upsert(
        {
          client_id: clientId,
          period_id: periodId,
          section: "reportInsights",
          data: { ...insights, generatedAt: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id,period_id,section" }
      );

    return Response.json({ success: true, insights });
  } catch (e) {
    console.error("Report insights error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
