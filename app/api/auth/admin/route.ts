import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_TTL, createAdminSession, sessionCookieOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || password !== adminPassword) {
      return Response.json({ error: "Invalid password" }, { status: 401 });
    }

    // Signed HMAC token instead of the static "true" — can't be forged.
    const cookieStore = await cookies();
    cookieStore.set("admin_session", await createAdminSession(), sessionCookieOptions(ADMIN_SESSION_TTL));

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
