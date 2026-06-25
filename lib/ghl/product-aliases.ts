// Product name consolidation for Ghutte sales.
//
// Different funnels can sell the same offer under different names. Map each
// raw Ghutte sourceName/entitySourceName to a single canonical product so the
// dashboard groups them together. Keys are matched case-insensitively.
//
// To merge more products, add `"raw funnel name": "Canonical name"` here.

const ALIASES: Record<string, string> = {
  "unforgettable speakers": "English Webinar",
  "unforgettable speakers academy": "English Webinar",
};

export function canonicalProduct(name: string | undefined | null): string {
  const raw = (name || "").trim();
  if (!raw) return "Unattributed";
  return ALIASES[raw.toLowerCase()] || raw;
}
