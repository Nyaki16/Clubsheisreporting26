import { NextRequest } from "next/server";
import { runMonthlySync } from "@/lib/sync";

export async function POST(request: NextRequest) {
  try {
    // Verify admin auth
    const authHeader = request.headers.get("authorization");
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminPassword && authHeader !== `Bearer ${adminPassword}`) {
      // Also check cookie
      const adminCookie = request.cookies.get("admin_session");
      if (adminCookie?.value !== "true") {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const now = new Date();
    const year = body.year || now.getFullYear();
    // Default to previous month
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
