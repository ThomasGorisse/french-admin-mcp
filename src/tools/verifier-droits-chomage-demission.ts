/**
 * Vérification des droits au chômage après démission.
 *
 * Par défaut, une démission ne donne PAS droit à l'ARE.
 * Exceptions (démissions légitimes) listées dans le règlement d'assurance chômage :
 *  - Suivi de conjoint
 *  - Non-paiement de salaire
 *  - Harcèlement
 *  - Création/reprise d'entreprise (démission pour reconversion, depuis 01/11/2019)
 *  - Autres cas légitimes définis par la convention Unédic
 *
 * Depuis novembre 2019, la démission pour reconversion professionnelle
 * ouvre droit à l'ARE sous conditions (projet validé par la commission régionale).
 *
 * Sources : Unédic, France Travail, service-public.gouv.fr, Code du travail
 */

export interface DroitsChomageDemissionInput {
  motif_demission:
    | "reconversion"
    | "creation_entreprise"
    | "suivi_conjoint"
    | "harcelement"
    | "non_paiement"
    | "autre";
  anciennete_mois: number; // ancienneté en mois dans l'emploi quitté
  salaire_brut_mensuel: number;
}

export interface DroitsChomageDemissionResult {
  eligible: boolean;
  typeEligibilite: "demission_legitime" | "demission_reconversion" | "non_eligible" | "reexamen_possible";
  motifAnalyse: string;
  montantEstimeARE?: {
    allocationJournaliereBrute: number;
    allocationMensuelleBrute: number;
    allocationMensuelleNette: number;
    dureeEstimeeMois: number;
  };
  conditions: string[];
  demarchesSpecifiques: string[];
  casLegitimes: string[];
  delais: string[];
  references: string[];
  avertissement: string;
}

// Constantes ARE 2026 (identiques à simuler-chomage)
const PARTIE_FIXE_JOURNALIERE = 13.11;
const PLANCHER_JOURNALIER = 32.13;
const TAUX_CSG_CRDS = 0.0635;

function estimerARE(salaireBrutMensuel: number, ancienneteMois: number) {
  const joursCalendaires = Math.round(ancienneteMois * 30.42);
  const salairesTotaux = salaireBrutMensuel * ancienneteMois;
  const sjr = salairesTotaux / joursCalendaires;

  const methode1 = sjr * 0.404 + PARTIE_FIXE_JOURNALIERE;
  const methode2 = sjr * 0.57;
  let areJournaliere = Math.max(methode1, methode2);

  // Plafond 75% du SJR
  const plafond = sjr * 0.75;
  areJournaliere = Math.min(areJournaliere, plafond);

  // Plancher
  areJournaliere = Math.max(areJournaliere, PLANCHER_JOURNALIER);

  // Si plancher dépasse 75% SJR
  if (PLANCHER_JOURNALIER > plafond && plafond > 0) {
    areJournaliere = plafond;
  }

  areJournaliere = Math.round(areJournaliere * 100) / 100;

  const dureeMaxJours = Math.min(joursCalendaires, 548); // 18 mois max (< 55 ans par défaut)
  const dureeMois = Math.round((dureeMaxJours / 30.42) * 10) / 10;

  const areMensuelleBrute = Math.round(areJournaliere * 30.42 * 100) / 100;
  const areMensuelleNette = Math.round(areMensuelleBrute * (1 - TAUX_CSG_CRDS) * 100) / 100;

  return {
    allocationJournaliereBrute: areJournaliere,
    allocationMensuelleBrute: areMensuelleBrute,
    allocationMensuelleNette: areMensuelleNette,
    dureeEstimeeMois: dureeMois,
  };
}

export function verifierDroitsChomageDemission(
  input: DroitsChomageDemissionInput
): DroitsChomageDemissionResult {
  const { motif_demission, anciennete_mois, salaire_brut_mensuel } = input;

  // Liste des cas de démission légitime (pour information dans tous les cas)
  const casLegitimes = [
    "Suivi du conjoint (mutation, mariage, PACS) — art. 2 §2 du règlement d'assurance chômage",
    "Non-paiement des salaires — attesté par ordonnance de référé",
    "Actes délictueux subis dans le cadre du travail (harcèlement, violences)",
    "Démission d'un CDI pour un autre CDI, rompu dans les 65 jours par l'employeur",
    "Démission pour reconversion professionnelle (depuis 01/11/2019, sous conditions)",
    "Démission pour création ou reprise d'entreprise (avec projet validé)",
    "Victime de violences conjugales et déménagement",
    "Mineur qui démissionne pour suivre ses parents (ascendants)",
    "Journaliste invoquant la clause de conscience",
    "Salarié dont le contrat contient une clause de résidence modifiée par l'employeur",
    "Démission pour un contrat de service civique ou de volontariat",
  ];

  const conditions: string[] = [];
  const demarchesSpecifiques: string[] = [];
  const delais: string[] = [];
  let eligible = false;
  let typeEligibilite: DroitsChomageDemissionResult["typeEligibilite"] = "non_eligible";
  let motifAnalyse = "";

  // Vérifier l'ancienneté minimale pour l'ARE (6 mois sur 24)
  const ancienneteSuffisante = anciennete_mois >= 6;

  switch (motif_demission) {
    case "reconversion":
      motifAnalyse =
        "Démission pour reconversion professionnelle. Depuis le 1er novembre 2019, " +
        "ce type de démission peut ouvrir droit à l'ARE sous conditions strictes.";

      if (anciennete_mois < 60) {
        conditions.push(
          "Il faut justifier d'au moins 5 ans (60 mois) d'activité salariée continue dans les 60 mois précédents"
        );
        eligible = false;
        typeEligibilite = "non_eligible";
      } else {
        eligible = true;
        typeEligibilite = "demission_reconversion";
        conditions.push("5 ans d'ancienneté continue ✓");
      }

      conditions.push(
        "Le projet de reconversion doit être réel et sérieux",
        "Le projet doit être validé par la Commission paritaire interprofessionnelle régionale (CPIR / Transitions Pro)"
      );

      demarchesSpecifiques.push(
        "1. Demander un CEP (Conseil en Évolution Professionnelle) — obligatoire et gratuit",
        "2. Élaborer le dossier de reconversion avec le CEP",
        "3. Soumettre le projet à Transitions Pro (CPIR) pour validation",
        "4. Attendre la décision de la commission (délai ~2 mois)",
        "5. Démissionner APRÈS la validation du projet",
        "6. S'inscrire à France Travail dans les 6 mois suivant la démission"
      );

      delais.push(
        "Inscription France Travail : dans les 6 mois suivant la démission",
        "Mise en œuvre du projet : dans les 6 mois suivant l'ouverture des droits ARE"
      );
      break;

    case "creation_entreprise":
      motifAnalyse =
        "Démission pour création ou reprise d'entreprise. " +
        "Ce cas est traité comme une reconversion professionnelle depuis 2019.";

      if (anciennete_mois < 60) {
        conditions.push(
          "Il faut justifier d'au moins 5 ans (60 mois) d'activité salariée continue"
        );
        eligible = false;
        typeEligibilite = "non_eligible";
      } else {
        eligible = true;
        typeEligibilite = "demission_reconversion";
        conditions.push("5 ans d'ancienneté continue ✓");
      }

      conditions.push(
        "Le projet de création/reprise doit être réel et sérieux",
        "Le projet doit être validé par Transitions Pro (CPIR)"
      );

      demarchesSpecifiques.push(
        "1. Consulter un CEP (Conseil en Évolution Professionnelle) — obligatoire",
        "2. Monter le dossier avec business plan, étude de marché",
        "3. Soumettre le projet à Transitions Pro pour validation",
        "4. Obtenir la validation AVANT de démissionner",
        "5. Démissionner et s'inscrire à France Travail dans les 6 mois",
        "6. Immatriculer l'entreprise dans les 6 mois suivant l'ouverture des droits"
      );

      delais.push(
        "Inscription France Travail : dans les 6 mois suivant la démission",
        "Création effective de l'entreprise : dans les 6 mois suivant l'inscription"
      );
      break;

    case "suivi_conjoint":
      motifAnalyse =
        "Démission pour suivi de conjoint. C'est un cas de démission légitime reconnu " +
        "qui ouvre droit à l'ARE sans délai d'attente supplémentaire.";

      eligible = ancienneteSuffisante;
      typeEligibilite = eligible ? "demission_legitime" : "non_eligible";

      if (!ancienneteSuffisante) {
        conditions.push("Il faut avoir travaillé au moins 6 mois sur les 24 derniers mois");
      } else {
        conditions.push("Ancienneté suffisante ✓");
      }

      conditions.push(
        "Le conjoint (marié, pacsé, ou concubin) doit changer de lieu de résidence pour un motif professionnel",
        "Le nouveau domicile ne doit pas permettre de conserver l'emploi actuel"
      );

      demarchesSpecifiques.push(
        "1. Réunir les justificatifs : attestation employeur du conjoint, justificatif de nouvelle adresse",
        "2. Remettre la lettre de démission avec le motif 'suivi de conjoint'",
        "3. S'inscrire à France Travail dès la fin du préavis",
        "4. Fournir à France Travail les pièces justifiant le suivi de conjoint"
      );

      delais.push(
        "Inscription France Travail : dans les 12 mois suivant la fin de contrat",
        "Délai de carence standard : 7 jours"
      );
      break;

    case "harcelement":
      motifAnalyse =
        "Démission suite à des actes délictueux (harcèlement moral/sexuel, violences). " +
        "C'est un cas de démission légitime si les faits sont attestés.";

      eligible = ancienneteSuffisante;
      typeEligibilite = eligible ? "demission_legitime" : "non_eligible";

      if (!ancienneteSuffisante) {
        conditions.push("Il faut avoir travaillé au moins 6 mois sur les 24 derniers mois");
      } else {
        conditions.push("Ancienneté suffisante ✓");
      }

      conditions.push(
        "Les faits doivent être attestés par un dépôt de plainte ou une décision de justice",
        "Une ordonnance de référé, une plainte ou une main courante constituent des éléments justificatifs"
      );

      demarchesSpecifiques.push(
        "1. Déposer plainte ou main courante au commissariat",
        "2. Consulter un avocat en droit du travail",
        "3. Prévenir l'inspection du travail (DREETS)",
        "4. Consulter la médecine du travail",
        "5. Remettre la lettre de démission mentionnant les motifs",
        "6. S'inscrire à France Travail avec les justificatifs (plainte, certificats médicaux)",
        "7. Envisager une prise d'acte ou une résiliation judiciaire (plus protectrice que la démission)"
      );

      delais.push(
        "Inscription France Travail : dans les 12 mois suivant la fin de contrat",
        "Prescription des faits de harcèlement : 6 ans (pénal)"
      );
      break;

    case "non_paiement":
      motifAnalyse =
        "Démission pour non-paiement des salaires. C'est un cas de démission légitime reconnu, " +
        "à condition que le non-paiement soit attesté par une décision de justice (ordonnance de référé).";

      eligible = ancienneteSuffisante;
      typeEligibilite = eligible ? "demission_legitime" : "non_eligible";

      if (!ancienneteSuffisante) {
        conditions.push("Il faut avoir travaillé au moins 6 mois sur les 24 derniers mois");
      } else {
        conditions.push("Ancienneté suffisante ✓");
      }

      conditions.push(
        "Le non-paiement doit être attesté par une ordonnance du conseil de prud'hommes (référé)",
        "Conserver tous les bulletins de paie et justificatifs de virements manquants"
      );

      demarchesSpecifiques.push(
        "1. Envoyer une mise en demeure par LRAR à l'employeur",
        "2. Saisir le conseil de prud'hommes en référé",
        "3. Obtenir l'ordonnance de référé constatant le non-paiement",
        "4. Démissionner en mentionnant le motif et la référence de l'ordonnance",
        "5. S'inscrire à France Travail avec l'ordonnance et la lettre de démission",
        "6. Envisager une prise d'acte de rupture (requalifiée en licenciement si les torts sont prouvés)"
      );

      delais.push(
        "Inscription France Travail : dans les 12 mois suivant la fin de contrat",
        "Délai de carence standard : 7 jours"
      );
      break;

    case "autre":
      motifAnalyse =
        "Démission classique (motif non reconnu comme légitime). " +
        "En principe, pas de droit à l'ARE. Cependant, un réexamen est possible après 4 mois.";

      eligible = false;
      typeEligibilite = "reexamen_possible";

      conditions.push(
        "La démission simple ne donne pas droit à l'ARE",
        "Après 4 mois (121 jours) sans emploi, vous pouvez demander un réexamen de votre situation auprès de France Travail",
        "L'Instance Paritaire Régionale (IPR) peut accorder l'ARE si vous justifiez de recherches actives d'emploi"
      );

      demarchesSpecifiques.push(
        "1. S'inscrire à France Travail dès la fin du préavis (même sans droit ARE)",
        "2. Rechercher activement un emploi pendant 4 mois (121 jours)",
        "3. Conserver toutes les preuves de recherche d'emploi (candidatures, réponses, entretiens)",
        "4. Après 121 jours, demander un réexamen de votre situation à France Travail",
        "5. L'IPR examinera votre dossier et pourra accorder l'ARE rétroactivement"
      );

      delais.push(
        "Délai de réexamen : 121 jours (4 mois) à partir de l'inscription France Travail",
        "Inscription France Travail : dans les 12 mois suivant la fin de contrat"
      );
      break;
  }

  // Estimer l'ARE si éligible et ancienneté suffisante
  let montantEstimeARE: DroitsChomageDemissionResult["montantEstimeARE"];
  if (eligible && ancienneteSuffisante) {
    montantEstimeARE = estimerARE(salaire_brut_mensuel, Math.min(anciennete_mois, 24));
  }

  return {
    eligible,
    typeEligibilite,
    motifAnalyse,
    montantEstimeARE,
    conditions,
    demarchesSpecifiques,
    casLegitimes,
    delais,
    references: [
      "Règlement d'assurance chômage — annexe relative aux démissions légitimes",
      "Loi n°2018-771 du 5 septembre 2018 (liberté de choisir son avenir professionnel) — article 49",
      "Décret n°2019-797 du 26 juillet 2019 — démission pour reconversion",
      "service-public.fr — Allocation chômage : démission",
      "francetravail.fr — Démission et droits au chômage",
      "unedic.org — Règles d'indemnisation",
    ],
    avertissement:
      "⚠️ Estimation indicative. L'éligibilité effective dépend de votre situation précise et de l'appréciation " +
      "de France Travail (ex-Pôle Emploi) ou de l'Instance Paritaire Régionale. " +
      "Consultez un avocat en droit du travail ou le service juridique de France Travail. " +
      "Ne démissionnez pas avant d'avoir vérifié vos droits.",
  };
}
