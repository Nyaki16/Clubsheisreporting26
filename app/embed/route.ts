import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getClientByLocationId } from "@/lib/clients";

// GHL embed entry point. A single Custom Menu Link in GoHighLevel points here
// with the current sub-account's id injected via the {{location.id}} merge
// field:
//
//   https://reports.clubsheis.com/embed?location={{location.id}}
//
// We map that location id to the matching client, drop a scoped client_session
// cookie, and redirect to that client's dashboard. Because only users already
// authenticated inside a sub-account can see the menu link, the location id
// acts as the credential — no password prompt (mirrors the shareToken model).

export const dynamic = "force-dynamic";

function fallbackPage(message: string, status: number): NextResponse {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ClubSheIs Reporting</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background:#FAF7F2; color:#4A1942; }
  .card { max-width:440px; padding:40px; text-align:center; }
  h1 { font-size:20px; margin:0 0 12px; }
  p { font-size:15px; line-height:1.5; color:#6b5563; margin:0; }
</style>
</head>
<body>
  <div class="card">
    <h1>No dashboard for this account yet</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(request: NextRequest) {
  const locationId = request.nextUrl.searchParams.get("location")?.trim();

  if (!locationId) {
    return fallbackPage(
      "This link must be opened from inside a GoHighLevel sub-account. Please contact your account manager.",
      400,
    );
  }

  const mapping = getClientByLocationId(locationId);
  if (!mapping) {
    return fallbackPage(
      "We couldn't find a reporting dashboard linked to this sub-account. Please contact your account manager.",
      404,
    );
  }

  // Resolve the Supabase client row so the session carries the real client id.
  const supabase = getServiceClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, slug")
    .eq("slug", mapping.slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!client) {
    return fallbackPage(
      "This client's dashboard isn't active yet. Please contact your account manager.",
      404,
    );
  }

  const isProd = process.env.NODE_ENV === "production";
  const response = NextResponse.redirect(new URL(`/dashboard/${client.slug}`, request.url));

  // Same cross-site cookie settings the admin/client login routes use, so the
  // session is sent when the dashboard runs inside the Ghutte iframe.
  response.cookies.set("client_session", JSON.stringify({ clientId: client.id, slug: client.slug }), {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    partitioned: isProd,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}
