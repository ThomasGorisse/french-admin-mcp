import { describe, it, expect } from "vitest";
import { simulerAidesLogement } from "../src/tools/simuler-aides-logement.js";

describe("simulerAidesLogement", () => {
  // --- Cas de base ---

  it("locataire seul zone 1 avec revenus modestes — éligible", () => {
    const result = simulerAidesLogement({
      loyer_mensuel: 800,
      zone: 1,
      situation: "locataire",
      revenus_annuels: 14000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    expect(result.eligible).toBe(true);
    expect(result.montantEstimeMensuel).toBeGreaterThan(0);
    expect(result.typeAide).toBe("APL");
  });

  it("couple avec enfant zone 2 — éligible", () => {
    const result = simulerAidesLogement({
      loyer_mensuel: 600,
      zone: 2,
      situation: "locataire",
      revenus_annuels: 20000,
      nb_personnes_foyer: 3,
      type_logement: "appartement",
    });

    expect(result.eligible).toBe(true);
    expect(result.montantEstimeMensuel).toBeGreaterThan(0);
  });

  it("locataire zone 3 petite ville — éligible", () => {
    const result = simulerAidesLogement({
      loyer_mensuel: 400,
      zone: 3,
      situation: "locataire",
      revenus_annuels: 12000,
      nb_personnes_foyer: 1,
      type_logement: "maison",
    });

    expect(result.eligible).toBe(true);
    expect(result.montantEstimeMensuel).toBeGreaterThan(0);
  });

  // --- Plafonds de loyer ---

  it("loyer plafonné au maximum de la zone", () => {
    const result = simulerAidesLogement({
      loyer_mensuel: 2000,
      zone: 1,
      situation: "locataire",
      revenus_annuels: 15000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    expect(result.loyerPrisEnCompte).toBeLessThanOrEqual(result.plafondLoyer);
    expect(result.loyerPrisEnCompte).toBeLessThan(2000);
  });

  it("loyer inférieur au plafond — pris en compte intégralement", () => {
    const result = simulerAidesLogement({
      loyer_mensuel: 200,
      zone: 3,
      situation: "locataire",
      revenus_annuels: 10000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    expect(result.loyerPrisEnCompte).toBe(200);
  });

  // --- Colocation ---

  it("colocataire — abattement sur le plafond de loyer", () => {
    const locataire = simulerAidesLogement({
      loyer_mensuel: 600,
      zone: 1,
      situation: "locataire",
      revenus_annuels: 15000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    const colocataire = simulerAidesLogement({
      loyer_mensuel: 600,
      zone: 1,
      situation: "colocataire",
      revenus_annuels: 15000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    // Le colocataire a un plafond plus bas donc potentiellement une aide moindre
    expect(colocataire.loyerPrisEnCompte).toBeLessThanOrEqual(locataire.loyerPrisEnCompte);
  });

  it("colocataire reçoit type ALS", () => {
    const result = simulerAidesLogement({
      loyer_mensuel: 500,
      zone: 2,
      situation: "colocataire",
      revenus_annuels: 12000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    expect(result.typeAide).toBe("ALS");
  });

  // --- Foyer / résidence ---

  it("foyer — type ALS", () => {
    const result = simulerAidesLogement({
      loyer_mensuel: 450,
      zone: 1,
      situation: "foyer",
      revenus_annuels: 8000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    expect(result.typeAide).toBe("ALS");
  });

  // --- Revenus élevés ---

  it("revenus élevés — aide très faible ou nulle", () => {
    const result = simulerAidesLogement({
      loyer_mensuel: 800,
      zone: 1,
      situation: "locataire",
      revenus_annuels: 80000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    // Avec 80k de revenus, l'aide devrait être nulle ou très faible
    expect(result.montantEstimeMensuel).toBeLessThanOrEqual(50);
  });

  // --- Simulation avec/sans aide ---

  it("simulation montre la différence avec et sans aide", () => {
    const result = simulerAidesLogement({
      loyer_mensuel: 600,
      zone: 2,
      situation: "locataire",
      revenus_annuels: 15000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    expect(result.simulation.loyerSansAide).toBe(600);
    if (result.eligible) {
      expect(result.simulation.loyerAvecAide).toBeLessThan(result.simulation.loyerSansAide);
      expect(result.simulation.economieAnnuelle).toBeGreaterThan(0);
    }
  });

  it("économie annuelle = montant × 12", () => {
    const result = simulerAidesLogement({
      loyer_mensuel: 500,
      zone: 3,
      situation: "locataire",
      revenus_annuels: 12000,
      nb_personnes_foyer: 2,
      type_logement: "appartement",
    });

    if (result.eligible) {
      expect(result.simulation.economieAnnuelle).toBeCloseTo(result.montantEstimeMensuel * 12, 0);
    }
  });

  // --- Zones ---

  it("zone 1 a des plafonds plus élevés que zone 3", () => {
    const z1 = simulerAidesLogement({
      loyer_mensuel: 800,
      zone: 1,
      situation: "locataire",
      revenus_annuels: 15000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    const z3 = simulerAidesLogement({
      loyer_mensuel: 800,
      zone: 3,
      situation: "locataire",
      revenus_annuels: 15000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    expect(z1.plafondLoyer).toBeGreaterThan(z3.plafondLoyer);
  });

  // --- Composition du foyer ---

  it("famille nombreuse (5 personnes) — plafond plus élevé", () => {
    const seul = simulerAidesLogement({
      loyer_mensuel: 800,
      zone: 2,
      situation: "locataire",
      revenus_annuels: 15000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    const famille = simulerAidesLogement({
      loyer_mensuel: 800,
      zone: 2,
      situation: "locataire",
      revenus_annuels: 15000,
      nb_personnes_foyer: 5,
      type_logement: "appartement",
    });

    expect(famille.plafondLoyer).toBeGreaterThan(seul.plafondLoyer);
  });

  it("nb personnes > 6 utilise le plafond de 6", () => {
    const result = simulerAidesLogement({
      loyer_mensuel: 600,
      zone: 2,
      situation: "locataire",
      revenus_annuels: 15000,
      nb_personnes_foyer: 8,
      type_logement: "appartement",
    });

    expect(result.plafondLoyer).toBeGreaterThan(0);
    expect(result.chargeForfaitaire).toBeGreaterThan(0);
  });

  // --- Loyer nul ou négatif ---

  it("loyer 0 — non éligible", () => {
    const result = simulerAidesLogement({
      loyer_mensuel: 0,
      zone: 1,
      situation: "locataire",
      revenus_annuels: 10000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    expect(result.eligible).toBe(false);
    expect(result.montantEstimeMensuel).toBe(0);
  });

  // --- Démarches et références ---

  it("contient les démarches CAF", () => {
    const result = simulerAidesLogement({
      loyer_mensuel: 500,
      zone: 2,
      situation: "locataire",
      revenus_annuels: 15000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    expect(result.demarches.length).toBeGreaterThan(3);
    expect(result.demarches.some((d) => d.includes("caf.fr"))).toBe(true);
  });

  it("contient les références légales", () => {
    const result = simulerAidesLogement({
      loyer_mensuel: 500,
      zone: 2,
      situation: "locataire",
      revenus_annuels: 15000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    expect(result.references.length).toBeGreaterThan(0);
    expect(result.references.some((r) => r.includes("sécurité sociale"))).toBe(true);
  });

  it("contient un avertissement", () => {
    const result = simulerAidesLogement({
      loyer_mensuel: 500,
      zone: 2,
      situation: "locataire",
      revenus_annuels: 15000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    expect(result.avertissement).toContain("indicative");
  });

  // --- Charge forfaitaire ---

  it("charge forfaitaire augmente avec le nombre de personnes", () => {
    const r1 = simulerAidesLogement({
      loyer_mensuel: 500,
      zone: 2,
      situation: "locataire",
      revenus_annuels: 15000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    const r4 = simulerAidesLogement({
      loyer_mensuel: 500,
      zone: 2,
      situation: "locataire",
      revenus_annuels: 15000,
      nb_personnes_foyer: 4,
      type_logement: "appartement",
    });

    expect(r4.chargeForfaitaire).toBeGreaterThan(r1.chargeForfaitaire);
  });

  // --- Participation personnelle ---

  it("participation personnelle augmente avec les revenus", () => {
    const pauvre = simulerAidesLogement({
      loyer_mensuel: 500,
      zone: 2,
      situation: "locataire",
      revenus_annuels: 10000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    const aise = simulerAidesLogement({
      loyer_mensuel: 500,
      zone: 2,
      situation: "locataire",
      revenus_annuels: 30000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    expect(aise.participationPersonnelle).toBeGreaterThan(pauvre.participationPersonnelle);
  });

  // --- Revenus très faibles ---

  it("revenus très faibles — aide maximale", () => {
    const result = simulerAidesLogement({
      loyer_mensuel: 400,
      zone: 3,
      situation: "locataire",
      revenus_annuels: 0,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    expect(result.eligible).toBe(true);
    expect(result.montantEstimeMensuel).toBeGreaterThan(100);
  });

  // --- Type maison vs appartement ---

  it("type logement n'affecte pas le calcul de base", () => {
    const appart = simulerAidesLogement({
      loyer_mensuel: 500,
      zone: 2,
      situation: "locataire",
      revenus_annuels: 15000,
      nb_personnes_foyer: 2,
      type_logement: "appartement",
    });

    const maison = simulerAidesLogement({
      loyer_mensuel: 500,
      zone: 2,
      situation: "locataire",
      revenus_annuels: 15000,
      nb_personnes_foyer: 2,
      type_logement: "maison",
    });

    expect(appart.montantEstimeMensuel).toBe(maison.montantEstimeMensuel);
  });

  // --- Conditions élevées revenus ---

  it("mentionne revenus élevés quand applicable", () => {
    const result = simulerAidesLogement({
      loyer_mensuel: 800,
      zone: 1,
      situation: "locataire",
      revenus_annuels: 70000,
      nb_personnes_foyer: 1,
      type_logement: "appartement",
    });

    expect(result.conditions.some((c) => c.includes("élevés"))).toBe(true);
  });

  // --- Couple zone 2 ---

  it("couple sans enfant zone 2 avec revenus moyens", () => {
    const result = simulerAidesLogement({
      loyer_mensuel: 700,
      zone: 2,
      situation: "locataire",
      revenus_annuels: 25000,
      nb_personnes_foyer: 2,
      type_logement: "appartement",
    });

    expect(result.plafondLoyer).toBeGreaterThan(0);
    expect(result.chargeForfaitaire).toBeGreaterThan(0);
    expect(typeof result.montantEstimeMensuel).toBe("number");
  });
});
