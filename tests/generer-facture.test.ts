import { describe, it, expect } from "vitest";
import { genererFacture } from "../src/tools/generer-facture.js";

describe("genererFacture", () => {
  const baseInput = {
    nomEmetteur: "Jean Dupont",
    siret: "12345678901234",
    adresseEmetteur: "10 rue de la République, 75001 Paris",
    nomClient: "Entreprise ABC",
    adresseClient: "5 avenue des Champs, 75008 Paris",
    numeroFacture: "F-2025-001",
    lignes: [
      { description: "Développement application mobile", quantite: 1, prixUnitaireHT: 5000 },
      { description: "Maintenance mensuelle", quantite: 3, prixUnitaireHT: 500 },
    ],
    franchiseEnBaseTVA: true,
  };

  it("génère une facture avec les montants corrects", () => {
    const result = genererFacture(baseInput);

    expect(result.totalHT).toBe(6500);
    expect(result.totalTVA).toBe(0);
    expect(result.totalTTC).toBe(6500);
  });

  it("inclut la mention franchise en base TVA", () => {
    const result = genererFacture(baseInput);

    expect(result.mentionsLegales).toContain("TVA non applicable, art. 293 B du CGI");
    expect(result.texteFacture).toContain("FACTURE");
    expect(result.texteFacture).toContain("Jean Dupont");
    expect(result.texteFacture).toContain("12345678901234");
  });

  it("calcule la TVA quand applicable", () => {
    const result = genererFacture({
      ...baseInput,
      franchiseEnBaseTVA: false,
      lignes: [
        { description: "Prestation", quantite: 1, prixUnitaireHT: 1000, tauxTVA: 0.20 },
      ],
    });

    expect(result.totalHT).toBe(1000);
    expect(result.totalTVA).toBe(200);
    expect(result.totalTTC).toBe(1200);
  });

  it("inclut les pénalités de retard", () => {
    const result = genererFacture(baseInput);
    const penaliteMention = result.mentionsLegales.find((m) => m.includes("retard"));
    expect(penaliteMention).toBeDefined();
    expect(penaliteMention).toContain("40 €");
  });

  it("contient l'avertissement logiciel certifié", () => {
    const result = genererFacture(baseInput);
    expect(result.avertissement).toContain("logiciel de facturation");
  });
});
