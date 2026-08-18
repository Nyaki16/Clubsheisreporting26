"use client";

import { supabase } from "@/lib/supabase";

// A `?period=` URL value can be either a period id or a period_key such as
// "august-2026" (the Refresh Data redirect uses the key). Anything that hands a
// period to an API route has to resolve it to an id first.
export async function resolvePeriodId(periodParam: string | null): Promise<string | null> {
  if (periodParam) {
    if (/^[0-9a-f]{8}-/.test(periodParam)) return periodParam;
    const { data } = await supabase
      .from("reporting_periods").select("id").eq("period_key", periodParam).single();
    if (data?.id) return data.id;
  }
  const { data: current } = await supabase
    .from("reporting_periods").select("id").eq("is_current", true).single();
  return current?.id || null;
}
