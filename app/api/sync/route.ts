import { NextRequest } from "next/server";
import { runMonthlySync } from "@/lib/sync";
import { getClientSession, isAdminRequest } from "@/lib/auth";

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
    const body = await request.json().catch(() => ({}));
    const now = new Date();

    // --- Auth ---
    // Admins (Bearer password or admin_session) can sync anything. A client
    // session may refresh ONLY its own current month (the embed runs as a
    // client), so we ignore any month/slug it sends and force a safe scope.
    const isAdmin = await isAdminRequest(request);

    let onlySlug: string | undefined = body.slug;
    let useCurrent = !!body.current;
    let makeCurrent = body.slug ? false : body.makeCurrent !== false;

    if (!isAdmin) {
      const sessionSlug = (await getClientSession(request))?.slug ?? null;
      if (!sessionSlug || (body.slug && body.slug !== sessionSlug)) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      // Force safe scope for client-triggered refreshes.
      onlySlug = sessionSlug;
      useCurrent = true;
      makeCurrent = false;
    }

    // `current: true` targets the in-progress calendar month (month-to-date).
    // Otherwise default to the previous completed month (the monthly model).
    const currentMonth = now.getMonth() + 1; // 1-indexed
    const year = (!isAdmin ? undefined : body.year) || now.getFullYear();
    const month = (!isAdmin ? undefined : body.month) || (useCurrent ? currentMonth : (now.getMonth() === 0 ? 12 : now.getMonth()));

    const results = await runMonthlySync(year, month, { onlySlug, makeCurrent });

    return Response.json({
      success: true,
      period: { year, month },
      slug: body.slug || "all",
      results,
    });
  } catch (e) {
    console.error("Sync error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
