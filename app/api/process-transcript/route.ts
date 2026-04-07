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

    const { clientId, periodId, transcript: rawTranscript, meetingDate } = await request.json();
    if (!clientId || !periodId || !rawTranscript) {
      return Response.json({ error: "clientId, periodId, and transcript required" }, { status: 400 });
    }

    // Truncate transcript if too long to avoid token limits
    const transcript = typeof rawTranscript === "string" && rawTranscript.length > 8000
      ? rawTranscript.slice(0, 8000) + "\n\n... [transcript truncated for processing]"
      : rawTranscript;

    const supabase = getServiceClient();

    // Fetch client name
    const { data: client } = await supabase
      .from("clients").select("name").eq("id", clientId).single();

    // Fetch period label
    const { data: period } = await supabase
      .from("reporting_periods").select("label").eq("id", periodId).single();

    // Fetch all dashboard sections for context
    const { data: sections } = await supabase
      .from("dashboard_data")
      .select("section, data")
      .eq("client_id", clientId)
      .eq("period_id", periodId);

    const sectionMap: Record<string, unknown> = {};
    for (const s of sections || []) sectionMap[s.section] = s.data;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [
        {
          role: "user",
          content: `You are a senior account manager at a digital marketing agency in South Africa called Club She Is. You're processing a strategy meeting transcript for a client.

Analyze the transcript and the client's current dashboard data to produce structured meeting notes.

CLIENT: ${client?.name || "Unknown"}
PERIOD: ${period?.label || "Unknown"}
MEETING DATE: ${meetingDate || "Not specified"}

DASHBOARD DATA:
${JSON.stringify(sectionMap, null, 2).slice(0, 3000)}

MEETING TRANSCRIPT:
${transcript}

Respond in this exact JSON format:
{
  "summary": "3-5 sentence executive summary of what was discussed and decided",
  "keyDecisions": ["Decision 1", "Decision 2"],
  "meetingNotes": [
    {"topic": "Topic Name", "points": ["Specific point 1 with numbers", "Point 2", "Point 3"]},
    {"topic": "Another Topic", "points": ["Point 1", "Point 2"]}
  ],
  "agencyActions": [
    {"description": "What needs to be done", "owner": "Suggested owner/role", "dueDate": "YYYY-MM-DD or 'Next week' etc", "priority": "high|medium|low"}
  ],
  "clientActions": [
    {"description": "What the client needs to do", "owner": "Client contact name if mentioned", "dueDate": "YYYY-MM-DD or 'Next week' etc", "priority": "high|medium|low"}
  ],
  "dataInsights": ["Any insights from the dashboard data that relate to what was discussed"]
}

Be specific. Reference actual numbers from the data. If action items mention specific people, use their names as owners. Keep agency vs client actions clearly separated.`,
        },
      ],
    });

    const textBlock = message.content.find(b => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json({ error: "No response from AI" }, { status: 500 });
    }

    let parsed;
    try {
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(textBlock.text);
    } catch {
      return Response.json({ error: "Failed to parse AI response", raw: textBlock.text }, { status: 500 });
    }

    // Build the notes data structure
    const notesData = {
      meetingDate: meetingDate || new Date().toISOString().split("T")[0],
      transcript: rawTranscript,
      summary: parsed.summary || "",
      keyDecisions: parsed.keyDecisions || [],
      meetingNotes: parsed.meetingNotes || "",
      agencyActions: (parsed.agencyActions || []).map((a: Record<string, string>, i: number) => ({
        id: `agency-${Date.now()}-${i}`,
        description: a.description,
        owner: a.owner || "Agency",
        dueDate: a.dueDate || "",
        priority: a.priority || "medium",
        status: "pending" as const,
      })),
      clientActions: (parsed.clientActions || []).map((a: Record<string, string>, i: number) => ({
        id: `client-${Date.now()}-${i}`,
        description: a.description,
        owner: a.owner || "Client",
        dueDate: a.dueDate || "",
        priority: a.priority || "medium",
        status: "pending" as const,
      })),
      dataInsights: parsed.dataInsights || [],
      generatedAt: new Date().toISOString(),
    };

    // Store in Supabase
    await supabase
      .from("dashboard_data")
      .upsert(
        {
          client_id: clientId,
          period_id: periodId,
          section: "notes",
          data: notesData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id,period_id,section" }
      );

    return Response.json({ success: true, notes: notesData });
  } catch (e) {
    console.error("Process transcript error:", e);
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("timeout") || message.includes("ECONNRESET")) {
      return Response.json({ error: "AI request timed out. Try again or shorten the transcript." }, { status: 504 });
    }
    if (message.includes("rate_limit") || message.includes("429")) {
      return Response.json({ error: "AI rate limit reached. Please wait a minute and try again." }, { status: 429 });
    }
    return Response.json({ error: "Failed to process transcript: " + message }, { status: 500 });
  }
}
