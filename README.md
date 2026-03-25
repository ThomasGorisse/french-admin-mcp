# french-admin-mcp

> **Avertissement :** Estimation indicative uniquement. Ne constitue pas un conseil fiscal ou juridique. Consultez un expert-comptable ou un avocat. Tous les résultats (simulations d'impôts, charges, aides, factures, courriers) doivent être vérifiés indépendamment. Voir [TERMS.md](./TERMS.md) et [PRIVACY.md](./PRIVACY.md).

Serveur MCP (Model Context Protocol) pour **l'administration francaise**.
Aide les citoyens et entreprises a naviguer la bureaucratie francaise avec l'IA.

> Impots, URSSAF, CAF, factures, courriers administratifs, conventions collectives, retraite.

## Installation

```bash
npm install -g french-admin-mcp
```

Ou dans votre configuration Claude Desktop / MCP :

```json
{
  "mcpServers": {
    "french-admin": {
      "command": "npx",
      "args": ["-y", "french-admin-mcp"]
    }
  }
}
```

## Outils disponibles

### `simuler_impots`
Simule l'impot sur le revenu (bareme 2025/2026). Prend en compte la situation familiale, le quotient familial, les abattements par type de revenu, et la decote.

**Parametres** : revenu brut annuel, type de revenu (salaire, BNC, BIC, foncier), situation familiale, nombre d'enfants, charges deductibles.

### `calculer_charges_ae`
Calcule les charges sociales URSSAF d'un auto-entrepreneur / micro-entrepreneur.

**Parametres** : chiffre d'affaires, type d'activite (services BIC/BNC, commerce, liberal CIPAV), periode, option versement liberatoire, ACRE.

### `generer_facture`
Genere une facture conforme au droit francais avec toutes les mentions legales obligatoires (art. L441-9 du Code de commerce).

**Parametres** : emetteur (nom, SIRET, adresse), client, lignes de facturation, franchise en base TVA.

### `declaration_urssaf`
Prepare la declaration trimestrielle URSSAF. Calcule les cotisations et fournit les etapes a suivre.

**Parametres** : type d'activite, trimestre, annee, CA par mois.

### `aide_caf`
Estime les aides de la CAF : prime d'activite, allocations familiales, APL.

**Parametres** : situation familiale, enfants, revenus, loyer, zone APL.

### `demarche_admin`
Guide etape par etape pour les demarches administratives : carte d'identite, passeport, permis de conduire, declaration d'impots, creation auto-entrepreneur, carte grise.

### `rediger_courrier`
Redige un courrier administratif formel : contestation, resiliation, reclamation, mise en demeure, demande, signalement.

### `verifier_convention_collective`
Verifie les droits sous une convention collective : preavis, periode d'essai, conges speciaux, indemnites. Couvre Syntec (1486), Metallurgie (3248), Commerce (2609), Transport (0016), Particulier employeur (3239).

### `simuler_retraite`
Simulation simplifiee de la retraite : pension de base (CNAV), complementaire (Agirc-Arrco), taux de remplacement. Prend en compte la reforme 2023.

## Exemples d'utilisation

### Avec Claude
```
"Combien d'impots je vais payer si je gagne 45000 euros en salaire, marie avec 2 enfants ?"

"Calcule mes charges auto-entrepreneur pour 5000 euros de CA en prestations BNC"

"Genere une facture pour une prestation de developpement a 3000 euros"

"Quelles sont les etapes pour renouveler mon passeport ?"

"Redige un courrier de contestation pour un PV de stationnement"

"Quels sont mes droits sous la convention Syntec ?"
```

## Tarifs

| Plan | Prix | Requetes |
|------|------|----------|
| Gratuit | 0 EUR | 20/mois |
| Premium | 9,99 EUR/mois | Illimite |
| Pro (comptables) | 29,99 EUR/mois | Illimite + API |

## Donnees et precision

- Baremes fiscaux 2025/2026
- Taux URSSAF 2025
- Seuils CAF 2025
- Reforme retraites 2023

**Avertissement** : Les calculs sont indicatifs et ne constituent pas un avis fiscal, juridique ou comptable. Pour les montants exacts, consultez les sites officiels (impots.gouv.fr, urssaf.fr, caf.fr) ou un professionnel.

## Developpement

```bash
git clone https://github.com/thomasgorisse/french-admin-mcp.git
cd french-admin-mcp
npm install
npm run build
npm test
```

## Licence

MIT

## Auteur

SceneView Tools
