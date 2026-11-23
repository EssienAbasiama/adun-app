/** Brand + checkout constants, shared with the website (src/lib/site.ts there). */
export const site = {
  name: "Àdùn",
  tagline: "Lagos-born. World-fed.",
  url: "https://adun-rose.vercel.app",
  address: ["Admiralty Way", "Lekki Phase 1, Lagos"],
  vat: 0.075,
  freeDeliveryFrom: 40000,
} as const;

export const AREAS = [
  { id: "lekki", label: "Lekki", fee: 1500, eta: 25 },
  { id: "vi", label: "Victoria Island", fee: 2000, eta: 30 },
  { id: "ikoyi", label: "Ikoyi", fee: 2000, eta: 30 },
  { id: "ajah", label: "Ajah", fee: 3000, eta: 45 },
  { id: "yaba", label: "Yaba", fee: 3500, eta: 50 },
  { id: "ikeja", label: "Ikeja", fee: 4500, eta: 60 },
] as const;
export const TIPS = [0, 5, 10, 15] as const;
export const PAY = [
  { id: "pod", title: "Pay on arrival", sub: "Cash, transfer or POS when it lands" },
  { id: "transfer", title: "Bank transfer", sub: "Demo only, no account details" },
  { id: "card", title: "Card", sub: "Demo only, no card is charged" },
] as const;
export const PROMOS: Record<string, number> = { JOLLOF10: 0.1, OWAMBE: 0.15 };

/** Seconds after placing an order when each tracker stage begins (demo pacing). */
export const TRACKER_T = [0, 5, 12, 19, 36] as const;
