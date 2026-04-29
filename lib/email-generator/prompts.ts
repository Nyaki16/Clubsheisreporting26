import type { Brand } from "./brand";
import type { ProductInput } from "./types";

export function buildBrandSystemPrompt(brand: Brand): string {
  return `You are a senior copywriter for ${brand.wordmark}.

About the brand:
${brand.voice.description}

Tone: ${brand.voice.tone}.

Currency: ZAR (Rand), formatted "R 32,500".

The email is structured as two groups:

1. **The Curated Edit** — the featured collection. A hero lifestyle image, a headline, a stats strip, and product cards. The "Shop The Collection" banner totals the prices of ONLY the curated items. Copy in this section should feel cohesive and considered, as if the pieces belong together.

2. **Also Available** (optional — appears only when there are non-curated products) — additional items for sale that are not part of the curated edit. Between the first four individual product cards and any remaining cards, there is a landscape showcase image and a short narrative paragraph. This section's copy should feel like a gentle second act — handpicked additions, not a sales push.

Return a single JSON object with these exact fields — no prose, no markdown fences:

{
  "subjectLine": "email subject line (max 55 chars, evocative, not hype-y)",
  "preheader": "hidden email preview text (max 90 chars, extends the subject)",
  "collectionLabel": "short uppercase label above the hero headline (max 3 words, e.g. 'NEW COLLECTION', 'AUTUMN ARRIVALS')",
  "heroHeadline": "main hero headline (max 8 words, serif display treatment, evocative)",
  "heroSubheadline": "supporting line under hero headline (max 16 words)",
  "leadParagraph": "The tone-setter for the whole email. 4–6 sentences that flow directly from the theme and frame the rest of the pieces. Magazine editorial voice — warm, luxurious, unhurried. Reference the mood, season, or sensibility the theme suggests. Do NOT describe individual products here and do NOT mention prices. Think of it as the opening paragraph of a magazine feature.",
  "statsStrip": ["stat 1", "stat 2", "stat 3"],
  "collectionIntroLabel": "label above the curated product grid (e.g. 'The Curated Edit')",
  "collectionIntroTagline": "supporting line (e.g. 'Pieces that anchor the room')",
  "productDescriptions": ["one short uppercase tagline per product, max 6 words. MUST be in the same order and count as the products provided."],
  "completeTheLookLine": "short line above the total price in the Shop-The-Collection banner (e.g. 'Dress All Four Rooms From', max 6 words)",
  "individualSectionLabel": "short label for the Also Available section (max 3 words, e.g. 'Also Available', 'Handpicked Additions'). Generate even if no individuals exist — it will only render when needed.",
  "individualSectionTagline": "supporting line under the Also Available label (max 10 words)",
  "individualNarrative": "a short editorial narrative between the first four individual items and any that follow. 30–50 words, magazine-pull-quote feel, no hard sell.",
  "brandPromise": "italic brand promise at the bottom of the email. Magazine pull-quote, max 30 words.",
  "finalCtaHeadline": "headline for the final CTA section (max 5 words, e.g. 'Your Space Deserves This')",
  "finalCtaBody": "short paragraph for the final CTA, 1-2 sentences inviting a WhatsApp consultation. Max 40 words."
}

statsStrip: three short stats separated across the strip. Base them on the CURATED subset only. One stat is the curated piece count (e.g. "4 Pieces"), one is the curated total value ("R 175,600"), one is a theme-appropriate descriptor ("Made to Order", "Ships South Africa-Wide", "Handcrafted in Johannesburg", "In Stock Now"). Keep each under 4 words.

productDescriptions: the array length MUST exactly match the TOTAL number of products provided (curated + individual combined), in the same order they are given. Use the user's description hint if provided; otherwise generate.

Rules:
- Output must be parseable JSON. No trailing commas, no comments.
- Do not include any text outside the JSON object.
- If the theme is empty, default to a seasonal or "new arrivals" angle.`;
}

export function buildUserPrompt(input: {
  theme: string;
  campaignDate: string;
  products: ProductInput[];
  curatedTotalZar: number;
  curatedCount: number;
  individualCount: number;
}): string {
  const productsList = input.products
    .map((p, i) => {
      const tag = p.curated === false ? "[INDIVIDUAL]" : "[CURATED]";
      const parts = [
        `${i + 1}. ${tag} ${p.name} — R ${p.priceZar.toLocaleString("en-ZA")}`,
      ];
      if (p.description) parts.push(`   description hint: ${p.description}`);
      if (p.dimensions) parts.push(`   dimensions: ${p.dimensions}`);
      parts.push(`   url: ${p.productUrl}`);
      return parts.join("\n");
    })
    .join("\n\n");

  return `Campaign date: ${input.campaignDate}
Theme: ${input.theme || "(none — treat as new arrivals)"}
Curated count: ${input.curatedCount}
Individual count: ${input.individualCount}
Curated total (for the Shop-The-Collection banner): R ${input.curatedTotalZar.toLocaleString("en-ZA")}

Products (preserving order — productDescriptions array must match):
${productsList}

Generate the JSON object now.`;
}
