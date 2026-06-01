import { NextRequest } from "next/server";

export interface AuthResult {
  ok: boolean;
  role?: "admin" | "client";
  slug?: string;
  clientId?: string;
}

// Allows admin OR client whose session matches `expectedSlug`.
export function authorizeForSlug(request: NextRequest, expectedSlug: string): AuthResult {
  const adminCookie = request.cookies.get("admin_session");
  if (adminCookie?.value === "true") return { ok: true, role: "admin" };

  const adminPassword = process.env.ADMIN_PASSWORD;
  const authHeader = request.headers.get("authorization");
  if (adminPassword && authHeader === `Bearer ${adminPassword}`) {
    return { ok: true, role: "admin" };
  }

  const clientCookie = request.cookies.get("client_session");
  if (clientCookie?.value) {
    try {
      const session = JSON.parse(clientCookie.value);
      if (session.slug === expectedSlug) {
        return { ok: true, role: "client", slug: session.slug, clientId: session.clientId };
      }
    } catch {
      // fall through
    }
  }
  return { ok: false };
}
