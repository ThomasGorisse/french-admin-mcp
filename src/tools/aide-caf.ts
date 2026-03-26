import {
  estimerPrimeActivite,
  estimerAllocationsFamiliales,
  APL_LOYER_PLAFOND,
} from "../data/caf-thresholds.js";

export interface AideCAFInput {
  situationFamiliale: "seul" | "couple";
  enfants: number;
  enfantsDePlus14Ans?: number;
  revenusMensuelsActivite: number;
  autresRevenus?: number;
  revenusFiscauxAnnuels?: number;
  loyer?: number;
  zoneAPL?: "zone_1" | "zone_2" | "zone_3";
}

export interface AideCAFResult {
  primeActivite: {
    eligible: boolean;
    montantEstime: number;
    details: string;
  };
  allocationsFamiliales: {
    montantMensuel: number;
    details: string;
  };
  aplEstimation: {
    possible: boolean;
    details: string;
  };
  totalEstimeMensuel: number;
  demarchesRecommandees: string[];
  avertissement: string;
}

export function estimerAidesCAF(input: AideCAFInput): AideCAFResult {
  // Prime d'activité
  const primeActivite = estimerPrimeActivite(
    input.revenusMensuelsActivite,
    input.situationFamiliale,
    input.enfants,
    input.autresRevenus ?? 0
  );

  // Allocations familiales
  const revenusFiscaux = input.revenusFiscauxAnnuels ?? input.revenusMensuelsActivite * 12;
  const af = estimerAllocationsFamiliales(
    revenusFiscaux,
    input.enfants,
    input.enfantsDePlus14Ans ?? 0
  );

  // APL (estimation très simplifiée)
  let aplPossible = false;
  let aplDetails = "Informations insuffisantes pour estimer l'APL.";

  if (input.loyer && input.zoneAPL) {
    const plafonds = APL_LOYER_PLAFOND[input.zoneAPL];
    const loyerPlafond =
      input.situationFamiliale === "couple"
        ? plafonds.couple + input.enfants * plafonds.par_personne_sup
        : plafonds.seul + input.enfants * plafonds.par_personne_sup;

    const loyerPrisEnCompte = Math.min(input.loyer, loyerPlafond);
    const revenusAnnuels = revenusFiscaux;

    // Très grossière estimation — l'APL dépend d'une formule complexe
    // On donne juste une indication
    if (revenusAnnuels < 25000 + input.enfants * 5000) {
      aplPossible = true;
      aplDetails =
        `Avec un loyer de ${input.loyer} €/mois en ${input.zoneAPL.replace("_", " ")}, ` +
        `vous pourriez être éligible à l'APL. ` +
        `Loyer pris en compte (plafonné) : ${loyerPlafond.toFixed(2)} €. ` +
        `Le montant exact dépend de nombreux paramètres — simulez sur caf.fr.`;
    } else {
      aplDetails =
        `Avec des revenus annuels de ${revenusAnnuels} €, ` +
        `l'éligibilité à l'APL est peu probable mais pas impossible. Simulez sur caf.fr.`;
    }
  }

  const totalEstime =
    (primeActivite.eligible ? primeActivite.montantEstime : 0) +
    af.montantMensuel;

  const demarches: string[] = [];
  if (primeActivite.eligible) {
    demarches.push(
      "Faire une demande de Prime d'activité sur caf.fr > Mes services en ligne > Faire une demande de prestation"
    );
  }
  if (af.montantMensuel > 0) {
    demarches.push(
      "Les allocations familiales sont automatiques si vous avez déclaré vos enfants à la CAF"
    );
  }
  if (aplPossible) {
    demarches.push(
      "Faire une demande d'APL sur caf.fr > Mes services en ligne > Faire une demande de prestation"
    );
  }
  demarches.push(
    "Simuler toutes vos aides sur mesdroitssociaux.gouv.fr (simulateur officiel multi-organismes)"
  );

  return {
    primeActivite,
    allocationsFamiliales: af,
    aplEstimation: { possible: aplPossible, details: aplDetails },
    totalEstimeMensuel: Math.round(totalEstime * 100) / 100,
    demarchesRecommandees: demarches,
    avertissement:
      "⚠️ Estimations indicatives basées sur les barèmes 2025/2026. " +
      "Les montants réels dépendent de nombreux paramètres non pris en compte ici " +
      "(patrimoine, autres aides, situation détaillée). " +
      "Pour une estimation précise, utilisez le simulateur officiel sur caf.fr ou mesdroitssociaux.gouv.fr.",
  };
}
