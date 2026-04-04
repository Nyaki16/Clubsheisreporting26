import { supabase } from "./supabase";
import type { Client, Period, DashboardDataRow, SectionName } from "@/types/dashboard";

export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) {
    console.error("Error fetching clients:", error);
    return [];
  }
  return data || [];
}

export async function getClientBySlug(slug: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error) return null;
  return data;
}

export async function getPeriods(): Promise<Period[]> {
  const { data, error } = await supabase
    .from("reporting_periods")
    .select("*")
    .order("start_date", { ascending: false });
  if (error) {
    console.error("Error fetching periods:", error);
    return [];
  }
  return data || [];
}

export async function getCurrentPeriod(): Promise<Period | null> {
  const { data, error } = await supabase
    .from("reporting_periods")
    .select("*")
    .eq("is_current", true)
    .single();
  if (error) return null;
  return data;
}

export async function getDashboardSection(
  clientId: string,
  periodId: string,
  section: SectionName
): Promise<unknown | null> {
  const { data, error } = await supabase
    .from("dashboard_data")
    .select("data")
    .eq("client_id", clientId)
    .eq("period_id", periodId)
    .eq("section", section)
    .single();
  if (error) return null;
  return data?.data || null;
}

export async function getAllSections(
  clientId: string,
  periodId: string
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from("dashboard_data")
    .select("section, data")
    .eq("client_id", clientId)
    .eq("period_id", periodId);
  if (error) {
    console.error("Error fetching dashboard data:", error);
    return {};
  }
  const result: Record<string, unknown> = {};
  for (const row of data || []) {
    result[row.section] = row.data;
  }
  return result;
}
