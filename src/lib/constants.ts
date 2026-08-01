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

export const COMMISSION_RATE = 0.08;

export const MAX_LISTINGS_PER_USER = 10;
