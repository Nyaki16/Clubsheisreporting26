// Raw data from API fetchers - before transformation into dashboard sections

export interface PaystackTransactionSummary {
  revenue: number;
  successCount: number;
  failedCount: number;
  abandonedCount: number;
  reversedCount: number;
}

export interface PaystackMembershipSummary {
  members: number;          // successful R149+R349 payments this month (for CSI)
  memberBreakdown: string;  // e.g. "15×R149 + 42×R349"
  activeSubscriptions: number;
  attentionSubscriptions: number;
  nonRenewingSubscriptions: number;
  plans: string;            // e.g. "103×R149 + 111×R349 (memberships only)"
}

export interface WindsorMetaAdsData {
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  campaigns: { name: string; spend: number; impressions: number; clicks: number; ctr: string; cpc: string; reach: number }[];
}

export interface WindsorFBOrganicData {
  fans: number;
  impressions: number;
  engagements: number;
}

export interface WindsorInstagramData {
  reach: number;
  followers: string;  // current follower count as string
}

export interface GHLRevenueData {
  revenue: number;
  transactionCount: number;
  isNewSubs?: boolean;  // For W&W: GHL rev represents new subscribers
  newSubCount?: number;
  label: string;
}

export interface SystemeRevenueData {
  revenue: number;
  salesCount: number;
  products: { name: string; count: number; revenue: number }[];
  label: string;
}

export interface FetchedClientData {
  clientId: string;
  clientKey: string;
  periodLabel: string;

  // Paystack
  paystack?: PaystackTransactionSummary;
  paystackMembership?: PaystackMembershipSummary;

  // Windsor
  metaAds?: WindsorMetaAdsData;
  fbOrganic?: WindsorFBOrganicData;
  instagram?: WindsorInstagramData;

  // GHL
  ghl?: GHLRevenueData;

  // Systeme.io
  systeme?: SystemeRevenueData;

  // Email leads (manual/static for now)
  emailLeads?: number;
}

export interface MonthData {
  label: string;  // "January 2026"
  data: FetchedClientData;
}
