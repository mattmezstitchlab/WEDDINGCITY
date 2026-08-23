# WEDDING CITY — DIAGNOSTIC DE FIN DE CONSOLIDATION

**Date :** 23 août 2026 · **Branche :** `arena/01a02c94-weddingcity`
**Phase :** noyau stable, observable et honnête — **avant toute intégration externe**

---

## 1. AVANT / APRÈS

| Indicateur | Avant (audit initial) | Après consolidation |
|---|---|---|
| **Démarrage `vite dev`** | 🔴 crash TDZ `BRAND_ACCENT` | 🟢 démarre |
| **Build production** | 🟠 fonctionne par accident (inlining du minifieur) | 🟢 robuste, cycle éliminé |
| **Cycles d'import** | 1 destructeur | 0 sur 21 modules |
| **Pertes de données au reload** | 3 (`phases`, `adSlots`, `userDmcIdentity`) | 0 |
| **Schéma de persistance** | écrit à la main en 4 endroits divergents | 1 table, vérifiée à la compilation |
| **`catch {}` muets** | 26 | 0 hors gardes du reporteur (4, documentées) |
| **Error Boundary** | aucun | racine + périmètre 3D dédié |
| **Références orphelines** | 12 (démo) + 6 (World Engine) | 0 / 652 vérifiées |
| **Boutons morts** | « Reconstruire », WASD, Join, lien d'invitation | 0 |
| **Modules du Nerve sondés** | 0 / 22 (statuts écrits en dur) | **22 / 22** |
| **« OK » codés en dur** | 20 | 2 (mesurés) |
| **Tests automatisés** | 0 | **140** sur 6 suites |
| **CI / vérification** | aucune | `pnpm verify` bloque le build |
| **JS au chargement initial** | 1 372 ko (monolithe) | **1 176 ko** (−14 %) + 204 ko différés |

---

## 2. ÉTAT RÉEL DES 23 SONDES

Mesuré, jamais déclaré. `verifiedRatio = 0,26` — volontairement bas et honnête.

### 🟢 VERIFIED (6) — exécuté et observé, avec preuves

`PERSISTENCE` · `DATA_INTEGRITY` · `DOCUMENTS` · `DMC_ID` · `TIMELINE` · `STORAGE_QUOTA` · `RUNTIME_ERRORS`

Exemples de preuves collectées : round-trip localStorage réel, 652 références croisées résolues, 13 champs persistés couverts, phases continues sans trou horaire.

### 🟠 PARTIAL (9) — réellement implémenté mais incomplet

| Module | Limite mesurée |
|---|---|
| `PLAYLIST` | `hasVoted` est un booléen **par morceau**, pas par votant |
| `MISSIONS` | aucune dépendance entre tâches → un retard ne se propage pas |
| `PEOPLE` | aucune entité `Guest` : les invités sont des agents |
| `AVATAR` | identité liée **par rôle**, pas par identifiant |
| `ADVERTISING` | ni inventaire, ni paiement, ni mesure d'impression |
| `OCR` | `.txt/.csv/.json` seulement ; PDF/images jamais analysés |
| `INVITATIONS` | résolution locale opérationnelle, inter-appareils impossible |
| `WORLD_ENGINE` | 11 archétypes cohérents, mais la description n'est pas interprétée |
| `AUDIO` | disponible, mais suspendu avant le premier geste utilisateur |

### 🟡 MOCK (3) — auto-déclaré par les moteurs eux-mêmes

`CONNECTORS` · `WEB_RESEARCH` · `GEOGRAPHY`

**Mécanisme anti-mensonge :** chaque moteur déclare ses capacités (`network: false`), et un test compare la déclaration au code source. Impossible d'annoncer `network: true` sans un `fetch` réel.

### ⚪ NOT_IMPLEMENTED (3)

`AUTH` (aucun mot de passe ni session) · `PERMISSIONS` (rôle purement visuel) · `NARRATION` (`speechSynthesis` jamais appelé)

### ⚫ UNKNOWN (2)

`RENDER_3D` et `AUDIO` en contexte headless — **non mesurables sans navigateur**. Dans le navigateur, ces sondes mesurent réellement (contexte WebGL, renderer, taille de texture max).

> Aucun `UNKNOWN` n'a été converti en `OK` pour améliorer le score.

---

## 3. CE QUI A ÉTÉ CONSTRUIT

**Sondes de santé** — contrat complet : `status · lastCheck · dependencies · errors · warnings · evidence · repairable · repairAction`. Défaut honnête `UNKNOWN` ; un module sans sonde est **forcé** à `UNKNOWN`.

**Réparation vérifiée** — `RepairOutcome` sépare `executed` de `verified`. Le verdict vient d'une **re-mesure après l'action**. Prouvé par test : réparer un module sain renvoie `verified: false` avec le message « le module n'était pas en défaut ».

**Graphe nerveux** — 83 nœuds, 383 arêtes, construits depuis les données réelles. Une panne sur un document se propage sur 4 niveaux et 31 éléments, le long de la chaîne exacte `DOCUMENT → PRESTATAIRE → TÂCHE → TIMELINE → LIEU → PERSONNES`. Les identifiants morts ne produisent aucune arête fantôme.

---

## 4. NOUVEAUX PROBLÈMES DÉCOUVERTS

1. **Le mariage de démo avait 12 références mortes** vers 6 entités inexistantes. Détecté par la sonde d'intégrité, absent de l'audit initial. Corrigé — le graphe neuronal du projet par défaut fonctionne pour la première fois.
2. **Copies superficielles contaminantes** — `[...INITIAL_X]` partageait les objets ; revendiquer une campagne mutait la constante « pristine » et polluait les autres projets.
3. **`vercel.json` ne définit aucune commande de build** — le déploiement n'exécute donc pas `pnpm verify`. À traiter avant toute mise en ligne.
4. **`vendor-three` pèse 995 ko** et reste le vrai plafond de performance. Le découpage l'a isolé mais pas réduit.
5. **`tick()` appelle toujours `notify()` à ~60 Hz** — coût réel non encore mesuré, candidat P2.3.

---

## 5. LIMITES DE CETTE VÉRIFICATION

- **Aucun navigateur headless disponible** : les 140 tests couvrent le graphe de modules, la logique métier, la persistance, les sondes et le graphe nerveux — **pas le rendu visuel**. Les nouveaux panneaux (détail module, graphe) et les badges 🟡/⚪ demandent une validation visuelle de votre part.
- `RENDER_3D` et `AUDIO` ne sont mesurés qu'en navigateur.
- Aucun test E2E : les parcours utilisateur complets ne sont pas couverts.

---

## 6. RECOMMANDATION AVANT LES INTÉGRATIONS

Le noyau est désormais **stable, observable et honnête**. Trois points méritent d'être réglés **avant** Google/OCR/Spotify/IA, car chacun deviendra plus coûteux ensuite :

1. **Entités `Guest` et `Vendor` de premier ordre** (P2.2). Aujourd'hui `PEOPLE`, `PLAYLIST` et `AVATAR` sont tous 🟠 pour la même raison racine : **aucun identifiant stable ne désigne une personne**. Sans cela, le vote nominatif, le RSVP et le plan de table restent impossibles — et toute intégration externe s'accrochera à un modèle qu'il faudra refaire.
2. **Auth + permissions réelles** (P2.7). Prérequis strict d'OAuth : sans identité serveur, il n'y a nulle part où stocker un jeton en sécurité.
3. **`vercel.json` + CI GitHub Actions** pour que `pnpm verify` protège réellement chaque déploiement.

Mon avis : **le point 1 est le verrou**. Il débloque simultanément trois modules 🟠 et conditionne la crédibilité des intégrations suivantes.
