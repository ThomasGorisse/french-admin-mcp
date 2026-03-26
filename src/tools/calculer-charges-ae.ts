import {
  URSSAF_RATES,
  calculerChargesTrimestrielles,
  TVA_SEUIL_SERVICES,
  TVA_SEUIL_COMMERCE,
  VERSEMENT_LIBERATOIRE,
  VERSEMENT_LIBERATOIRE_SEUIL_PAR_PART,
} from "../data/urssaf-rates.js";

export interface ChargesAEInput {
  chiffreAffaires: number;
  typeActivite: "services_bic" | "services_bnc" | "commerce" | "liberal_cipav";
  periode: "mensuel" | "trimestriel" | "annuel";
  versementLiberatoire?: boolean;
  acre?: boolean;
}

export interface ChargesAEResult {
  activite: string;
  chiffreAffaires: number;
  periode: string;
  cotisationsSociales: number;
  cfp: number;
  versementIR: number;
  totalCharges: number;
  resteApresCharges: number;
  tauxEffectif: number;
  // Projections annuelles
  caAnnuelEstime: number;
  chargesAnnuellesEstimees: number;
  resteAnnuelEstime: number;
  // Seuils
  plafondCA: number;
  seuilTVA: number;
  assujettissementTVA: boolean;
  // Si ACRE
  acreApplique: boolean;
  economieAcre: number;
  avertissement: string;
}

export function calculerChargesAE(input: ChargesAEInput): ChargesAEResult {
  const rate = URSSAF_RATES[input.typeActivite];
  if (!rate) {
    throw new Error(`Type d'activité inconnu : ${input.typeActivite}`);
  }

  // Convertir en trimestriel pour le calcul
  let caTrimestriel: number;
  let multiplicateur: number;
  switch (input.periode) {
    case "mensuel":
      caTrimestriel = input.chiffreAffaires * 3;
      multiplicateur = 12;
      break;
    case "trimestriel":
      caTrimestriel = input.chiffreAffaires;
      multiplicateur = 4;
      break;
    case "annuel":
      caTrimestriel = input.chiffreAffaires / 4;
      multiplicateur = 1;
      break;
  }

  const vl = input.versementLiberatoire ?? false;
  let charges = calculerChargesTrimestrielles(caTrimestriel, input.typeActivite, vl);

  // ACRE : réduction de 50% des cotisations sociales la 1ère année
  let economieAcre = 0;
  if (input.acre) {
    economieAcre = Math.round(charges.cotisationsSociales * 0.5 * 100) / 100;
    const cotisationsReduites = charges.cotisationsSociales - economieAcre;
    const totalReduit = cotisationsReduites + charges.cfp + charges.versementIR;
    charges = {
      ...charges,
      cotisationsSociales: Math.round(cotisationsReduites * 100) / 100,
      total: Math.round(totalReduit * 100) / 100,
      caNet: Math.round((caTrimestriel - totalReduit) * 100) / 100,
    };
  }

  // Ramener à la période demandée
  const diviseur = input.periode === "mensuel" ? 3 : input.periode === "annuel" ? 0.25 : 1;
  const cotisationsPeriode = Math.round((charges.cotisationsSociales / diviseur) * 100) / 100;
  const cfpPeriode = Math.round((charges.cfp / diviseur) * 100) / 100;
  const vlPeriode = Math.round((charges.versementIR / diviseur) * 100) / 100;
  const totalPeriode = Math.round((charges.total / diviseur) * 100) / 100;
  const restePeriode = Math.round((input.chiffreAffaires - totalPeriode) * 100) / 100;

  const caAnnuel = input.chiffreAffaires * multiplicateur;
  const chargesAnnuelles = Math.round(totalPeriode * multiplicateur * 100) / 100;

  const seuilTVA =
    input.typeActivite === "commerce" ? TVA_SEUIL_COMMERCE : TVA_SEUIL_SERVICES;

  return {
    activite: rate.activite,
    chiffreAffaires: input.chiffreAffaires,
    periode: input.periode,
    cotisationsSociales: cotisationsPeriode,
    cfp: cfpPeriode,
    versementIR: vlPeriode,
    totalCharges: totalPeriode,
    resteApresCharges: restePeriode,
    tauxEffectif:
      Math.round((totalPeriode / input.chiffreAffaires) * 10000) / 100,
    caAnnuelEstime: caAnnuel,
    chargesAnnuellesEstimees: chargesAnnuelles,
    resteAnnuelEstime: Math.round((caAnnuel - chargesAnnuelles) * 100) / 100,
    plafondCA: rate.plafondCA,
    seuilTVA,
    assujettissementTVA: caAnnuel > seuilTVA,
    acreApplique: input.acre ?? false,
    economieAcre: input.acre
      ? Math.round((economieAcre / diviseur) * 100) / 100
      : 0,
    avertissement:
      "⚠️ Calcul indicatif basé sur les taux URSSAF 2026. " +
      "Les taux réels peuvent varier selon votre situation. " +
      "Consultez autoentrepreneur.urssaf.fr pour les montants exacts." +
      (caAnnuel > rate.plafondCA
        ? ` ATTENTION : votre CA annuel estimé (${caAnnuel} €) dépasse le plafond (${rate.plafondCA} €). Vous risquez de sortir du régime micro-entrepreneur.`
        : ""),
  };
}
