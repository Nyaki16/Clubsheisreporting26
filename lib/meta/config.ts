import { getServiceClient } from "@/lib/supabase";

export type RevenueSource = "meta" | "ghl" | "paystack" | "none";

export interface MetaClientConfig {
  metaAdAccountId: string | null;
  conversionSource: RevenueSource;
  revenueSource: RevenueSource;
  conversionEvent: string;
  ghlLocationId: string | null;
  paystackAccountId: string | null;
  roasTarget: number;
}

const DEFAULTS: Omit<MetaClientConfig, "metaAdAccountId" | "ghlLocationId" | "paystackAccountId"> = {
  conversionSource: "meta",
  revenueSource: "meta",
  conversionEvent: "purchase",
  roasTarget: 3.0,
};

// Reads per-client config from the existing api_keys section in dashboard_data.
// Some clients have multiple api_keys rows — we merge them, matching the email-stats pattern.
export async function getMetaClientConfig(clientId: string): Promise<MetaClientConfig> {
  const supabase = getServiceClient();
  const { data: rows } = await supabase
    .from("dashboard_data")
    .select("data")
    .eq("client_id", clientId)
    .eq("section", "api_keys")
    .is("period_id", null)
    .limit(5);

  const keys: Record<string, string> = {};
  for (const row of rows || []) {
    const d = row.data as Record<string, string> | null;
    if (d) Object.assign(keys, d);
  }

  const revenueSource = (keys.meta_revenue_source as RevenueSource) || DEFAULTS.revenueSource;
  const conversionSource = (keys.meta_conversion_source as RevenueSource) || DEFAULTS.conversionSource;

  const validSources: RevenueSource[] = ["meta", "ghl", "paystack", "none"];

  return {
    metaAdAccountId: keys.meta_ad_account_id || null,
    revenueSource: validSources.includes(revenueSource) ? revenueSource : DEFAULTS.revenueSource,
    conversionSource: validSources.includes(conversionSource) ? conversionSource : DEFAULTS.conversionSource,
    conversionEvent: keys.meta_conversion_event || DEFAULTS.conversionEvent,
    ghlLocationId: keys.ghl_account_id || null,
    paystackAccountId: keys.paystack_account_id || null,
    roasTarget: keys.roas_target ? Number(keys.roas_target) || DEFAULTS.roasTarget : DEFAULTS.roasTarget,
  };
}

export async function resolveClientBySlug(slug: string): Promise<{ id: string; name: string } | null> {
  const supabase = getServiceClient();
  const { data } = await supabase.from("clients").select("id, name").eq("slug", slug).single();
  return data;
}
