import { ClientAccountMapping } from "@/types/dashboard";

export const CLIENT_ACCOUNTS: ClientAccountMapping[] = [
  {
    uuid: "0a9476d1-5a5a-4f4b-b213-8c9528587b37",
    name: "Club She Is",
    slug: "club-she-is",
    color: "#4A1942",
    facebookAds: ["1579515942849269"],
    facebookOrganic: "109329703032995",
    instagram: "17841402788798805",
    goHighLevel: "AkhI3DXZ01YFKLGXfg2V",
    paystack: true,
    paystackAccounts: ["1", "2", "3", "4"],
    systemeIo: true,
  },
  {
    uuid: "5529a26b-fe9f-4e8c-967c-12828dcbba7d",
    name: "Awahome",
    slug: "awahome",
    color: "#8B3A62",
    facebookAds: ["844275745180907"],
    facebookOrganic: "113308466875306",
    instagram: "17841401609005113",
    goHighLevel: "GWAnJQeAJSENicSyGKDC",
  },
  {
    uuid: "bccee066-354d-4bcd-b46c-bd44da65f016",
    name: "GIBS EDA",
    slug: "gibs-eda",
    color: "#1F2937",
  },
  {
    uuid: "e5555d53-77ed-43fe-995b-d96ce6e772a7",
    name: "Link Interiors",
    slug: "link-interiors",
    color: "#C4956A",
    facebookAds: ["744119155184115"],
    facebookOrganic: "919844641722004",
    instagram: "17841415636828180",
    goHighLevel: "9FSp4QLrs63jpzugi2NL",
    wordpress: "www.linkinterior.co.za",
  },
  {
    uuid: "9bd71d9b-e419-46a8-bb29-6155174b5d46",
    name: "Palesa Dooms",
    slug: "palesa-dooms",
    color: "#059669",
    facebookAds: ["346283871806094", "2246460195737618"],
    facebookOrganic: "602923406799748",
    instagram: "17841469417252316",
    goHighLevel: "NDVeEcaieSYrPqxiBRxD",
    paystack: true,
    systemeIo: true,
  },
  {
    uuid: "33d1c611-d00f-4f32-b3ad-2a4e94a9437c",
    name: "Purpose for Impact",
    slug: "purpose-for-impact",
    color: "#0D9488",
    facebookOrganic: "602790659574747",
    instagram: "17841469744147081",
    goHighLevel: "P2GxuKbjPEU0kQlXrCqf",
  },
  {
    uuid: "eb1d354f-d57f-4730-9cfb-6f057b83ee08",
    name: "Wisdom & Wellness",
    slug: "wisdom-wellness",
    color: "#D97706",
    facebookAds: ["956456447068702"],
    facebookOrganic: "100857922763752",
    instagram: "17841449119247616",
    goHighLevel: "OgSu08WcrumYq4ZHcoHp",
  },
];

export function getClientBySlug(slug: string): ClientAccountMapping | undefined {
  return CLIENT_ACCOUNTS.find((c) => c.slug === slug);
}

export function getClientByUuid(uuid: string): ClientAccountMapping | undefined {
  return CLIENT_ACCOUNTS.find((c) => c.uuid === uuid);
}
