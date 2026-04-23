import type { ProductInput } from "./types";

export interface LookbookProduct {
  originalIndex: number;
  name: string;
  priceZar: number;
  description: string;
  dimensions?: string;
  productUrl: string;
  imageUrl?: string;
}

export type LookbookPage =
  | {
      kind: "cover";
      heroUrl?: string;
      theme: string;
      subheadline: string;
      lead: string;
      wordmark: string;
    }
  | {
      kind: "products";
      sectionLabel: string;
      narrative: string;
      products: LookbookProduct[];
    }
  | {
      kind: "contact";
      whatsapp: string;
      phone: string;
      website: string;
      instagram: string;
    };

const PRODUCTS_PER_PAGE = 4;

export function groupProducts(
  products: LookbookProduct[]
): LookbookProduct[][] {
  const pages: LookbookProduct[][] = [];
  for (let i = 0; i < products.length; i += PRODUCTS_PER_PAGE) {
    pages.push(products.slice(i, i + PRODUCTS_PER_PAGE));
  }
  return pages;
}

export function buildLookbookProducts(
  products: ProductInput[],
  descriptions: string[],
  slotUrls: Record<string, string>
): {
  curated: LookbookProduct[];
  individual: LookbookProduct[];
} {
  const curated: LookbookProduct[] = [];
  const individual: LookbookProduct[] = [];
  products.forEach((p, i) => {
    const item: LookbookProduct = {
      originalIndex: i,
      name: p.name,
      priceZar: p.priceZar,
      description: descriptions[i] || p.description || "",
      dimensions: p.dimensions,
      productUrl: p.productUrl,
      imageUrl: slotUrls[`product-${i}`],
    };
    if (p.curated === false) individual.push(item);
    else curated.push(item);
  });
  return { curated, individual };
}

export interface LookbookCopyPage {
  sectionLabel: string;
  narrative: string;
  productOriginalIndices: number[];
}
