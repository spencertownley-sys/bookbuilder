// Single source of truth for pricing. Change numbers here and the pricing page,
// checkout, and feature gates all follow.

export type PlanId = "free" | "creator" | "studio";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  monthly: number; // USD
  yearly: number; // USD per year (shown as discount)
  // Stripe Price IDs come from env so test/live modes stay separate.
  stripePriceEnvMonthly?: string;
  stripePriceEnvYearly?: string;
  limits: {
    books: number; // active books
    pagesPerBook: number;
    aiImagesPerMonth: number;
    watermark: boolean;
    printReadyPdf: boolean; // 300dpi + bleed export for KDP/Ingram/Lulu
    commercialLicense: boolean; // may sell the book
    characters: "basic" | "all";
  };
  features: string[];
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Doodle",
    tagline: "Make a book for someone you love",
    monthly: 0,
    yearly: 0,
    limits: {
      books: 2,
      pagesPerBook: 16,
      aiImagesPerMonth: 5,
      watermark: true,
      printReadyPdf: false,
      commercialLicense: false,
      characters: "basic",
    },
    features: [
      "2 books, up to 16 pages each (24 with a Keepsake unlock)",
      "All 6 story starters, backgrounds & stickers",
      "Family share links & voice recordings",
      "Posable characters (3 styles)",
      "5 AI illustrations / month",
      "Screen-quality PDF (small watermark)",
    ],
  },
  {
    id: "creator",
    name: "Storyteller",
    tagline: "For gifts, keepsakes and your first published book",
    monthly: 4.99,
    yearly: 39,
    stripePriceEnvMonthly: "STRIPE_PRICE_CREATOR_MONTHLY",
    stripePriceEnvYearly: "STRIPE_PRICE_CREATOR_YEARLY",
    limits: {
      books: 10,
      pagesPerBook: 40,
      aiImagesPerMonth: 60,
      watermark: false,
      printReadyPdf: true,
      commercialLicense: true,
      characters: "all",
    },
    features: [
      "10 books, up to 40 pages",
      "60 AI illustrations / month",
      "Print-ready PDF with bleed (KDP, IngramSpark, Lulu)",
      "No watermark + the right to sell your books",
      "Every character, outfit and pose",
    ],
    highlight: true,
  },
  {
    id: "studio",
    name: "Publisher",
    tagline: "For authors, teachers and small presses",
    monthly: 9.99,
    yearly: 79,
    stripePriceEnvMonthly: "STRIPE_PRICE_STUDIO_MONTHLY",
    stripePriceEnvYearly: "STRIPE_PRICE_STUDIO_YEARLY",
    limits: {
      books: 100,
      pagesPerBook: 64,
      aiImagesPerMonth: 250,
      watermark: false,
      printReadyPdf: true,
      commercialLicense: true,
      characters: "all",
    },
    features: [
      "100 books, up to 64 pages",
      "250 AI illustrations / month",
      "Print-ready interiors + paperback cover files",
      "No watermark + the right to sell your books",
      "Every character, outfit and pose",
    ],
  },
];

// One-time add-ons (Stripe one-off prices). Good for gift-buyers who won't subscribe.
export const ADD_ONS = [
  { id: "ai-pack-50", name: "50 extra AI illustrations", price: 3, priceEnv: "STRIPE_PRICE_AI_PACK" },
  { id: "keepsake", name: "Keepsake unlock (one book, print-ready, no watermark)", price: 6, priceEnv: "STRIPE_PRICE_KEEPSAKE" },
] as const;

export function getPlan(id: string | undefined | null): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}
