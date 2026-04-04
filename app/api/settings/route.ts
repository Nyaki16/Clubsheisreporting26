import { NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase";

// GET — Fetch all client settings (API keys masked)
export async function GET() {
  const supabase = getServiceClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, slug, has_paystack, has_meta_ads, has_ghl, has_systemeio, paystack_account, ghl_account, windsor_facebook_account, windsor_instagram_account")
    .eq("is_active", true)
    .order("name");

  // Fetch stored API keys from dashboard_data (section = "api_keys")
  const { data: keyRows } = await supabase
    .from("dashboard_data")
    .select("client_id, data")
    .eq("section", "api_keys");

  const keyMap: Record<string, Record<string, string>> = {};
  for (const row of keyRows || []) {
    keyMap[row.client_id] = row.data as Record<string, string>;
  }

  // Mask keys for display
  const result = (clients || []).map((c) => {
    const keys = keyMap[c.id] || {};
    const masked: Record<string, string> = {};
    for (const [k, v] of Object.entries(keys)) {
      if (v && typeof v === "string" && v.length > 8) {
        masked[k] = v.slice(0, 8) + "..." + v.slice(-4);
      } else if (v) {
        masked[k] = "****";
      }
    }
    return { ...c, apiKeys: masked, hasKeys: Object.keys(keys).length > 0 };
  });

  return Response.json(result);
}

// POST — Save API keys for a client
export async function POST(request: NextRequest) {
  try {
    const { clientId, keys } = await request.json();
    if (!clientId || !keys) {
      return Response.json({ error: "Missing clientId or keys" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Fetch existing keys and merge (so you can update one without losing others)
    const { data: existing } = await supabase
      .from("dashboard_data")
      .select("data")
      .eq("client_id", clientId)
      .eq("section", "api_keys")
      .single();

    const merged = { ...(existing?.data as Record<string, string> || {}), ...keys };

    // Remove empty values
    for (const k of Object.keys(merged)) {
      if (!merged[k]) delete merged[k];
    }

    // Upsert
    const { error } = await supabase
      .from("dashboard_data")
      .upsert(
        {
          client_id: clientId,
          period_id: null,
          section: "api_keys",
          data: merged,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id,period_id,section" }
      );

    if (error) {
      // If upsert fails due to constraint, try update then insert
      const { data: check } = await supabase
        .from("dashboard_data")
        .select("id")
        .eq("client_id", clientId)
        .eq("section", "api_keys")
        .is("period_id", null);

      if (check && check.length > 0) {
        await supabase
          .from("dashboard_data")
          .update({ data: merged, updated_at: new Date().toISOString() })
          .eq("id", check[0].id);
      } else {
        await supabase
          .from("dashboard_data")
          .insert({
            client_id: clientId,
            section: "api_keys",
            data: merged,
          });
      }
    }

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
