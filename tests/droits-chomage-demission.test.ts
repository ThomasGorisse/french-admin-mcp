import { describe, it, expect } from "vitest";
import { verifierDroitsChomageDemission } from "../src/tools/verifier-droits-chomage-demission.js";

describe("verifierDroitsChomageDemission", () => {
  // --- Reconversion ---

  it("reconversion avec 5+ ans d'ancienneté — éligible", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "reconversion",
      anciennete_mois: 72,
      salaire_brut_mensuel: 3000,
    });

    expect(result.eligible).toBe(true);
    expect(result.typeEligibilite).toBe("demission_reconversion");
    expect(result.montantEstimeARE).toBeDefined();
    expect(result.montantEstimeARE!.allocationMensuelleBrute).toBeGreaterThan(0);
  });

  it("reconversion avec moins de 5 ans — non éligible", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "reconversion",
      anciennete_mois: 48,
      salaire_brut_mensuel: 3000,
    });

    expect(result.eligible).toBe(false);
    expect(result.typeEligibilite).toBe("non_eligible");
    expect(result.montantEstimeARE).toBeUndefined();
  });

  it("reconversion mentionne le CEP dans les démarches", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "reconversion",
      anciennete_mois: 72,
      salaire_brut_mensuel: 3000,
    });

    expect(result.demarchesSpecifiques.some((d) => d.includes("CEP"))).toBe(true);
  });

  it("reconversion mentionne Transitions Pro", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "reconversion",
      anciennete_mois: 72,
      salaire_brut_mensuel: 3000,
    });

    expect(result.conditions.some((c) => c.includes("Transitions Pro") || c.includes("CPIR"))).toBe(
      true
    );
  });

  // --- Création d'entreprise ---

  it("création entreprise avec 5+ ans — éligible", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "creation_entreprise",
      anciennete_mois: 60,
      salaire_brut_mensuel: 4000,
    });

    expect(result.eligible).toBe(true);
    expect(result.typeEligibilite).toBe("demission_reconversion");
    expect(result.montantEstimeARE).toBeDefined();
  });

  it("création entreprise avec moins de 5 ans — non éligible", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "creation_entreprise",
      anciennete_mois: 36,
      salaire_brut_mensuel: 4000,
    });

    expect(result.eligible).toBe(false);
  });

  it("création entreprise mentionne le business plan", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "creation_entreprise",
      anciennete_mois: 72,
      salaire_brut_mensuel: 4000,
    });

    expect(result.demarchesSpecifiques.some((d) => d.includes("business plan"))).toBe(true);
  });

  // --- Suivi de conjoint ---

  it("suivi conjoint avec ancienneté suffisante — éligible", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "suivi_conjoint",
      anciennete_mois: 12,
      salaire_brut_mensuel: 2500,
    });

    expect(result.eligible).toBe(true);
    expect(result.typeEligibilite).toBe("demission_legitime");
    expect(result.montantEstimeARE).toBeDefined();
  });

  it("suivi conjoint avec ancienneté insuffisante — non éligible", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "suivi_conjoint",
      anciennete_mois: 3,
      salaire_brut_mensuel: 2500,
    });

    expect(result.eligible).toBe(false);
    expect(result.typeEligibilite).toBe("non_eligible");
  });

  it("suivi conjoint mentionne le conjoint professionnel", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "suivi_conjoint",
      anciennete_mois: 12,
      salaire_brut_mensuel: 2500,
    });

    expect(result.conditions.some((c) => c.includes("conjoint"))).toBe(true);
  });

  // --- Harcèlement ---

  it("harcèlement avec ancienneté suffisante — éligible", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "harcelement",
      anciennete_mois: 24,
      salaire_brut_mensuel: 3000,
    });

    expect(result.eligible).toBe(true);
    expect(result.typeEligibilite).toBe("demission_legitime");
  });

  it("harcèlement mentionne le dépôt de plainte", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "harcelement",
      anciennete_mois: 24,
      salaire_brut_mensuel: 3000,
    });

    expect(result.demarchesSpecifiques.some((d) => d.includes("plainte"))).toBe(true);
  });

  it("harcèlement mentionne l'inspection du travail", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "harcelement",
      anciennete_mois: 24,
      salaire_brut_mensuel: 3000,
    });

    expect(result.demarchesSpecifiques.some((d) => d.includes("inspection du travail"))).toBe(
      true
    );
  });

  // --- Non-paiement ---

  it("non-paiement avec ancienneté suffisante — éligible", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "non_paiement",
      anciennete_mois: 18,
      salaire_brut_mensuel: 2800,
    });

    expect(result.eligible).toBe(true);
    expect(result.typeEligibilite).toBe("demission_legitime");
  });

  it("non-paiement mentionne les prud'hommes", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "non_paiement",
      anciennete_mois: 18,
      salaire_brut_mensuel: 2800,
    });

    expect(result.demarchesSpecifiques.some((d) => d.includes("prud'hommes"))).toBe(true);
  });

  it("non-paiement mentionne la mise en demeure", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "non_paiement",
      anciennete_mois: 18,
      salaire_brut_mensuel: 2800,
    });

    expect(result.demarchesSpecifiques.some((d) => d.includes("mise en demeure"))).toBe(true);
  });

  // --- Démission classique (autre) ---

  it("démission classique — non éligible mais réexamen possible", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "autre",
      anciennete_mois: 36,
      salaire_brut_mensuel: 3000,
    });

    expect(result.eligible).toBe(false);
    expect(result.typeEligibilite).toBe("reexamen_possible");
    expect(result.montantEstimeARE).toBeUndefined();
  });

  it("démission classique mentionne les 121 jours", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "autre",
      anciennete_mois: 36,
      salaire_brut_mensuel: 3000,
    });

    expect(result.conditions.some((c) => c.includes("121 jours") || c.includes("4 mois"))).toBe(
      true
    );
  });

  it("démission classique mentionne l'IPR", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "autre",
      anciennete_mois: 36,
      salaire_brut_mensuel: 3000,
    });

    expect(result.demarchesSpecifiques.some((d) => d.includes("IPR") || d.includes("réexamen"))).toBe(
      true
    );
  });

  // --- Cas légitimes listés ---

  it("liste les cas de démission légitime", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "autre",
      anciennete_mois: 12,
      salaire_brut_mensuel: 2500,
    });

    expect(result.casLegitimes.length).toBeGreaterThan(5);
    expect(result.casLegitimes.some((c) => c.includes("conjoint"))).toBe(true);
    expect(result.casLegitimes.some((c) => c.includes("reconversion"))).toBe(true);
  });

  // --- Montants ARE estimés ---

  it("montant ARE estimé cohérent pour démission légitime", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "suivi_conjoint",
      anciennete_mois: 24,
      salaire_brut_mensuel: 3000,
    });

    expect(result.montantEstimeARE).toBeDefined();
    const are = result.montantEstimeARE!;
    expect(are.allocationJournaliereBrute).toBeGreaterThan(30);
    expect(are.allocationMensuelleBrute).toBeGreaterThan(900);
    expect(are.allocationMensuelleNette).toBeLessThan(are.allocationMensuelleBrute);
    expect(are.dureeEstimeeMois).toBeGreaterThan(0);
  });

  it("pas de montant ARE si non éligible", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "autre",
      anciennete_mois: 36,
      salaire_brut_mensuel: 3000,
    });

    expect(result.montantEstimeARE).toBeUndefined();
  });

  // --- Références ---

  it("contient les références juridiques", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "reconversion",
      anciennete_mois: 72,
      salaire_brut_mensuel: 3000,
    });

    expect(result.references.length).toBeGreaterThan(3);
    expect(result.references.some((r) => r.includes("assurance chômage"))).toBe(true);
  });

  // --- Avertissement ---

  it("contient un avertissement", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "reconversion",
      anciennete_mois: 72,
      salaire_brut_mensuel: 3000,
    });

    expect(result.avertissement).toContain("indicative");
    expect(result.avertissement).toContain("avocat");
  });

  // --- Délais ---

  it("contient des délais pour chaque motif", () => {
    for (const motif of [
      "reconversion",
      "creation_entreprise",
      "suivi_conjoint",
      "harcelement",
      "non_paiement",
      "autre",
    ] as const) {
      const result = verifierDroitsChomageDemission({
        motif_demission: motif,
        anciennete_mois: 72,
        salaire_brut_mensuel: 3000,
      });

      expect(result.delais.length).toBeGreaterThan(0);
    }
  });

  // --- Motif analyse ---

  it("motif analyse décrit le cas pour chaque motif", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "suivi_conjoint",
      anciennete_mois: 24,
      salaire_brut_mensuel: 3000,
    });

    expect(result.motifAnalyse.length).toBeGreaterThan(20);
    expect(result.motifAnalyse).toContain("conjoint");
  });

  // --- Ancienneté exactement 60 mois pour reconversion ---

  it("reconversion avec exactement 60 mois — éligible", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "reconversion",
      anciennete_mois: 60,
      salaire_brut_mensuel: 3000,
    });

    expect(result.eligible).toBe(true);
    expect(result.typeEligibilite).toBe("demission_reconversion");
  });

  it("reconversion avec 59 mois — non éligible", () => {
    const result = verifierDroitsChomageDemission({
      motif_demission: "reconversion",
      anciennete_mois: 59,
      salaire_brut_mensuel: 3000,
    });

    expect(result.eligible).toBe(false);
  });
});
