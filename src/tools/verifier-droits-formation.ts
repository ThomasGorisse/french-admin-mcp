/**
 * Vérification des droits CPF (Compte Personnel de Formation).
 * Barème 2026.
 *
 * Sources : moncompteformation.gouv.fr, service-public.gouv.fr
 *
 * Alimentation :
 *  - 500 €/an pour un salarié à temps plein (plafond 5 000 €)
 *  - 800 €/an pour les salariés peu qualifiés (plafond 8 000 €)
 *
 * Reste à charge obligatoire : 103,20 € (depuis 01/01/2026)
 *
 * Plafonds d'utilisation (depuis 26/02/2026) :
 *  - Certifications du répertoire spécifique : 1 500 €
 *  - Bilans de compétences : 1 600 €
 *  - Permis de conduire (B, B1, BE, A1, A2) : 900 €
 */

export interface FormationInput {
  anneesTravaillees: number;
  tempsPlein: boolean;
  quotiteTempsPartiel?: number; // ex: 0.8 pour 80%
  niveauQualification: "bac_plus" | "bac_ou_moins" | "sans_diplome";
  travailleurHandicape?: boolean;
  montantCPFConnu?: number; // si la personne connaît déjà son solde
  typeFormationEnvisagee?: "diplome" | "certification" | "bilan_competences" | "permis_conduire" | "vae" | "creation_entreprise" | "autre";
  coutFormation?: number;
}

export interface FormationResult {
  droitsCPFEstimes: number;
  alimentationAnnuelle: number;
  plafondCPF: number;
  resteAChargeObligatoire: number;
  // Plafonds spécifiques
  plafondFormation?: {
    type: string;
    plafond: number;
    applicable: boolean;
  };
  budgetDisponibleEstime: number;
  financement: {
    cpfUtilisable: number;
    resteACharge: number;
    abondementsPossibles: string[];
  };
  droitsSpeciaux: string[];
  demarches: string[];
  avertissement: string;
}

// Constantes CPF 2026
const CPF_ALIMENTATION_STANDARD = 500;
const CPF_ALIMENTATION_PEU_QUALIFIE = 800;
const CPF_PLAFOND_STANDARD = 5_000;
const CPF_PLAFOND_PEU_QUALIFIE = 8_000;
const CPF_RESTE_A_CHARGE = 103.20;

// Plafonds d'utilisation (depuis 26/02/2026)
const PLAFOND_CERTIFICATION_SPECIFIQUE = 1_500;
const PLAFOND_BILAN_COMPETENCES = 1_600;
const PLAFOND_PERMIS_CONDUIRE = 900;

export function verifierDroitsFormation(input: FormationInput): FormationResult {
  const estPeuQualifie =
    input.niveauQualification === "sans_diplome" || input.travailleurHandicape;

  const alimentationAnnuelle = estPeuQualifie
    ? CPF_ALIMENTATION_PEU_QUALIFIE
    : CPF_ALIMENTATION_STANDARD;

  const plafondCPF = estPeuQualifie
    ? CPF_PLAFOND_PEU_QUALIFIE
    : CPF_PLAFOND_STANDARD;

  // Estimation du solde CPF
  let droitsEstimes: number;
  if (input.montantCPFConnu !== undefined) {
    droitsEstimes = input.montantCPFConnu;
  } else {
    // Estimation basée sur les années travaillées
    let quotite = 1;
    if (!input.tempsPlein && input.quotiteTempsPartiel) {
      // Depuis 2020, les temps partiels >= 50% acquièrent le même montant
      quotite = input.quotiteTempsPartiel >= 0.5 ? 1 : input.quotiteTempsPartiel * 2;
    }

    const droitsBruts = alimentationAnnuelle * quotite * input.anneesTravaillees;
    droitsEstimes = Math.min(droitsBruts, plafondCPF);
  }

  droitsEstimes = Math.round(droitsEstimes * 100) / 100;

  // Plafonds spécifiques selon le type de formation
  let plafondFormation: FormationResult["plafondFormation"];
  if (input.typeFormationEnvisagee === "certification") {
    plafondFormation = {
      type: "Certification du répertoire spécifique",
      plafond: PLAFOND_CERTIFICATION_SPECIFIQUE,
      applicable: true,
    };
  } else if (input.typeFormationEnvisagee === "bilan_competences") {
    plafondFormation = {
      type: "Bilan de compétences",
      plafond: PLAFOND_BILAN_COMPETENCES,
      applicable: true,
    };
  } else if (input.typeFormationEnvisagee === "permis_conduire") {
    plafondFormation = {
      type: "Permis de conduire (groupe léger)",
      plafond: PLAFOND_PERMIS_CONDUIRE,
      applicable: true,
    };
  }

  // Budget disponible (en tenant compte des plafonds)
  let cpfUtilisable = droitsEstimes;
  if (plafondFormation?.applicable) {
    cpfUtilisable = Math.min(cpfUtilisable, plafondFormation.plafond);
  }

  // Reste à charge
  let resteACharge = CPF_RESTE_A_CHARGE;
  if (input.coutFormation !== undefined) {
    const partCPF = Math.min(cpfUtilisable, input.coutFormation - CPF_RESTE_A_CHARGE);
    resteACharge = Math.max(CPF_RESTE_A_CHARGE, input.coutFormation - partCPF);
  }

  const budgetDisponible = Math.max(0, cpfUtilisable - CPF_RESTE_A_CHARGE);

  // Abondements possibles
  const abondements: string[] = [];
  abondements.push("Votre employeur peut compléter votre CPF (abondement entreprise)");
  abondements.push("France Travail peut abonder pour les demandeurs d'emploi");
  abondements.push("Votre OPCO peut financer le reste à charge");
  if (input.travailleurHandicape) {
    abondements.push("Agefiph : abondement possible pour les travailleurs handicapés");
  }
  abondements.push("Régions : certaines régions proposent des aides complémentaires");

  // Droits spéciaux
  const droitsSpeciaux: string[] = [];
  if (estPeuQualifie) {
    droitsSpeciaux.push(
      `Alimentation majorée : ${CPF_ALIMENTATION_PEU_QUALIFIE} €/an (au lieu de ${CPF_ALIMENTATION_STANDARD} €)`
    );
    droitsSpeciaux.push(`Plafond relevé : ${CPF_PLAFOND_PEU_QUALIFIE} € (au lieu de ${CPF_PLAFOND_STANDARD} €)`);
  }
  if (input.travailleurHandicape) {
    droitsSpeciaux.push("Exonération du reste à charge de 103,20 € (travailleur handicapé)");
    resteACharge = 0; // exempté
  }

  const demarches: string[] = [
    "Consultez votre solde CPF exact sur moncompteformation.gouv.fr (FranceConnect)",
    "Vérifiez que la formation est éligible au CPF sur moncompteformation.gouv.fr",
    `Reste à charge obligatoire : ${CPF_RESTE_A_CHARGE} € (paiement par carte bancaire lors de l'inscription)`,
    "Délai de rétractation : 14 jours après inscription",
    "Attention aux arnaques CPF : ne jamais donner son numéro de sécurité sociale par téléphone",
  ];

  if (plafondFormation?.applicable) {
    demarches.push(
      `Plafond ${plafondFormation.type} : ${plafondFormation.plafond} € maximum de CPF utilisable`
    );
  }

  return {
    droitsCPFEstimes: droitsEstimes,
    alimentationAnnuelle,
    plafondCPF,
    resteAChargeObligatoire: CPF_RESTE_A_CHARGE,
    plafondFormation,
    budgetDisponibleEstime: Math.round(budgetDisponible * 100) / 100,
    financement: {
      cpfUtilisable: Math.round(cpfUtilisable * 100) / 100,
      resteACharge: Math.round(resteACharge * 100) / 100,
      abondementsPossibles: abondements,
    },
    droitsSpeciaux,
    demarches,
    avertissement:
      "⚠️ Estimation indicative. Votre solde CPF réel est consultable sur moncompteformation.gouv.fr. " +
      "Les plafonds d'utilisation s'appliquent depuis le 26 février 2026. " +
      "Le reste à charge de 103,20 € est obligatoire sauf exceptions (demandeurs d'emploi, travailleurs handicapés).",
  };
}
