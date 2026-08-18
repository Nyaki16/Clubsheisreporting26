import { getServiceClient } from "@/lib/supabase";

// Reporting periods are calendar months. The dropdown must always offer the
// month we're actually in — historically a month only appeared once a sync had
// created its row, so the list froze one month behind (and `is_current` froze
// with it whenever a monthly cron run was missed).

export const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

export const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// The agency reports on South African time. Vercel runs UTC, so without this
// the first two hours of a new month still resolve to the previous one.
const REPORTING_TIMEZONE = "Africa/Johannesburg";

export interface PeriodRow {
  id: string;
  period_key: string;
  label: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function currentMonth(now: Date = new Date()): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORTING_TIMEZONE,
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  return { year, month };
}

export function monthMeta(year: number, month: number) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    period_key: `${MONTH_NAMES[month - 1]}-${year}`,
    label: `${MONTH_LABELS[month - 1]} ${year}`,
    start_date: `${year}-${pad(month)}-01`,
    end_date: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

export function currentPeriodKey(now: Date = new Date()): string {
  const { year, month } = currentMonth(now);
  return monthMeta(year, month).period_key;
}

function monthIndex(year: number, month: number) {
  return year * 12 + (month - 1);
}

type Supa = ReturnType<typeof getServiceClient>;

/**
 * Creates any missing month rows between the newest existing period and the
 * month we're currently in, so the reporting-period dropdown never lags behind
 * the calendar. New rows are never flagged `is_current` — that stays with the
 * newest completed month (see `healCurrentFlag`).
 */
export async function ensurePeriodsThroughCurrent(
  supabase: Supa = getServiceClient(),
  now: Date = new Date(),
): Promise<PeriodRow[]> {
  const { data: existing } = await supabase
    .from("reporting_periods")
    .select("id, period_key, label, start_date, end_date, is_current")
    .order("start_date", { ascending: false });

  const periods = (existing || []) as PeriodRow[];
  const target = currentMonth(now);
  const targetIndex = monthIndex(target.year, target.month);

  // Start from the month after the newest existing period; with no periods at
  // all, just create the current month.
  let cursor = targetIndex;
  if (periods.length > 0) {
    const [ny, nm] = periods[0].start_date.split("-").map(Number);
    cursor = monthIndex(ny, nm) + 1;
  }

  const toCreate: ReturnType<typeof monthMeta>[] = [];
  // Guard against a wildly stale/garbage newest row filling in years of months.
  for (let i = cursor; i <= targetIndex && toCreate.length < 24; i++) {
    toCreate.push(monthMeta(Math.floor(i / 12), (i % 12) + 1));
  }

  if (toCreate.length > 0) {
    const { data: inserted } = await supabase
      .from("reporting_periods")
      .upsert(
        toCreate.map((m) => ({ ...m, is_current: false })),
        { onConflict: "period_key" },
      )
      .select("id, period_key, label, start_date, end_date, is_current");
    for (const row of (inserted || []) as PeriodRow[]) {
      if (!periods.some((p) => p.period_key === row.period_key)) periods.push(row);
    }
    periods.sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
  }

  return periods;
}

/**
 * Points `is_current` at the newest COMPLETED month that actually has data.
 * Completed, so a client refreshing the in-progress month doesn't flip every
 * other client's default view to a month they have no data for; with-data, so
 * a freshly created empty month never becomes the default either.
 */
export async function healCurrentFlag(
  supabase: Supa,
  periods: PeriodRow[],
  now: Date = new Date(),
): Promise<PeriodRow | null> {
  const currentKey = currentPeriodKey(now);
  const completed = periods
    .filter((p) => p.period_key !== currentKey)
    .sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
  if (completed.length === 0) return periods.find((p) => p.is_current) || null;

  let chosen: PeriodRow | null = null;
  for (const period of completed) {
    const { data } = await supabase
      .from("dashboard_data")
      .select("id")
      .eq("period_id", period.id)
      .limit(1);
    if (data && data.length > 0) {
      chosen = period;
      break;
    }
  }
  // No completed month has data yet — keep the newest completed month.
  if (!chosen) chosen = completed[0];

  if (!chosen.is_current) {
    await supabase
      .from("reporting_periods")
      .update({ is_current: false })
      .eq("is_current", true);
    await supabase
      .from("reporting_periods")
      .update({ is_current: true })
      .eq("id", chosen.id);
    for (const p of periods) p.is_current = p.id === chosen.id;
  }
  return chosen;
}
