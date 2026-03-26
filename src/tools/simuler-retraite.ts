/**
 * Simulation simplifiée de retraite.
 * Régime général (CNAV) + complémentaire (Agirc-Arrco).
 */

export interface RetraiteInput {
  ageActuel: number;
  salaireAnnuelBrutMoyen: number;
  anneesCotisees: number;
  anneesRestantesEstimees?: number;
  statut: "salarie" | "fonctionnaire" | "independant" | "auto_entrepreneur";
}

export interface RetraiteResult {
  ageLegalDepart: number;
  ageTauxPlein: number;
  trimestresRequis: number;
  trimestresAcquis: number;
  trimestresManquants: number;
  pensionBase: {
    montantMensuelEstime: number;
    details: string;
  };
  pensionComplementaire: {
    montantMensuelEstime: number;
    details: string;
  };
  totalMensuelEstime: number;
  tauxRemplacement: number;
  conseils: string[];
  avertissement: string;
}

// Plafond Sécurité Sociale 2026 (+2%)
const PASS_ANNUEL = 48_060;
const PASS_MENSUEL = 4_005;

// Salaire de référence Agirc-Arrco 2025 (prix d'achat d'un point)
const PRIX_POINT_AGIRC_ARRCO = 18.7669;
// Valeur de service du point 2025
const VALEUR_POINT_AGIRC_ARRCO = 1.4159;
// Taux d'appel
const TAUX_ACQUISITION_T1 = 0.0625; // 6.20% * taux d'appel
const TAUX_ACQUISITION_T2 = 0.1712; // tranche 2

export function simulerRetraite(input: RetraiteInput): RetraiteResult {
  // Âge légal de départ (réforme 2023 — progressif, 64 ans pour les générations 1968+)
  const anneeNaissance = new Date().getFullYear() - input.ageActuel;
  let ageLegal: number;
  let trimestresRequis: number;

  if (anneeNaissance >= 1968) {
    ageLegal = 64;
    trimestresRequis = 172;
  } else if (anneeNaissance >= 1966) {
    ageLegal = 63.5;
    trimestresRequis = 172;
  } else if (anneeNaissance >= 1964) {
    ageLegal = 63;
    trimestresRequis = 171;
  } else if (anneeNaissance >= 1962) {
    ageLegal = 62.5;
    trimestresRequis = 170;
  } else {
    ageLegal = 62;
    trimestresRequis = 168;
  }

  const ageTauxPlein = 67; // Taux plein automatique à 67 ans

  const trimestresAcquis = input.anneesCotisees * 4;
  const anneesRestantes = input.anneesRestantesEstimees ?? Math.max(0, ageLegal - input.ageActuel);
  const trimestresAVenir = anneesRestantes * 4;
  const trimestresTotal = trimestresAcquis + trimestresAVenir;
  const trimestresManquants = Math.max(0, trimestresRequis - trimestresTotal);

  // Pension de base (régime général) — simplifiée
  // Formule : SAM * taux * (trimestres validés / trimestres requis)
  const sam = Math.min(input.salaireAnnuelBrutMoyen, PASS_ANNUEL);
  const taux = trimestresTotal >= trimestresRequis ? 0.50 : Math.max(0.375, 0.50 - trimestresManquants * 0.00625);
  const prorata = Math.min(1, trimestresTotal / trimestresRequis);

  const pensionBaseAnnuelle = Math.round(sam * taux * prorata);
  const pensionBaseMensuelle = Math.round(pensionBaseAnnuelle / 12);

  // Pension complémentaire Agirc-Arrco (salariés uniquement)
  let pensionComplementaireMensuelle = 0;
  let detailComplementaire = "";

  if (input.statut === "salarie") {
    const salaireBrut = input.salaireAnnuelBrutMoyen;
    const tranche1 = Math.min(salaireBrut, PASS_ANNUEL);
    const tranche2 = Math.max(0, Math.min(salaireBrut, PASS_ANNUEL * 8) - PASS_ANNUEL);

    // Points acquis par an
    const pointsParAnT1 = (tranche1 * TAUX_ACQUISITION_T1) / PRIX_POINT_AGIRC_ARRCO;
    const pointsParAnT2 = (tranche2 * TAUX_ACQUISITION_T2) / PRIX_POINT_AGIRC_ARRCO;
    const pointsParAn = pointsParAnT1 + pointsParAnT2;

    const totalAnnees = input.anneesCotisees + anneesRestantes;
    const totalPoints = Math.round(pointsParAn * totalAnnees);

    const pensionCompAnnuelle = Math.round(totalPoints * VALEUR_POINT_AGIRC_ARRCO);
    pensionComplementaireMensuelle = Math.round(pensionCompAnnuelle / 12);

    detailComplementaire =
      `~${Math.round(pointsParAn)} points/an × ${totalAnnees} ans = ~${totalPoints} points. ` +
      `Valeur du point : ${VALEUR_POINT_AGIRC_ARRCO} €.`;
  } else if (input.statut === "auto_entrepreneur") {
    detailComplementaire =
      "Les auto-entrepreneurs cotisent au régime de base uniquement. " +
      "La retraite complémentaire dépend de la caisse (CIPAV ou SSI). " +
      "Les montants sont généralement très faibles — envisagez une épargne complémentaire (PER).";
  } else if (input.statut === "fonctionnaire") {
    // Simplification : pas d'Agirc-Arrco, mais RAFP
    detailComplementaire =
      "Fonctionnaires : retraite complémentaire via le RAFP (Retraite Additionnelle de la Fonction Publique). " +
      "Montants généralement modestes. Calcul basé sur les primes.";
  } else {
    detailComplementaire =
      "Indépendants : la complémentaire dépend de votre caisse (SSI). " +
      "Consultez info-retraite.fr pour une estimation personnalisée.";
  }

  const totalMensuel = pensionBaseMensuelle + pensionComplementaireMensuelle;
  const salaireMensuelNet = input.salaireAnnuelBrutMoyen * 0.78 / 12; // approximation
  const tauxRemplacement = salaireMensuelNet > 0
    ? Math.round((totalMensuel / salaireMensuelNet) * 10000) / 100
    : 0;

  const conseils: string[] = [
    "Consultez info-retraite.fr pour une estimation officielle personnalisée",
    "Vérifiez votre relevé de carrière sur lassuranceretraite.fr",
    trimestresManquants > 0
      ? `Il vous manque ~${trimestresManquants} trimestres pour le taux plein. Envisagez le rachat de trimestres.`
      : "Vous êtes en bonne voie pour le taux plein.",
    "Le PER (Plan d'Épargne Retraite) permet de compléter votre retraite avec des avantages fiscaux",
    "Les trimestres pour enfants (8 par enfant) peuvent compléter votre durée de cotisation",
  ];

  return {
    ageLegalDepart: ageLegal,
    ageTauxPlein,
    trimestresRequis,
    trimestresAcquis,
    trimestresManquants,
    pensionBase: {
      montantMensuelEstime: pensionBaseMensuelle,
      details: `SAM=${sam}€ × taux=${(taux * 100).toFixed(1)}% × prorata=${(prorata * 100).toFixed(1)}% = ${pensionBaseMensuelle}€/mois`,
    },
    pensionComplementaire: {
      montantMensuelEstime: pensionComplementaireMensuelle,
      details: detailComplementaire,
    },
    totalMensuelEstime: totalMensuel,
    tauxRemplacement,
    conseils,
    avertissement:
      "⚠️ Simulation très simplifiée à titre indicatif uniquement. " +
      "Les montants réels dépendent de votre carrière complète, des revalorisations, " +
      "et de nombreux paramètres non pris en compte ici. " +
      "Pour une estimation fiable, consultez info-retraite.fr ou prenez RDV avec votre caisse de retraite.",
  };
}
