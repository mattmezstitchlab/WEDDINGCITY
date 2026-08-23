# WEDDING CITY — DIAGNOSTIC DE VÉRIFICATION

**Date :** 23 août 2026
**Branche auditée :** `arena/01a02c94-weddingcity` (issue de `main` @ `c3e8b73`)
**Méthode :** lecture du code + exécution réelle (typecheck, build, exécution ESM native du graphe de modules)
**Aucun code applicatif n'a été modifié.**

---

## 0. AVERTISSEMENT PRÉALABLE — L'AUDIT REÇU EST PÉRIMÉ SUR SON POINT LE PLUS GRAVE

L'audit fourni affirme :

> « Le crash de démarrage précédemment reproduit (`BRAND_ACCENT` lu avant initialisation via cycle `weddingStore` ↔ `advertisingEngine`) **est corrigé dans la PR #2**. »

**C'est faux sur cette branche.** J'ai vérifié :

```
$ ls src/game/brand.ts
→ n'existe pas

$ grep -rn "BRAND_ACCENT" src/game/
src/game/advertisingEngine.ts:2:  import { BRAND_ACCENT } from './weddingStore';   ← utilisé au top-level
src/game/connectorEngine.ts:8:   import { weddingStore, BRAND_ACCENT } from './weddingStore';
src/game/worldEngine.ts:11:      import { BRAND_ACCENT } from './weddingStore';   ← importé, jamais utilisé
```

`BRAND_ACCENT` est toujours défini **dans** `weddingStore.ts` (ligne 42). Le fichier `brand.ts` de la PR #2 n'est pas présent. **Le cycle destructeur est intact.**

### Preuve d'exécution

J'ai compilé chaque module séparément (sans bundler, donc avec la sémantique ESM native — celle qu'utilise Vite en mode `dev`) et importé `weddingStore` :

```
$ node /tmp/native.mjs
CRASH: ReferenceError :: Cannot access 'BRAND_ACCENT' before initialization
```

**Chaîne de causalité exacte :**

1. `weddingStore.ts:26` → `import { INITIAL_AD_SLOTS } from './advertisingEngine'`
2. ESM évalue donc `advertisingEngine.ts` **avant** le corps de `weddingStore.ts`
3. `advertisingEngine.ts:5` construit `INITIAL_AD_SLOTS` **au chargement du module**, et ce tableau lit `themeColor: BRAND_ACCENT` (lignes 23, 91, 113)
4. Or `BRAND_ACCENT` est déclaré en `const` à `weddingStore.ts:42` — corps pas encore exécuté → **zone morte temporelle (TDZ)**
5. `ReferenceError` → écran blanc

### Pourquoi le build « passe » quand même — et pourquoi c'est un piège

```
$ npx tsc --noEmit        → OK (le typecheck ne voit pas les TDZ)
$ npx vite build          → OK, 1 334 ko
```

J'ai désassemblé les deux bundles :

| Build | Ordre `def` vs `usage` de BRAND_ACCENT | Résultat |
|---|---|---|
| `vite build` (minifié) | esbuild **inline** `#e2b448` comme littéral → la variable disparaît | ✅ fonctionne **par accident** |
| `vite build --minify false` | `def` @ index 268333, `usage` @ index 252942 → **usage avant définition** | ❌ TDZ |
| ESM natif (= `vite dev`) | idem | ❌ **TDZ confirmé à l'exécution** |

> **Conclusion critique : la production ne survit que grâce à une optimisation du minifieur.**
> Le mode `dev` est cassé. Et la moindre modification (un `BRAND_ACCENT` rendu non-inlinable, un changement de `build.minify`, un passage à SWC/Terser, un code-splitting) **casse la production**.
> Ce n'est pas un bug latent : c'est une bombe à retardement qui a déjà explosé une fois.

**C'est le point n°1 de la roadmap, avant toute autre chose.**

---

## 1. CARTOGRAPHIE DES 22 MODULES DEMANDÉS

Légende : 🟢 réel · 🟠 incomplet · 🔴 cassé · 🟡 simulé · ⚪ absent

| # | Module | Statut | Ce qui existe VRAIMENT | Le défaut vérifié |
|---|---|---|---|---|
| 1 | **WeddingStore** | 🟠 | Singleton 2 597 lignes, `useSyncExternalStore`, tick par frame, sélection, focus caméra, horloge 10h→27h | Champs publics mutables sans validation ni transaction ; `notify()` potentiellement à 60 Hz ; aucun événement métier |
| 2 | **World Engine** | 🔴 | Génère réellement places/agents/tasks depuis un archétype | Génère des **références orphelines** : `doc_vols_japan`, `doc_ryokan_kyoto`, `doc_jr_pass`, `doc_tech_rider` sont référencés (lignes 178-207) mais **seul `doc_master_plan` est créé** (ligne 235). Graphe cassé sur les mondes Travel/Concert |
| 3 | **Timeline** | 🔴 | Rendu, curseur, vitesse, phases, focus — tout est branché au store | `phases` est **sauvegardé** (`weddingStore.ts:1504`) mais **jamais restauré** : absent de `initFromPersistence()` (l.1476-1485) *et* de `loadProject()` (l.1944-1953). **Perte de données silencieuse à chaque rechargement** |
| 4 | **Monde 3D** | 🟢 | R3F monté, environnement, worldmap, atmosphère, effets temporels — build propre, 655 modules | Bundle monolithique 1 334 ko (358 ko gzip), aucun code-splitting, aucun budget perf |
| 5 | **Agents / personnages** | 🟠 | Agents voxel rendus, rôle, couleur, pensée, sélection, déplacement horaire | Identité utilisateur liée **par rôle**, pas par ID → deux personnes du même rôle se confondent. Pas de CRUD |
| 6 | **Documents** | 🟠 | Ajout, montant, acompte, liens, persistance locale | Binaires jamais analysés → stockés en Data URL tronquée. Pas de stockage fichier, pas d'index |
| 7 | **OCR** | 🟡 | Lit `.txt/.csv/.json`, extrait le 1er montant `€` par regex | Aucun Tesseract, aucun parser PDF/XLSX. **PDF et images ne sont jamais OCRisés** — l'UI dit « Scan IA » |
| 8 | **DMC ID** | 🔴 | Palette 12 couleurs + 10 glyphes, appliqués à l'identité | `userDmcIdentity` (l.1393) **absent du snapshot** `saveCurrentState()` → **perdu à chaque reload** |
| 9 | **Prestataires** | 🟡 | Filtrage local, liens `tel:`/site, ajout en document | 8 fiches hardcodées dans `researchEngine.ts:4`. Revendication = mutation mémoire, non persistée, aucune vérification SIREN |
| 10 | **Invités** | 🟡 | Agents « invités » générés (l.764) | **Il n'existe aucune entité Guest** — ce sont des agents. Pas de RSVP, pas d'import de liste, pas de plan de table réel |
| 11 | **Budget** | 🟠 | Agrégation réelle des montants/acomptes documents + tâches + conflits | Aucun paiement, devise, rapprochement, export. Ajouter un prestataire crée un document sans contrat ni fournisseur lié |
| 12 | **Tâches** | 🟠 | Affichage, auto-complétion horaire, mise à jour par résolution de conflit | Pas de création/assignation UI, pas de dépendances, pas d'audit trail |
| 13 | **Playlist / DJ** | 🟠 | Ajout, vote, validation, tri « harmonize », persistance des tracks | `hasVoted` est un **booléen global sur le track** (`types/wedding.ts:230`) → un vote bloque tout le monde. « IA harmonise » = tri déterministe. Aucune API Spotify |
| 14 | **Advertising Grid** | 🟠 | 6 slots 3D rendus, campagnes éditables en mémoire | `adSlots` (l.1390) **absent du snapshot** → campagne revendiquée perdue au reload |
| 15 | **Connecteurs** | 🟡 | Statuts, sync items, ingestion réelle vers le store | **`grep -rn "fetch(" src/` → 0 résultat.** Zéro appel réseau dans tout le projet. `connectorEngine.ts:309` = un `setTimeout`. L'écran affiche « connecté » à Google/Spotify/Dropbox : **c'est faux** |
| 16 | **Web Research** | 🟡 | Filtres UI et liens externes fonctionnels | Tableaux statiques (`VERIFIED_PUBLIC_VENDORS`, `HONEYMOON_DESTINATIONS`). Avis et prix affichés comme « vérifiés » sans aucune source live |
| 17 | **Agent** | 🟡 | Répond par mots-clés avec de vraies données du store ; boutons d'action fonctionnels | Aucun LLM, aucune requête réseau, réponses prédéfinies |
| 18 | **System Nerve** | 🟡 | `runDiagnostics()` fait quelques vrais tests (localStorage l.367-369, WebGL, AudioContext) | Les **22 modules ont un `status` écrit en dur** dans le source (`'OK'`, `'PARTIAL'`…). Le tableau affirme `DATABASE: OK`, `CONNECTORS: CONFIGURATION_REQUIRED`, `OCR: OK`, `NARRATION: OK` — **aucun n'est mesuré**. C'est une maquette, pas une supervision |
| 19 | **Persistence** | 🔴 | `localStorage` réel, comptes, index projets, snapshot | 3 pertes de données confirmées : `phases`, `adSlots`, `userDmcIdentity`. Erreurs avalées par `catch {}` vides (11 occurrences) → un quota dépassé est **totalement invisible** |
| 20 | **Invitations** | 🔴 | Génère et copie `/?code=...&role=...` | **`grep -rn "URLSearchParams" src/` → 0 résultat.** Le lien n'est **jamais lu**. Le champ `joinCode` (`IdentityEntryFlow.tsx:72`) est saisi puis **jamais utilisé**. Fonctionnalité 100 % décorative |
| 21 | **Authentification** | 🟡 | Crée/charge un compte local | **Aucun champ mot de passe dans `AuthModal.tsx`.** Un email suffit. « Créer un compte » et « se connecter » sont le même code. Aucune session, aucun secret |
| 22 | **Permissions** | ⚪ | Choix visuel de rôle | Aucune ACL. Tout utilisateur appelle les mêmes méthodes du store. Le rôle est cosmétique |

### Bonus vérifiés

| Élément | Statut | Constat |
|---|---|---|
| **WASD intérieur** | 🔴 | `InteriorVenueView.tsx:24` déclare `keys.current`, lu l.30-33, **jamais écrit**. Le seul `keydown` monté est celui d'`App.tsx:77` (raccourcis globaux) |
| **Bouton « Reconstruire → »** | 🔴 | `ImportLocationModal.tsx:189` — `<button>` **sans `onClick`**. Seule la carte parente (l.173) porte le handler |
| **Code mort** | 🟠 | `SceneShell.tsx`, `GameFlow.tsx`, `ChaseCamera.tsx`, `mouseLook.ts` : **importés par personne**. `input.ts`→`loop.ts`→`GameFlow.tsx` : chaîne entière orpheline. **~470 lignes mortes**, dont l'`input.ts` qui aurait justement réparé le WASD |
| **Backend / DB / API / secrets** | ⚪ | Aucun `fetch`, aucun `import.meta.env`, aucun `.env`, aucune route, aucun ORM. **SPA 100 % navigateur** |
| **Tests / CI** | ⚪ | Aucun test, aucun `.github/workflows` |
| **Télémétrie tierce** | 🟠 | `index.html` embarque rrweb + un POST vers `designarena.ai`. Étranger au produit, à retirer avant toute mise en production |

---

## 2. LE VRAI PROBLÈME STRUCTUREL

Les 3 pertes de données (`phases`, `adSlots`, `userDmcIdentity`) **ne sont pas trois bugs.** C'est **un seul défaut de conception, répété** :

> Le schéma de persistance est écrit **à la main**, en double, à trois endroits distincts qui ne se parlent pas :
> `PersistedWeddingState` (le type) · `saveCurrentState()` (l'écriture) · `initFromPersistence()` + `loadProject()` (les **deux** lectures divergentes).

Ajouter un champ au store demande de modifier 4 endroits. En oublier un ne produit **aucune erreur** : ni TypeScript (les champs sont optionnels ou l'objet littéral est partiel), ni runtime (le `??` retombe sur la valeur par défaut). La perte est **silencieuse par construction**.

**Tant que ce défaut n'est pas corrigé à la racine, chaque fonctionnalité future ajoutera sa propre perte de données.** C'est pourquoi la Priorité 2 doit précéder toute nouvelle fonctionnalité.

Deuxième défaut structurel, de même nature : **`weddingStore.ts` fait 2 597 lignes** et concentre données initiales, logique métier, simulation, persistance et état d'UI. Le cycle `weddingStore ↔ advertisingEngine` qui provoque le crash n'est qu'un **symptôme** de cette absence de couches.

---

## 3. ROADMAP TECHNIQUE PRIORISÉE

### 🔴 PRIORITÉ 1 — Rendre fiable ce qui existe (aucune fonctionnalité nouvelle)

| # | Action | Fichiers | Effort |
|---|---|---|---|
| 1.1 | **Extraire `brand.ts`** (les constantes `BRAND_*`) et casser les 3 cycles. Supprimer l'import inutile dans `worldEngine.ts` | `game/brand.ts` (nouveau), `weddingStore`, `advertisingEngine`, `worldEngine`, `connectorEngine` | S |
| 1.2 | **Verrou anti-régression** : `madge --circular` + un test qui charge le store en ESM natif. Sans ça, le bug 1.1 revient | `package.json`, CI | S |
| 1.3 | **Source unique de vérité pour la persistance** : un seul descripteur de schéma qui pilote sérialisation ET désérialisation. Fusionner `initFromPersistence`/`loadProject`. Corrige `phases` + `adSlots` + `userDmcIdentity` **et empêche la 4ᵉ perte** | `persistence.ts`, `weddingStore.ts` | M |
| 1.4 | **Versionner le snapshot** (`schemaVersion` + migrations) — sinon le correctif 1.3 casse les sauvegardes existantes | `persistence.ts` | S |
| 1.5 | **Rendre les échecs visibles** : remplacer les `catch {}` vides par un canal d'erreurs que le System Nerve consomme (quota, JSON corrompu, WebGL absent) | `persistence.ts`, `audio.ts` | S |
| 1.6 | **Réparer le WASD** en montant `input.ts` (déjà écrit, jamais branché) avec cleanup + garde sur les champs de saisie | `InteriorVenueView.tsx`, `input.ts` | S |
| 1.7 | **Réparer « Reconstruire → »** : handler propre + `stopPropagation` pour éviter le double déclenchement | `ImportLocationModal.tsx` | S |
| 1.8 | **Réparer les références orphelines** du World Engine (générer les docs référencés, ou ne pas les référencer) | `worldEngine.ts` | S |
| 1.9 | **Error Boundary React** + écran d'erreur — aujourd'hui la moindre exception donne un écran blanc muet | `App.tsx`, `main.tsx` | S |
| 1.10 | **Honnêteté de l'UI** : requalifier en « Démo » / « Simulé » tout ce qui annonce OAuth, Google, Spotify, OCR, IA, temps réel. **Ne rien supprimer** — juste ne plus mentir | modales concernées | M |
| 1.11 | Supprimer le code mort (`SceneShell`, `GameFlow`, `ChaseCamera`, `mouseLook`, `loop`) **après** avoir récupéré `input.ts` en 1.6 | — | S |
| 1.12 | Retirer la télémétrie `designarena.ai` d'`index.html` | `index.html` | S |

**Sortie de P1 :** application qui démarre en dev, ne perd plus de données, n'a plus de bouton mort, et dont l'UI ne promet rien de faux.

### 🟠 PRIORITÉ 2 — Vraie architecture de données

| # | Action | Pourquoi maintenant |
|---|---|---|
| 2.1 | **Découper `weddingStore.ts`** en couches : `domain/` (entités + règles pures, testables), `sim/` (tick, mouvements), `ui-state/`. Le singleton reste l'API publique — pas de réécriture visible | Sans ça, plus rien n'est testable ni modifiable sans risque |
| 2.2 | **Modèle relationnel à IDs stables** : `Guest` devient une entité propre (aujourd'hui inexistante), `Vendor` aussi. Intégrité référentielle validée (le bug 1.8 devient impossible) | Prérequis de tout CRUD et de tout backend |
| 2.3 | **Découpler `tick()` de `notify()`** : la simulation à 60 Hz ne doit pas notifier React à 60 Hz (throttle + notifications sélectives) | Perf : c'est le vrai coût caché aujourd'hui |
| 2.4 | **Couche `storage` abstraite** (interface unique, impl. `localStorage` d'abord) | Permet de basculer vers un serveur sans toucher au domaine |
| 2.5 | **Tests** : unitaires sur les mutations, intégration sur le cycle save/load, E2E sur les 3 parcours clés. GitHub Actions | Le filet de sécurité de tout le reste |
| 2.6 | **Routage + deep-links** (`/projet/:id`, `/invite/:code`) et **consommation réelle du lien d'invitation** (`URLSearchParams`) | Débloque enfin la collaboration promise |
| 2.7 | **Vraie authentification** (mot de passe/OTP, session) + **ACL** appliquée côté store : un rôle « invité » ne doit pas pouvoir muter le budget | Aujourd'hui le rôle est purement décoratif |
| 2.8 | **Code-splitting** des modales lourdes et de la scène 3D + budget de perf en CI | Ramène le bundle sous les 500 ko d'entrée |

### 🟡 PRIORITÉ 3 — Connecter les services externes, un par un

Règle : **un seul connecteur réel, de bout en bout, avant d'en promettre un deuxième.**

| # | Action |
|---|---|
| 3.1 | Choisir le backend (Supabase = le plus court chemin ici : DB + auth + storage + RLS). Poser `.env` et la gestion des secrets — **aujourd'hui inexistante** |
| 3.2 | Migrer la persistance locale → serveur, avec mode hors-ligne conservé (la couche 2.4 rend ça mécanique) |
| 3.3 | **Premier connecteur réel : Google Calendar** (OAuth PKCE côté serveur, tokens jamais dans le navigateur). Requalifier les autres en « bientôt disponible » |
| 3.4 | **Vraie ingestion documentaire** : upload fichier → storage → parsing PDF/XLSX → extraction **traçable** (chaque montant pointe vers sa page/cellule) → validation humaine |
| 3.5 | **OCR réel** (Tesseract.js côté client, ou service cloud) — remplace la regex `€` |
| 3.6 | **Recherche Web réelle** avec sources, fraîcheur, cache et attribution. Supprimer les avis statiques présentés comme vérifiés |
| 3.7 | **Agent IA réel** (LLM + outils lisant le store) — l'ossature conversationnelle existe déjà |

### 🚀 PRIORITÉ 4 — Innovations que l'architecture rend enfin possibles

Ces 4 propositions **réutilisent les moteurs déjà présents** et ne deviennent crédibles qu'après P1-P3.

1. **Propagateur de changement contractuel.** La chaîne `Document → Conflict → TimelinePhase → NeuralConnections` existe déjà. Avec le parsing traçable (3.4), un avenant de photographe recalcule automatiquement tâches, phase, trajectoires d'agents et propage une onde visuelle dans le monde 3D. *C'est la fonctionnalité signature de Wedding City* : personne d'autre ne peut montrer l'impact spatial d'un avenant PDF.
2. **Plan de salle opérationnel.** `PlacedObject` a déjà catégorie, position et capacité de table. Avec l'entité `Guest` réelle (2.2) : validation de capacité, régimes alimentaires, proximités familiales, congestion buffet/tables — projeté dans l'intérieur 3D existant.
3. **Régisseur temporel multi-zone.** La simulation sait déjà déplacer agents et véhicules selon l'heure. En liant tâches + lieux + dépendances : une console « prochaine action critique par zone », avec alerte **uniquement** quand une dépendance risque de glisser.
4. **Cockpit d'incidents traçables — le vrai System Nerve.** (voir §4)

---

## 4. LE SYSTEM NERVE — DE LA MAQUETTE AU TABLEAU DE SANTÉ RÉEL

C'est votre demande centrale, et c'est la plus mal servie aujourd'hui : **les 22 statuts sont écrits en dur dans le source.** Le panneau affirme `DATABASE: OK` sans jamais interroger la base, et `OCR: OK` alors que l'OCR n'existe pas. Un tableau de santé qui ment est pire que pas de tableau du tout.

**Le renversement à opérer :** aujourd'hui le Nerve *décrit* les modules. Demain, chaque module doit *déclarer* sa santé, et le Nerve ne fait que **collecter**.

### Architecture cible

Chaque module expose une **sonde** (`HealthProbe`) exécutée à la demande, qui retourne un statut mesuré :

| 🟢 OK | mesuré et conforme |
| 🟠 PARTIEL | fonctionne en mode dégradé / simulé |
| 🔴 ERREUR | défaut reproduit |
| ⚪ ABSENT | aucune implémentation |

Sondes **réellement mesurables** dès la P1, sans backend :

- **Persistance** — écrire/relire/comparer un canari ; comparer les clés du store aux clés du snapshot → *détecte automatiquement les `phases`/`adSlots`/`userDmcIdentity` manquants*
- **Intégrité référentielle** — parcourir tous les `connected*Ids` et signaler les cibles inexistantes → *détecte les orphelins du World Engine*
- **Cycles de modules** — résultat du check `madge` injecté au build → *détecte le bug BRAND_ACCENT*
- **Services externes** — un connecteur sans `fetch` réel se déclare 🟡 SIMULÉ **lui-même**. Fin du mensonge par construction
- **Perf** — FPS réel, taille du bundle, durée du tick, poids du `localStorage` vs quota
- **UI morte** — inventaire des handlers manquants

### Format d'un incident : CAUSE → IMPACT → SOLUTION → ACTION

Chaque problème détecté devient un objet sélectionnable. Exemple réel, tel qu'il apparaîtrait aujourd'hui :

> **🔴 TIMELINE — Phases non restaurées**
> **CAUSE** — `phases` est écrit par `saveCurrentState()` (`weddingStore.ts:1504`) mais absent de `initFromPersistence()` et de `loadProject()`.
> **IMPACT** — Toute Timeline personnalisée ou générée par le World Engine est perdue au rechargement. Silencieux : aucune erreur affichée.
> **SOLUTION** — Unifier lecture et écriture derrière un descripteur de schéma unique (roadmap 1.3).
> **ACTION** — `[Restaurer depuis le dernier snapshot]` · `[Voir le code]` · `[Ignorer pour cette session]`

Le modèle d'action existe déjà : `runAutoFix()` et `resolveConflict()` prouvent que le pattern diagnostic→action fonctionne. Il faut le brancher sur des **événements mesurés** au lieu d'un tableau statique.

> **Conséquence importante :** le System Nerve devient le **test de recette de la roadmap elle-même**. Chaque case passée au 🟢 est une ligne de roadmap réellement terminée — et vérifiée par la machine, pas déclarée par un humain.

---

## 5. CE QUE JE RECOMMANDE MAINTENANT

L'ordre n'est pas négociable sur les deux premiers points :

1. **1.1 + 1.2** — le crash TDZ. Le mode `dev` est cassé et la prod ne tient que par chance. **Rien d'autre ne doit être entrepris avant.**
2. **1.3 + 1.4** — la source unique de persistance. Corrige les 3 pertes *et* rend la 4ᵉ impossible.
3. **1.5 → 1.12** — la fiabilité visible (WASD, bouton mort, orphelins, Error Boundary, honnêteté UI).
4. **4** — refonte du System Nerve en collecteur de sondes réelles, pour que la suite se pilote sur des faits mesurés.

Je n'ai encore modifié **aucune ligne de code applicatif**. Dites-moi si je lance la Priorité 1.
