import { describe, it, expect } from "vitest";
import { calculerIndemnitesLicenciement } from "../src/tools/calculer-indemnites-licenciement.js";

describe("calculerIndemnitesLicenciement", () => {
  it("5 ans d'ancienneté — formule 1/4 par année", () => {
    const result = calculerIndemnitesLicenciement({
      salaireBrutMensuel: 3000,
      ancienneteAnnees: 5,
      motif: "licenciement_personnel",
    });

    expect(result.eligible).toBe(true);
    // 3000 × 1/4 × 5 = 3750
    expect(result.indemniteMinimaleLegale).toBe(3750);
    expect(result.indemniteLicenciement).toBe(3750);
  });

  it("15 ans d'ancienneté — formule mixte 1/4 + 1/3", () => {
    const result = calculerIndemnitesLicenciement({
      salaireBrutMensuel: 4000,
      ancienneteAnnees: 15,
      motif: "licenciement_economique",
    });

    expect(result.eligible).toBe(true);
    // 10 premières : 4000 × 1/4 × 10 = 10000
    // 5 suivantes : 4000 × 1/3 × 5 = 6666.67
    // Total : ~16666.67
    expect(result.indemniteMinimaleLegale).toBeCloseTo(16666.67, 0);
  });

  it("moins de 8 mois — non éligible", () => {
    const result = calculerIndemnitesLicenciement({
      salaireBrutMensuel: 3000,
      ancienneteAnnees: 0,
      ancienneteMois: 5,
      motif: "licenciement_personnel",
    });

    expect(result.eligible).toBe(false);
    expect(result.motifIneligibilite).toContain("8 mois");
  });

  it("8 mois exactement — éligible", () => {
    const result = calculerIndemnitesLicenciement({
      salaireBrutMensuel: 3000,
      ancienneteAnnees: 0,
      ancienneteMois: 8,
      motif: "licenciement_personnel",
    });

    expect(result.eligible).toBe(true);
    expect(result.indemniteMinimaleLegale).toBeGreaterThan(0);
  });

  it("inaptitude professionnelle — doublement de l'indemnité", () => {
    const result = calculerIndemnitesLicenciement({
      salaireBrutMensuel: 3000,
      ancienneteAnnees: 10,
      motif: "inaptitude_professionnelle",
    });

    expect(result.eligible).toBe(true);
    // Indemnité de base : 3000 × 1/4 × 10 = 7500, doublée = 15000
    expect(result.indemniteLicenciement).toBe(15000);
    expect(result.indemniteLicenciement).toBe(result.indemniteMinimaleLegale * 2);
  });

  it("salaire avec primes plus favorable retenu", () => {
    const result = calculerIndemnitesLicenciement({
      salaireBrutMensuel: 3000,
      salaireBrutMensuelAvecPrimes: 3500,
      ancienneteAnnees: 5,
      motif: "licenciement_personnel",
    });

    expect(result.salaireReference).toBe(3500);
    expect(result.methodeSalaire).toContain("3 derniers mois");
    // 3500 × 1/4 × 5 = 4375
    expect(result.indemniteMinimaleLegale).toBe(4375);
  });

  it("rupture conventionnelle — conseil spécifique", () => {
    const result = calculerIndemnitesLicenciement({
      salaireBrutMensuel: 3000,
      ancienneteAnnees: 3,
      motif: "rupture_conventionnelle",
    });

    expect(result.eligible).toBe(true);
    expect(result.conseils.some((c) => c.includes("rupture conventionnelle"))).toBe(true);
  });

  it("ancienneté avec mois supplémentaires — prorata", () => {
    const result = calculerIndemnitesLicenciement({
      salaireBrutMensuel: 3000,
      ancienneteAnnees: 5,
      ancienneteMois: 6,
      motif: "licenciement_personnel",
    });

    expect(result.eligible).toBe(true);
    // 5.5 ans × 1/4 × 3000 = 4125
    expect(result.indemniteMinimaleLegale).toBe(4125);
  });

  it("régime fiscal cohérent", () => {
    const result = calculerIndemnitesLicenciement({
      salaireBrutMensuel: 5000,
      ancienneteAnnees: 20,
      motif: "licenciement_economique",
    });

    expect(result.eligible).toBe(true);
    expect(result.plafondExonerationFiscale).toBeGreaterThan(0);
    expect(result.regimeSocial).toContain("PASS");
  });
});
