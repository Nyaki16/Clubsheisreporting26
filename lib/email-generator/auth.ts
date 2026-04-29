import type { NextRequest } from "next/server";

/**
 * Allow either:
 *  - Admin: ADMIN_PASSWORD via Bearer header, or admin_session cookie === "true"
 *  - Client: client_session cookie with JSON { slug } that matches the supplied slug
 *
 * Pass the brand slug being acted on so a client can only operate on their own.
 */
export function isAuthorized(request: NextRequest, slug?: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminPassword) {
    const authHeader = request.headers.get("authorization");
    if (authHeader === `Bearer ${adminPassword}`) return true;
  }
  const adminCookie = request.cookies.get("admin_session");
  if (adminCookie?.value === "true") return true;

  if (slug) {
    const clientCookie = request.cookies.get("client_session");
    if (clientCookie?.value) {
      try {
        const session = JSON.parse(clientCookie.value) as { slug?: string };
        if (typeof session?.slug === "string" && session.slug === slug) return true;
      } catch {
        // fall through
      }
    }
  }
  return false;
}
