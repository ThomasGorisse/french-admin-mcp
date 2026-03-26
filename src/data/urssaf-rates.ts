/**
 * Taux URSSAF pour les auto-entrepreneurs (micro-entrepreneurs).
 * Mis à jour : barème 2026 (applicable au 1er janvier 2026).
 *
 * Source : urssaf.fr — taux de cotisations sociales micro-entreprise.
 * BNC passé de 24.6% (2025) à 25.6% (2026).
 * Commerce, Services BIC et CIPAV : inchangés.
 */

export interface UrssafRate {
  activite: string;
  description: string;
  tauxCotisations: number;
  tauxCFP: number; // Contribution à la Formation Professionnelle
  tauxTotal: number;
  abattementMicro: number; // Abattement forfaitaire pour l'IR
  plafondCA: number; // Plafond de CA annuel
}

export const URSSAF_RATES: Record<string, UrssafRate> = {
  services_bic: {
    activite: "Prestations de services (BIC)",
    description: "Artisanat, prestations de services commerciales",
    tauxCotisations: 0.212,
    tauxCFP: 0.003,
    tauxTotal: 0.215,
    abattementMicro: 0.50,
    plafondCA: 77_700,
  },
  services_bnc: {
    activite: "Prestations de services (BNC)",
    description: "Professions libérales, conseil, dev, formation",
    tauxCotisations: 0.254,
    tauxCFP: 0.002,
    tauxTotal: 0.256,
    abattementMicro: 0.34,
    plafondCA: 77_700,
  },
  commerce: {
    activite: "Vente de marchandises (BIC)",
    description: "Achat/revente, fabrication, restauration, hébergement",
    tauxCotisations: 0.123,
    tauxCFP: 0.001,
    tauxTotal: 0.124,
    abattementMicro: 0.71,
    plafondCA: 188_700,
  },
  liberal_cipav: {
    activite: "Professions libérales (CIPAV)",
    description: "Architectes, ingénieurs-conseil, psychologues, etc.",
    tauxCotisations: 0.232,
    tauxCFP: 0.002,
    tauxTotal: 0.234,
    abattementMicro: 0.34,
    plafondCA: 77_700,
  },
};

/** Seuil de franchise en base de TVA */
export const TVA_SEUIL_SERVICES = 36_800;
export const TVA_SEUIL_COMMERCE = 91_900;
export const TVA_SEUIL_MAJORE_SERVICES = 39_100;
export const TVA_SEUIL_MAJORE_COMMERCE = 101_000;

/** Versement libératoire de l'IR (option) */
export const VERSEMENT_LIBERATOIRE = {
  commerce: 0.01,
  services_bic: 0.017,
  services_bnc: 0.022,
  liberal_cipav: 0.022,
};

/** Seuil de revenus pour éligibilité au versement libératoire (RFR N-2 par part) */
export const VERSEMENT_LIBERATOIRE_SEUIL_PAR_PART = 28_797;

/**
 * Calcul des charges trimestrielles.
 */
export function calculerChargesTrimestrielles(
  caTrimestriel: number,
  typeActivite: keyof typeof URSSAF_RATES,
  versementLiberatoire: boolean = false
): {
  cotisationsSociales: number;
  cfp: number;
  versementIR: number;
  total: number;
  caNet: number;
} {
  const rate = URSSAF_RATES[typeActivite];
  if (!rate) throw new Error(`Type d'activité inconnu : ${typeActivite}`);

  const cotisationsSociales = Math.round(caTrimestriel * rate.tauxCotisations * 100) / 100;
  const cfp = Math.round(caTrimestriel * rate.tauxCFP * 100) / 100;
  const vlRate = versementLiberatoire
    ? VERSEMENT_LIBERATOIRE[typeActivite as keyof typeof VERSEMENT_LIBERATOIRE] ?? 0
    : 0;
  const versementIR = Math.round(caTrimestriel * vlRate * 100) / 100;
  const total = Math.round((cotisationsSociales + cfp + versementIR) * 100) / 100;
  const caNet = Math.round((caTrimestriel - total) * 100) / 100;

  return { cotisationsSociales, cfp, versementIR, total, caNet };
}
