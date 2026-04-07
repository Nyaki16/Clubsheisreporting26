import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      slug,
      subtitle,
      has_paystack,
      has_meta_ads,
      has_ghl,
      has_systemeio,
      has_webinarkit,
      paystack_account,
      ghl_account,
      windsor_facebook_account,
      windsor_instagram_account,
      api_keys,
      membership_amounts,
    } = body;

    if (!name || !slug) {
      return Response.json({ error: "Name and slug are required" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Check for duplicate slug
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return Response.json({ error: "A client with this slug already exists" }, { status: 409 });
    }

    // 1. Create client row
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert({
        name,
        slug,
        subtitle: subtitle || null,
        is_active: true,
        has_paystack: has_paystack || false,
        has_meta_ads: has_meta_ads || false,
        has_ghl: has_ghl || false,
        has_systemeio: has_systemeio || false,
        has_webinarkit: has_webinarkit || false,
        paystack_account: paystack_account || null,
        ghl_account: ghl_account || null,
        windsor_facebook_account: windsor_facebook_account || null,
        windsor_instagram_account: windsor_instagram_account || null,
      })
      .select()
      .single();

    if (clientError || !client) {
      console.error("Client insert error:", clientError);
      return Response.json({ error: clientError?.message || "Failed to create client" }, { status: 500 });
    }

    // 2. Store API keys in dashboard_data (section = "api_keys", period_id = null)
    const keysToStore: Record<string, string> = {};
    if (api_keys) {
      for (const [k, v] of Object.entries(api_keys)) {
        if (v && typeof v === "string" && v.trim()) {
          keysToStore[k] = v.trim();
        }
      }
    }

    // Also store membership_amounts if provided
    if (membership_amounts && membership_amounts.trim()) {
      keysToStore.membership_amounts = membership_amounts.trim();
    }

    if (Object.keys(keysToStore).length > 0) {
      await supabase
        .from("dashboard_data")
        .insert({
          client_id: client.id,
          period_id: null,
          section: "api_keys",
          data: keysToStore,
        });
    }

    // 3. Ensure a reporting_period exists for the current month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const periodKey = `${MONTH_NAMES[month]}-${year}`;
    const periodLabel = `${MONTH_LABELS[month]} ${year}`;
    const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const { data: existingPeriod } = await supabase
      .from("reporting_periods")
      .select("id")
      .eq("period_key", periodKey)
      .single();

    if (!existingPeriod) {
      await supabase
        .from("reporting_periods")
        .insert({
          period_key: periodKey,
          label: periodLabel,
          start_date: startDate,
          end_date: endDate,
          is_current: true,
        });
    }

    return Response.json({ success: true, slug: client.slug, id: client.id });
  } catch (e) {
    console.error("Create client error:", e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
