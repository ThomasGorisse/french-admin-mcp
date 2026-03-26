#!/usr/bin/env node

/**
 * french-admin-mcp — Serveur MCP pour l'administration française.
 *
 * Outils : impôts, charges auto-entrepreneur, factures, URSSAF,
 * aides CAF, démarches administratives, courriers, conventions collectives, retraite.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { simulerImpots } from "./tools/simuler-impots.js";
import { calculerChargesAE } from "./tools/calculer-charges-ae.js";
import { genererFacture } from "./tools/generer-facture.js";
import { preparerDeclarationUrssaf } from "./tools/declaration-urssaf.js";
import { estimerAidesCAF } from "./tools/aide-caf.js";
import { getProcedure, listProcedures } from "./data/procedures.js";
import { redigerCourrier } from "./tools/rediger-courrier.js";
import { rechercherConvention, listConventions } from "./data/conventions.js";
import { simulerRetraite } from "./tools/simuler-retraite.js";
import { simulerChomage } from "./tools/simuler-chomage.js";
import { calculerIndemnitesLicenciement } from "./tools/calculer-indemnites-licenciement.js";
import { verifierDroitsFormation } from "./tools/verifier-droits-formation.js";

const server = new McpServer({
  name: "french-admin-mcp",
  version: "2.1.0",
});

// ---------------------------------------------------------------------------
// Avertissement juridique
// ---------------------------------------------------------------------------

const DISCLAIMER = '\n\n---\n*Estimation indicative uniquement. Ne constitue pas un conseil fiscal ou juridique. Consultez un expert-comptable ou un avocat. Voir [TERMS.md](https://github.com/thomasgorisse/french-admin-mcp/blob/main/TERMS.md).*';

function addDisclaimer(text: string): string {
  return text + DISCLAIMER;
}

// ─── simuler_impots ───────────────────────────────────────────────────
server.tool(
  "simuler_impots",
  "Simule l'impôt sur le revenu français selon le barème 2025/2026. Prend en compte la situation familiale, le quotient familial, l'abattement selon le type de revenu, et la décote.",
  {
    revenuBrutAnnuel: z.number().describe("Revenu brut annuel en euros"),
    typeRevenu: z
      .enum(["salaire", "bnc", "bic_services", "bic_commerce", "foncier", "autre"])
      .describe("Type de revenu (salaire, BNC profession libérale, BIC services, BIC commerce, foncier micro-foncier, autre)"),
    situationFamiliale: z
      .enum(["celibataire", "marie", "pacse", "divorce", "veuf"])
      .describe("Situation familiale"),
    enfants: z.number().optional().describe("Nombre d'enfants à charge"),
    enfantsEnGardeAlternee: z.number().optional().describe("Nombre d'enfants en garde alternée"),
    chargesDeductibles: z.number().optional().describe("Charges déductibles annuelles (pension alimentaire, PER, etc.)"),
    anneeRevenus: z.number().optional().describe("Année des revenus (2024 ou 2025, défaut=2024)"),
  },
  async (args) => {
    try {
      const result = simulerImpots(args);
      return {
        content: [
          {
            type: "text" as const,
            text: addDisclaimer(JSON.stringify(result, null, 2)),
          },
        ],
      };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Erreur : ${e.message}` }], isError: true };
    }
  }
);

// ─── calculer_charges_ae ──────────────────────────────────────────────
server.tool(
  "calculer_charges_ae",
  "Calcule les charges sociales (URSSAF) d'un auto-entrepreneur / micro-entrepreneur. Inclut cotisations sociales, CFP, versement libératoire optionnel, et ACRE.",
  {
    chiffreAffaires: z.number().describe("Chiffre d'affaires de la période en euros"),
    typeActivite: z
      .enum(["services_bic", "services_bnc", "commerce", "liberal_cipav"])
      .describe("Type d'activité : services_bic (artisan, services commerciaux), services_bnc (libéral, conseil, dev), commerce (achat-revente), liberal_cipav (CIPAV)"),
    periode: z
      .enum(["mensuel", "trimestriel", "annuel"])
      .describe("Période du CA déclaré"),
    versementLiberatoire: z.boolean().optional().describe("Option pour le versement libératoire de l'IR"),
    acre: z.boolean().optional().describe("Bénéficie de l'ACRE (réduction 50% la 1ère année)"),
  },
  async (args) => {
    try {
      const result = calculerChargesAE(args);
      return { content: [{ type: "text" as const, text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Erreur : ${e.message}` }], isError: true };
    }
  }
);

// ─── generer_facture ──────────────────────────────────────────────────
server.tool(
  "generer_facture",
  "Génère une facture conforme au droit français avec toutes les mentions légales obligatoires. Idéal pour les auto-entrepreneurs et TPE.",
  {
    nomEmetteur: z.string().describe("Nom ou raison sociale de l'émetteur"),
    siret: z.string().describe("Numéro SIRET de l'émetteur (14 chiffres)"),
    adresseEmetteur: z.string().describe("Adresse complète de l'émetteur"),
    emailEmetteur: z.string().optional().describe("Email de l'émetteur"),
    telephoneEmetteur: z.string().optional().describe("Téléphone de l'émetteur"),
    nomClient: z.string().describe("Nom ou raison sociale du client"),
    adresseClient: z.string().describe("Adresse complète du client"),
    siretClient: z.string().optional().describe("SIRET du client (si professionnel)"),
    numeroFacture: z.string().describe("Numéro de facture (ex: F-2025-001)"),
    dateFacture: z.string().optional().describe("Date de facturation (ISO, défaut=aujourd'hui)"),
    dateEcheance: z.string().optional().describe("Date d'échéance (ISO, défaut=+30 jours)"),
    lignes: z
      .array(
        z.object({
          description: z.string().describe("Description de la prestation/produit"),
          quantite: z.number().describe("Quantité"),
          prixUnitaireHT: z.number().describe("Prix unitaire HT en euros"),
          tauxTVA: z.number().optional().describe("Taux de TVA (0.20 pour 20%, 0 si franchise en base)"),
        })
      )
      .describe("Lignes de la facture"),
    franchiseEnBaseTVA: z.boolean().optional().describe("true si franchise en base de TVA (auto-entrepreneur sous seuil)"),
    conditionsPaiement: z.string().optional().describe("Conditions de paiement personnalisées"),
    mentionsParticulieres: z.array(z.string()).optional().describe("Mentions particulières à ajouter"),
  },
  async (args) => {
    try {
      const result = genererFacture(args);
      return { content: [{ type: "text" as const, text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Erreur : ${e.message}` }], isError: true };
    }
  }
);

// ─── declaration_urssaf ───────────────────────────────────────────────
server.tool(
  "declaration_urssaf",
  "Prépare la déclaration trimestrielle URSSAF d'un auto-entrepreneur. Calcule les cotisations et fournit les étapes à suivre sur autoentrepreneur.urssaf.fr.",
  {
    typeActivite: z
      .enum(["services_bic", "services_bnc", "commerce", "liberal_cipav"])
      .describe("Type d'activité"),
    trimestre: z.number().min(1).max(4).describe("Numéro du trimestre (1 à 4)"),
    annee: z.number().describe("Année de la déclaration"),
    chiffreAffairesMois1: z.number().describe("CA du 1er mois du trimestre"),
    chiffreAffairesMois2: z.number().describe("CA du 2ème mois du trimestre"),
    chiffreAffairesMois3: z.number().describe("CA du 3ème mois du trimestre"),
    versementLiberatoire: z.boolean().optional().describe("Versement libératoire de l'IR"),
    acre: z.boolean().optional().describe("Bénéficie de l'ACRE"),
  },
  async (args) => {
    try {
      const result = preparerDeclarationUrssaf({
        ...args,
        trimestre: args.trimestre as 1 | 2 | 3 | 4,
      });
      return { content: [{ type: "text" as const, text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Erreur : ${e.message}` }], isError: true };
    }
  }
);

// ─── aide_caf ─────────────────────────────────────────────────────────
server.tool(
  "aide_caf",
  "Estime les aides de la CAF : prime d'activité, allocations familiales, APL. Fournit les démarches à effectuer.",
  {
    situationFamiliale: z.enum(["seul", "couple"]).describe("Situation familiale"),
    enfants: z.number().describe("Nombre d'enfants à charge"),
    enfantsDePlus14Ans: z.number().optional().describe("Nombre d'enfants de plus de 14 ans"),
    revenusMensuelsActivite: z.number().describe("Revenus mensuels d'activité nets en euros"),
    autresRevenus: z.number().optional().describe("Autres revenus mensuels (allocations, pensions, etc.)"),
    revenusFiscauxAnnuels: z.number().optional().describe("Revenus fiscaux annuels du foyer (RFR)"),
    loyer: z.number().optional().describe("Loyer mensuel en euros (pour estimation APL)"),
    zoneAPL: z.enum(["zone_1", "zone_2", "zone_3"]).optional().describe("Zone APL : zone_1 (Paris), zone_2 (grandes villes), zone_3 (reste)"),
  },
  async (args) => {
    try {
      const result = estimerAidesCAF(args);
      return { content: [{ type: "text" as const, text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Erreur : ${e.message}` }], isError: true };
    }
  }
);

// ─── demarche_admin ───────────────────────────────────────────────────
server.tool(
  "demarche_admin",
  "Guide étape par étape pour les démarches administratives françaises courantes : carte d'identité, passeport, permis de conduire, déclaration d'impôts, création auto-entrepreneur, carte grise.",
  {
    demarche: z
      .string()
      .describe(
        "Nom de la démarche : carte_identite, passeport, permis_conduire, declaration_impots, creation_auto_entrepreneur, carte_grise. Ou un mot-clé pour rechercher."
      ),
  },
  async (args) => {
    const procedure = getProcedure(args.demarche);
    if (!procedure) {
      const available = listProcedures();
      return {
        content: [
          {
            type: "text" as const,
            text: `Démarche "${args.demarche}" non trouvée.\n\nDémarches disponibles :\n${available.map((p) => `- ${p}`).join("\n")}`,
          },
        ],
      };
    }
    return { content: [{ type: "text" as const, text: addDisclaimer(JSON.stringify(procedure, null, 2)) }] };
  }
);

// ─── rediger_courrier ─────────────────────────────────────────────────
server.tool(
  "rediger_courrier",
  "Rédige un courrier administratif formel en français : contestation, résiliation, réclamation, mise en demeure, demande, signalement.",
  {
    type: z
      .enum(["contestation", "resiliation", "reclamation", "demande", "mise_en_demeure", "signalement", "autre"])
      .describe("Type de courrier"),
    expediteurNom: z.string().describe("Nom de l'expéditeur"),
    expediteurAdresse: z.string().describe("Adresse de l'expéditeur"),
    expediteurTelephone: z.string().optional().describe("Téléphone de l'expéditeur"),
    expediteurEmail: z.string().optional().describe("Email de l'expéditeur"),
    destinataireNom: z.string().describe("Nom du destinataire"),
    destinataireAdresse: z.string().describe("Adresse du destinataire"),
    destinataireService: z.string().optional().describe("Service du destinataire"),
    objet: z.string().describe("Objet du courrier"),
    contexte: z.string().describe("Contexte / exposé des faits"),
    demandeSpecifique: z.string().describe("Ce que vous demandez précisément"),
    piecesJointes: z.array(z.string()).optional().describe("Liste des pièces jointes"),
    recommande: z.boolean().optional().describe("Envoi en recommandé avec AR"),
  },
  async (args) => {
    try {
      const result = redigerCourrier({
        type: args.type,
        expediteur: {
          nom: args.expediteurNom,
          adresse: args.expediteurAdresse,
          telephone: args.expediteurTelephone,
          email: args.expediteurEmail,
        },
        destinataire: {
          nom: args.destinataireNom,
          adresse: args.destinataireAdresse,
          service: args.destinataireService,
        },
        objet: args.objet,
        contexte: args.contexte,
        demandeSpecifique: args.demandeSpecifique,
        pieces_jointes: args.piecesJointes,
        recommande: args.recommande,
      });
      return { content: [{ type: "text" as const, text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Erreur : ${e.message}` }], isError: true };
    }
  }
);

// ─── verifier_convention_collective ───────────────────────────────────
server.tool(
  "verifier_convention_collective",
  "Vérifie les droits sous une convention collective française : préavis, période d'essai, congés spéciaux, indemnités. Couvre les CC les plus courantes (Syntec, Métallurgie, Commerce, Transport, Particulier employeur).",
  {
    recherche: z
      .string()
      .describe("IDCC (ex: 1486 pour Syntec) ou mot-clé (ex: 'informatique', 'transport', 'commerce')"),
  },
  async (args) => {
    const convention = rechercherConvention(args.recherche);
    if (!convention) {
      const available = listConventions();
      return {
        content: [
          {
            type: "text" as const,
            text:
              `Convention "${args.recherche}" non trouvée.\n\n` +
              `Conventions disponibles :\n${available.map((c) => `- ${c}`).join("\n")}\n\n` +
              `Pour trouver votre convention collective, consultez votre bulletin de paie ou legifrance.gouv.fr.`,
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text" as const,
          text: addDisclaimer(
            JSON.stringify(convention, null, 2) +
            "\n\n⚠️ Informations indicatives. Vérifiez toujours sur legifrance.gouv.fr pour les textes en vigueur."
          ),
        },
      ],
    };
  }
);

// ─── simuler_retraite ─────────────────────────────────────────────────
server.tool(
  "simuler_retraite",
  "Simulation simplifiée de la retraite : pension de base (CNAV), complémentaire (Agirc-Arrco), taux de remplacement. Prend en compte la réforme 2023.",
  {
    ageActuel: z.number().min(18).max(66).describe("Âge actuel"),
    salaireAnnuelBrutMoyen: z.number().describe("Salaire annuel brut moyen de carrière en euros"),
    anneesCotisees: z.number().describe("Nombre d'années déjà cotisées"),
    anneesRestantesEstimees: z.number().optional().describe("Nombre d'années de cotisation restantes estimées"),
    statut: z
      .enum(["salarie", "fonctionnaire", "independant", "auto_entrepreneur"])
      .describe("Statut professionnel"),
  },
  async (args) => {
    try {
      const result = simulerRetraite(args);
      return { content: [{ type: "text" as const, text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Erreur : ${e.message}` }], isError: true };
    }
  }
);

// ─── simuler_chomage ─────────────────────────────────────────────────
server.tool(
  "simuler_chomage",
  "Estime l'allocation chômage (ARE — Aide au Retour à l'Emploi). Calcule le montant journalier/mensuel, la durée d'indemnisation et les démarches France Travail. Barème 2026.",
  {
    salaireBrutMensuelMoyen: z.number().describe("Salaire brut mensuel moyen des 24 derniers mois"),
    moisTravailles: z.number().min(0).describe("Nombre de mois travaillés sur les 24 derniers mois (minimum 6 pour être éligible)"),
    age: z.number().min(16).max(67).describe("Âge au moment de la fin de contrat"),
    motifRupture: z
      .enum(["licenciement", "rupture_conventionnelle", "fin_cdd", "demission_legitime"])
      .describe("Motif de la rupture du contrat"),
  },
  async (args) => {
    try {
      const result = simulerChomage(args);
      return { content: [{ type: "text" as const, text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Erreur : ${e.message}` }], isError: true };
    }
  }
);

// ─── calculer_indemnites_licenciement ────────────────────────────────
server.tool(
  "calculer_indemnites_licenciement",
  "Calcule l'indemnité légale de licenciement selon le Code du travail. Prend en compte l'ancienneté, le salaire de référence, et le motif. Inclut le régime fiscal.",
  {
    salaireBrutMensuel: z.number().describe("Salaire brut mensuel moyen des 12 derniers mois"),
    salaireBrutMensuelAvecPrimes: z.number().optional().describe("Salaire brut mensuel moyen des 3 derniers mois (primes incluses au prorata)"),
    ancienneteAnnees: z.number().min(0).describe("Années complètes d'ancienneté"),
    ancienneteMois: z.number().min(0).max(11).optional().describe("Mois supplémentaires d'ancienneté (0-11)"),
    motif: z
      .enum(["licenciement_personnel", "licenciement_economique", "inaptitude_professionnelle", "inaptitude_non_professionnelle", "rupture_conventionnelle"])
      .describe("Motif de la rupture"),
  },
  async (args) => {
    try {
      const result = calculerIndemnitesLicenciement(args);
      return { content: [{ type: "text" as const, text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Erreur : ${e.message}` }], isError: true };
    }
  }
);

// ─── verifier_droits_formation ───────────────────────────────────────
server.tool(
  "verifier_droits_formation",
  "Vérifie les droits au CPF (Compte Personnel de Formation). Estime le solde, les plafonds d'utilisation (2026), le reste à charge obligatoire (103,20 €), et les abondements possibles.",
  {
    anneesTravaillees: z.number().min(0).describe("Nombre d'années travaillées au total"),
    tempsPlein: z.boolean().describe("Travail à temps plein (true) ou partiel (false)"),
    quotiteTempsPartiel: z.number().min(0).max(1).optional().describe("Quotité temps partiel (ex: 0.8 pour 80%). Ignoré si temps plein."),
    niveauQualification: z
      .enum(["bac_plus", "bac_ou_moins", "sans_diplome"])
      .describe("Niveau de qualification : bac_plus, bac_ou_moins, sans_diplome"),
    travailleurHandicape: z.boolean().optional().describe("Reconnaissance travailleur handicapé (RQTH)"),
    montantCPFConnu: z.number().optional().describe("Montant CPF déjà connu (consultable sur moncompteformation.gouv.fr)"),
    typeFormationEnvisagee: z
      .enum(["diplome", "certification", "bilan_competences", "permis_conduire", "vae", "creation_entreprise", "autre"])
      .optional()
      .describe("Type de formation envisagée (pour vérifier les plafonds)"),
    coutFormation: z.number().optional().describe("Coût de la formation envisagée en euros"),
  },
  async (args) => {
    try {
      const result = verifierDroitsFormation(args);
      return { content: [{ type: "text" as const, text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Erreur : ${e.message}` }], isError: true };
    }
  }
);

// ─── verifier_eligibilite_rsa ────────────────────────────────────────
server.tool(
  "verifier_eligibilite_rsa",
  "Vérifie l'éligibilité au RSA (Revenu de Solidarité Active) selon les critères 2026. Calcule le montant estimé en fonction de la composition du foyer, des ressources et de la situation. Inclut les montants forfaitaires à jour, le calcul des droits, et les démarches CAF/MSA.",
  {
    age: z.number().min(18).max(67).describe("Âge du demandeur"),
    situationFamiliale: z
      .enum(["seul", "couple"])
      .describe("Seul(e) ou en couple"),
    enfants: z.number().min(0).describe("Nombre d'enfants à charge"),
    enceinte: z.boolean().optional().describe("Femme enceinte (majoration isolement)"),
    parentIsole: z.boolean().optional().describe("Parent isolé (majoration)"),
    ressourcesMensuelles: z.number().min(0).describe("Total des ressources mensuelles du foyer en euros (salaires, allocations, pensions, revenus du patrimoine)"),
    allocationLogement: z.boolean().optional().describe("Perçoit une allocation logement (APL, ALS, ALF) ou hébergé gratuitement"),
    nationalite: z
      .enum(["francais", "ue", "hors_ue_titre_sejour", "hors_ue_sans_titre"])
      .optional()
      .describe("Nationalité / situation administrative (défaut : français)"),
    activite: z
      .enum(["sans_activite", "activite_faible", "etudiant", "stagiaire"])
      .optional()
      .describe("Situation d'activité"),
  },
  async (args) => {
    try {
      const result = verifierEligibiliteRSA(args);
      return { content: [{ type: "text" as const, text: addDisclaimer(JSON.stringify(result, null, 2)) }] };
    } catch (e: any) {
      return { content: [{ type: "text" as const, text: `Erreur : ${e.message}` }], isError: true };
    }
  }
);

/**
 * RSA eligibility calculation — barèmes 2026 (montants revalorisés avril 2025).
 */
function verifierEligibiliteRSA(args: {
  age: number;
  situationFamiliale: "seul" | "couple";
  enfants: number;
  enceinte?: boolean;
  parentIsole?: boolean;
  ressourcesMensuelles: number;
  allocationLogement?: boolean;
  nationalite?: string;
  activite?: string;
}) {
  // Montant forfaitaire RSA 2026 (base personne seule, revalorisé avril 2025)
  const BASE_RSA = 635.71; // montant mensuel personne seule sans enfant

  // Calcul du nombre de parts
  let parts = args.situationFamiliale === "couple" ? 2 : 1;
  if (args.enfants >= 1) parts += 0.5;
  if (args.enfants >= 2) parts += 0.5;
  if (args.enfants >= 3) parts += args.enfants - 2; // 1 part par enfant supplémentaire à partir du 3ème

  // Montant forfaitaire selon la composition
  let montantForfaitaire: number;
  if (args.situationFamiliale === "seul") {
    if (args.enfants === 0) montantForfaitaire = BASE_RSA;
    else if (args.enfants === 1) montantForfaitaire = BASE_RSA * 1.5;
    else if (args.enfants === 2) montantForfaitaire = BASE_RSA * 1.83;
    else montantForfaitaire = BASE_RSA * (1.83 + (args.enfants - 2) * 0.35);
  } else {
    if (args.enfants === 0) montantForfaitaire = BASE_RSA * 1.5;
    else if (args.enfants === 1) montantForfaitaire = BASE_RSA * 1.83;
    else if (args.enfants === 2) montantForfaitaire = BASE_RSA * 2.14;
    else montantForfaitaire = BASE_RSA * (2.14 + (args.enfants - 2) * 0.35);
  }

  // Majoration parent isolé
  if (args.parentIsole) {
    const majorationIsolement = BASE_RSA * 0.5072; // ~128,412 €/mois base
    const majorationEnfant = BASE_RSA * 0.2534 * args.enfants;
    montantForfaitaire = BASE_RSA + majorationIsolement + majorationEnfant;
    if (args.enceinte) {
      montantForfaitaire += BASE_RSA * 0.2534; // majoration grossesse
    }
  }

  // Forfait logement (déduit si allocation logement ou hébergement gratuit)
  let forfaitLogement = 0;
  if (args.allocationLogement) {
    if (parts <= 1) forfaitLogement = BASE_RSA * 0.12;
    else if (parts <= 2) forfaitLogement = BASE_RSA * 0.16;
    else forfaitLogement = BASE_RSA * 0.166;
  }

  // Montant RSA = forfaitaire - ressources - forfait logement
  const montantRSA = Math.max(0, Math.round((montantForfaitaire - args.ressourcesMensuelles - forfaitLogement) * 100) / 100);

  // Conditions d'éligibilité
  const conditions: string[] = [];
  let eligible = true;

  // Âge
  if (args.age < 25 && args.enfants === 0 && !args.enceinte) {
    conditions.push("Le RSA est réservé aux 25 ans et plus (sauf parent isolé, femme enceinte, ou RSA Jeune sous conditions)");
    eligible = false;
  }

  // Nationalité
  const nat = args.nationalite || "francais";
  if (nat === "hors_ue_sans_titre") {
    conditions.push("Un titre de séjour en cours de validité est requis pour les ressortissants hors UE");
    eligible = false;
  }
  if (nat === "ue") {
    conditions.push("Ressortissant UE : droit de séjour requis (>3 mois de résidence ou activité professionnelle)");
  }

  // Activité
  if (args.activite === "etudiant") {
    conditions.push("Les étudiants ne sont généralement pas éligibles au RSA, sauf si parent isolé ou en interruption d'études");
    eligible = false;
  }

  // Montant trop faible
  if (montantRSA < 6) {
    conditions.push("Montant RSA inférieur au seuil de versement (6 €)");
    eligible = false;
  }

  // Ressources trop élevées
  if (args.ressourcesMensuelles >= montantForfaitaire) {
    conditions.push("Ressources supérieures ou égales au montant forfaitaire");
    eligible = false;
  }

  const demarches = [
    "1. Faire une simulation sur caf.fr ou msa.fr",
    "2. Constituer le dossier : pièce d'identité, justificatif de domicile, relevé bancaire (3 derniers mois), avis d'imposition",
    "3. Déposer la demande en ligne sur caf.fr (Mon Compte > Mes démarches > RSA) ou auprès de votre CAF/MSA",
    "4. Un rendez-vous d'orientation sera proposé dans les 2 mois suivant l'ouverture des droits",
    "5. Le RSA est soumis à des droits et devoirs : recherche d'emploi, accompagnement social ou professionnel",
  ];

  return {
    eligible,
    montantForfaitaire: Math.round(montantForfaitaire * 100) / 100,
    forfaitLogement: Math.round(forfaitLogement * 100) / 100,
    ressourcesDeclarees: args.ressourcesMensuelles,
    montantRSAEstime: eligible ? montantRSA : 0,
    composition: {
      situation: args.situationFamiliale,
      enfants: args.enfants,
      parts,
      parentIsole: args.parentIsole || false,
      enceinte: args.enceinte || false,
    },
    conditions: conditions.length > 0 ? conditions : ["Toutes les conditions sont remplies"],
    demarches,
    references: [
      "Barème RSA 2026 (revalorisé avril 2025)",
      "Articles L262-1 et suivants du Code de l'action sociale et des familles",
      "caf.fr — Simulateur RSA",
      "service-public.fr — Revenu de solidarité active (RSA)",
    ],
  };
}

// ─── Start server ─────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("french-admin-mcp server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
