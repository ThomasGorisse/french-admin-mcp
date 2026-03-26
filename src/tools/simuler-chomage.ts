/**
 * Simulation de l'Allocation de Retour à l'Emploi (ARE) — chômage.
 * Barème 2026 (applicable au 1er janvier 2026).
 *
 * Sources : France Travail, Unédic, service-public.gouv.fr
 *
 * Formule :
 *  - SJR = Salaire Journalier de Référence = salaires bruts 24 derniers mois / nombre de jours travaillés
 *  - ARE = max(40.4% SJR + partie fixe, 57% SJR)
 *  - Plancher : 32.13 €/jour (au 01/07/2025)
 *  - Plafond : 75% du SJR
 */

export interface ChomageInput {
  salaireBrutMensuelMoyen: number;
  moisTravailles: number; // nombre de mois travaillés sur les 24 derniers mois (min 6)
  age: number;
  motifRupture: "licenciement" | "rupture_conventionnelle" | "fin_cdd" | "demission_legitime";
}

export interface ChomageResult {
  eligible: boolean;
  motifIneligibilite?: string;
  salaireJournalierReference: number;
  allocationJournaliereBrute: number;
  allocationMensuelleBrute: number;
  allocationMensuelleNette: number;
  dureeIndemnisationMois: number;
  dureeIndemnisationJours: number;
  differePaiementJours: number;
  montantTotalEstime: number;
  details: {
    methodeCalcul: string;
    partieFixeJournaliere: number;
    tauxApplique: number;
    plancherJournalier: number;
    plafondJournalier: number;
  };
  demarches: string[];
  avertissement: string;
}

// Constantes ARE 2026
const PARTIE_FIXE_JOURNALIERE = 13.11; // au 01/07/2025
const PLANCHER_JOURNALIER = 32.13; // allocation minimale
const TAUX_RETENUE_CSG_CRDS = 0.0635; // 6.2% CSG + 0.5% CRDS - 0.15% taux réduit

export function simulerChomage(input: ChomageInput): ChomageResult {
  // Vérification éligibilité
  if (input.moisTravailles < 6) {
    return {
      eligible: false,
      motifIneligibilite: "Il faut avoir travaillé au moins 6 mois (130 jours) sur les 24 derniers mois.",
      salaireJournalierReference: 0,
      allocationJournaliereBrute: 0,
      allocationMensuelleBrute: 0,
      allocationMensuelleNette: 0,
      dureeIndemnisationMois: 0,
      dureeIndemnisationJours: 0,
      differePaiementJours: 0,
      montantTotalEstime: 0,
      details: {
        methodeCalcul: "Non applicable",
        partieFixeJournaliere: 0,
        tauxApplique: 0,
        plancherJournalier: 0,
        plafondJournalier: 0,
      },
      demarches: [
        "Vous ne remplissez pas la condition de durée de travail minimale.",
        "Vérifiez vos droits sur francetravail.fr.",
      ],
      avertissement:
        "⚠️ Simulation indicative. Consultez France Travail pour une évaluation officielle.",
    };
  }

  // SJR = salaires bruts sur la période / nombre de jours calendaires travaillés
  // Simplification : mois travaillés * 30.42 jours calendaires
  const joursCalendaires = Math.round(input.moisTravailles * 30.42);
  const salairesTotaux = input.salaireBrutMensuelMoyen * input.moisTravailles;
  const sjr = Math.round((salairesTotaux / joursCalendaires) * 100) / 100;

  // Calcul de l'ARE : on retient le plus favorable
  const methode1 = sjr * 0.404 + PARTIE_FIXE_JOURNALIERE; // 40.4% + partie fixe
  const methode2 = sjr * 0.57; // 57%
  let areJournaliereBrute = Math.max(methode1, methode2);
  const methodeRetenue = methode1 >= methode2 ? "40.4% SJR + partie fixe" : "57% SJR";
  const tauxApplique = methode1 >= methode2 ? 0.404 : 0.57;

  // Plafond : 75% du SJR
  const plafond = sjr * 0.75;
  areJournaliereBrute = Math.min(areJournaliereBrute, plafond);

  // Plancher
  areJournaliereBrute = Math.max(areJournaliereBrute, PLANCHER_JOURNALIER);

  // Si le plancher dépasse 75% du SJR, on retient 75%
  if (PLANCHER_JOURNALIER > plafond && plafond > 0) {
    areJournaliereBrute = plafond;
  }

  areJournaliereBrute = Math.round(areJournaliereBrute * 100) / 100;

  // Durée d'indemnisation
  // Règle : 1 jour indemnisé pour 1 jour travaillé, plafonné
  const joursIndemnisation = joursCalendaires; // base
  let dureeMaxJours: number;
  if (input.age >= 57) {
    dureeMaxJours = 822; // 27 mois
  } else if (input.age >= 55) {
    dureeMaxJours = 685; // 22.5 mois
  } else {
    dureeMaxJours = 548; // 18 mois
  }
  const dureeEffectiveJours = Math.min(joursIndemnisation, dureeMaxJours);
  const dureeEffectiveMois = Math.round((dureeEffectiveJours / 30.42) * 10) / 10;

  // Différé de paiement (7 jours de carence + différé congés payés estimé)
  const differePaiement = 7;

  // Montants mensuels
  const areMensuelleBrute = Math.round(areJournaliereBrute * 30.42 * 100) / 100;
  // Cotisations sociales (CSG-CRDS) — la retenue ne peut pas faire descendre en-dessous de 98.25% plancher SMIC
  const areMensuelleNette = Math.round(areMensuelleBrute * (1 - TAUX_RETENUE_CSG_CRDS) * 100) / 100;

  // Total estimé
  const montantTotal = Math.round(areJournaliereBrute * dureeEffectiveJours * 100) / 100;

  const demarches: string[] = [
    "S'inscrire sur francetravail.fr dans les 12 mois suivant la fin de contrat",
    "Préparer : attestation employeur, certificat de travail, solde de tout compte",
    "Actualiser votre situation chaque mois sur francetravail.fr",
    "Le délai de carence est de 7 jours + éventuel différé congés payés",
  ];

  if (input.motifRupture === "rupture_conventionnelle") {
    demarches.push("Rupture conventionnelle : le différé spécifique peut s'appliquer (max 150 jours)");
  }

  return {
    eligible: true,
    salaireJournalierReference: sjr,
    allocationJournaliereBrute: areJournaliereBrute,
    allocationMensuelleBrute: areMensuelleBrute,
    allocationMensuelleNette: areMensuelleNette,
    dureeIndemnisationMois: dureeEffectiveMois,
    dureeIndemnisationJours: dureeEffectiveJours,
    differePaiementJours: differePaiement,
    montantTotalEstime: montantTotal,
    details: {
      methodeCalcul: methodeRetenue,
      partieFixeJournaliere: PARTIE_FIXE_JOURNALIERE,
      tauxApplique,
      plancherJournalier: PLANCHER_JOURNALIER,
      plafondJournalier: Math.round(plafond * 100) / 100,
    },
    demarches,
    avertissement:
      "⚠️ Simulation indicative basée sur les règles ARE 2026. " +
      "Le montant réel dépend de votre historique précis de salaires et d'emploi. " +
      "Pour une estimation officielle, utilisez le simulateur sur francetravail.fr. " +
      "La dégressivité de l'ARE s'applique pour les hauts revenus après 6 mois.",
  };
}
