export interface ProductInput {
  name: string;
  priceZar: number;
  productUrl: string;
  description?: string;
  dimensions?: string;
}

export interface CampaignInput {
  campaignDate: string;
  theme: string;
  products: ProductInput[];
}

export interface AICopy {
  subjectLine: string;
  preheader: string;
  collectionLabel: string;
  heroHeadline: string;
  heroSubheadline: string;
  statsStrip: [string, string, string];
  collectionIntroLabel: string;
  collectionIntroTagline: string;
  productDescriptions: string[];
  completeTheLookLine: string;
  brandPromise: string;
  finalCtaHeadline: string;
  finalCtaBody: string;
}

export type SlotLayout = "hero" | "full" | "half";

export interface ImageSlot {
  id: string;
  layout: SlotLayout;
  width: number;
  productIndex?: number;
  productName?: string;
  productUrl?: string;
}

export interface Draft {
  html: string;
  copy: AICopy;
  slots: ImageSlot[];
  totalZar: number;
}

export type SlotUrlMap = Record<string, string>;
