import { getServiceClient } from "@/lib/supabase";
import {
  currentPeriodKey,
  ensurePeriodsThroughCurrent,
  healCurrentFlag,
  type PeriodRow,
} from "@/lib/periods";

export const dynamic = "force-dynamic";

// The reporting-period list for the dashboard header. Reading it also
// self-heals the calendar: any month missing between the newest stored period
// and today gets created, and `is_current` is re-pointed at the newest
// completed month that has data. That way the dropdown never sits a month (or
// three) behind just because a monthly sync didn't run.
export async function GET() {
  const supabase = getServiceClient();
  const currentKey = currentPeriodKey();

  let periods: PeriodRow[] = [];
  try {
    periods = await ensurePeriodsThroughCurrent(supabase);
    await healCurrentFlag(supabase, periods);
  } catch (e) {
    console.error("Period ensure failed, falling back to a plain read:", e);
    const { data } = await supabase
      .from("reporting_periods")
      .select("id, period_key, label, start_date, end_date, is_current")
      .order("start_date", { ascending: false });
    periods = (data || []) as PeriodRow[];
  }

  const currentPeriodId = periods.find((p) => p.is_current)?.id || periods[0]?.id || null;

  return Response.json({
    success: true,
    currentPeriodId,
    currentMonthKey: currentKey,
    periods: periods.map((p) => ({
      id: p.id,
      period_key: p.period_key,
      label: p.label,
      start_date: p.start_date,
      end_date: p.end_date,
      is_current: p.is_current,
      // The month we're actually in — data for it is month-to-date.
      in_progress: p.period_key === currentKey,
    })),
  });
}
