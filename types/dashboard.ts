// ===== Client Types =====
export interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  paystack_account: string | null;
  ghl_account: string | null;
  windsor_facebook_account: string | null;
  windsor_instagram_account: string | null;
  has_paystack: boolean;
  has_meta_ads: boolean;
  has_ghl: boolean;
  has_systemeio: boolean;
  has_webinarkit: boolean;
  webinarkit_api_key: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Period {
  id: string;
  period_key: string;
  label: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export type SectionName =
  | "overview"
  | "meta"
  | "social"
  | "paystack"
  | "ghl"
  | "systeme"
  | "insights"
  | "nextMonth";

export interface DashboardDataRow {
  id: string;
  client_id: string;
  period_id: string;
  section: SectionName;
  data: unknown;
  created_at: string;
  updated_at: string;
}

// ===== KPI Types =====
export interface KPI {
  label: string;
  value: string;
  badge?: string;
  change?: string;
  direction: "up" | "down" | "neutral";
  icon?: string;
}

// ===== Overview Section =====
export interface PaystackOverview {
  revenue: number;
  revenueFormatted: string;
  revenueBadge: string;
  activeMemberships?: number;
  membershipBreakdown?: string;
  failedAmount: number;
  failedFormatted: string;
  failedBadge: string;
  abandonedAmount: number;
  abandonedFormatted: string;
  abandonedBadge: string;
  reversedAmount?: number;
  reversedFormatted?: string;
  reversedBadge?: string;
}

export interface MissedRevenue {
  totalLost: number;
  totalLostFormatted: string;
  failedPayments: number;
  failedPaymentsBadge: string;
  abandonedCarts: number;
  abandonedCartsBadge: string;
  reversedChargebacks: number;
  reversedChargebacksBadge: string;
  recoveryRate: number;
  recoveryRateBadge: string;
}

export interface ChartDataPoint {
  name: string;
  spend?: number;
  value?: number;
  count?: number;
}

export interface PerformanceTrend {
  labels: string[];
  adSpend: number[];
  newContacts: number[];
  socialReach?: number[];
  revenue?: number[];
}

export interface SocialHighlights {
  instagramFollowers: { value: string; badge: string };
  facebookFans: { value: string; badge: string };
  fbOrganicReach: { value: string; badge: string };
  fbEngagements: { value: string; badge: string };
  igMonthlyReach: { value: string; badge: string };
  engagementRate: { value: string; badge: string };
}

export interface OverviewData {
  kpis: KPI[];
  paystack?: PaystackOverview;
  missedRevenue?: MissedRevenue;
  revenueVsFailedChart?: {
    successful: number;
    failed: number;
    abandoned: number;
  };
  performanceTrend?: PerformanceTrend;
  campaignSpend?: { name: string; spend: number }[];
  socialHighlights?: SocialHighlights;
}

// ===== Meta Ads Section =====
export interface MetaCampaign {
  name: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: string;
  cpc: string;
  reach: number;
}

export interface MetaData {
  kpis: KPI[];
  trend?: {
    labels: string[];
    spend: number[];
    impressions: number[];
    clicks: number[];
  };
  campaigns?: MetaCampaign[];
}

// ===== GHL Section =====
export interface SourceBreakdown {
  source: string;
  contacts: number;
  opportunities: number;
  won: number;
  revenue: string;
  convRate: string;
}

export interface GHLData {
  kpis: KPI[];
  contactsBySource?: {
    labels: string[];
    values: number[];
  };
  weeklyContactsRevenue?: {
    labels: string[];
    contacts: number[];
    revenue: number[];
  };
  sourceBreakdown?: SourceBreakdown[];
}

// ===== Systeme.io Section =====
export interface SystemeData {
  kpis: KPI[];
  productSales?: { name: string; count: number }[];
  topTags?: { name: string; count: number }[];
  trafficSources?: { domain: string; contacts: number; share: string }[];
}

// ===== Social Section =====
export interface SocialData {
  kpis: KPI[];
  trend?: {
    labels: string[];
    instagramReach: number[];
    facebookReach: number[];
    followers: number[];
  };
}

// ===== Paystack Section =====
export interface PaystackData {
  revenue: number;
  revenueFormatted: string;
  transactions: {
    successful: { count: number; amount: number };
    failed: { count: number; amount: number };
    abandoned: { count: number; amount: number };
    reversed: { count: number; amount: number };
  };
  activeMemberships?: {
    total: number;
    plans: { price: number; count: number }[];
  };
  trend?: {
    labels: string[];
    revenue: number[];
    transactions: number[];
  };
}

// ===== Insights Section =====
export interface InsightItem {
  icon: string;
  text: string;
}

export interface InsightsData {
  wins: InsightItem[];
  alerts: InsightItem[];
}

// ===== Next Month Section =====
export interface FocusArea {
  priority: "high" | "medium" | "low";
  area: string;
  recommendation: string;
}

export interface Target {
  metric: string;
  current: string;
  target: string;
  stretch: string;
}

export interface NextMonthData {
  focusAreas: FocusArea[];
  targets: Target[];
}

// ===== Client Account Mapping =====
export interface ClientAccountMapping {
  uuid: string;
  name: string;
  slug: string;
  color: string;
  facebookAds?: string[];
  facebookOrganic?: string;
  instagram?: string;
  goHighLevel?: string;
  paystack?: boolean;
  paystackAccounts?: string[];
  systemeIo?: boolean;
  wordpress?: string;
}
