# AUDIT — CONVERGENCE FINALE DU PRODUIT

Dépôt : `mattmezstitchlab/WEDDINGCITY` · branche `arena/01a02c94-weddingcity` · HEAD audité `8226a24`.
`tsc --noEmit` : **OK** (vérifié). Aucune ligne de code n'a été modifiée pendant cet audit.

Méthode : lecture exhaustive du code réellement monté (`src/App.tsx` → composants), du store
(`src/game/weddingStore.ts`, 5 585 lignes) et des types. Chaque verdict porte sur un fichier et une
ligne existants. Verdicts employés : **GARDER · ÉTENDRE · FUSIONNER · CONNECTER · CRÉER · REFUSER ·
NE PAS EXPOSER**.

---

## 0. Carte du produit tel qu'il existe

| Couche | Fichier | État |
|---|---|---|
| Source de vérité | `src/game/weddingStore.ts` | Unique. Aucune seconde base. |
| Persistance | `persistence.ts` + `persistenceSchema.ts` | 5 clés `wedding_city_*`. Unique. |
| Types métier | `src/types/wedding.ts`, `src/types/identity.ts` | `Person`(+`craft`), `Vendor`, `Guest`, `MediaAsset`, `TimelinePhase`, `TaskEntity`, `TimelineScenario`. |
| Entrée publique | `MirrorLanding.tsx` | Hero + 8 séquences. |
| Analyse | `projectIntake.ts` + `documentIntelligence.ts` + `IntakeStudio.tsx` | 2 étapes, 2 niveaux de confiance. |
| Timeline | `timeline/TimelineStudio.tsx` (+ `MomentHub.tsx`) | **La** pellicule du produit. |
| Organisation | `organisation/{OrganisationSection,CrewPanel,ScenariosPanel,SeatingPlan}` | Lab, équipe, scénarios, plan de table. |
| Recherche | `GlobalSearch.tsx` → `store.searchEverything()` | 8 types d'objets, projet courant. |

---

## 1. AUDIT PAR SURFACE

### 1.1 Landing — `MirrorLanding.tsx` (664 l.)

Existant : hero plein écran + 8 séquences (pellicule de démonstration, spectacle, feuille de route,
musique, plan de table, scénarios, documents, mes événements, clôture).

Défauts **mesurés dans le code** :

- **Numérotation cassée.** Les index affichés sont `02, 03, 03, 04, 06, 07, 09` (lignes 190, 246,
  322, 393, 445, 491, 561). `03` apparaît deux fois ; `01`, `05` et `08` n'existent pas. → **CORRIGER**
  (pas de nouveau composant, renumérotation).
- **Deux séquences réclamées par le brief §20 sont absentes** : « IMPORTER LE CHAOS » et
  « ADMINISTRATION INVISIBLE ». → **CRÉER** deux séquences dans ce même fichier, jamais une seconde page.
- Ordre actuel ≠ ordre du brief §20 (Timeline → Chaos → Documents → Artistes → Plan B → Admin →
  visuel). → **RÉORDONNER**.
- Musique et plan de table démontrent des fonctions réelles du moteur. Le brief interdit les
  sections *décoratives*, pas les démonstrations. → **GARDER**, renumérotées.
- Bandeau `MATT & ÉMILIE · 18 JUILLET 2027 · démonstration` (l. 196-199) : média éditorial du
  produit, explicitement étiqueté, hors projet utilisateur. Conforme à la règle posée. → **GARDER**.

### 1.2 Hero — `MirrorLanding.tsx` l. 109-184 + `landing.css` l. 506

Conforme au brief §2 sur l'essentiel : titre `LE GRAND JOUR®`, signature « L'amour en vrai. », une
seule barre blanche portant champ / `+ Importer` / sélecteur / `→`. Aucun nom de mariés, aucune date.

Deux écarts réels :

- **Le sélecteur ne ressemble pas à un menu déroulant.** `.wc-gj-bar-type { appearance: none; …}`
  sans chevron ni fond : à l'écran, « Mariage » se lit comme un texte statique — exactement ce que
  le brief interdit. → **CORRIGER** (chevron + affordance, `<select>` natif conservé pour
  l'accessibilité et le tactile).
- **7 types au lieu des 10 demandés.** `EVENT_TYPES` = mariage, anniversaire, fête, séminaire,
  convention, soirée, autre. Manquent : **Festival, Concert, Gala, Spectacle, Événement associatif,
  Événement culturel**, et « Événement corporate » s'appelle « Séminaire ». → **ÉTENDRE**
  `src/design/eventTypes.ts` (vocabulaire + questions + moments par type). Aucun second moteur : le
  schéma existant porte déjà `principalsQuestion`, `fields`, `momentWords`, `headcountLabel`.

### 1.3 Import — hero (`<input type="file" multiple>`) → `IntakeStudio`

- Aucun attribut `accept` : tous les formats sont acceptés à l'entrée. Mais l'extraction réelle est
  **texte seulement** (`documentIntelligence.extractDocumentFacts`). PDF, DOCX, XLSX et images sont
  conservés en `MediaAsset` et marqués `unreadable` (« non lisible comme du texte ici — conservé tel
  quel », `IntakeStudio` l. 262). C'est honnête, ce n'est pas complet. → **GARDER** le comportement,
  **ÉTENDRE** l'énoncé : dire *avant* l'import ce qui sera lu et ce qui sera seulement rangé. CSV et
  TXT sont lus ; DOCX/XLSX/PDF ne le sont pas sans dépendance réseau ou binaire nouvelle → à décider.
- **Doublon d'import détecté** : `ui/ImportChaosModal.tsx` (touche `I`) alimente
  `store.importChaosFile()`, qui **invente** date, liens et acompte. Déjà classé « jamais exposé »,
  mais **il reste atteignable au clavier depuis le produit** (voir §1.13). → **NE PAS EXPOSER**, et
  fermer l'accès clavier.

### 1.4 Moteur d'analyse — `projectIntake.ts` (378 l.)

Lit : heures, moments (vocabulaire du type choisi), personnes, prestataires, lieux, morceaux,
montants, documents ; produit un `IntakePlan` où **chaque élément porte son `evidence`** (le
fragment source) et un drapeau `keep`. Le couple n'est jamais deviné (`canGenerate` bloque).

Écart avec le brief §3 : **deux niveaux de confiance** (`'read' | 'estimated'`) alors que cinq sont
demandés (**CONFIRMÉ · DÉDUIT · ESTIMÉ · À CONFIRMER · MANQUANT**). → **ÉTENDRE** le type
`IntakeConfidence` existant et le propager jusqu'à `TimelinePhase`. Ne pas créer de second modèle de
confiance : `À CONFIRMER` existe déjà comme convention textuelle dans `generateAdminDocument`, il
faut l'unifier.

### 1.5 Écran d'analyse — `IntakeStudio.tsx` (408 l.)

Deux étapes : `reading` (« Lecture des fichiers… », barre de progression, mention « aucun fichier
n'est envoyé nulle part ») puis `review` (« Lecture du projet » / « Votre journée prend forme »),
avec compteurs, champs identitaires du type, questions, et groupes Moments / Personnes /
Prestataires / Lieux / Musique / Documents, chacun corrigeable avant génération.

Le brief §4 demande le même écran avec un récapitulatif structuré **TYPE · DATE · LIEU · PERSONNES ·
PRESTATAIRES · ARTISTES · MOMENTS · DOCUMENTS · CONTRAINTES**. Manquent : la ligne **TYPE** explicite,
la distinction **ARTISTES** vs prestataires, et le bloc **CONTRAINTES** (« 2 informations à
confirmer ») aujourd'hui dispersé dans `plan.questions`. → **ÉTENDRE** le même composant. **REFUSER**
tout second écran d'analyse.

### 1.6 Timeline — `TimelineStudio.tsx` (841 l.)

Échelle horaire réelle (0→30 h), largeur = durée, glissement deux sens + inertie + tactile, zoom,
« Toute la journée », repère NOW, création de moment, gabarits par type, glisser-déposer d'une carte
avec heure cible, proposition de propagation (ripple). **C'est la seule pellicule du produit.**
→ **GARDER, ne jamais dupliquer.**

Manque au regard du brief §7-§8 : la carte affiche heure, nom, durée et trois compteurs
(`n pers. · n prest. · n doc.`, l. 500-503) mais **aucun état de complétude** (`✓ Lieu défini`,
`⚠ Photographe sans contrat`) et **aucune barre d'actions directe**. → **ÉTENDRE** : dériver un
`phaseFindings(phaseId)` du même moteur que `projectFindings()` / `crewFindings()` — surtout pas un
troisième moteur de diagnostic.

### 1.7 Moment — `MomentHub.tsx` (860 l.)

Onze dimensions déjà présentes : Heure, Lieu, Personnes, Prestataires, Musique, Photo/Vidéo, Repas,
Logistique, Budget, Documents, Notes. Le moment **est** déjà le hub demandé. → **GARDER**.

Manquent, par rapport au brief §8-§9 :
- « Créer une tâche » existe dans le store (`createTaskForPhase`) mais pas dans le hub.
- « Créer un scénario » n'est accessible que depuis `ScenariosPanel`.
- **« Générer un document » n'est pas accessible depuis un moment** alors que
  `generateAdminDocument()` accepte déjà un `phaseId`.
- Aucune **suggestion de document manquant** (« ce moment contient un saxophoniste, aucun contrat »).
→ **CONNECTER** (aucune nouvelle mécanique, uniquement des points d'entrée vers l'existant).

### 1.8 Personnes — `MirrorPeople.tsx`, `Person` + `PersonCraft`

Une seule entité de personne dans tout le produit ; `craft` porte métier, statut, zone, cachet,
installation/démontage, besoins, déplacement, hébergement. `Performer` n'existe pas et ne doit pas
exister. → **GARDER**.

La « carte personne » du brief §11 (événements, prochainement, documents, agenda, contact, relations)
n'existe pas comme surface unique : les morceaux sont éparpillés entre `MirrorPeople`, `CrewPanel`
et `EntityInspector`. Le comptage inter-événements n'est possible que par
`crossEventConflicts()`, qui rapproche **par nom** et le dit (« à confirmer »). → **FUSIONNER** en
une carte unique lisant les données existantes ; **ne jamais** afficher un rapprochement de nom
comme une identité certaine.

### 1.9 Prestataires / Artistes / Techniciens

`Vendor` (structure) et `Person.craft` (personne qui exerce) sont deux choses distinctes et
correctement séparées. `getCrew`, `getCrewForPhase`, `getCallSheet`, `crewFindings`,
`whoWorksBetween`, `findReplacements`, `createMission`, `getMissionsFor`, `setPersonTravel` existent
et sont tous exposés dans `CrewPanel.tsx`. → **GARDER**.
Réserve : la distinction artiste/technicien est **déduite du libellé du métier**, elle n'est pas une
donnée. À afficher comme une déduction, jamais comme un fait.

### 1.10 Documents — `MediaAsset` uniquement

`addMedia`, `getMediaFor`, `attachMediaToPhase`, `removeMedia`, `generateAdminDocument`. Un seul
système, propriétaires typés (`person | place | vendor | event | song | wedding`).
`DocumentEntity` (`types/wedding.ts` l. 388) est un **vestige de l'ère World** encore présent dans le
store via `getDocumentsForVendor`. → **NE PAS ÉTENDRE** `DocumentEntity` ; toute nouveauté sur
`MediaAsset`. La fusion des deux est possible mais coûteuse : à décider séparément.

### 1.11 Scénarios — `TimelineScenario` + `ScenariosPanel.tsx`

Branche persistée, deux rails comparés, `scenarioDiff`, application ligne à ligne ou totale, abandon.
La journée principale ne bouge qu'à l'application. → **GARDER, moteur unique.**
Limites : un scénario porte **heures + lieu** uniquement ; il ne porte ni les rattachements d'équipe,
ni une cause (« pluie », « artiste indisponible »), ni un coût. Le brief §18 demande une liste de
causes et une détection de conflit après décalage. → **ÉTENDRE** le même moteur.

### 1.12 Causalité / propagation

`shiftPhasesAfter`, `phasesAfter`, `previewMoveToIndex`, `movePhaseToIndex` + barre ripple
(`data-jourj="ripple"`). Le décalage est **proposé**, jamais appliqué en douce. → **GARDER**.
Manque : l'affichage nominatif des conséquences (« Photographe +30, Saxophoniste +30 ») — la donnée
existe pourtant (`getCrewForPhase`) — et les quatre issues du brief (`APPLIQUER · CRÉER UN PLAN B ·
MODIFIER · IGNORER`) : seules `Appliquer` et `Ignorer` existent. → **ÉTENDRE**.

### 1.13 Navigation, anciens espaces, doublons — **le point le plus grave**

`src/App.tsx` monte encore tout l'écosystème de l'ère World. Trois constats vérifiés dans le code :

1. **Les raccourcis clavier ne vérifient pas la projection** (`App.tsx` l. 56-113). Depuis le
   produit, `I` ouvre `ImportChaosModal` (moteur qui invente), `N` le System Nerve Center, `C` le
   Connectors Hub (Google / Spotify / OAuth — services refusés), `L` le World Lab, `M` la DJ Zone,
   `G` la Guest Constellation, `T` la `LivingTimelineView`. → **NE PAS EXPOSER** : conditionner ces
   touches à `projection === 'world'`.
2. **`LivingTimelineView` est une seconde représentation de la timeline** montée sans condition de
   projection (`App.tsx` l. 214). C'est le doublon interdit par la règle absolue §23, atteignable par
   une touche. → **NE PAS EXPOSER** dans le produit.
3. **`EntityInspector` (759 l.)** est monté sans condition de projection (l. 211) ; c'est
   l'inspecteur du World.  → **NE PAS EXPOSER** hors World.

Autres doublons recensés (aucun n'est atteignable depuis la navigation du produit, tous le sont par
le clavier ou par un état du store) : `CreateWeddingModal` **et** `WeddingCreationModal` (deux
créations de mariage), `LandingPageModal` (une seconde landing), `BrandMenuModal`, `AdSlotModal`,
`WorldResearchModal` + `researchEngine.ts` (faux prestataires « Lenôtre », `source: 'Google Places
API'`), `ImportLocationModal`, `ClaimVendorModal`, `SpatialAiAgentDrawer`.
→ Verdict global : **NE PAS EXPOSER**, et documenter dans `docs/DORMANT_MODULES.md`. Aucune
suppression n'est proposée dans cette passe : elle casserait des suites de tests existantes.

Point positif vérifié : **aucune occurrence de « Mirror », « World 3D » ou « WORLDMAP » n'existe dans
les surfaces produit** (`src/components/mirror/**`). Le chrome 3D n'est rendu que si
`projection === 'world'` (l. 190, 199, 205, 208).

### 1.14 Recherche — `searchEverything()` (l. 3008)

Personnes (nom, e-mail, téléphone, **métier, spécialité, statut, besoins**), moments, lieux,
prestataires, morceaux, documents, tâches, tables. Chaque résultat porte son contexte. Plafond
40 résultats. → **GARDER**.
Limites : **projet courant uniquement** ; ni filtre, ni tri, ni statut (brief §10) ; le clic ne
navigue que pour les moments (`GlobalSearch` l. 76). → **ÉTENDRE** la même fonction.

### 1.15 Plan de table — `SeatingPlan.tsx`

Spatial, l'invité suit le doigt, table pleine explicite, `assignGuestToTable` +
`getTableOccupancy`. → **GARDER**.

### 1.16 Stockage — `persistence.ts`

`wedding_city_accounts_v1`, `_active_account_v1`, `_projects_v1`, `_active_project_id_v1`,
`wedding_city_state_<projectId>`. **Un état par projet : l'isolation inter-événements est
structurelle.** C'est aussi la raison pour laquelle une vue multi-événements doit lire les autres
projets **en lecture seule**, comme le fait déjà `crossEventConflicts()`. → **GARDER**.
Aucune nouvelle base ne doit être introduite pour l'Admin.

### 1.17 Permissions — `Capability`, `ProjectMembership`, `store.can()`

Le modèle existe (14 capacités, 6 rôles) et `can()` est implémenté… mais **aucune surface produit ne
l'appelle** (vérifié : zéro occurrence dans `src/components/mirror/**`). Le brief §17 fait
précisément reposer sur lui la séparation client / administrateur. → **CONNECTER**. Ne pas créer un
second système de rôles.

---

## 2. SYNTHÈSE DES VERDICTS

| Sujet | Verdict |
|---|---|
| Store unique, persistance, `Person`/`Vendor`/`MediaAsset` | GARDER |
| Pellicule `TimelineStudio` | GARDER — seule timeline |
| Moteur de scénarios | GARDER puis ÉTENDRE (cause, équipe, coût) |
| `eventTypes` : 7 → 10 types | ÉTENDRE |
| `IntakeConfidence` : 2 → 5 niveaux | ÉTENDRE |
| Écran d'analyse : TYPE / ARTISTES / CONTRAINTES | ÉTENDRE |
| Squelette de journée estimé (§6) | CRÉER dans `eventTypes` + `createPhase` |
| État de complétude par moment (§8) | ÉTENDRE `projectFindings` → `phaseFindings` |
| Actions depuis un moment (tâche, scénario, document) | CONNECTER |
| Document manquant suggéré (§9) | CONNECTER |
| Carte personne unique (§11) | FUSIONNER |
| Surface Administration (§10-§13) | CRÉER — une surface, zéro nouvelle base |
| Arborescence documentaire (§16) | CRÉER en **projection dérivée** des métadonnées |
| Permissions client / administrateur (§17) | CONNECTER `store.can()` |
| Chevron du sélecteur de type | CORRIGER |
| Numérotation de la Landing | CORRIGER |
| Séquences « Importer le chaos » et « Administration invisible » | CRÉER |
| Raccourcis clavier vers les surfaces World | NE PAS EXPOSER |
| `LivingTimelineView`, `EntityInspector` hors World | NE PAS EXPOSER |
| `ImportChaosModal` / `importChaosFile` (invente) | NE PAS EXPOSER |
| `researchEngine.ts` / `WorldResearchModal` (faux prestataires) | NE PAS EXPOSER |
| Recherche Web d'entité (§14) | **REFUSER** — aucun accès réseau ; l'interface doit le dire |
| Envoi réel d'un document (§15) | **REFUSER** — aucun transport connecté |
| OCR / lecture PDF-DOCX-XLSX | REFUSER en l'état (dépendance nouvelle à décider) |
| Lecture audio réelle | REFUSER (`itunes.apple.com` injoignable) |

**Ce que le produit dira à l'utilisateur, sans détour :** la recherche d'entreprise ou
d'association sur le Web n'est pas disponible ; l'envoi d'un document n'est pas disponible ; un PDF
importé est conservé mais n'est pas lu. Aucune de ces trois fonctions ne sera simulée.

---

## 3. INNOVATIONS PROPOSÉES (§21) — **aucune n'est implémentée**

Chacune n'utilise que des données déjà présentes dans le store.

### C-01 · État de complétude d'un moment
- **Problème** : la carte ne dit pas ce qui manque ; l'utilisateur doit ouvrir chaque moment.
- **Solution** : trois à cinq lignes `✓ / ⚠` sur la carte et en tête du hub.
- **Données** : `phase.primaryPlaceId`, `personIds`, `vendorIds`, `media`, `tasks`, `budget`, `craft.requirements`.
- **Fonctionnement** : `phaseFindings(phaseId)`, projection pure, même grammaire que `projectFindings()`.
- **Valeur** : la timeline devient une interface de pilotage (brief §8).
- **Difficulté** : moyenne. **Doublon** : nul si dérivé du moteur existant ; élevé si un nouveau moteur est écrit.

### C-02 · Squelette de journée estimé
- **Problème** : sans horaire fourni, l'intake produit une journée vide.
- **Solution** : proposer une ossature par type, chaque heure marquée **ESTIMÉ**, modifiable.
- **Données** : `EVENT_TYPES[].momentWords` + une table d'heures typiques par type.
- **Fonctionnement** : `createPhase()` avec `confidence: 'estimated'`.
- **Valeur** : on commence immédiatement (brief §6).
- **Difficulté** : faible. **Doublon** : nul. **Risque** : une heure typique reste une convention — elle doit rester visiblement estimée.

### C-03 · Cinq niveaux de certitude, de bout en bout
- **Problème** : « lu » et « estimé » ne suffisent pas ; l'incertitude se perd après la création.
- **Solution** : CONFIRMÉ / DÉDUIT / ESTIMÉ / À CONFIRMER / MANQUANT, porté par la phase et affiché partout, y compris dans les documents générés.
- **Données** : `IntakeConfidence` étendu + un champ sur `TimelinePhase`.
- **Valeur** : la règle « ne jamais inventer » devient visible en permanence.
- **Difficulté** : moyenne (migration de persistance). **Doublon** : nul.

### C-04 · Document manquant, proposé au bon endroit
- **Problème** : personne ne sait quel document devrait exister.
- **Solution** : « Ce moment engage un saxophoniste ; aucun contrat n'y est rattaché. → Générer ».
- **Données** : `getPhaseHub`, `getMediaFor`, `person.craft`, `vendor.status`.
- **Fonctionnement** : règles déterministes, puis `generateAdminDocument({ phaseId, personId })` **déjà écrit**.
- **Valeur** : brief §9 sans aucune nouvelle mécanique documentaire.
- **Difficulté** : faible. **Doublon** : nul.

### C-05 · Surface Administration (non-dashboard)
- **Problème** : celui qui pilote plusieurs événements n'a aucune vue transverse.
- **Solution** : **une seule page, une seule ligne de saisie**, réponse en listes typographiques. Pas de grille de cartes, pas de widgets.
- **Données** : `searchEverything()` étendu à tous les projets (lecture seule, comme `crossEventConflicts`).
- **Valeur** : brief §10 et §12 sans second système.
- **Difficulté** : élevée. **Risque** : c'est ici que naît un dashboard SaaS si la retenue lâche.

### C-06 · Carte d'une personne, tous événements confondus
- **Problème** : Matt Mez existe dans quatre projets, sans lien entre eux.
- **Solution** : une carte — métier, statut, événements, prochaine date, documents, missions, relations — avec les rapprochements inter-projets **marqués « à confirmer »**.
- **Données** : `Person`, `craft`, `getMissionsFor`, `getCallSheet`, `getRelationshipsFor`, projets voisins.
- **Difficulté** : moyenne. **Doublon** : réel si `EntityInspector` n'est pas écarté du produit — d'où le verdict NE PAS EXPOSER.

### C-07 · Feuille de route imprimable
- **Problème** : sur le terrain, on travaille sur papier ou hors ligne.
- **Solution** : impression navigateur d'un `getCallSheet` — aucune dépendance, aucun service.
- **Données** : `getCallSheet(personId)`, projection pure déjà recalculée à chaque modification globale.
- **Difficulté** : faible. **Doublon** : nul (même projection, autre rendu).

### C-08 · Scénario avec cause et conséquences nommées
- **Problème** : un plan B est aujourd'hui un décalage anonyme.
- **Solution** : choisir une cause (retard, pluie, artiste indisponible, changement de lieu, panne) ; le diff nomme les personnes et prestataires touchés, et signale les conflits créés.
- **Données** : moteur de scénarios existant + `getCrewForPhase` + `crewFindings`.
- **Difficulté** : moyenne. **Doublon** : nul si le moteur reste unique.

### C-09 · Arborescence documentaire dérivée
- **Problème** : les documents existent mais ne se rangent pas.
- **Solution** : une vue `/ÉVÉNEMENT / PERSONNES / PRESTATAIRES / CONTRATS…` **calculée** à partir de `ownerKind`, `ownerId` et du titre. Aucun fichier dupliqué, aucun dossier stocké.
- **Difficulté** : faible. **Doublon** : nul par construction (lecture seule).

### C-10 · Complexité visible pilotée par le rôle
- **Problème** : le client ne doit pas voir l'infrastructure.
- **Solution** : la navigation lit `store.can()` ; le client voit Timeline, Personnes, Documents, Musique, Organisation ; l'administrateur voit en plus l'Administration.
- **Difficulté** : moyenne (déterminer le rôle courant sans écran de connexion).
- **Doublon** : nul — le modèle de permissions existe déjà et n'est simplement pas branché.

---

## 4. CE QUE CET AUDIT NE TRANCHE PAS

- Faut-il **supprimer** les modules dormants de l'ère World, ou seulement les rendre inatteignables ?
  Les supprimer casse des suites de tests existantes ; les tests ne doivent pas être supprimés.
- Faut-il introduire une dépendance pour lire les PDF/DOCX/XLSX ? Cela sort du cadre « aucun service
  réseau » seulement si la bibliothèque est locale ; c'est une décision produit, pas technique.
- L'ordre exact et le nombre de séquences de la Landing (§20) : sept innovations à démontrer, huit
  séquences existantes, deux à créer — un arbitrage est nécessaire.

**Aucune modification de code n'a été faite. Rien ne sera implémenté sans décision explicite.**
