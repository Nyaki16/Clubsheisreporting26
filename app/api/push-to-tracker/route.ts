import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getClientBySlug } from "@/lib/clients";

export const maxDuration = 30;

interface ActionPayload {
  description: string;
  owner: string;
  due: string;
  priority: string;
  type: "agency" | "client";
}

interface RequestBody {
  clientSlug: string;
  actions: ActionPayload[];
}

// Reporting dashboard slug → tracker client name. The two apps use different Supabase projects
// so we match on the client's display name (the tracker's clients table has no slug column).
const SLUG_TO_TRACKER_NAME: Record<string, string> = {
  "club-she-is": "Club She Is",
  "palesa-dooms": "Palesa Dooms",
  "wisdom-wellness": "Wisdom & Wellness",
  "purpose-for-impact": "Purpose for Impact",
  "link-interiors": "Link Interiors",
  "awahome": "Awahome",
  "gibs-eda": "GIBS EDA",
};

function formatTaskNotes(a: ActionPayload): string {
  const parts: string[] = [];
  parts.push(`Owner: ${a.owner || "—"}`);
  if (a.priority) parts.push(`Priority: ${a.priority}`);
  if (a.due) parts.push(`Due (from notes): ${a.due}`);
  parts.push(`Source: Reporting → Strategy Notes (${a.type === "agency" ? "Agency action" : "Client action"})`);
  return parts.join("\n");
}

function parseDueDate(due: string): string | null {
  if (!due) return null;
  // Already YYYY-MM-DD?
  if (/^\d{4}-\d{2}-\d{2}$/.test(due)) return due;
  // "Ongoing", "TBD", date phrases — let it land in notes, not due_date.
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Same auth pattern as the rest of /api routes
    const adminCookie = request.cookies.get("admin_session");
    const authHeader = request.headers.get("authorization");
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminPassword && authHeader !== `Bearer ${adminPassword}`) {
      if (adminCookie?.value !== "true") {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const trackerUrl = process.env.TRACKER_SUPABASE_URL;
    const trackerKey = process.env.TRACKER_SUPABASE_SERVICE_ROLE_KEY;
    if (!trackerUrl || !trackerKey) {
      return Response.json(
        {
          error:
            "Tracker not configured. Set TRACKER_SUPABASE_URL and TRACKER_SUPABASE_SERVICE_ROLE_KEY in environment variables.",
        },
        { status: 500 },
      );
    }

    const body = (await request.json()) as RequestBody;
    if (!body?.clientSlug || !Array.isArray(body.actions) || body.actions.length === 0) {
      return Response.json({ error: "clientSlug and a non-empty actions array are required" }, { status: 400 });
    }

    const trackerName = SLUG_TO_TRACKER_NAME[body.clientSlug] || getClientBySlug(body.clientSlug)?.name;
    if (!trackerName) {
      return Response.json({ error: `No tracker name mapping for slug: ${body.clientSlug}` }, { status: 400 });
    }

    // Use a fresh service-role client scoped to the tracker's Supabase project.
    const tracker = createClient(trackerUrl, trackerKey, { auth: { persistSession: false } });

    // Find the tracker client by exact name match.
    const { data: clientRows, error: clientErr } = await tracker
      .from("clients")
      .select("id, name")
      .eq("name", trackerName)
      .limit(1);
    if (clientErr) return Response.json({ error: `Tracker client lookup failed: ${clientErr.message}` }, { status: 502 });
    const trackerClient = clientRows?.[0];
    if (!trackerClient) {
      return Response.json(
        { error: `Client "${trackerName}" not found in tracker. Create them first, then retry.` },
        { status: 404 },
      );
    }

    // Create a new job for this push.
    const today = new Date().toISOString().slice(0, 10);
    const jobName = `Meeting Action Items — ${today}`;
    const { data: job, error: jobErr } = await tracker
      .from("jobs")
      .insert({ client_id: trackerClient.id, name: jobName, stage: "briefing" })
      .select("id")
      .single();
    if (jobErr || !job) {
      return Response.json({ error: `Tracker job creation failed: ${jobErr?.message ?? "unknown"}` }, { status: 502 });
    }

    // Bulk-insert tasks under the new job.
    const taskRows = body.actions.map((a) => ({
      job_id: job.id,
      title: a.description?.slice(0, 500) || "(untitled)",
      assignee_id: null,
      due_date: parseDueDate(a.due),
      notes: formatTaskNotes(a),
      status: "planning" as const,
    }));
    const { error: tasksErr, count } = await tracker
      .from("tasks")
      .insert(taskRows, { count: "exact" });
    if (tasksErr) {
      return Response.json({ error: `Tracker task insert failed: ${tasksErr.message}`, jobId: job.id }, { status: 502 });
    }

    return Response.json({
      success: true,
      jobId: job.id,
      jobName,
      clientId: trackerClient.id,
      created: count ?? taskRows.length,
      total: body.actions.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Push-to-tracker error:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
