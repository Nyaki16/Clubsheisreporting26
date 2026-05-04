export type EmailTheme = "dark" | "light";

export interface Brand {
  slug: string;
  wordmark: string;
  /** Optional hosted image to use in place of the text wordmark */
  logoImageUrl?: string;
  emailTheme: EmailTheme;
  palette: {
    bg: string;
    bgAlt: string;
    text: string;
    textMuted: string;
    accent: string;
    accentLight: string;
    accentDark: string;
    border: string;
  };
  fonts: {
    serif: string;
    sans: string;
    /** Used for serif headings — Link uses 300 (light); modern brands may want heavier */
    headingsWeight: number;
  };
  contact: {
    whatsapp?: string;
    phone?: string;
    website: string;
    instagram?: string;
    instagramUrl?: string;
  };
  voice: {
    /** Description for Claude system prompt — what kind of brand, where, what tone */
    description: string;
    /** Short tagline-shape: e.g. "magazine editorial, understated confidence" */
    tone: string;
  };
}

const LINK_INTERIORS: Brand = {
  slug: "link-interiors",
  wordmark: "LINK INTERIORS",
  emailTheme: "dark",
  palette: {
    bg: "#0A0A0A",
    bgAlt: "#1A1A1A",
    text: "#FAFAFA",
    textMuted: "#8A8A8A",
    accent: "#C9A96E",
    accentLight: "#D4BA8A",
    accentDark: "#A8874D",
    border: "#1A1A1A",
  },
  fonts: {
    serif: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    sans: "'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    headingsWeight: 300,
  },
  contact: {
    whatsapp: "https://wa.me/27632072807",
    phone: "+27 63 207 2807",
    website: "https://linkinterior.co.za",
    instagram: "@link_interior",
    instagramUrl: "https://instagram.com/link_interior",
  },
  voice: {
    description:
      "Link Interiors — a South African luxury interior design and furniture brand based in Johannesburg. The voice is magazine editorial: understated confidence, never salesy. Short, intentional sentences. Aspirational but grounded — attainable luxury for people who care about their space. Avoid exclamation marks, hype clichés, hashtags, and emojis. South African English spelling.",
    tone: "magazine editorial, understated confidence",
  },
};

const AWAHOME: Brand = {
  slug: "awahome",
  wordmark: "AWAHOME",
  emailTheme: "light",
  palette: {
    bg: "#FFFFFF",
    bgAlt: "#F7F4ED",
    text: "#141414",
    textMuted: "#6B6B6B",
    accent: "#D2AC2F",
    accentLight: "#E0BD52",
    accentDark: "#A88820",
    border: "#E5E1D6",
  },
  fonts: {
    serif: "'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    sans: "'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    headingsWeight: 400,
  },
  contact: {
    phone: "066 254 9155",
    website: "https://www.awahome.co.za",
    instagram: "@awahome_castironc",
    instagramUrl: "https://instagram.com/awahome_castironc",
  },
  voice: {
    description:
      "Awahome — a South African luxury modern furniture brand. The voice is contemporary and refined: warm, inviting, confident. Aspirational but accessible — the brand believes a home should reflect personality. Tone is current and elegant, not stiff. Avoid hype clichés, hashtags, emojis, and exclamation marks.",
    tone: "luxury modern, contemporary, inviting",
  },
};

const REGISTRY: Record<string, Brand> = {
  [LINK_INTERIORS.slug]: LINK_INTERIORS,
  [AWAHOME.slug]: AWAHOME,
};

export const BRAND_SLUGS = Object.keys(REGISTRY);

export function getBrand(slug: string): Brand | null {
  return REGISTRY[slug] || null;
}

export function getBrandOrThrow(slug: string): Brand {
  const b = REGISTRY[slug];
  if (!b) throw new Error(`Email generator not configured for client "${slug}"`);
  return b;
}

/** Backwards-compat default — points at Link Interiors */
export const BRAND = LINK_INTERIORS;

export function formatZar(amount: number): string {
  return "R " + amount.toLocaleString("en-ZA", { maximumFractionDigits: 0 });
}
