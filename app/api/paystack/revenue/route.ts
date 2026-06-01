import { NextRequest } from "next/server";

// TODO (Phase 2): Replace mock with live Paystack call.
// Pull successful transactions for date range, attribute to Meta where UTM data is preserved
// in metadata.custom_fields or metadata.referrer.
// Auth: client's Paystack secret key from dashboard_data api_keys section.
// Endpoint: GET https://api.paystack.co/transaction?from=...&to=...&status=success

interface RequestBody {
  paystack_account_id?: string;
  date_range: { start: string; end: string };
  utm_source?: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RequestBody;
  if (!body?.date_range?.start || !body?.date_range?.end) {
    return Response.json({ error: "date_range required" }, { status: 400 });
  }

  return Response.json({
    mock: true,
    note: "Paystack revenue integration not yet implemented. Wire in Phase 2.",
    paystack_account_id: body.paystack_account_id || null,
    date_range: body.date_range,
    utm_source: body.utm_source || "facebook",
    conversions: 0,
    revenue: 0,
    currency: "ZAR",
    transactions: [],
  });
}
