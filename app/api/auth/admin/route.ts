import { NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || password !== adminPassword) {
      return Response.json({ error: "Invalid password" }, { status: 401 });
    }

    const isProd = process.env.NODE_ENV === "production";
    const cookieStore = await cookies();
    cookieStore.set("admin_session", "true", {
      httpOnly: true,
      secure: isProd,
      // SameSite=None + Partitioned so the cookie is sent when the dashboard
      // runs inside the Ghutte iframe (cross-site context). Partitioned (CHIPS)
      // keeps it working even when Chrome blocks third-party cookies.
      sameSite: isProd ? "none" : "lax",
      partitioned: isProd,
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
