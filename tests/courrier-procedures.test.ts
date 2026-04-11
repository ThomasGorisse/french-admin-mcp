import { describe, it, expect } from "vitest";
import { redigerCourrier } from "../src/tools/rediger-courrier.js";
import { getProcedure, listProcedures } from "../src/data/procedures.js";
import { rechercherConvention, listConventions } from "../src/data/conventions.js";
import { simulerRetraite } from "../src/tools/simuler-retraite.js";

describe("redigerCourrier", () => {
  it("rédige une contestation", () => {
    const result = redigerCourrier({
      type: "contestation",
      expediteur: { nom: "Jean Dupont", adresse: "10 rue de la Gare, 75001 Paris" },
      destinataire: { nom: "Service des Impôts", adresse: "1 place de la Mairie, 75001 Paris" },
      objet: "Contestation avis d'imposition 2024",
      contexte: "J'ai reçu un avis d'imposition erroné ne tenant pas compte de mes frais réels.",
      demandeSpecifique: "je vous demande de rectifier mon avis d'imposition.",
      recommande: true,
    });

    expect(result.courrier).toContain("Jean Dupont");
    expect(result.courrier).toContain("Service des Impôts");
    expect(result.courrier).toContain("contester");
    expect(result.courrier).toContain("Lettre recommandée");
    expect(result.courrier).toContain("salutations distinguées");
    expect(result.conseilsEnvoi.length).toBeGreaterThan(0);
  });

  it("rédige une mise en demeure", () => {
    const result = redigerCourrier({
      type: "mise_en_demeure",
      expediteur: { nom: "Marie Martin", adresse: "5 allée des Roses, 75011 Paris" },
      destinataire: { nom: "SAS Travaux Express", adresse: "Zone Industrielle, 93100 Montreuil" },
      objet: "Mise en demeure — travaux non conformes",
      contexte: "Les travaux réalisés le 15 janvier ne sont pas conformes au devis signé.",
      demandeSpecifique: "reprendre les travaux sous 15 jours",
    });

    expect(result.courrier).toContain("mets en demeure");
    expect(result.courrier).toContain("procédure judiciaire");
  });

  it("rédige une résiliation", () => {
    const result = redigerCourrier({
      type: "resiliation",
      expediteur: { nom: "Pierre Durand", adresse: "3 rue du Port, 13001 Marseille" },
      destinataire: { nom: "Opérateur Télécom", adresse: "BP 1234, 75000 Paris" },
      objet: "Résiliation contrat n° 123456",
      contexte: "Conformément à la loi Chatel, je résilie mon abonnement.",
      demandeSpecifique: "procéder à la résiliation effective sous 10 jours",
    });

    expect(result.courrier).toContain("résilier");
  });
});

describe("getProcedure", () => {
  it("trouve la carte d'identité", () => {
    const proc = getProcedure("carte_identite");
    expect(proc).toBeDefined();
    expect(proc!.titre).toContain("identité");
    expect(proc!.etapes.length).toBeGreaterThan(3);
  });

  it("trouve le passeport", () => {
    const proc = getProcedure("passeport");
    expect(proc).toBeDefined();
    expect(proc!.cout).toContain("86");
  });

  it("recherche par mot-clé", () => {
    const proc = getProcedure("auto entrepreneur");
    expect(proc).toBeDefined();
  });

  it("retourne undefined pour une démarche inconnue", () => {
    const proc = getProcedure("xyz_inconnu_123");
    expect(proc).toBeUndefined();
  });

  it("liste les procédures", () => {
    const list = listProcedures();
    expect(list.length).toBeGreaterThanOrEqual(5);
  });
});

describe("rechercherConvention", () => {
  it("trouve Syntec par IDCC", () => {
    const conv = rechercherConvention("1486");
    expect(conv).toBeDefined();
    expect(conv!.titre).toContain("SYNTEC");
  });

  it("trouve par mot-clé", () => {
    const conv = rechercherConvention("transport");
    expect(conv).toBeDefined();
    expect(conv!.branche).toContain("Transport");
  });

  it("liste les conventions", () => {
    const list = listConventions();
    expect(list.length).toBeGreaterThanOrEqual(4);
  });
});

describe("simulerRetraite", () => {
  it("simule une retraite salarié", () => {
    const result = simulerRetraite({
      ageActuel: 40,
      salaireAnnuelBrutMoyen: 40_000,
      anneesCotisees: 15,
      statut: "salarie",
    });

    expect(result.ageLegalDepart).toBeGreaterThanOrEqual(62);
    expect(result.trimestresRequis).toBeGreaterThanOrEqual(168);
    expect(result.pensionBase.montantMensuelEstime).toBeGreaterThan(0);
    expect(result.pensionComplementaire.montantMensuelEstime).toBeGreaterThan(0);
    expect(result.totalMensuelEstime).toBeGreaterThan(0);
    expect(result.tauxRemplacement).toBeGreaterThan(0);
    expect(result.conseils.length).toBeGreaterThan(0);
  });

  it("auto-entrepreneur a peu de complémentaire", () => {
    const result = simulerRetraite({
      ageActuel: 35,
      salaireAnnuelBrutMoyen: 30_000,
      anneesCotisees: 10,
      statut: "auto_entrepreneur",
    });

    expect(result.pensionComplementaire.montantMensuelEstime).toBe(0);
    expect(result.pensionComplementaire.details).toContain("PER");
  });
});
