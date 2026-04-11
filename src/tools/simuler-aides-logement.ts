/**
 * Simulation des aides au logement (APL / ALF / ALS).
 * Barèmes 2025-2026 (revalorisés octobre 2025).
 *
 * Sources : CAF, service-public.gouv.fr, legifrance.gouv.fr
 *
 * L'aide au logement est calculée selon la formule :
 *   Aide = L + C − PP
 * où :
 *   L  = loyer pris en compte (plafonné selon zone et composition)
 *   C  = charge forfaitaire
 *   PP = participation personnelle du ménage (basée sur les revenus)
 */

export interface AidesLogementInput {
  loyer_mensuel: number;
  zone: 1 | 2 | 3;
  situation: "locataire" | "colocataire" | "foyer";
  revenus_annuels: number;
  nb_personnes_foyer: number; // nombre total de personnes (ex: 1 = seul, 2 = couple sans enfant, 3 = couple + 1 enfant)
  type_logement: "appartement" | "maison";
}

export interface AidesLogementResult {
  eligible: boolean;
  motifIneligibilite?: string;
  typeAide: "APL" | "ALF" | "ALS";
  montantEstimeMensuel: number;
  loyerPrisEnCompte: number;
  plafondLoyer: number;
  chargeForfaitaire: number;
  participationPersonnelle: number;
  simulation: {
    loyerSansAide: number;
    loyerAvecAide: number;
    economieAnnuelle: number;
  };
  conditions: string[];
  demarches: string[];
  references: string[];
  avertissement: string;
}

// Plafonds de loyer mensuels selon zone et nombre de personnes (barème 2025-2026)
const PLAFONDS_LOYER: Record<number, Record<number, number>> = {
  // zone 1 (Île-de-France)
  1: { 1: 319.52, 2: 389.56, 3: 417.22, 4: 453.59, 5: 497.07, 6: 540.53 },
  // zone 2 (grandes agglomérations)
  2: { 1: 278.07, 2: 339.76, 3: 364.14, 4: 395.12, 5: 433.14, 6: 471.14 },
  // zone 3 (reste de la France)
  3: { 1: 260.33, 2: 317.91, 3: 340.91, 4: 369.74, 5: 405.49, 6: 441.22 },
};

// Charges forfaitaires mensuelles (barème 2025-2026)
const CHARGES_FORFAITAIRES: Record<number, number> = {
  1: 55.87,
  2: 55.87,
  3: 67.37,
  4: 78.87,
  5: 90.37,
  6: 101.87,
};

// Seuil de non-versement
const SEUIL_NON_VERSEMENT = 10;

export function simulerAidesLogement(input: AidesLogementInput): AidesLogementResult {
  const nbPersonnes = Math.max(1, Math.min(input.nb_personnes_foyer, 6));

  // Déterminer le type d'aide
  let typeAide: "APL" | "ALF" | "ALS";
  if (input.situation === "foyer") {
    typeAide = "ALS"; // résidences, foyers
  } else if (nbPersonnes >= 3) {
    // Couple avec enfant(s) ou parent isolé avec enfant(s) → ALF si pas APL
    typeAide = "APL"; // APL si logement conventionné (on suppose par défaut)
  } else {
    typeAide = "APL"; // APL pour locataires en logement conventionné
  }

  // Plafond de loyer selon zone et composition
  const plafondLoyer = PLAFONDS_LOYER[input.zone][nbPersonnes] ?? PLAFONDS_LOYER[input.zone][6];

  // Loyer pris en compte (plafonné)
  let loyerPrisEnCompte = Math.min(input.loyer_mensuel, plafondLoyer);

  // Colocation : abattement de ~25% sur le plafond
  if (input.situation === "colocataire") {
    const plafondColoc = plafondLoyer * 0.75;
    loyerPrisEnCompte = Math.min(input.loyer_mensuel, plafondColoc);
    typeAide = "ALS"; // colocation → souvent ALS
  }

  // Charge forfaitaire
  const chargeForfaitaire = CHARGES_FORFAITAIRES[nbPersonnes] ?? CHARGES_FORFAITAIRES[6];

  // Participation personnelle (PP) — simplification du barème
  // PP = P0 + Tp × (R - R0) où R = ressources mensuelles
  const revenusMensuels = input.revenus_annuels / 12;

  // Seuils de participation selon la composition du foyer
  let tauxParticipation: number;
  let plancher: number;

  if (nbPersonnes === 1) {
    plancher = 35.09;
    tauxParticipation = revenusMensuels <= 1200 ? 0.025 : revenusMensuels <= 2000 ? 0.28 : 0.38;
  } else if (nbPersonnes === 2) {
    plancher = 62.72;
    tauxParticipation = revenusMensuels <= 1500 ? 0.025 : revenusMensuels <= 2500 ? 0.265 : 0.36;
  } else {
    plancher = 62.72 + (nbPersonnes - 2) * 25.04;
    tauxParticipation = revenusMensuels <= 1800 ? 0.025 : revenusMensuels <= 3000 ? 0.25 : 0.34;
  }

  const participationPersonnelle = Math.max(plancher, plancher + tauxParticipation * revenusMensuels);

  // Calcul de l'aide : L + C - PP
  let montantAide = loyerPrisEnCompte + chargeForfaitaire - participationPersonnelle;
  montantAide = Math.round(Math.max(0, montantAide) * 100) / 100;

  // Vérifier éligibilité
  const conditions: string[] = [];
  let eligible = true;

  if (montantAide < SEUIL_NON_VERSEMENT) {
    conditions.push(`Montant inférieur au seuil de versement (${SEUIL_NON_VERSEMENT} €/mois)`);
    eligible = false;
    montantAide = 0;
  }

  if (input.revenus_annuels > 60000 && nbPersonnes <= 2) {
    conditions.push("Revenus élevés : l'aide pourrait être très faible ou nulle");
  }

  if (input.loyer_mensuel <= 0) {
    conditions.push("Le loyer doit être supérieur à 0 €");
    eligible = false;
    montantAide = 0;
  }

  if (eligible) {
    conditions.push("Conditions d'éligibilité estimées remplies");
  }

  const economieAnnuelle = Math.round(montantAide * 12 * 100) / 100;

  const demarches = [
    "1. Faire une simulation sur caf.fr/allocataires/mes-services-en-ligne/faire-une-simulation",
    "2. Créer un compte ou se connecter sur caf.fr",
    "3. Déposer la demande en ligne (Mon Compte > Demander une prestation > Logement)",
    "4. Fournir : attestation de loyer (remplie par le propriétaire), RIB, justificatif d'identité, avis d'imposition",
    "5. L'aide est versée au propriétaire (tiers payant) ou directement au bénéficiaire",
    "6. Actualiser sa situation trimestriellement (déclaration de ressources)",
  ];

  return {
    eligible,
    motifIneligibilite: eligible ? undefined : conditions.join(". "),
    typeAide,
    montantEstimeMensuel: montantAide,
    loyerPrisEnCompte: Math.round(loyerPrisEnCompte * 100) / 100,
    plafondLoyer,
    chargeForfaitaire,
    participationPersonnelle: Math.round(participationPersonnelle * 100) / 100,
    simulation: {
      loyerSansAide: input.loyer_mensuel,
      loyerAvecAide: Math.round((input.loyer_mensuel - montantAide) * 100) / 100,
      economieAnnuelle,
    },
    conditions,
    demarches,
    references: [
      "Barème aides au logement 2025-2026 (revalorisé octobre 2025)",
      "Articles L831-1 et suivants du Code de la sécurité sociale (APL)",
      "Articles L542-1 et suivants du Code de la sécurité sociale (ALF)",
      "Articles L831-1 et suivants du Code de la construction et de l'habitation",
      "caf.fr — Simulateur aides au logement",
      "service-public.fr — Aide au logement",
    ],
    avertissement:
      "⚠️ Estimation indicative basée sur les barèmes simplifiés 2025-2026. " +
      "Le montant réel dépend de nombreux facteurs (revenus N-2, patrimoine, situation professionnelle). " +
      "Pour une estimation officielle, utilisez le simulateur sur caf.fr.",
  };
}
