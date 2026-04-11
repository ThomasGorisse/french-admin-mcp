/**
 * Calcul des indemnités de congés payés.
 * Code du travail, articles L3141-24 à L3141-31.
 *
 * Deux méthodes de calcul :
 *  1. Maintien de salaire : salaire que le salarié aurait perçu s'il avait travaillé
 *  2. Dixième (1/10ème) : 10% de la rémunération brute totale perçue pendant la période de référence
 *
 * L'employeur doit appliquer la méthode la plus favorable au salarié.
 *
 * Période de référence : du 1er juin N-1 au 31 mai N.
 * Acquisition : 2.5 jours ouvrables par mois de travail effectif (30 jours/an max).
 */

export interface IndemniteCongesInput {
  salaire_brut_mensuel: number;
  jours_acquis: number; // jours ouvrables acquis (max 30 par période)
  methode: "maintien_salaire" | "dixieme";
  jours_pris: number; // nombre de jours de congés à indemniser
}

export interface IndemniteCongesResult {
  montantBrut: number;
  methodeAppliquee: string;
  comparaison: {
    maintienSalaire: {
      montantBrut: number;
      detailCalcul: string;
    };
    dixieme: {
      montantBrut: number;
      detailCalcul: string;
    };
    methodePlusFavorable: "maintien_salaire" | "dixieme";
    difference: number;
  };
  chargesSocialesEstimees: {
    tauxCSGCRDS: number;
    tauxCotisationsSalariales: number;
    montantCSGCRDS: number;
    montantCotisationsSalariales: number;
    montantNetEstime: number;
  };
  informations: {
    joursAcquis: number;
    joursPris: number;
    joursRestants: number;
    salaireBrutMensuel: number;
    salaireBrutAnnuel: number;
  };
  regles: string[];
  avertissement: string;
}

// Taux de charges sociales salariales (estimation simplifiée)
const TAUX_CSG_CRDS = 0.0697; // CSG 9.2% × 98.25% assiette + CRDS 0.5% × 98.25%
const TAUX_COTISATIONS_SALARIALES = 0.14; // estimation globale cotisations salariales (sécu, retraite, chômage)

export function calculerIndemniteConges(input: IndemniteCongesInput): IndemniteCongesResult {
  const { salaire_brut_mensuel, jours_acquis, methode, jours_pris } = input;

  if (jours_pris > jours_acquis) {
    throw new Error(
      `Impossible de prendre ${jours_pris} jours : seulement ${jours_acquis} jours acquis.`
    );
  }

  if (jours_pris <= 0) {
    throw new Error("Le nombre de jours pris doit être supérieur à 0.");
  }

  if (salaire_brut_mensuel <= 0) {
    throw new Error("Le salaire brut mensuel doit être supérieur à 0 €.");
  }

  // Salaire brut annuel (période de référence = 12 mois)
  const salaireBrutAnnuel = salaire_brut_mensuel * 12;

  // --- Méthode 1 : Maintien de salaire ---
  // Indemnité = salaire journalier × nombre de jours pris
  // Salaire journalier (jours ouvrables) = salaire mensuel / 26 (jours ouvrables par mois moyen)
  const salaireJournalierOuvrable = salaire_brut_mensuel / 26;
  const montantMaintien = Math.round(salaireJournalierOuvrable * jours_pris * 100) / 100;
  const detailMaintien =
    `Salaire journalier = ${salaire_brut_mensuel.toFixed(2)} € / 26 jours = ${salaireJournalierOuvrable.toFixed(2)} €/jour\n` +
    `Indemnité = ${salaireJournalierOuvrable.toFixed(2)} € × ${jours_pris} jours = ${montantMaintien.toFixed(2)} €`;

  // --- Méthode 2 : Dixième (1/10ème) ---
  // Indemnité = (rémunération brute totale période de référence) × 10% × (jours pris / jours acquis)
  const dixiemeBrut = salaireBrutAnnuel * 0.10;
  const montantDixieme = Math.round((dixiemeBrut * jours_pris / jours_acquis) * 100) / 100;
  const detailDixieme =
    `1/10ème total = ${salaireBrutAnnuel.toFixed(2)} € × 10% = ${dixiemeBrut.toFixed(2)} €\n` +
    `Pour ${jours_pris} jours sur ${jours_acquis} acquis = ${dixiemeBrut.toFixed(2)} € × ${jours_pris}/${jours_acquis} = ${montantDixieme.toFixed(2)} €`;

  // Méthode la plus favorable
  const methodePlusFavorable: "maintien_salaire" | "dixieme" =
    montantMaintien >= montantDixieme ? "maintien_salaire" : "dixieme";
  const difference = Math.abs(Math.round((montantMaintien - montantDixieme) * 100) / 100);

  // Montant selon la méthode choisie par l'utilisateur
  const montantBrut = methode === "maintien_salaire" ? montantMaintien : montantDixieme;

  // Charges sociales estimées
  const montantCSGCRDS = Math.round(montantBrut * TAUX_CSG_CRDS * 100) / 100;
  const montantCotisationsSalariales = Math.round(montantBrut * TAUX_COTISATIONS_SALARIALES * 100) / 100;
  const montantNetEstime = Math.round((montantBrut - montantCSGCRDS - montantCotisationsSalariales) * 100) / 100;

  const regles = [
    "L'employeur doit appliquer la méthode la plus favorable au salarié (art. L3141-24 Code du travail)",
    "Période de référence : du 1er juin N-1 au 31 mai N (sauf accord collectif différent)",
    "Acquisition : 2,5 jours ouvrables par mois de travail effectif (maximum 30 jours/an)",
    "Les congés non pris ne sont pas reportés sauf accord ou arrêt maladie",
    "En cas de rupture du contrat, les congés non pris sont indemnisés (indemnité compensatrice)",
    "Les jours fériés tombant pendant les congés ne sont pas décomptés",
  ];

  return {
    montantBrut,
    methodeAppliquee: methode === "maintien_salaire" ? "Maintien de salaire" : "Dixième (1/10ème)",
    comparaison: {
      maintienSalaire: {
        montantBrut: montantMaintien,
        detailCalcul: detailMaintien,
      },
      dixieme: {
        montantBrut: montantDixieme,
        detailCalcul: detailDixieme,
      },
      methodePlusFavorable,
      difference,
    },
    chargesSocialesEstimees: {
      tauxCSGCRDS: TAUX_CSG_CRDS,
      tauxCotisationsSalariales: TAUX_COTISATIONS_SALARIALES,
      montantCSGCRDS,
      montantCotisationsSalariales,
      montantNetEstime,
    },
    informations: {
      joursAcquis: jours_acquis,
      joursPris: jours_pris,
      joursRestants: jours_acquis - jours_pris,
      salaireBrutMensuel: salaire_brut_mensuel,
      salaireBrutAnnuel,
    },
    regles,
    avertissement:
      "⚠️ Estimation indicative. Les montants réels dépendent de votre rémunération exacte sur la période de référence " +
      "(primes, heures supplémentaires, avantages en nature). " +
      "Votre convention collective peut prévoir des règles plus favorables. " +
      "Consultez votre service RH ou un expert-comptable.",
  };
}
