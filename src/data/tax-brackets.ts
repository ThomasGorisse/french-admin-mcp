/**
 * Barème impôt sur le revenu 2025 (revenus 2024) et 2026 (revenus 2025).
 * Source : CGI art. 197, loi de finances.
 *
 * Chaque tranche : { min, max (Infinity pour la dernière), taux }
 * Le taux est exprimé en décimal (0.11 = 11 %).
 */

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

/** Barème 2025 sur revenus 2024 */
export const TAX_BRACKETS_2025: TaxBracket[] = [
  { min: 0, max: 11_294, rate: 0 },
  { min: 11_294, max: 28_797, rate: 0.11 },
  { min: 28_797, max: 82_341, rate: 0.30 },
  { min: 82_341, max: 177_106, rate: 0.41 },
  { min: 177_106, max: Infinity, rate: 0.45 },
];

/** Barème 2026 sur revenus 2025 (officiel, loi de finances 2026, indexé +0.9 %) */
export const TAX_BRACKETS_2026: TaxBracket[] = [
  { min: 0, max: 11_600, rate: 0 },
  { min: 11_600, max: 29_579, rate: 0.11 },
  { min: 29_579, max: 84_577, rate: 0.30 },
  { min: 84_577, max: 181_917, rate: 0.41 },
  { min: 181_917, max: Infinity, rate: 0.45 },
];

/** Plafond du quotient familial (par demi-part au-delà de 2) */
export const QF_PLAFOND_2025 = 1_759;
export const QF_PLAFOND_2026 = 1_791;

/** Décote 2025 (revenus 2024) */
export const DECOTE_SEUIL_CELIBATAIRE_2025 = 1_929;
export const DECOTE_SEUIL_COUPLE_2025 = 3_191;

/** Décote 2026 (revenus 2025) — indexée +0.9% */
export const DECOTE_SEUIL_CELIBATAIRE_2026 = 1_946;
export const DECOTE_SEUIL_COUPLE_2026 = 3_220;

/** Abattement forfaitaire 10 % salaires */
export const ABATTEMENT_SALAIRES_MIN = 504;
export const ABATTEMENT_SALAIRES_MAX = 14_426;
export const ABATTEMENT_SALAIRES_RATE = 0.10;

/**
 * Nombre de parts fiscales selon la situation.
 */
export function calculerParts(
  situationFamiliale: "celibataire" | "marie" | "pacse" | "divorce" | "veuf",
  enfants: number,
  enfantsEnGardeAlternee: number = 0
): number {
  let parts = situationFamiliale === "marie" || situationFamiliale === "pacse" ? 2 : 1;

  // Parent isolé : +0.5 part
  if (
    (situationFamiliale === "celibataire" || situationFamiliale === "divorce") &&
    enfants > 0
  ) {
    parts += 0.5;
  }

  // Veuf avec enfants : 2 parts (comme couple)
  if (situationFamiliale === "veuf" && enfants > 0) {
    parts = 2;
  }

  // Enfants à charge pleine
  const enfantsPleins = enfants - enfantsEnGardeAlternee;
  if (enfantsPleins >= 1) parts += 0.5;
  if (enfantsPleins >= 2) parts += 0.5;
  if (enfantsPleins >= 3) parts += enfantsPleins - 2; // 1 part par enfant à partir du 3ème

  // Enfants en garde alternée (demi-parts divisées par 2)
  if (enfantsEnGardeAlternee >= 1) parts += 0.25;
  if (enfantsEnGardeAlternee >= 2) parts += 0.25;
  if (enfantsEnGardeAlternee >= 3) parts += (enfantsEnGardeAlternee - 2) * 0.5;

  return parts;
}

/**
 * Calcul de l'impôt brut sur un revenu imposable pour N parts.
 */
export function calculerImpotBrut(
  revenuImposable: number,
  parts: number,
  brackets: TaxBracket[] = TAX_BRACKETS_2025
): number {
  const quotient = revenuImposable / parts;
  let impotParPart = 0;

  for (const bracket of brackets) {
    if (quotient <= bracket.min) break;
    const taxableInBracket = Math.min(quotient, bracket.max) - bracket.min;
    impotParPart += taxableInBracket * bracket.rate;
  }

  return Math.round(impotParPart * parts);
}
