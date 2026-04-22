import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // Check admin session
  const adminCookie = request.cookies.get("admin_session");
  if (adminCookie?.value === "true") {
    return Response.json({ role: "admin", slug: null });
  }

  // Check client session
  const clientCookie = request.cookies.get("client_session");
  if (clientCookie?.value) {
    try {
      const session = JSON.parse(clientCookie.value);
      return Response.json({ role: "client", slug: session.slug, clientId: session.clientId });
    } catch {
      return Response.json({ role: null }, { status: 401 });
    }
  }

  return Response.json({ role: null }, { status: 401 });
}
