export const AP_EXAMS = [
  "AP Art History",
  "AP Biology",
  "AP Calculus AB",
  "AP Calculus BC",
  "AP Chemistry",
  "AP Computer Science A",
  "AP Computer Science Principles",
  "AP English Language",
  "AP English Literature",
  "AP Environmental Science",
  "AP European History",
  "AP Human Geography",
  "AP Macroeconomics",
  "AP Microeconomics",
  "AP Physics 1",
  "AP Physics 2",
  "AP Physics C: Mechanics",
  "AP Physics C: E&M",
  "AP Psychology",
  "AP Statistics",
  "AP US History",
  "AP World History",
] as const;

export const REGENTS_EXAMS = [
  "Algebra I Regents",
  "Algebra II Regents",
  "Geometry Regents",
  "Global History Regents",
  "US History Regents",
  "Living Environment Regents",
  "Earth Science Regents",
  "Chemistry Regents",
  "Physics Regents",
  "English Regents",
] as const;

export const GENERAL_TOPICS = [
  "General Math",
  "General Science",
  "General English",
  "General Social Studies",
  "Books/Literature",
] as const;

export const TOPICS = [
  "SAT",
  "PSAT",
  "ACT",
  ...GENERAL_TOPICS,
  ...AP_EXAMS,
  ...REGENTS_EXAMS,
] as const;

export const CONDITIONS = ["Like New", "Good", "Fair", "Bad"] as const;

export const SCHOOLS = [
  "Herricks High School",
  "Manhasset Secondary School",
] as const;

export const LISTING_TYPES = ["sell", "donate"] as const;

/** Fixed listing-fee brackets by asking price. */
export const LISTING_FEE_BRACKETS = [
  { max: 10, fee: 2, label: "$10 or less" },
  { max: 20, fee: 3, label: "$10 – $20" },
  { max: 50, fee: 5, label: "$20 – $50" },
  { max: 100, fee: 10, label: "$50 – under $100" },
  { max: Infinity, fee: 15, label: "$100+" },
] as const;

/** Flat listing fee based on asking-price bracket. */
export function calcListingFee(price: number | null | undefined): number {
  if (price == null || Number.isNaN(price) || price <= 0) return 0;
  if (price <= 10) return 2;
  if (price <= 20) return 3;
  if (price <= 50) return 5;
  if (price < 100) return 10;
  return 15;
}

export function formatListingFee(price: number | null | undefined): string {
  const fee = calcListingFee(price);
  return fee > 0 ? `$${fee.toFixed(2)}` : "$0.00";
}

/** Buyer savings vs regular/retail price (donate counts as $0 listed). */
export function calcListingSavings(
  regularPrice: number | null | undefined,
  listedPrice: number | null | undefined,
  listingType?: "sell" | "donate" | null,
): number {
  if (regularPrice == null || Number.isNaN(regularPrice) || regularPrice <= 0) {
    return 0;
  }
  const listed =
    listingType === "donate" || listedPrice == null || Number.isNaN(listedPrice)
      ? 0
      : listedPrice;
  return Math.max(0, Math.round((regularPrice - listed) * 100) / 100);
}
