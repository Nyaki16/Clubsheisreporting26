import { NextRequest } from "next/server";

// TODO (Phase 2): Replace mock with live GHL call.
// Pull conversions and revenue for the date range, attribute to Meta via UTM source.
// Auth: client's PIT key from dashboard_data api_keys section.
// Endpoint candidates:
//   - GET /opportunities/search?locationId=...&date=...
//   - GET /payments/orders?locationId=...
// Match by utm_source contains "facebook" OR "instagram".

interface RequestBody {
  ghl_location_id?: string;
  date_range: { start: string; end: string };
  utm_source?: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RequestBody;
  if (!body?.date_range?.start || !body?.date_range?.end) {
    return Response.json({ error: "date_range required" }, { status: 400 });
  }

  // Stubbed mock data — clearly flagged so the UI can render a warning.
  return Response.json({
    mock: true,
    note: "GHL revenue integration not yet implemented. Wire in Phase 2.",
    location_id: body.ghl_location_id || null,
    date_range: body.date_range,
    utm_source: body.utm_source || "facebook",
    conversions: 0,
    revenue: 0,
    currency: "ZAR",
    orders: [],
  });
}
