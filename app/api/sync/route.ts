import { NextRequest } from "next/server";
import { runMonthlySync } from "@/lib/sync";

export const maxDuration = 60; // seconds — requires Vercel Pro for >10s

// GET handler for Vercel Cron
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sync the previous month (cron runs on 1st of each month)
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // getMonth() is 0-indexed
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    const results = await runMonthlySync(prevYear, prevMonth);

    return Response.json({
      success: true,
      period: { year: prevYear, month: prevMonth },
      results,
    });
  } catch (e) {
    console.error("Cron sync error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

// POST handler for manual trigger from admin UI
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

    const body = await request.json().catch(() => ({}));
    const now = new Date();
    const year = body.year || now.getFullYear();
    const month = body.month || (now.getMonth() === 0 ? 12 : now.getMonth());

    const results = await runMonthlySync(year, month);

    return Response.json({
      success: true,
      period: { year, month },
      results,
    });
  } catch (e) {
    console.error("Sync error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
