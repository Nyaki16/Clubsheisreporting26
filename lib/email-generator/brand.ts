export const BRAND = {
  palette: {
    black: "#0A0A0A",
    white: "#FAFAFA",
    gold: "#C9A96E",
    goldLight: "#D4BA8A",
    goldDark: "#A8874D",
    cream: "#F5F0E8",
    charcoal: "#1A1A1A",
    greyText: "#8A8A8A",
  },
  fonts: {
    serif: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
    sans: "'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  },
  contact: {
    whatsapp: "https://wa.me/27632072807",
    phone: "+27 63 207 2807",
    website: "https://linkinterior.co.za",
    instagram: "@link_interior",
    instagramUrl: "https://instagram.com/link_interior",
  },
  wordmark: "LINK INTERIORS",
} as const;

export function formatZar(amount: number): string {
  return "R " + amount.toLocaleString("en-ZA", { maximumFractionDigits: 0 });
}
