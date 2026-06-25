import type { NextRequest } from "next/server";
import { getClientSession, isAdminRequest } from "@/lib/auth";

/**
 * Allow either:
 *  - Admin: ADMIN_PASSWORD via Bearer header, or a valid signed admin_session cookie
 *  - Client: a valid signed client_session cookie whose slug matches the supplied slug
 *
 * Pass the brand slug being acted on so a client can only operate on their own.
 */
export async function isAuthorized(request: NextRequest, slug?: string): Promise<boolean> {
  if (await isAdminRequest(request)) return true;

  if (slug) {
    const session = await getClientSession(request);
    if (session?.slug === slug) return true;
  }
  return false;
}
