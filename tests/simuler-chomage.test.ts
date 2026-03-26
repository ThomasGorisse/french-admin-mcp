import { describe, it, expect } from "vitest";
import { simulerChomage } from "../src/tools/simuler-chomage.js";

describe("simulerChomage", () => {
  it("salarié classique licencié — calcul ARE", () => {
    const result = simulerChomage({
      salaireBrutMensuelMoyen: 3000,
      moisTravailles: 24,
      age: 35,
      motifRupture: "licenciement",
    });

    expect(result.eligible).toBe(true);
    expect(result.salaireJournalierReference).toBeGreaterThan(0);
    expect(result.allocationJournaliereBrute).toBeGreaterThan(30);
    expect(result.allocationMensuelleBrute).toBeGreaterThan(900);
    expect(result.allocationMensuelleNette).toBeLessThan(result.allocationMensuelleBrute);
    expect(result.dureeIndemnisationMois).toBeGreaterThan(0);
    expect(result.demarches.length).toBeGreaterThan(0);
  });

  it("moins de 6 mois travaillés — non éligible", () => {
    const result = simulerChomage({
      salaireBrutMensuelMoyen: 2500,
      moisTravailles: 4,
      age: 30,
      motifRupture: "fin_cdd",
    });

    expect(result.eligible).toBe(false);
    expect(result.motifIneligibilite).toContain("6 mois");
    expect(result.allocationJournaliereBrute).toBe(0);
  });

  it("senior 57+ a une durée d'indemnisation plus longue", () => {
    const jeune = simulerChomage({
      salaireBrutMensuelMoyen: 3500,
      moisTravailles: 24,
      age: 40,
      motifRupture: "licenciement",
    });

    const senior = simulerChomage({
      salaireBrutMensuelMoyen: 3500,
      moisTravailles: 24,
      age: 58,
      motifRupture: "licenciement",
    });

    expect(senior.dureeIndemnisationJours).toBeGreaterThan(jeune.dureeIndemnisationJours);
  });

  it("rupture conventionnelle mentionne le différé spécifique", () => {
    const result = simulerChomage({
      salaireBrutMensuelMoyen: 4000,
      moisTravailles: 24,
      age: 45,
      motifRupture: "rupture_conventionnelle",
    });

    expect(result.eligible).toBe(true);
    expect(result.demarches.some((d) => d.includes("différé spécifique"))).toBe(true);
  });

  it("allocation ne dépasse pas 75% du SJR", () => {
    const result = simulerChomage({
      salaireBrutMensuelMoyen: 2000,
      moisTravailles: 12,
      age: 30,
      motifRupture: "licenciement",
    });

    expect(result.eligible).toBe(true);
    const plafond = result.salaireJournalierReference * 0.75;
    expect(result.allocationJournaliereBrute).toBeLessThanOrEqual(plafond + 0.01);
  });

  it("haut salaire — méthode 57% retenue", () => {
    const result = simulerChomage({
      salaireBrutMensuelMoyen: 8000,
      moisTravailles: 24,
      age: 40,
      motifRupture: "licenciement",
    });

    expect(result.eligible).toBe(true);
    expect(result.allocationJournaliereBrute).toBeGreaterThan(100);
  });

  it("durée max 18 mois pour moins de 55 ans", () => {
    const result = simulerChomage({
      salaireBrutMensuelMoyen: 3000,
      moisTravailles: 24,
      age: 40,
      motifRupture: "licenciement",
    });

    expect(result.dureeIndemnisationJours).toBeLessThanOrEqual(548);
  });

  it("montant total estimé cohérent", () => {
    const result = simulerChomage({
      salaireBrutMensuelMoyen: 3000,
      moisTravailles: 18,
      age: 35,
      motifRupture: "fin_cdd",
    });

    expect(result.eligible).toBe(true);
    const totalCalcule = result.allocationJournaliereBrute * result.dureeIndemnisationJours;
    expect(result.montantTotalEstime).toBeCloseTo(totalCalcule, 0);
  });
});
