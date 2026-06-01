// Shared types for campaign performance + creative intelligence.

export type Fatigue = "green" | "amber" | "red";
export type AdFormat = "video" | "static" | "carousel" | "unknown";
export type RowStatus = "active" | "paused" | "learning" | "in_review" | "disapproved" | "unknown";

export interface AdRow {
  id: string;
  name: string;
  status: RowStatus;
  format: AdFormat;
  thumbnailUrl: string | null;
  bodyText: string | null;
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  linkClicks: number;
  landingPageViews: number;
  conversions: number;
  revenue: number | null;
  roas: number | null;
  cpa: number | null;
  hookRate: number | null;
  fatigue: Fatigue;
}

export interface AdSetRow {
  id: string;
  name: string;
  status: RowStatus;
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  linkClicks: number;
  landingPageViews: number;
  conversions: number;
  revenue: number | null;
  roas: number | null;
  cpa: number | null;
  hookRate: number | null;
  fatigue: Fatigue;
  ads: AdRow[];
}

export interface CampaignRow {
  id: string;
  name: string;
  status: RowStatus;
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  linkClicks: number;
  landingPageViews: number;
  conversions: number;
  revenue: number | null;
  roas: number | null;
  cpa: number | null;
  hookRate: number | null;
  fatigue: Fatigue;
  adSets: AdSetRow[];
}

export interface CampaignsResponse {
  campaigns: CampaignRow[];
  revenueSource: "meta" | "ghl" | "paystack" | "none";
  revenueSourceMock?: boolean;
  totals: {
    spend: number;
    impressions: number;
    conversions: number;
    revenue: number | null;
    roas: number | null;
  };
  dateRange: { start: string; end: string };
  /** True when served from a synced Supabase snapshot (MCP sync) rather than a live Meta call. */
  synced?: boolean;
  /** ISO timestamp of the last sync, when `synced` is true. */
  syncedAt?: string;
}

// Creative intelligence ---------------------------------------------------

export interface IntelligenceAdMetric {
  spend: number;
  impressions: number;
  linkClicks: number;
  conversions: number;
  revenue: number | null;
  roas: number | null;
  cpa: number | null;
  hookRate: number | null;
  frequency: number;
}

export interface WinnerInsight {
  ad_id: string;
  framework: string;
  hook_type: string;
  angle: string;
  why_it_works: string;
}

export interface LoserInsight {
  ad_id: string;
  framework: string;
  hook_type: string;
  angle: string;
  diagnosis: string;
  try_instead: string;
}

export interface PatternInsight {
  paragraph: string;
  rules: string[];
}

export interface IntelligenceResponse {
  winners: WinnerInsight[];
  losers: LoserInsight[];
  pattern: PatternInsight;
  generatedAt: string;
  dateRange: { start: string; end: string };
  adMetrics: Record<string, { name: string; thumbnailUrl: string | null; metrics: IntelligenceAdMetric; format: AdFormat }>;
}
