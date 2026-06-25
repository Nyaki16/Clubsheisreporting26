// Product name consolidation for Ghutte sales.
//
// Ghutte's transaction `entitySourceName` is the FUNNEL the payment came
// through, not the product — and several funnels map to the same offer. Map
// each raw name to a single canonical product so the dashboard groups them.
// Keys are matched case-insensitively.

const ALIASES: Record<string, string> = {
  // The R250 webinar — sold under two funnel names.
  "unforgettable speakers": "English Webinar",
  // The Junior programme (R1,450+ subscription) — sold under several funnel
  // names. NOTE: "Unforgettable Speakers Academy" is the Junior programme, NOT
  // the webinar, despite the similar name.
  "unforgettable speakers academy": "Unforgettable Junior Academy",
  "unforgettable junior speakers programme": "Unforgettable Junior Academy",
};

// English Webinar is always R250 (a discounted R187.50 also occurs). Anything
// dearer that still claims to be the webinar is a higher-tier programme that
// came through the webinar funnel — treat it as the Junior programme.
const WEBINAR_MAX = 300;

export function canonicalProduct(name: string | undefined | null, amount?: number): string {
  const raw = (name || "").trim();
  if (!raw) return "Unattributed";
  const mapped = ALIASES[raw.toLowerCase()] || raw;

  if (mapped === "English Webinar" && typeof amount === "number" && amount > WEBINAR_MAX) {
    return "Unforgettable Junior Academy";
  }
  return mapped;
}
