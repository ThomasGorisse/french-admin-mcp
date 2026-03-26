import { describe, it, expect } from "vitest";
import { calculerChargesAE } from "../src/tools/calculer-charges-ae.js";
import { calculerChargesTrimestrielles } from "../src/data/urssaf-rates.js";

describe("calculerChargesTrimestrielles", () => {
  it("calcule les charges BNC sur 10000€", () => {
    const charges = calculerChargesTrimestrielles(10_000, "services_bnc");
    expect(charges.cotisationsSociales).toBeCloseTo(2540, 0); // 25.4% en 2026 (était 23.3% en 2025)
    expect(charges.cfp).toBeCloseTo(20, 0);
    expect(charges.total).toBeGreaterThan(0);
    expect(charges.caNet).toBeLessThan(10_000);
  });

  it("commerce a un taux plus bas que services", () => {
    const commerce = calculerChargesTrimestrielles(10_000, "commerce");
    const services = calculerChargesTrimestrielles(10_000, "services_bnc");
    expect(commerce.total).toBeLessThan(services.total);
  });
});

describe("calculerChargesAE", () => {
  it("calcule les charges mensuelles BNC", () => {
    const result = calculerChargesAE({
      chiffreAffaires: 5_000,
      typeActivite: "services_bnc",
      periode: "mensuel",
    });

    expect(result.activite).toContain("BNC");
    expect(result.totalCharges).toBeGreaterThan(0);
    expect(result.resteApresCharges).toBeLessThan(5_000);
    expect(result.tauxEffectif).toBeGreaterThan(20);
    expect(result.tauxEffectif).toBeLessThan(30);
  });

  it("applique ACRE (réduction 50%)", () => {
    const sans = calculerChargesAE({
      chiffreAffaires: 5_000,
      typeActivite: "services_bnc",
      periode: "mensuel",
    });

    const avec = calculerChargesAE({
      chiffreAffaires: 5_000,
      typeActivite: "services_bnc",
      periode: "mensuel",
      acre: true,
    });

    expect(avec.totalCharges).toBeLessThan(sans.totalCharges);
    expect(avec.economieAcre).toBeGreaterThan(0);
  });

  it("détecte le dépassement de seuil TVA", () => {
    const result = calculerChargesAE({
      chiffreAffaires: 50_000,
      typeActivite: "services_bnc",
      periode: "annuel",
    });

    expect(result.assujettissementTVA).toBe(true);
  });

  it("commerce sous seuil TVA", () => {
    const result = calculerChargesAE({
      chiffreAffaires: 5_000,
      typeActivite: "commerce",
      periode: "mensuel",
    });

    expect(result.assujettissementTVA).toBe(false);
  });

  it("versement libératoire ajoute un montant IR", () => {
    const result = calculerChargesAE({
      chiffreAffaires: 5_000,
      typeActivite: "services_bnc",
      periode: "mensuel",
      versementLiberatoire: true,
    });

    expect(result.versementIR).toBeGreaterThan(0);
  });

  it("projections annuelles cohérentes", () => {
    const result = calculerChargesAE({
      chiffreAffaires: 5_000,
      typeActivite: "services_bnc",
      periode: "mensuel",
    });

    expect(result.caAnnuelEstime).toBe(60_000);
    expect(result.chargesAnnuellesEstimees).toBeCloseTo(result.totalCharges * 12, 0);
  });
});
