import {
  TAX_BRACKETS_2025,
  TAX_BRACKETS_2026,
  calculerParts,
  calculerImpotBrut,
  ABATTEMENT_SALAIRES_RATE,
  ABATTEMENT_SALAIRES_MIN,
  ABATTEMENT_SALAIRES_MAX,
  DECOTE_SEUIL_CELIBATAIRE_2025,
  DECOTE_SEUIL_COUPLE_2025,
  DECOTE_SEUIL_CELIBATAIRE_2026,
  DECOTE_SEUIL_COUPLE_2026,
} from "../data/tax-brackets.js";

export interface SimulationImpotsInput {
  revenuBrutAnnuel: number;
  typeRevenu: "salaire" | "bnc" | "bic_services" | "bic_commerce" | "foncier" | "autre";
  situationFamiliale: "celibataire" | "marie" | "pacse" | "divorce" | "veuf";
  enfants?: number;
  enfantsEnGardeAlternee?: number;
  chargesDeductibles?: number;
  anneeRevenus?: number;
}

export interface SimulationImpotsResult {
  revenuBrut: number;
  abattement: number;
  revenuNet: number;
  chargesDeduites: number;
  revenuImposable: number;
  parts: number;
  quotientFamilial: number;
  impotBrut: number;
  decote: number;
  impotNet: number;
  tauxMoyen: number;
  tauxMarginal: number;
  revenuApresImpot: number;
  bareme: string;
  avertissement: string;
}

export function simulerImpots(input: SimulationImpotsInput): SimulationImpotsResult {
  const annee = input.anneeRevenus ?? 2024;
  const brackets = annee >= 2025 ? TAX_BRACKETS_2026 : TAX_BRACKETS_2025;
  const baremeLabel = annee >= 2025 ? "2026 (revenus 2025)" : "2025 (revenus 2024)";

  // Abattement selon type de revenu
  let abattement = 0;
  switch (input.typeRevenu) {
    case "salaire":
      abattement = Math.min(
        ABATTEMENT_SALAIRES_MAX,
        Math.max(ABATTEMENT_SALAIRES_MIN, input.revenuBrutAnnuel * ABATTEMENT_SALAIRES_RATE)
      );
      break;
    case "bnc":
      abattement = input.revenuBrutAnnuel * 0.34;
      break;
    case "bic_services":
      abattement = input.revenuBrutAnnuel * 0.50;
      break;
    case "bic_commerce":
      abattement = input.revenuBrutAnnuel * 0.71;
      break;
    case "foncier":
      abattement = input.revenuBrutAnnuel * 0.30; // micro-foncier
      break;
    default:
      abattement = 0;
  }

  const revenuNet = Math.round(input.revenuBrutAnnuel - abattement);
  const chargesDeduites = input.chargesDeductibles ?? 0;
  const revenuImposable = Math.max(0, revenuNet - chargesDeduites);

  const enfants = input.enfants ?? 0;
  const gardeAlternee = input.enfantsEnGardeAlternee ?? 0;
  const parts = calculerParts(input.situationFamiliale, enfants, gardeAlternee);
  const quotientFamilial = Math.round(revenuImposable / parts);

  const impotBrut = calculerImpotBrut(revenuImposable, parts, brackets);

  // Décote (simplifiée)
  let decote = 0;
  const isCouple = input.situationFamiliale === "marie" || input.situationFamiliale === "pacse";
  const seuilDecote = annee >= 2025
    ? (isCouple ? DECOTE_SEUIL_COUPLE_2026 : DECOTE_SEUIL_CELIBATAIRE_2026)
    : (isCouple ? DECOTE_SEUIL_COUPLE_2025 : DECOTE_SEUIL_CELIBATAIRE_2025);

  if (impotBrut > 0 && impotBrut < seuilDecote) {
    decote = Math.round(seuilDecote - impotBrut * 0.4525);
    decote = Math.max(0, Math.min(decote, impotBrut));
  }

  const impotNet = Math.max(0, impotBrut - decote);

  // Taux marginal
  const qf = revenuImposable / parts;
  let tauxMarginal = 0;
  for (const bracket of brackets) {
    if (qf > bracket.min) tauxMarginal = bracket.rate;
  }

  const tauxMoyen = revenuImposable > 0 ? (impotNet / revenuImposable) * 100 : 0;

  return {
    revenuBrut: input.revenuBrutAnnuel,
    abattement: Math.round(abattement),
    revenuNet,
    chargesDeduites,
    revenuImposable,
    parts,
    quotientFamilial,
    impotBrut,
    decote,
    impotNet,
    tauxMoyen: Math.round(tauxMoyen * 100) / 100,
    tauxMarginal: tauxMarginal * 100,
    revenuApresImpot: input.revenuBrutAnnuel - impotNet,
    bareme: baremeLabel,
    avertissement:
      "⚠️ Simulation indicative uniquement. Ne constitue pas un avis fiscal. " +
      "Pour une simulation officielle, utilisez simulateur.impots.gouv.fr. " +
      "Les crédits/réductions d'impôt ne sont pas pris en compte ici.",
  };
}
