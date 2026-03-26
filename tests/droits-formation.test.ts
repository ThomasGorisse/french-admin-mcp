import { describe, it, expect } from "vitest";
import { verifierDroitsFormation } from "../src/tools/verifier-droits-formation.js";

describe("verifierDroitsFormation", () => {
  it("salarié temps plein 5 ans — estimation CPF", () => {
    const result = verifierDroitsFormation({
      anneesTravaillees: 5,
      tempsPlein: true,
      niveauQualification: "bac_plus",
    });

    // 500 × 5 = 2500
    expect(result.droitsCPFEstimes).toBe(2500);
    expect(result.alimentationAnnuelle).toBe(500);
    expect(result.plafondCPF).toBe(5000);
    expect(result.resteAChargeObligatoire).toBe(103.20);
  });

  it("salarié peu qualifié — alimentation majorée", () => {
    const result = verifierDroitsFormation({
      anneesTravaillees: 5,
      tempsPlein: true,
      niveauQualification: "sans_diplome",
    });

    expect(result.alimentationAnnuelle).toBe(800);
    expect(result.plafondCPF).toBe(8000);
    // 800 × 5 = 4000
    expect(result.droitsCPFEstimes).toBe(4000);
    expect(result.droitsSpeciaux.length).toBeGreaterThan(0);
  });

  it("travailleur handicapé — exonération reste à charge", () => {
    const result = verifierDroitsFormation({
      anneesTravaillees: 10,
      tempsPlein: true,
      niveauQualification: "bac_ou_moins",
      travailleurHandicape: true,
    });

    expect(result.financement.resteACharge).toBe(0);
    expect(result.droitsSpeciaux.some((d) => d.includes("travailleur handicapé"))).toBe(true);
  });

  it("plafond CPF atteint après 10+ ans", () => {
    const result = verifierDroitsFormation({
      anneesTravaillees: 15,
      tempsPlein: true,
      niveauQualification: "bac_plus",
    });

    // 500 × 15 = 7500, mais plafonné à 5000
    expect(result.droitsCPFEstimes).toBe(5000);
  });

  it("montant CPF connu utilisé en priorité", () => {
    const result = verifierDroitsFormation({
      anneesTravaillees: 5,
      tempsPlein: true,
      niveauQualification: "bac_plus",
      montantCPFConnu: 3200,
    });

    expect(result.droitsCPFEstimes).toBe(3200);
  });

  it("formation certification — plafond 1500 €", () => {
    const result = verifierDroitsFormation({
      anneesTravaillees: 10,
      tempsPlein: true,
      niveauQualification: "bac_plus",
      typeFormationEnvisagee: "certification",
    });

    expect(result.plafondFormation).toBeDefined();
    expect(result.plafondFormation!.plafond).toBe(1500);
    expect(result.financement.cpfUtilisable).toBeLessThanOrEqual(1500);
  });

  it("bilan de compétences — plafond 1600 €", () => {
    const result = verifierDroitsFormation({
      anneesTravaillees: 8,
      tempsPlein: true,
      niveauQualification: "bac_plus",
      typeFormationEnvisagee: "bilan_competences",
    });

    expect(result.plafondFormation!.plafond).toBe(1600);
  });

  it("permis de conduire — plafond 900 €", () => {
    const result = verifierDroitsFormation({
      anneesTravaillees: 3,
      tempsPlein: true,
      niveauQualification: "bac_ou_moins",
      typeFormationEnvisagee: "permis_conduire",
    });

    expect(result.plafondFormation!.plafond).toBe(900);
    expect(result.financement.cpfUtilisable).toBeLessThanOrEqual(900);
  });

  it("temps partiel >= 50% acquiert le même montant", () => {
    const result = verifierDroitsFormation({
      anneesTravaillees: 5,
      tempsPlein: false,
      quotiteTempsPartiel: 0.8,
      niveauQualification: "bac_plus",
    });

    // >= 50% = même droits que temps plein
    expect(result.droitsCPFEstimes).toBe(2500);
  });

  it("temps partiel < 50% — droits réduits", () => {
    const result = verifierDroitsFormation({
      anneesTravaillees: 5,
      tempsPlein: false,
      quotiteTempsPartiel: 0.3,
      niveauQualification: "bac_plus",
    });

    // 0.3 * 2 = 0.6 quotité → 500 * 0.6 * 5 = 1500
    expect(result.droitsCPFEstimes).toBe(1500);
  });

  it("démarches incluent des avertissements anti-arnaque", () => {
    const result = verifierDroitsFormation({
      anneesTravaillees: 5,
      tempsPlein: true,
      niveauQualification: "bac_plus",
    });

    expect(result.demarches.some((d) => d.includes("arnaque"))).toBe(true);
  });
});
