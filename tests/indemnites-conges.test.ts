import { describe, it, expect } from "vitest";
import { calculerIndemniteConges } from "../src/tools/calculer-indemnites-conges.js";

describe("calculerIndemniteConges", () => {
  // --- Cas de base ---

  it("méthode maintien de salaire — calcul correct", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 3000,
      jours_acquis: 30,
      methode: "maintien_salaire",
      jours_pris: 12,
    });

    expect(result.montantBrut).toBeGreaterThan(0);
    expect(result.methodeAppliquee).toBe("Maintien de salaire");
    // 3000 / 26 × 12 ≈ 1384.62
    expect(result.montantBrut).toBeCloseTo(3000 / 26 * 12, 0);
  });

  it("méthode dixième — calcul correct", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 3000,
      jours_acquis: 30,
      methode: "dixieme",
      jours_pris: 12,
    });

    expect(result.montantBrut).toBeGreaterThan(0);
    expect(result.methodeAppliquee).toBe("Dixième (1/10ème)");
    // (3000 × 12 × 10%) × (12/30) = 36000 × 0.1 × 0.4 = 1440
    expect(result.montantBrut).toBeCloseTo(36000 * 0.1 * 12 / 30, 0);
  });

  // --- Comparaison des deux méthodes ---

  it("compare les deux méthodes et identifie la plus favorable", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 3000,
      jours_acquis: 30,
      methode: "maintien_salaire",
      jours_pris: 15,
    });

    expect(result.comparaison.maintienSalaire.montantBrut).toBeGreaterThan(0);
    expect(result.comparaison.dixieme.montantBrut).toBeGreaterThan(0);
    expect(["maintien_salaire", "dixieme"]).toContain(result.comparaison.methodePlusFavorable);
    expect(result.comparaison.difference).toBeGreaterThanOrEqual(0);
  });

  it("la méthode plus favorable donne un montant >= l'autre", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 2500,
      jours_acquis: 25,
      methode: "maintien_salaire",
      jours_pris: 10,
    });

    const { maintienSalaire, dixieme, methodePlusFavorable } = result.comparaison;
    if (methodePlusFavorable === "maintien_salaire") {
      expect(maintienSalaire.montantBrut).toBeGreaterThanOrEqual(dixieme.montantBrut);
    } else {
      expect(dixieme.montantBrut).toBeGreaterThanOrEqual(maintienSalaire.montantBrut);
    }
  });

  // --- Tous les jours acquis pris ---

  it("prendre tous les jours acquis — 30 jours", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 3000,
      jours_acquis: 30,
      methode: "maintien_salaire",
      jours_pris: 30,
    });

    expect(result.montantBrut).toBeGreaterThan(0);
    expect(result.informations.joursRestants).toBe(0);
  });

  it("prendre 1 seul jour", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 3000,
      jours_acquis: 30,
      methode: "maintien_salaire",
      jours_pris: 1,
    });

    expect(result.montantBrut).toBeCloseTo(3000 / 26, 0);
    expect(result.informations.joursRestants).toBe(29);
  });

  // --- Jours restants ---

  it("calcule les jours restants correctement", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 2500,
      jours_acquis: 25,
      methode: "dixieme",
      jours_pris: 10,
    });

    expect(result.informations.joursRestants).toBe(15);
    expect(result.informations.joursAcquis).toBe(25);
    expect(result.informations.joursPris).toBe(10);
  });

  // --- Charges sociales ---

  it("estime les charges sociales", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 3000,
      jours_acquis: 30,
      methode: "maintien_salaire",
      jours_pris: 15,
    });

    expect(result.chargesSocialesEstimees.montantCSGCRDS).toBeGreaterThan(0);
    expect(result.chargesSocialesEstimees.montantCotisationsSalariales).toBeGreaterThan(0);
    expect(result.chargesSocialesEstimees.montantNetEstime).toBeLessThan(result.montantBrut);
  });

  it("net estimé = brut - CSG/CRDS - cotisations", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 4000,
      jours_acquis: 30,
      methode: "dixieme",
      jours_pris: 20,
    });

    const { montantCSGCRDS, montantCotisationsSalariales, montantNetEstime } =
      result.chargesSocialesEstimees;
    expect(montantNetEstime).toBeCloseTo(
      result.montantBrut - montantCSGCRDS - montantCotisationsSalariales,
      0
    );
  });

  // --- Erreurs ---

  it("erreur si jours pris > jours acquis", () => {
    expect(() =>
      calculerIndemniteConges({
        salaire_brut_mensuel: 3000,
        jours_acquis: 10,
        methode: "maintien_salaire",
        jours_pris: 15,
      })
    ).toThrow("seulement 10 jours acquis");
  });

  it("erreur si jours pris = 0", () => {
    expect(() =>
      calculerIndemniteConges({
        salaire_brut_mensuel: 3000,
        jours_acquis: 30,
        methode: "maintien_salaire",
        jours_pris: 0,
      })
    ).toThrow("supérieur à 0");
  });

  it("erreur si salaire = 0", () => {
    expect(() =>
      calculerIndemniteConges({
        salaire_brut_mensuel: 0,
        jours_acquis: 30,
        methode: "maintien_salaire",
        jours_pris: 5,
      })
    ).toThrow("supérieur à 0");
  });

  // --- Salaire annuel brut ---

  it("salaire annuel brut = salaire mensuel × 12", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 2500,
      jours_acquis: 30,
      methode: "maintien_salaire",
      jours_pris: 10,
    });

    expect(result.informations.salaireBrutAnnuel).toBe(30000);
  });

  // --- Détail de calcul ---

  it("détail de calcul maintien contient les étapes", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 3000,
      jours_acquis: 30,
      methode: "maintien_salaire",
      jours_pris: 10,
    });

    expect(result.comparaison.maintienSalaire.detailCalcul).toContain("26");
    expect(result.comparaison.maintienSalaire.detailCalcul).toContain("€/jour");
  });

  it("détail de calcul dixième contient les étapes", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 3000,
      jours_acquis: 30,
      methode: "dixieme",
      jours_pris: 10,
    });

    expect(result.comparaison.dixieme.detailCalcul).toContain("10%");
  });

  // --- Règles ---

  it("contient les règles du Code du travail", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 3000,
      jours_acquis: 30,
      methode: "maintien_salaire",
      jours_pris: 10,
    });

    expect(result.regles.length).toBeGreaterThan(3);
    expect(result.regles.some((r) => r.includes("L3141-24"))).toBe(true);
  });

  // --- Avertissement ---

  it("contient un avertissement", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 3000,
      jours_acquis: 30,
      methode: "maintien_salaire",
      jours_pris: 10,
    });

    expect(result.avertissement).toContain("indicative");
  });

  // --- Salaires variés ---

  it("SMIC — calcul cohérent", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 1801.80,
      jours_acquis: 30,
      methode: "maintien_salaire",
      jours_pris: 5,
    });

    expect(result.montantBrut).toBeGreaterThan(0);
    expect(result.montantBrut).toBeLessThan(1801.80); // moins d'un mois pour 5 jours
  });

  it("haut salaire — proportionnel", () => {
    const smic = calculerIndemniteConges({
      salaire_brut_mensuel: 1800,
      jours_acquis: 30,
      methode: "maintien_salaire",
      jours_pris: 10,
    });

    const cadre = calculerIndemniteConges({
      salaire_brut_mensuel: 5000,
      jours_acquis: 30,
      methode: "maintien_salaire",
      jours_pris: 10,
    });

    expect(cadre.montantBrut).toBeGreaterThan(smic.montantBrut);
    // Le ratio devrait être proche de 5000/1800
    const ratio = cadre.montantBrut / smic.montantBrut;
    expect(ratio).toBeCloseTo(5000 / 1800, 1);
  });

  // --- Jours acquis partiels ---

  it("12 jours acquis (mi-temps ou année incomplète)", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 2000,
      jours_acquis: 12,
      methode: "dixieme",
      jours_pris: 12,
    });

    expect(result.montantBrut).toBeGreaterThan(0);
    expect(result.informations.joursRestants).toBe(0);
  });

  // --- Difference entre méthodes ---

  it("différence est la valeur absolue de l'écart", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 3000,
      jours_acquis: 30,
      methode: "maintien_salaire",
      jours_pris: 15,
    });

    const ecart = Math.abs(
      result.comparaison.maintienSalaire.montantBrut -
        result.comparaison.dixieme.montantBrut
    );
    expect(result.comparaison.difference).toBeCloseTo(ecart, 1);
  });

  // --- Taux charges ---

  it("taux CSG/CRDS et cotisations sont raisonnables", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 3000,
      jours_acquis: 30,
      methode: "maintien_salaire",
      jours_pris: 10,
    });

    expect(result.chargesSocialesEstimees.tauxCSGCRDS).toBeGreaterThan(0.05);
    expect(result.chargesSocialesEstimees.tauxCSGCRDS).toBeLessThan(0.15);
    expect(result.chargesSocialesEstimees.tauxCotisationsSalariales).toBeGreaterThan(0.05);
    expect(result.chargesSocialesEstimees.tauxCotisationsSalariales).toBeLessThan(0.30);
  });

  // --- Informations ---

  it("informations salaire brut mensuel restitué", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 2750,
      jours_acquis: 25,
      methode: "maintien_salaire",
      jours_pris: 8,
    });

    expect(result.informations.salaireBrutMensuel).toBe(2750);
  });

  // --- Edge: acquis = pris ---

  it("jours acquis = jours pris — tous les congés", () => {
    const result = calculerIndemniteConges({
      salaire_brut_mensuel: 3500,
      jours_acquis: 15,
      methode: "dixieme",
      jours_pris: 15,
    });

    expect(result.informations.joursRestants).toBe(0);
    // Dixième total = 3500 × 12 × 10% = 4200, pris 15/15 = 4200
    expect(result.montantBrut).toBeCloseTo(3500 * 12 * 0.1, 0);
  });
});
