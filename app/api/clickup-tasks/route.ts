import { NextRequest } from "next/server";

const CLICKUP_API_TOKEN = "pk_278642598_N0ZJEZ977AJFSQPTRA7X5E3ORRMPX7IV";
const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

const CLIENT_LIST_IDS: Record<string, string> = {
  "club-she-is": "901216333346",
  "palesa-dooms": "901216332808",
  "wisdom-and-wellness": "901216193017",
  "purpose-for-impact": "901216190500",
  "link-interiors": "901216189889",
  "awahome": "901216094961",
  "gibs-eda": "901216237109",
};

const PRIORITY_MAP: Record<string, number> = {
  high: 1,
  medium: 2,
  low: 3,
};

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

export async function POST(request: NextRequest) {
  try {
    // Auth check — matches pattern from process-transcript route
    const adminCookie = request.cookies.get("admin_session");
    const authHeader = request.headers.get("authorization");
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminPassword && authHeader !== `Bearer ${adminPassword}`) {
      if (adminCookie?.value !== "true") {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body: RequestBody = await request.json();
    const { clientSlug, actions } = body;

    if (!clientSlug || !actions || !Array.isArray(actions) || actions.length === 0) {
      return Response.json(
        { error: "clientSlug and a non-empty actions array are required" },
        { status: 400 }
      );
    }

    const listId = CLIENT_LIST_IDS[clientSlug];
    if (!listId) {
      return Response.json(
        { error: `Unknown client slug: ${clientSlug}` },
        { status: 400 }
      );
    }

    const results: Array<{ id: string; url: string; name: string }> = [];
    const errors: string[] = [];

    for (const action of actions) {
      const tags = [
        "strategy-meeting",
        action.type === "agency" ? "agency-action" : "client-action",
      ];

      const taskBody: Record<string, unknown> = {
        name: action.description,
        tags,
        priority: PRIORITY_MAP[action.priority?.toLowerCase()] ?? 3,
      };

      // Parse due date if provided — ClickUp expects milliseconds since epoch
      if (action.due) {
        const dueMs = new Date(action.due).getTime();
        if (!isNaN(dueMs)) {
          taskBody.due_date = dueMs;
        }
      }

      try {
        const res = await fetch(`${CLICKUP_API_BASE}/list/${listId}/task`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: CLICKUP_API_TOKEN,
          },
          body: JSON.stringify(taskBody),
        });

        if (!res.ok) {
          const errText = await res.text();
          errors.push(`Failed to create task "${action.description}": ${res.status} ${errText}`);
          continue;
        }

        const task = await res.json();
        results.push({
          id: task.id,
          url: task.url,
          name: action.description,
        });
      } catch (e) {
        errors.push(`Error creating task "${action.description}": ${String(e)}`);
      }
    }

    return Response.json({
      success: true,
      created: results.length,
      total: actions.length,
      tasks: results,
      ...(errors.length > 0 ? { errors } : {}),
    });
  } catch (e) {
    console.error("ClickUp task creation error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
