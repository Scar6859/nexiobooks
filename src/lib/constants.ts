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

export const TOPICS = ["SAT", "ACT", ...AP_EXAMS, ...REGENTS_EXAMS] as const;

export const CONDITIONS = ["Like New", "Good", "Fair"] as const;

export const SCHOOLS = [
  "Herricks High School",
  "Manhasset Secondary School",
] as const;

export const LISTING_TYPES = ["sell", "donate"] as const;

/** Platform listing fee as a fraction of the asking price (10%). */
export const LISTING_FEE_RATE = 0.1;

/** @deprecated Prefer LISTING_FEE_RATE — kept for homepage savings calc */
export const COMMISSION_RATE = LISTING_FEE_RATE;

export function calcListingFee(price: number | null | undefined): number {
  if (price == null || Number.isNaN(price) || price <= 0) return 0;
  return Math.round(price * LISTING_FEE_RATE * 100) / 100;
}

export function formatListingFee(price: number | null | undefined): string {
  const fee = calcListingFee(price);
  return fee > 0 ? `$${fee.toFixed(2)}` : "$0.00";
}

export const MAX_LISTINGS_PER_USER = 10;
