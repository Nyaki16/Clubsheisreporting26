import { NextRequest } from "next/server";
import { getClientSession, isAdminRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  // Check admin session (verified signature)
  if (await isAdminRequest(request)) {
    return Response.json({ role: "admin", slug: null });
  }

  // Check client session (verified signature)
  const session = await getClientSession(request);
  if (session) {
    return Response.json({ role: "client", slug: session.slug, clientId: session.clientId });
  }

  return Response.json({ role: null }, { status: 401 });
}
