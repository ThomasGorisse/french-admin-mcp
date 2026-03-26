/**
 * Calcul de l'indemnité légale de licenciement.
 * Code du travail, articles L1234-9 et R1234-1 à R1234-4.
 *
 * Formule légale :
 *  - 1/4 de mois de salaire par année d'ancienneté pour les 10 premières années
 *  - 1/3 de mois de salaire par année au-delà de 10 ans
 *
 * Salaire de référence : le plus favorable entre :
 *  - Moyenne des 12 derniers mois
 *  - Moyenne des 3 derniers mois (primes au prorata)
 *
 * Condition : 8 mois d'ancienneté minimum (ininterrompus).
 */

export interface IndemniteInput {
  salaireBrutMensuel: number;
  salaireBrutMensuelAvecPrimes?: number; // moyenne sur 3 mois, primes incluses au prorata
  ancienneteAnnees: number;
  ancienneteMois?: number; // mois supplémentaires au-delà des années pleines
  motif: "licenciement_personnel" | "licenciement_economique" | "inaptitude_professionnelle" | "inaptitude_non_professionnelle" | "rupture_conventionnelle";
}

export interface IndemniteResult {
  eligible: boolean;
  motifIneligibilite?: string;
  salaireReference: number;
  methodeSalaire: string;
  ancienneteRetenue: { annees: number; mois: number; total: number };
  indemniteMinimaleLegale: number;
  detailCalcul: string;
  indemniteLicenciement: number;
  // Régime fiscal/social
  exonerationFiscale: boolean;
  plafondExonerationFiscale: number;
  regimeSocial: string;
  // Spécificités
  conseils: string[];
  avertissement: string;
}

// PASS 2026
const PASS_ANNUEL_2026 = 48_060;

export function calculerIndemnitesLicenciement(input: IndemniteInput): IndemniteResult {
  const ancienneteMois = input.ancienneteMois ?? 0;
  const ancienneteTotaleAnnees = input.ancienneteAnnees + ancienneteMois / 12;

  // Condition d'éligibilité : 8 mois d'ancienneté
  if (ancienneteTotaleAnnees < 8 / 12) {
    return {
      eligible: false,
      motifIneligibilite: "L'ancienneté minimale requise est de 8 mois ininterrompus (article L1234-9 du Code du travail).",
      salaireReference: 0,
      methodeSalaire: "",
      ancienneteRetenue: { annees: input.ancienneteAnnees, mois: ancienneteMois, total: ancienneteTotaleAnnees },
      indemniteMinimaleLegale: 0,
      detailCalcul: "",
      indemniteLicenciement: 0,
      exonerationFiscale: false,
      plafondExonerationFiscale: 0,
      regimeSocial: "",
      conseils: [
        "Avec moins de 8 mois d'ancienneté, vous n'avez pas droit à l'indemnité légale de licenciement.",
        "Vérifiez votre convention collective : elle peut prévoir des conditions plus favorables.",
      ],
      avertissement:
        "⚠️ Estimation indicative. Consultez un avocat en droit du travail ou votre convention collective.",
    };
  }

  // Salaire de référence : le plus favorable
  const salaire12Mois = input.salaireBrutMensuel;
  const salaire3Mois = input.salaireBrutMensuelAvecPrimes ?? input.salaireBrutMensuel;
  const salaireReference = Math.max(salaire12Mois, salaire3Mois);
  const methodeSalaire =
    salaireReference === salaire3Mois && salaire3Mois > salaire12Mois
      ? "Moyenne des 3 derniers mois (plus favorable)"
      : "Moyenne des 12 derniers mois";

  // Calcul de l'indemnité légale
  let indemnite = 0;
  let detailCalcul = "";

  if (ancienneteTotaleAnnees <= 10) {
    indemnite = salaireReference * (1 / 4) * ancienneteTotaleAnnees;
    detailCalcul = `${salaireReference.toFixed(2)} × 1/4 × ${ancienneteTotaleAnnees.toFixed(2)} ans = ${indemnite.toFixed(2)} €`;
  } else {
    const part1 = salaireReference * (1 / 4) * 10;
    const part2 = salaireReference * (1 / 3) * (ancienneteTotaleAnnees - 10);
    indemnite = part1 + part2;
    detailCalcul =
      `10 premières années : ${salaireReference.toFixed(2)} × 1/4 × 10 = ${part1.toFixed(2)} €\n` +
      `Au-delà : ${salaireReference.toFixed(2)} × 1/3 × ${(ancienneteTotaleAnnees - 10).toFixed(2)} = ${part2.toFixed(2)} €\n` +
      `Total : ${indemnite.toFixed(2)} €`;
  }

  indemnite = Math.round(indemnite * 100) / 100;

  // Inaptitude professionnelle : doublement de l'indemnité légale
  let indemniteLicenciement = indemnite;
  if (input.motif === "inaptitude_professionnelle") {
    indemniteLicenciement = indemnite * 2;
    detailCalcul += `\nInaptitude professionnelle : indemnité doublée = ${indemniteLicenciement.toFixed(2)} €`;
  }

  indemniteLicenciement = Math.round(indemniteLicenciement * 100) / 100;

  // Régime fiscal : exonération jusqu'à certains plafonds
  // Max(indemnité légale, 2×rémunération annuelle brute, 50% de l'indemnité, 6 PASS)
  const remuAnnuelle = salaireReference * 12;
  const plafondExo = Math.min(
    6 * PASS_ANNUEL_2026,
    Math.max(indemniteLicenciement, 2 * remuAnnuelle, indemniteLicenciement * 0.5)
  );

  const regimeSocial =
    indemniteLicenciement <= 2 * PASS_ANNUEL_2026
      ? "Exonérée de cotisations sociales dans la limite de 2 PASS (96 120 € en 2026)"
      : "Partiellement soumise aux cotisations sociales (dépasse 2 PASS)";

  const conseils: string[] = [
    "Vérifiez votre convention collective : elle peut prévoir une indemnité supérieure à l'indemnité légale.",
    "L'indemnité conventionnelle se substitue à l'indemnité légale si elle est plus favorable.",
    "En cas de licenciement économique, vous pouvez bénéficier du CSP (Contrat de Sécurisation Professionnelle).",
    "Conservez vos bulletins de paie des 12 derniers mois pour vérifier le calcul.",
  ];

  if (input.motif === "rupture_conventionnelle") {
    conseils.push(
      "Pour une rupture conventionnelle, l'indemnité ne peut pas être inférieure à l'indemnité légale de licenciement."
    );
  }

  if (input.motif === "inaptitude_professionnelle") {
    conseils.push(
      "L'indemnité est doublée car l'inaptitude est d'origine professionnelle (accident du travail ou maladie professionnelle)."
    );
  }

  return {
    eligible: true,
    salaireReference,
    methodeSalaire,
    ancienneteRetenue: {
      annees: input.ancienneteAnnees,
      mois: ancienneteMois,
      total: Math.round(ancienneteTotaleAnnees * 100) / 100,
    },
    indemniteMinimaleLegale: indemnite,
    detailCalcul,
    indemniteLicenciement,
    exonerationFiscale: indemniteLicenciement <= plafondExo,
    plafondExonerationFiscale: Math.round(plafondExo),
    regimeSocial,
    conseils,
    avertissement:
      "⚠️ Calcul de l'indemnité LEGALE minimale. Votre convention collective peut prévoir des montants supérieurs. " +
      "Consultez un avocat en droit du travail pour une analyse personnalisée. " +
      "Simulateur officiel : code.travail.gouv.fr/outils/indemnite-licenciement",
  };
}
