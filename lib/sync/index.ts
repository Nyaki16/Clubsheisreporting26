import { getServiceClient } from "@/lib/supabase";
import { CLIENT_ACCOUNTS } from "@/lib/clients";

interface SyncResult {
  client: string;
  sections: string[];
  errors: string[];
}

export async function runMonthlySync(year: number, month: number): Promise<SyncResult[]> {
  const supabase = getServiceClient();
  const results: SyncResult[] = [];

  // 1. Ensure period exists
  const periodLabel = formatPeriodLabel(month, year);
  const periodKey = `${year}-${String(month).padStart(2, "0")}`;
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  let { data: period } = await supabase
    .from("reporting_periods")
    .select("*")
    .eq("period_key", periodKey)
    .single();

  if (!period) {
    // Set all other periods to not current
    await supabase.from("reporting_periods").update({ is_current: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    const { data: newPeriod } = await supabase
      .from("reporting_periods")
      .insert({ period_key: periodKey, label: periodLabel, start_date: startDate, end_date: endDate, is_current: true })
      .select()
      .single();
    period = newPeriod;
  }

  if (!period) {
    throw new Error("Failed to create period");
  }

  // 2. Ensure all clients exist in DB
  for (const client of CLIENT_ACCOUNTS) {
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("id", client.uuid)
      .single();

    if (!existing) {
      await supabase.from("clients").insert({
        id: client.uuid,
        name: client.name,
        slug: client.slug,
        is_active: true,
      });
    }
  }

  // 3. For each client, sync data
  // In production, this would call Windsor MCP tools and Systeme.io API
  // For now, we log the intent and skip actual API calls
  for (const client of CLIENT_ACCOUNTS) {
    const result: SyncResult = {
      client: client.name,
      sections: [],
      errors: [],
    };

    try {
      // The actual data pulling would happen here via:
      // - Windsor MCP get_data for Meta Ads, FB Organic, Instagram, GHL, Paystack
      // - SystemeClient for Systeme.io data
      // Each pull would transform the data and upsert into dashboard_data

      result.sections.push("clients_ensured");
    } catch (e) {
      result.errors.push(String(e));
    }

    results.push(result);
  }

  return results;
}

function formatPeriodLabel(month: number, year: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[month - 1]} ${year}`;
}

export async function upsertSection(
  clientId: string,
  periodId: string,
  section: string,
  data: unknown
) {
  const supabase = getServiceClient();
  const { error } = await supabase
    .from("dashboard_data")
    .upsert(
      {
        client_id: clientId,
        period_id: periodId,
        section,
        data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,period_id,section" }
    );
  if (error) throw error;
}
