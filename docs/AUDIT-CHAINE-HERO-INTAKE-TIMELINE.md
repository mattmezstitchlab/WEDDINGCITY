# AUDIT — CHAÎNE UNIQUE « HERO → RAPPORT → TIMELINE »

Date : 24 août 2026  
Dépôt : `mattmezstitchlab/WEDDINGCITY`  
Branche : `arena/01a03367-weddingcity`  
HEAD audité : `81dac192598efdb163a756f73f8d2150db326c83`

## 0. Demande auditée

La priorité exprimée est de ne pas s’éparpiller :

> une personne décrit son projet dans le champ du hero ; le produit produit un
> rapport crédible et réel ; puis cette même information construit la timeline.

Contraintes appliquées :

- une seule source de vérité métier et temporelle ;
- aucune donnée inventée ;
- les propositions restent explicitement estimées ;
- une donnée conserve sa preuve quand elle est lue ;
- pas de second moteur de timeline, de documents ou de personnes ;
- arrêt après l’audit, avant toute implémentation.

## 1. Méthode et état de départ

Audit réalisé par :

1. lecture du chemin monté depuis `src/main.tsx` et `src/App.tsx` ;
2. inventaire des portes de création et des appels d’écriture ;
3. lecture de `projectIntake.ts`, `documentIntelligence.ts`,
   `IntakeStudio.tsx` et des mutations du store ;
4. exécution du moteur sur des phrases réelles de test, sans importer une
   seconde instance du store dans le navigateur ;
5. vérification de compilation et des tests existants ;
6. vérification Chromium de la chaîne actuelle à 1440 px et 390 px.

Résultats de base :

- `./node_modules/.bin/tsc --noEmit` : **OK** ;
- `pnpm run verify` : **OK** ; les diagnostics audio Node attendus apparaissent
  sur stderr, sans échec de suite ;
- `node scripts/acceptance-convergence-finale.mjs 1440` : **OK**, 0 échec ;
- `node scripts/acceptance-convergence-finale.mjs 390` : **OK**, 0 échec.

Ces acceptations vérifient la convergence générale et le parcours d’une phrase
vers une journée proposée. Elles ne couvrent pas encore les défauts spécifiques
relevés ci-dessous. Un état vert ne doit donc pas être interprété comme la
validation de la chaîne métier demandée ici.

## 2. Carte de vérité actuelle

| Besoin | Source actuelle | Verdict |
|---|---|---|
| Projet actif | `weddingStore.currentProject` + persistance projet | **Unique** |
| Moments / horaires | `weddingStore.phases` (`TimelinePhase`) | **Unique** |
| Affichage de pilotage | `TimelineStudio` + `MomentHub` | **Unique pour le Jour J** |
| Analyse de la phrase | `analyseIntake()` | **Unique** |
| Lecture des fichiers texte | `extractDocumentFacts()` | **Unique et locale** |
| Rapport avant création | écran de revue de `IntakeStudio` | **Projection temporaire**, pas un objet métier |
| Création | `createRealWedding()` puis `applyIntakePlan()` | **Deux opérations enchaînées** |
| Documents importés | `IntakePlan.documents` durant la revue | **Perdus à la génération** |
| Documents existants du produit | `MediaAsset` | **Unique**, mais non utilisé par l’import Intake |
| Timeline éditoriale secondaire | `MirrorTimeline` dans le récit public | **Lecture seule**, mais ambiguë avec la pellicule sombre |

Conclusion de cette carte : le moteur temporel est unique, mais la promesse
« ce que j’écris devient ce que je pilote » n’est pas encore raccordée de bout
en bout.

## 3. Portes et doublons constatés

### 3.1 Deux parcours visibles depuis la surface produit

Dans `MirrorLanding.tsx` :

- si le champ du hero contient une phrase ou un fichier, `start()` ouvre
  `IntakeStudio` ;
- si le champ est vide, `start()` appelle `store.startWeddingCreation()`.

`startWeddingCreation()` ouvre alors `WeddingCreationModal` depuis le site.
La navigation « Créer » et le calendrier utilisent aussi cette méthode.

Il existe donc deux expériences utilisateur :

1. **Hero rempli** → lecture → revue → génération → timeline ;
2. **Hero vide / navigation Créer** → formulaire en trois étapes → création vide
   directe, sans rapport et sans lecture de la phrase.

Les deux finissent par appeler `createRealWedding`, mais ce n’est pas une seule
expérience. Pour une personne qui veut décrire son projet, le produit peut donc
contourner le rapport selon l’état du champ.

**Verdict : DOUBLON PRODUIT P0 — FUSIONNER.**

### 3.2 Surfaces de création historiques encore présentes

Le dépôt contient également :

- `src/components/ui/CreateWeddingModal.tsx`, monté pour la surface World ;
- `src/components/ui/WorldLabModal.tsx`, qui appelle `createWorldWithAi()` ;
- `ImportChaosModal`, qui appartient à l’ancien flux et invente des données.

Ces surfaces ne sont pas les portes normales de la surface publique actuelle,
ce qui explique les tests de convergence verts. Elles restent toutefois des
systèmes de création concurrents dans le code et certaines sont atteignables
par les outils World ou leurs états historiques.

**Verdict : NE PAS EXPOSER.** La passe demandée ne doit pas créer une quatrième
porte ; elle doit réserver l’interface produit à l’Intake unique. Les modules
World peuvent rester dormants tant qu’ils ne sont pas supprimés par une passe
séparée et auditée.

### 3.3 Une timeline de données, deux rendus

La donnée temporelle est bien unique : les deux rendus lisent `phases`.
Cependant :

- `TimelineStudio` est la pellicule sombre de pilotage ;
- `MirrorTimeline` rend un programme en lecture seule dans le récit public,
  après le Jour J.

Ce n’est pas un second moteur, ni un second éditeur. C’est néanmoins une
possible impression de « Timeline 2 » pour l’utilisateur.

**Verdict : GARDER la source et le pilotage ; décider si le rendu public doit
être réduit à un renvoi vers le Jour J ou conservé comme lecture éditoriale.**
Ne pas ouvrir cette question dans la même implémentation que les corrections
métier sans décision explicite.

## 4. Test direct de la phrase du hero

### 4.1 Phrase simple : comportement cohérent mais incomplet

Entrée testée :

```text
Nous nous marions le 18 juillet 2027 au Château de Vaux.
Cérémonie à 14h, cocktail à 17h, dîner à 20h.
```

Le moteur lit correctement :

- date : `2027-07-18` ;
- lieu : `Château de Vaux` ;
- trois moments ;
- fins non écrites marquées `estimated`.

Il demande correctement les prénoms au lieu de les deviner.

Mais aucune personne, aucun prestataire, aucun morceau et aucun montant ne
peut être extrait d’une phrase de description générale. Dans
`projectIntake.ts`, la boucle de lecture des personnes, prestataires et
morceaux parcourt `sources`, pas `description`.

**Verdict : ÉCART P0 avec la promesse du champ hero.**

Règle à retenir pour la correction : un rôle sans nom (« un DJ », « un
photographe ») devient une question ou une information manquante ; il ne doit
pas devenir une personne ou une entreprise inventée.

### 4.2 Faux couple trouvé dans une phrase crédible

Entrée testée :

```text
Nous nous marions le 18 juillet 2027 au Château de Vaux.
Nous avons le DJ Paul, la photographe Marie et le traiteur Table & Feu,
environ 120 invités, budget 8 400 €.
```

Résultat réel de `analyseIntake()` :

- `coupleNames = "Table & Feu"` ;
- date et lieu corrects ;
- 120 invités reconnu ;
- aucun prestataire, aucune personne et aucun montant reconnu depuis cette
  phrase ;
- comme aucun horaire n’est présent, une trame mariage estimée est proposée.

La détection du couple cherche n’importe quel motif « mot & mot » dans la
description. Elle ne distingue pas un nom de prestataire d’un couple.

**Verdict : BUG P0 — le rapport n’est pas crédible sur une phrase métier
courante et peut écrire une entreprise comme identité des mariés.**

Le correctif devra privilégier un contexte explicite de couple et exclure les
segments identifiables comme prestataire, lieu ou ressource. En cas de doute,
le couple doit rester **MANQUANT** et être demandé.

### 4.3 Doublon logique des moments identiques

Les moments sont dédoublonnés par leur libellé :

```ts
if (moments.some((m) => m.label === found.label)) continue;
```

Une phrase comme :

```text
Cérémonie à 10h puis cérémonie à 15h.
```

ne produit qu’une seule cérémonie. Le dédoublonnage empêche les doublons
accidentels, mais supprime ici une occurrence réelle.

**Verdict : BUG P1 — ne pas dédupliquer un moment réel par son seul nom.**

Il faut dédupliquer une répétition seulement si elle porte la même preuve et le
même horaire, ou conserver deux occurrences avec un libellé désambiguïsé.

## 5. Ce qui est inventé aujourd’hui au moment de créer

### 5.1 Budget et nombre de personnes

`createRealWedding()` écrit actuellement :

```ts
budgetTarget: params.budgetTarget || 25000,
guestCountTarget: params.guestCountTarget || 100,
```

Le flux Intake ne transmet pas de budget cible à `createRealWedding()` et ne
transmet le nombre d’invités qu’après la création, seulement s’il a été lu.
Ainsi, une phrase sans budget crée tout de même `25000`, et une phrase sans
nombre crée d’abord `100`.

Ce sont des valeurs de démonstration dans un projet utilisateur réel.

**Verdict : BUG P0 — violation directe de « ne jamais inventer ».**

Le modèle de projet doit pouvoir exprimer l’absence d’une cible sans la
confondre avec un nombre réel. La migration du type `WeddingProject` devra être
traitée explicitement, car plusieurs projections consomment actuellement ces
champs comme des nombres.

### 5.2 Date invalide acceptée comme confirmée

La lecture accepte la forme `31 février 2027` et produit `2027-02-31`, avec un
niveau `confirmed`. La validation actuelle vérifie surtout la forme
`AAAA-MM-JJ`, pas l’existence du jour dans le calendrier.

**Verdict : BUG P1 — une donnée grammaticalement valide n’est pas forcément une
date réelle.**

La date doit rester **À CONFIRMER** ou être refusée si le calendrier ne la
reconnaît pas. Aucune normalisation JavaScript sensible au fuseau ne doit
transformer silencieusement le jour.

## 6. Ce qui disparaît entre le rapport et la timeline

### 6.1 Les documents importés ne sont pas construits

`IntakeStudio` affiche `plan.documents` et leurs faits. Ensuite,
`applyIntakePlan()` crée les lieux, les phases, les personnes, les prestataires
et les morceaux, mais ne crée aucun `MediaAsset` pour les documents du plan.

Le document est donc visible dans le rapport puis absent du projet après
« Générer ma journée ». Les fichiers eux-mêmes ne sont pas une source persistée
à ce moment-là.

**Verdict : BUG P0 — rupture de traçabilité.**

La règle architecturale reste `MediaAsset` uniquement. Il ne faut pas créer une
entité Report ou un second système de documents. Il faut décider, dans une passe
dédiée, comment conserver localement un fichier et sa source sans promettre la
lecture d’un PDF ou d’une image que le navigateur n’a pas décodé.

### 6.2 Les preuves du rapport ne suivent pas le projet

Les moments et les entités proposés ont une `evidence` dans `IntakePlan`, mais
cette preuve n’est pas conservée sur les entités créées. La date, le lieu, le
nombre d’invités et les montants n’ont pas de preuve homogène affichée dans le
modèle final.

Le rapport actuel est donc une bonne revue temporaire, mais pas un rapport
ré-auditable après génération.

**Verdict : ÉCART P1 — le rapport doit être une projection issue d’un plan
traçable, pas un texte décoratif.**

### 6.3 Les relations vers la timeline sont absentes

`applyIntakePlan()` :

- crée chaque lieu mais laisse `primaryPlaceId: ''` sur chaque phase ;
- crée les personnes mais ne les rattache pas aux moments ;
- crée les prestataires mais ne les rattache pas aux moments ;
- crée les morceaux mais ne les rattache pas aux moments ;
- ne reporte pas les actions extraites des documents ;
- ne reporte pas les montants dans le budget d’un moment.

Les entités sont donc ajoutées au même projet, mais elles ne forment pas encore
le poste de pilotage contextuel promis par la timeline.

**Verdict : BUG P0 — la chaîne produit des listes parallèles au lieu de
construire le même moment enrichi.**

La relation ne doit être créée que lorsqu’elle est explicitement fondée sur une
preuve. Sinon l’élément reste dans le projet, non rattaché, avec **À CONFIRMER**.

## 7. Atomicité et risque de duplication à la génération

Le bouton `IntakeStudio` exécute :

1. `createRealWedding()` ;
2. `applyIntakePlan()` ;
3. fermeture de l’Intake.

`createRealWedding()` crée déjà les personnes issues de `coupleNames`. Puis
`applyIntakePlan()` ajoute les personnes extraites des fichiers ou de la phrase.
Des gardes par nom existent dans `intakePerson()`, `createPlaceSilently()`,
`createVendorSilently()` et `createTrackSilently()`, ce qui protège quelques
répétitions exactes.

Cette protection n’est pas une identité fiable : `Alice Dupont`, `Alice` et
`Dupont Alice` peuvent encore être trois chaînes différentes. Les documents
provenant de deux sources ne portent pas non plus un identifiant commun.

**Verdict : ÉCART P1 — le parcours doit avoir une commande d’application unique,
ou au minimum un plan d’application atomique et testable.**

Il ne faut pas créer un deuxième registre d’identité. Les personnes restent
`Person`; une correspondance incertaine doit rester **À CONFIRMER**, jamais être
fusionnée silencieusement.

## 8. Rapport crédible : définition opérationnelle proposée

Pour cette passe, « rapport réel » doit signifier une revue avant écriture, pas
un texte génératif :

1. chaque fait affiché vient de la phrase ou d’un fichier réellement lisible ;
2. chaque fait affiche sa preuve ou indique pourquoi elle n’est pas disponible ;
3. les niveaux restent ceux de `certainty.ts` :
   `confirmed`, `inferred`, `estimated`, `to_confirm`, `missing` ;
4. un rôle sans identité devient une question, pas un nom ;
5. une proposition de trame reste visiblement **ESTIMÉE** ;
6. l’utilisateur peut retirer ou corriger avant la création ;
7. l’application crée uniquement les éléments conservés ;
8. après création, la timeline et ses hubs relisent exactement ces mêmes
   éléments, avec leurs relations et leur niveau de certitude ;
9. aucun appel réseau, OCR, IA externe ou recherche Web n’est ajouté.

Le rapport ne doit pas devenir une nouvelle entité. Il peut rester une
projection d’`IntakePlan`, à condition que l’application du plan ne perde pas
les preuves nécessaires au parcours.

## 9. Plan de passe recommandé — sans l’exécuter maintenant

### Passe A — fusionner le parcours

- faire du champ hero l’unique entrée de création publique ;
- ouvrir le même `IntakeStudio`, même quand la phrase est vide ;
- supprimer le contournement public vers `WeddingCreationModal` ou le réduire à
  un renvoi vers le hero ;
- conserver `CreateWeddingModal` et les outils World hors produit principal ;
- ajouter l’acceptation « champ vide → revue → réponse manquante », sans
  restaurer une deuxième création.

### Passe B — fiabiliser la lecture

- corriger le faux couple `Table & Feu` ;
- lire dans la description uniquement les entités explicitement nommées ;
- conserver une question pour un rôle sans nom ;
- corriger les occurrences de moments portant le même libellé ;
- valider réellement les dates ;
- couvrir ces cas par des tests du moteur avant Chromium.

### Passe C — appliquer le plan vers la même timeline

- retirer les valeurs par défaut `25000` et `100` du chemin Intake ;
- traiter l’absence de budget / jauge dans le modèle sans la convertir en fait ;
- relier lieu, personnes, prestataires et morceaux à une phase uniquement avec
  une preuve explicite ;
- décider la persistance des fichiers avec `MediaAsset` uniquement ;
- préserver les preuves sans créer de second système documentaire ;
- rendre l’application du plan unique, idempotente et vérifiable.

### Passe D — vérification réelle

À exécuter après chaque passe concernée :

```text
./node_modules/.bin/tsc --noEmit
pnpm run verify
node scripts/acceptance-convergence-finale.mjs 1440
node scripts/acceptance-convergence-finale.mjs 390
```

Puis ajouter une acceptation Chromium spécifique : phrase détaillée dans le
hero → rapport → corrections → génération → lecture du stockage → même
information dans la pellicule et dans le hub d’un moment.

## 10. Décision à prendre avant l’implémentation

Le constat est suffisamment précis pour commencer par la **Passe A**, mais il
faut confirmer une règle produit :

> Quand le champ du hero est vide, veut-on tout de même ouvrir la revue Intake
> unique, avec les informations manquantes à renseigner, plutôt que d’ouvrir un
> formulaire de création séparé ?

Recommandation : **oui**. Cela rend le parcours cohérent, supprime le doublon
visible, et permet de démarrer avec une première structure estimée sans la
présenter comme une réalité.

**État final de cette passe : audit livré, aucune implémentation de code
réalisée.**

## 11. Audit de la surface claire « Composer »

### 11.1 Rendu réellement observé dans Chromium

Parcours exécuté : création depuis le champ Hero, puis ouverture de la fiche
« Ouvrir les fiches » de la section du lieu.

À 1440 × 900, Chromium rend :

- `#wc-mirror-canvas` en surface fixe, pleine fenêtre (`1440 × 900`) ;
- un masthead ivoire indépendant ;
- une navigation horizontale de six onglets : `Ordre du jour`, `Personnes`,
  `Prestataires`, `Lieux`, `Musique`, `Médias` ;
- trois cartes de moments dans l’onglet `Ordre du jour` ;
- aucune saisie directe de titre, heure, durée, lieu ou note dans ces cartes ;
- douze actions de réglage ou d’ajout réparties dans les cartes, dont
  `Régler ce moment`, `Régler sur ce moment`, `+ Ajouter un morceau` et
  `+ Ajouter un média`.

La capture observée confirme le problème de perception : l’utilisateur quitte
la pellicule noire et arrive dans une page claire avec son propre titre, sa
propre navigation et ses propres cartes. Même si elle lit la même donnée, elle
ressemble à un second poste de pilotage.

### 11.2 Réponses A–G demandées

| Surface | A. Capacité réellement absente du Jour J ? | B/C. Même donnée / mêmes formulaires ? | D/E/F/G. Décision |
|---|---|---|---|
| `CanvasCore` — `ProgrammeSurface` | Réordonner plusieurs moments avec un geste de poignée restée fixe | Oui pour la liaison musique et l’ajout de média ; lecture des autres propriétés | **GARDER seulement comme projection d’ordre accessible**, ou déplacer le geste sur la pellicule ; retirer ses écritures musique/média de cette surface |
| `MomentHub` | Édition contextuelle complète d’un moment, état, documents, tâches, budget, scénarios | Porte principale de l’heure, durée, titre, lieu, personnes, prestataires, notes et contexte | **PORTE PRINCIPALE** pour toute donnée d’un moment |
| `MirrorTimeline` | Lecture éditoriale du déroulé dans le récit | Même `phases`, aucune édition directe | **PROJECTION DE LECTURE** ; ses boutons doivent ouvrir le `MomentHub`, jamais le Canvas |
| `PeopleSurface` / `VendorsSurface` / `PlacesSurface` | Fiches transverses d’entités, pas l’édition d’un moment | Même `Person`, `Vendor`, `Place` ; l’attachement au moment appartient au Hub | **GARDER pour les fiches transverses**, avec retour contextuel vers le moment |
| `MusicSurface` | Édition détaillée d’un morceau, durée et médias audio | Même `TrackEntity` et même liaison à une phase que le Hub | **GARDER pour la fiche musique**, retirer la liaison d’un moment si elle est déjà réglable dans le Hub, ou la rendre clairement secondaire |
| `MediaSurface` | Gestion de la collection et du propriétaire | Même `MediaAsset` ; le rattachement à un moment est aussi proposé par le Hub | **GARDER pour la collection**, mais le rattachement d’un document à un moment doit partir du Hub |
| `OrganisationSection` | Lecture et pilotage transversal : équipe, plan de table, rapports de projet | Même store ; listes de prestataires et documents lisent les relations des phases | **PROJECTION TRANSVERSALE**, pas un éditeur de moment ; chaque action doit renvoyer au Hub |
| `EventPanel` | Édition de l’événement entier : nom, nature, date, lieu principal, jauge | Même `WeddingProject`, mais distinct d’un moment | **GARDER dans le shell du Jour J**, unique porte des propriétés de l’événement |
| `ProjectSettingsModal` | Aucune capacité métier absente d’`EventPanel` pour ces champs | Réédite titre, mariés, date, lieu, jauge et budget | **DOUBLON LEGACY À RETIRER DE L’EXPÉRIENCE PRINCIPALE** ; si conservé pour World, le marquer hors produit |
| `WeddingCreationModal` | Création minimale sans rapport | Même création de projet, avec date et lieu | **SUPPRIMER COMME PORTE PUBLIQUE** au profit de l’Intake unique |
| `CreateWeddingModal` | Création World avec valeurs et formulaires historiques | Même `createRealWedding` | **NE PAS EXPOSER** ; conserver uniquement pour compatibilité World jusqu’à passe dédiée |

### 11.3 Doublons d’écriture précis

Les mêmes opérations métier ont plusieurs portes :

- moment : `TimelineStudio` peut déplacer une carte, `MomentHub` peut déplacer
  avec les flèches, `ProgrammeSurface` peut réordonner avec sa poignée ;
- musique d’un moment : `MomentHub` et `ProgrammeSurface` appellent des
  mutations de liaison différentes mais écrivent la même relation ;
- média d’un moment : `MomentHub` et `ProgrammeSurface` permettent l’ajout,
  `MediaSurface` permet en plus de choisir le propriétaire ;
- scénarios : `SimulationBar`, `MomentHub`, `EventPanel` et `ScenariosPanel`
  peuvent créer ou rejoindre une branche ;
- données d’événement : `EventPanel`, `ProjectSettingsModal`, les deux écrans
  de création et `createRealWedding()` alimentent les mêmes propriétés.

Le doublon le plus gênant visuellement est `CanvasCore` : même sans formulaire
horaire dans sa version actuelle, il conserve une page complète et des actions
sur les relations d’un moment, alors que le Hub est déjà le contexte naturel.

## 12. Audit de la démonstration « Et si… »

### 12.1 Ce que le moteur sait déjà faire correctement

Le moteur existant est réutilisable :

- `propagationImpact()` est une projection pure ;
- il calcule le moment déplacé, les moments suivants, les personnes, les
  prestataires et les conflits ;
- `weatherImpact()` ne touche que les moments déclarés manuellement en
  extérieur ;
- `createScenario()` clone la journée dans une branche ;
- `scenarioShiftPhase()` et `scenarioDiff()` utilisent la même arithmétique ;
- l’application du scénario est explicite et la journée réelle ne bouge pas
  avant validation.

Il n’y a donc pas besoin de nouveau moteur de simulation ou de nouvelle
Timeline.

### 12.2 Ce que le rendu fait réellement

Chromium a été conduit sur un projet réel créé depuis le Hero. Avec le curseur
de retard réglé de `+15 min` à `+60 min` :

- les cartes de la Timeline ont gardé les mêmes positions mesurées
  (`14:00`, `17:00`, `20:00`) ;
- seul le texte du bloc `Et si…` a changé ;
- les moments suivants sont nommés dans une phrase, mais ne sont pas déplacés
  dans une seconde lecture visuelle de la Timeline ;
- le bouton `Décaler pour de vrai` écrit bien dans le réel, de manière explicite.

Avec le curseur pluie à `100` :

- la section prend la classe `wc-sim is-raining` ;
- son fond passe de `rgb(11, 12, 14)` à `rgb(10, 15, 20)` ;
- le texte liste les moments extérieurs exposés ;
- aucune carte de la Timeline ne change d’état visuel ;
- aucun ciel, rideau de pluie, atmosphère ou environnement n’évolue ;
- aucune simulation temporaire n’est matérialisée sur le film lui-même.

**Verdict :** le moteur est honnête et isolé, mais la démonstration est encore
principalement textuelle. Elle ne satisfait pas la demande « la Timeline montre
réellement l’impact ».

La future correction doit ajouter une projection temporaire des horaires sur
les cartes existantes, clairement marquée **SIMULATION**, sans écrire dans
`phases`. Pour la pluie, la première étape sûre est de rendre visibles les
moments concernés dans cette même pellicule et de conserver le scénario météo
comme branche explicite. Une évolution d’ambiance visuelle ne doit pas
introduire un deuxième espace de pilotage.

## 13. Audit de la hiérarchie visuelle et des pictogrammes

### 13.1 Famille existante

`src/components/ui/Icons.tsx` fournit déjà une famille SVG fine et cohérente.
Il n’est pas nécessaire d’ajouter une bibliothèque.

Les surfaces auditées utilisent cependant encore des symboles Unicode isolés :

- `⚠` et `✓` dans les états de moments et le Lab ;
- `☀` et `☔` dans la météo ;
- `↶` et `↷` pour l’historique ;
- `↑`, `↓`, `⠿`, `×` et `→` dans différentes actions.

Les flèches et la poignée peuvent rester des signes de contrôle si leur rôle est
évident et accessible. Les pictogrammes météo et les alertes doivent être
unifiés avec la famille SVG existante, sans transformer chaque ligne en badge.

### 13.2 Accumulation observée

Sur une carte réelle de la pellicule, on observe simultanément :

- l’heure ;
- le badge `ESTIMÉ` ;
- `⚠ Horaire estimé` ;
- `⚠ Lieu à définir` ;
- parfois les compteurs de personnes, prestataires et documents.

L’information est juste, mais sa hiérarchie est trop signalétique. Le même
constat apparaît dans le Hub : l’état du moment et ses actions sont affichés
avant les sept sections repliables, puis une section répète certains états.

**Décision proposée :** garder un seul signal fort sur la carte — l’attention
prioritaire — et intégrer le reste dans une phrase calme ou dans le résumé de
section. Les détails restent dans `MomentHub`.

## 14. Audit de navigation et permissions

### 14.1 Navigation mesurée

À 1440 px, la barre de produit présente huit boutons :

`La journée · Les gens · L’organisation · Souvenirs · Calendrier · Rechercher ·
Mes mariages · Créer`.

À 390 px, elle mesure 135 px de haut. Les quatre destinations de la ligne
principale occupent déjà la largeur ; le bouton `Calendrier` dépasse à droite,
avec une limite mesurée à `430,47 px` pour une fenêtre de `390 px`. Le document
ne déborde pas grâce à `overflow-x: hidden`, mais le contrôle est coupé et non
accessible visuellement.

La barre mélange :

- lieux : `La journée`, `Les gens`, `L’organisation`, `Souvenirs`,
  `Calendrier` ;
- actions : `Rechercher`, `Mes mariages`, `Créer` ;
- administration : `Administration` quand la condition est vraie.

**Verdict :** la séparation sémantique demandée n’est pas encore visible dans
la composition de la barre. Il faut une navigation courte pour les lieux, et des
actions contextuelles ou un menu discret pour le reste.

### 14.2 Permissions réelles

`pilotsSeveralEvents()` masque l’entrée Administration pour un couple qui ne
pilote qu’un événement. C’est une bonne règle d’expérience.

Mais :

- `AdminConsole` est monté selon cette condition d’interface, pas selon
  `store.can(...)` ;
- `can()` retourne `true` en mode local sans membership ;
- il n’existe ni route serveur ni autorité distante dans cet environnement ;
- le masquage d’un bouton n’est donc pas une sécurité réelle.

**Verdict :** il est honnête de parler ici de **politique d’affichage locale**,
pas de contrôle d’accès sécurisé. Une sécurité réelle exige un backend et sort
des contraintes de cette passe. Il ne faut pas prétendre la fournir par une
nouvelle condition React.

## 15. Matrice de convergence

| Fonction | Donnée modifiée | Porte actuelle | Interface principale proposée | Doublon actuel | Décision |
|---|---|---|---|---|---|
| Décrire l’événement | `IntakePlan` | Hero / modales de création | Hero + Intake unique | Oui | Fusionner |
| Corriger nom/date/lieu de l’événement | `WeddingProject` | EventPanel, ProjectSettings, création | EventPanel après création | Oui | Une porte |
| Corriger heure/durée/titre d’un moment | `TimelinePhase` | MomentHub | MomentHub | Ancien Canvas supprimé, Timeline déplace seulement | Garder |
| Déplacer / réordonner un moment | `TimelinePhase` | pellicule, Hub, Canvas Programme | pellicule + accessibilité Hub | Oui, trois portes | Retirer du Canvas ou le rendre lecture/ordre seul |
| Attacher une personne | `phase.personIds` | MomentHub | MomentHub | Non | Garder |
| Attacher un prestataire | `phase.vendorIds` | MomentHub | MomentHub | Non pour l’attache, listes ailleurs | Garder |
| Rattacher musique | `TrackEntity.linkedPhaseId` | Hub, Canvas Programme, MusicSurface | Hub pour le moment, MusicSurface pour la fiche | Oui | Réduire |
| Rattacher un document | `MediaAsset.ownerKind/ownerId` | Hub, Canvas Programme, MediaSurface | Hub pour le moment, MediaSurface pour la collection | Oui | Clarifier |
| Créer une tâche | `TaskEntity` | Hub, Crew / surfaces historiques | Hub | Porte globale secondaire | Contextualiser |
| Créer un scénario | `TimelineScenario` | SimulationBar, Hub, EventPanel, Organisation | SimulationBar / Hub | Oui | Une action principale, projections ailleurs |
| Lire les risques | projections `phaseFindings/projectFindings` | carte, Hub, Lab, Cockpit | carte résumée + Hub détaillé | Pas de second moteur | Garder |
| Tester un retard | état local puis scénario ou écriture réelle | SimulationBar, drag, ScenariosPanel | SimulationBar dans le film | Oui | Une projection visuelle commune |
| Tester la pluie | état local + `weatherImpact` | SimulationBar | SimulationBar + cartes simulées | Pas de second moteur | Étendre sans stocker |
| Lire plusieurs jours | `calendarDays` | CalendarStudio | Calendrier | Non | Projection unique |
| Administrer plusieurs événements | projets persistés | AdminConsole | surface séparée conditionnelle | Politique locale uniquement | Garder hors couple |

## 16. Plan proposé avant implémentation

### Passe 1 — convergence des portes

1. Faire du Hero la porte publique unique, y compris lorsque le champ est vide.
2. Faire de `IntakeStudio` le seul parcours de revue et de création publique.
3. Retirer `WeddingCreationModal` de la navigation normale.
4. Faire de `MomentHub` la seule porte d’édition des propriétés d’un moment.
5. Transformer `CanvasCore` en surface de fiches transverses et d’ordre, sans
   écritures concurrentes sur musique/média de moment.
6. Conserver `MirrorTimeline` comme lecture, avec ouverture du Hub.

### Passe 2 — fiabilité du rapport

1. Empêcher `Table & Feu` ou tout prestataire de devenir les mariés.
2. Lire les données explicitement nommées dans la description Hero, sans
   inventer une identité à partir d’un rôle.
3. Ne plus dédupliquer deux occurrences réelles uniquement par leur libellé.
4. Valider les dates calendaires.
5. Supprimer les valeurs par défaut inventées dans le chemin Intake.
6. Garder l’absence comme `MANQUANT` ou `À CONFIRMER`.

### Passe 3 — continuité rapport → même moment

1. Appliquer le plan sans double écriture de création.
2. Conserver ou rattacher les `MediaAsset` selon une règle explicite.
3. Rattacher un lieu, une personne, un prestataire ou un morceau uniquement si
   la preuve le permet.
4. Transmettre les preuves et les niveaux de certitude jusqu’au Hub.
5. Tester l’idempotence et l’absence de doublon après génération et rechargement.

### Passe 4 — démonstration visuelle dans la pellicule

1. Ajouter un état de projection temporaire, sans modifier `phases`.
2. Faire apparaître les horaires simulés sur les cartes existantes.
3. Identifier visuellement les moments déplacés, les marges et les conflits.
4. Garder les actions explicites : appliquer au réel, créer un scénario, annuler.
5. Faire de la pluie une projection visible sur les cartes extérieures déclarées,
   puis seulement étudier une ambiance visuelle supplémentaire.

### Passe 5 — nettoyage de surface

1. Réduire la barre de navigation mobile et séparer lieux/actions.
2. Unifier les pictogrammes sémantiques avec `Icons.tsx`.
3. Supprimer les doublons `badge + alerte + texte`.
4. Vérifier le Hub fermé, ouvert et le focus clavier à 1440, 768 et 390 px.
5. Vérifier que le couple ne voit jamais la surface d’administration.

## 17. État de cette passe

Audit réel du code et du rendu effectué. Les tests généraux restent verts, mais
l’audit a démontré des défauts spécifiques dans la chaîne et dans le rendu
simulation :

- le Canvas clair est bien une surface pleine page avec sa navigation ;
- il conserve des écritures de relations déjà accessibles depuis le Hub ;
- la simulation actuelle calcule correctement mais ne déplace pas visuellement
  les cartes ;
- la pluie ne change que le bloc de simulation ;
- la navigation mobile coupe le Calendrier ;
- les valeurs par défaut et la rupture rapport → relations restent à corriger.

**Aucune implémentation de code n’a été faite dans cette passe.**

Le plan recommandé commence par la **Passe 1 — convergence des portes**, puis la
fiabilité du rapport. La simulation visuelle et le nettoyage graphique doivent
venir ensuite, afin de ne pas embellir un parcours qui conserverait des
écritures concurrentes.

### 12.3 Premier regard après génération

Le rendu Chromium révèle une autre rupture du parcours : après une génération
réelle contenant `Cérémonie à 14h`, `Cocktail à 17h` et `Dîner à 20h`, la
pellicule conserve son zoom par défaut de `190 px / heure` et commence à
`07:00`.

La première carte commence donc à `1330 px` depuis la gauche. À 1440 px, seuls
110 px de cette carte entrent dans la fenêtre ; à 390 px, aucune carte n’est
visible sans défilement horizontal manuel.

Le résultat est un premier écran majoritairement noir, avec l’événement réel
hors champ. Le rapport a bien généré les phases, mais l’arrivée dans le Jour J
ne montre pas immédiatement la journée produite.

**Verdict : BUG UX P0 pour la chaîne HERO → JOUR J.** Après création ou
ouverture d’un projet, la Timeline doit centrer le premier moment réel, ou
adopter un zoom d’entrée qui rend la journée lisible. Cette correction doit
utiliser le même `TimelineStudio`, pas un aperçu parallèle.

## 18. Conclusion et décision recommandée

Le code possède déjà les briques essentielles : un `IntakePlan` déterministe,
un `MomentHub`, une seule collection `phases`, un moteur de propagation, un
moteur de scénarios et un Calendrier dérivé.

Le problème n’est donc pas une absence de moteur. Il est dans les jonctions :

- deux portes publiques de création ;
- une lecture Hero incomplète et parfois trompeuse ;
- des valeurs par défaut qui deviennent des faits ;
- des documents et relations perdus entre le rapport et les phases ;
- une surface claire qui ressemble encore à un poste concurrent ;
- une simulation honnête mais pas assez visuelle ;
- une Timeline qui peut arriver avec le moment réel hors champ ;
- une navigation mobile qui coupe un contrôle ;
- des alertes et pictogrammes parfois redondants ;
- une administration protégée par affichage local, pas par sécurité réelle.

La séquence de travail recommandée est donc :

1. **Convergence des portes et de l’éditeur** ;
2. **Fiabilité du rapport et absence d’invention** ;
3. **Relations réelles entre le rapport et les moments** ;
4. **Projection visible des simulations dans la Timeline existante** ;
5. **Nettoyage visuel et navigation responsive**.

Cette priorité évite de produire une nouvelle couche graphique sur une chaîne
qui pourrait encore écrire des données par plusieurs chemins.

**Audit terminé. Aucune implémentation de code n’a été réalisée.**

## 19. Décision d’architecture proposée

Cette section ne modifie pas le code. Elle fixe la responsabilité de chaque
surface avant toute suppression.

### 19.1 HERO

**Rôle final :** une seule entrée de description et d’import.

Le Hero ne crée jamais directement un projet. Champ vide ou champ rempli,
flèche et action « Créer » ouvrent le même Intake. Le type d’événement reste
un choix du Hero, car il change le vocabulaire d’analyse.

### 19.2 RAPPORT

**Rôle final :** une revue pré-écriture du même `IntakePlan`.

Le rapport montre les faits, les preuves, les niveaux de certitude, les lacunes
et les corrections. Il ne devient ni une page de gestion durable ni une
nouvelle entité Report.

### 19.3 ÉVÉNEMENT

**Rôle final :** le panneau événement partagé par le Jour J.

`EventPanel` est la seule porte des propriétés de `WeddingProject` : nom,
nature, date, lieu principal, jauge. `ProjectSettingsModal` et les modales de
création historiques ne sont pas des portes du produit principal.

### 19.4 JOUR J / TIMELINE

**Rôle final :** `TimelineStudio` est le poste de pilotage principal.

Il concentre :

- la lecture temporelle ;
- l’ajout et le déplacement de moments ;
- le focus sur le premier moment utile ;
- la simulation temporaire ;
- l’ouverture du `MomentHub` ;
- l’état de chaque moment.

Le clic sur une carte ouvre le `MomentHub` dans le même univers. Le déplacement
par glissement reste un geste propre à la pellicule, validé par la même logique
métier ; il ne doit pas créer un second formulaire de temps.

### 19.5 MOMENTHUB

**Rôle final :** porte unique de toute propriété appartenant directement à un
moment.

Cela comprend : heure, durée, titre, sous-titre, lieu, personnes,
prestataires, musique, médias, tâches, notes, repas, logistique, budget,
certitude et scénarios liés.

Les autres surfaces peuvent résumer ou pointer vers le Hub, mais ne doivent pas
réécrire ces propriétés.

### 19.6 COMPOSER / CANVAS

**Décision proposée :** Composer ne doit plus être une destination de gestion de
la journée.

Le programme du Canvas réordonne les mêmes moments et écrit déjà une partie des
mêmes relations. Il n’a pas de capacité autonome suffisante face à la Timeline
et au MomentHub. Son onglet `Ordre du jour` doit donc sortir de l’expérience
principale.

Les fiches transverses `Personnes`, `Prestataires`, `Lieux`, `Musique` et
`Médias` peuvent rester utiles, car elles travaillent sur une entité à travers
plusieurs moments. Elles doivent être réduites à ce rôle précis :

- pas de seconde Timeline ;
- pas d’édition de propriété d’un moment ;
- pas de bouton « Voir dans le Monde » depuis le produit ;
- retour explicite vers le moment concerné quand une relation est consultée.

Le shell clair pleine page est donc soit transformé en panneau de fiches
transverses secondaire, soit rendu accessible depuis un contexte précis. Il ne
figure plus comme « Composer » dans la navigation du couple.

### 19.7 MIRRORTIMELINE

**Rôle final :** projection éditoriale de lecture, pas outil de pilotage.

Elle peut présenter le récit d’une journée, mais :

- elle ne contient aucun formulaire ;
- un clic sur un moment ouvre le `MomentHub` ;
- un clic sur une relation ouvre la fiche concernée ou le Hub ;
- elle ne doit pas ouvrir le World depuis le produit principal.

Si sa présence crée une impression de Timeline 2, elle doit être réduite à une
lecture narrative ou à un lien de retour vers le Jour J.

### 19.8 CALENDRIER

**Rôle final :** projection de navigation à plusieurs échelles.

Il lit la même date et les mêmes phases, n’édite pas un moment, ne possède pas
de stockage parallèle et renvoie au Jour J en centrant le moment demandé.

### 19.9 ORGANISATION

**Rôle final :** projection transversale pour l’équipe, le plan de table, les
scénarios et les documents répartis sur plusieurs moments.

Elle ne réédite pas un moment. Un élément qui concerne un moment renvoie au
`MomentHub` de ce moment.

### 19.10 ADMINISTRATION

**Rôle final :** surface séparée pour plusieurs événements et coordination.

Elle ne doit pas apparaître comme une rubrique normale d’un mariage de couple.
La condition actuelle est une politique d’interface locale. Elle ne constitue
pas une sécurité technique tant qu’aucun serveur ne porte l’autorité.

## 20. Matrice complète des responsabilités

| Fonction | Donnée | Propriété de quoi ? | Interface actuelle | Interface unique recommandée | Décision |
|---|---|---|---|---|---|
| Décrire le projet | texte + fichiers | intention d’entrée | Hero, `WeddingCreationModal` | Hero → Intake | Fusionner |
| Choisir la nature | `eventTypeId` | événement | Hero, EventPanel, anciennes modales | Hero avant création, EventPanel après | Deux moments du cycle, une écriture par étape |
| Lire les faits | `IntakePlan` | proposition temporaire | IntakeStudio | IntakeStudio | Garder |
| Corriger le rapport | `IntakePlan` | proposition temporaire | IntakeStudio | IntakeStudio | Garder |
| Créer le projet | `WeddingProject` + domaine | événement + projet | Intake, WeddingCreation, CreateWedding | commande unique d’application | Fusionner |
| Nom/date/lieu/jauge | `WeddingProject` | événement | EventPanel, ProjectSettings, créations | EventPanel après création | Retirer les doublons principaux |
| Ajouter un moment | `TimelinePhase` | moment | TimelineStudio, modèles | TimelineStudio | Garder |
| Lire l’heure et la durée | `TimelinePhase` | moment | TimelineStudio, MirrorTimeline, Canvas | TimelineStudio | Les autres lisent seulement |
| Modifier heure/durée/titre | `TimelinePhase` | moment | MomentHub, geste Timeline, anciens Canvas | MomentHub + geste temporel Timeline | Un seul éditeur, geste contrôlé |
| Réordonner les moments | ordre des `phases` | journée | Timeline, MomentHub, Canvas Programme | Timeline, avec accessibilité Hub | Retirer du Canvas |
| Associer un lieu | `primaryPlaceId` | relation moment → lieu | MomentHub, Canvas lecture, fiches | MomentHub | Une porte d’attache |
| Modifier une fiche lieu | `Place` | entité transverse | Canvas Places, anciennes surfaces World | fiche transverse ciblée | Garder hors édition de moment |
| Associer une personne | `personIds` | relation moment → personne | MomentHub | MomentHub | Garder |
| Modifier une personne | `Person` / `Guest` | entité transverse | Canvas People, CrewPanel | fiche transverse ciblée | Garder hors moment |
| Associer un prestataire | `vendorIds` | relation moment → prestataire | MomentHub | MomentHub | Garder |
| Modifier un prestataire | `Vendor` | entité transverse | Canvas Vendors, CrewPanel | fiche transverse ciblée | Garder hors moment |
| Associer musique | `linkedPhaseId` / `phase.trackIds` | relation morceau → moment | MomentHub, Canvas Programme, MusicSurface | MomentHub pour la relation | Retirer la liaison concurrente du Canvas |
| Modifier un morceau | `TrackEntity` | ressource musicale | Canvas Music, MomentHub partiel | fiche musique pour la ressource | Garder une fiche, pas deux relations |
| Associer média/document | `MediaAsset.ownerKind/ownerId` | ressource ou relation | MomentHub, Canvas Programme, MediaSurface | MomentHub pour un moment | Clarifier MediaSurface comme collection |
| Créer une tâche | `TaskEntity` | action liée au moment | MomentHub, Crew / anciens outils | MomentHub pour une tâche de moment | Contextualiser |
| Lire les risques | `phaseFindings` | projection du moment | carte, MomentHub | carte résumé + Hub détail | Garder un seul moteur |
| Lire l’état global | `projectFindings`, `readiness` | projection événement | Lab, Cockpit, Admin | Cockpit + Hub/Lab selon portée | Garder, sans duplication de calcul |
| Créer un scénario | `TimelineScenario` | branche de journée | SimulationBar, MomentHub, EventPanel, Organisation | SimulationBar ou Hub selon contexte | Un moteur, deux contextes lisibles |
| Déplacer en simulation | état temporaire | projection de journée | SimulationBar textuelle | TimelineStudio + SimulationBar | Étendre visuellement |
| Appliquer une simulation | `phases` | journée réelle | SimulationBar, ScenariosPanel | action explicite dans simulation | Garder |
| Déclarer l’extérieur | `phase.outdoor` | propriété du moment | MomentHub | MomentHub | Garder |
| Tester la météo | `weatherImpact` | projection temporaire | SimulationBar | même simulation dans Timeline | Étendre sans stockage parallèle |
| Lire plusieurs jours | `calendarDays` | calendrier dérivé | CalendarStudio | CalendarStudio | Garder |
| Ouvrir un jour | projet actif + focus phase | navigation | Calendrier, Admin, recherche | `openMoment()` puis Timeline | Une porte de focus |
| Lire un moment dans le récit | `phases` | projection éditoriale | MirrorTimeline | lecture + Hub | Pas d’édition locale |
| Explorer le World | projection legacy | outil historique | plusieurs boutons Mirror/Canvas | aucune porte produit | Retirer des surfaces principales |
| Administrer plusieurs événements | projets persistés | exploitation | AdminConsole | Admin séparée, politique locale | Garder hors couple |

## 21. Audit des boutons par nature sémantique

### Naviguer vers un lieu de produit

- `La journée` → `jour-j` ;
- `Les gens` → fiches / projection personnes ;
- `L’organisation` → organisation transversale ;
- `Souvenirs` → médias ;
- `Calendrier` → projection calendrier.

Ces entrées peuvent rester dans une navigation courte, mais elles ne doivent
pas contenir d’écriture cachée.

### Agir

- `Créer` ;
- `+ Ajouter un moment` ;
- `Créer une tâche` ;
- `Générer un document` ;
- `Créer un plan B` ;
- `Appliquer` ;
- `Décaler pour de vrai` ;
- `Abandonner` / `Ne rien changer`.

Ces actions doivent être affichées à proximité de l’objet qu’elles modifient,
pas dans la navigation globale.

### Configurer ou lire un mode

- zoom ;
- `Toute la journée` ;
- `Mode Jour J` ;
- sections d’accordéon ;
- échelles du Calendrier ;
- filtre et recherche.

Ces éléments sont des contrôles de lecture ou de contexte, pas des lieux de
stockage.

### Ouvrir un contexte

- clic sur une carte de moment ;
- `Ouvrir ce moment` ;
- `Régler ce moment` ;
- `Ouvrir ce moment` depuis une simulation ;
- ouverture depuis Calendrier, recherche ou Administration.

Tous doivent converger vers `openMoment()` puis `MomentHub`.

### Administrer

- `Administration` ;
- filtres multi-événements ;
- dossiers personne inter-événements.

Ces commandes restent hors de la navigation courante du couple.

### Accès World à retirer du produit principal

L’audit du code trouve encore des appels et libellés visibles dans :

- `MirrorTimeline.tsx` ;
- `MirrorPeople.tsx` ;
- `MirrorSections.tsx` ;
- `CanvasCore.tsx`.

Exemples : `Voir dans le Monde`, `Explorer dans le Monde`,
`showEventInWorld()`, `showPlaceInWorld()` et `showPersonInWorld()`.

C’est une contradiction concrète avec la décision de ne plus exposer le World
comme destination du produit principal. Une relation lisible doit ouvrir le Hub
ou une fiche, pas changer de projection.

## 22. Couverture du moteur de simulation

Le moteur commun peut recevoir les cas suivants sans nouveau moteur :

| Situation | Calcul commun nécessaire | Projection temporaire | Donnée réelle modifiée seulement après |
|---|---|---|---|
| Retard / avance | décalage signé + propagation | cartes et horaires simulés | validation utilisateur |
| Changement de durée | nouvelle fin + propagation éventuelle | largeur et suites impactées | validation utilisateur |
| Pluie / canicule | sélection des moments extérieurs déclarés | accent visuel, moments concernés, alternatives existantes | création/applicaton d’un scénario |
| Prestataire indisponible | retrait simulé d’une relation + conflits | personnes/moments à risque | validation ou remplacement explicite |
| Déplacement d’un lieu | changement simulé de `primaryPlaceId` | lieu alternatif et impacts | application du scénario |
| Annulation d’un moment | phase marquée dans la branche | carte barrée / suites recalculées | application explicite |
| Moment prolongé | variation de durée ou fin | largeur, marges, collisions | validation utilisateur |

Le contrat commun doit être une projection de branche avec :

- un état source réel immuable pendant le test ;
- un état projeté non persisté ;
- la liste des éléments affectés ;
- les conflits ;
- les marges restantes ;
- les options « appliquer », « créer un scénario », « revenir à la réalité ».

Pour la pluie, aucune météo réelle ne doit être suggérée. Le ciel et la pluie
visuels sont une ambiance de simulation, pas une prévision. Ils peuvent être
animés dans le même environnement de Timeline, sans réintroduire le World comme
seconde destination.

## 23. Plan final en passes

### Passe A — décision d’architecture

- appliquer la matrice ci-dessus comme contrat de responsabilité ;
- sortir Composer de la navigation comme poste de pilotage ;
- conserver seulement les fiches transverses utiles ;
- faire de MomentHub l’unique éditeur contextuel ;
- transformer MirrorTimeline en lecture ;
- retirer les accès World des surfaces principales ;
- réduire la navigation aux lieux, avec actions et contextes à part.

**Garde-fou :** aucun champ supprimé sans retrouver sa porte unique dans
MomentHub, EventPanel ou une fiche transverse.

### Passe B — chaîne HERO → Rapport → Événement

- un seul Intake champ rempli ou vide ;
- correction du faux couple ;
- lecture des entités explicitement nommées ;
- absence de rôle transformé en nom ;
- dates réelles ;
- occurrences non fusionnées à tort ;
- suppression des valeurs par défaut inventées.

### Passe C — application unique

- une commande d’application du plan ;
- documents dans `MediaAsset` uniquement ;
- preuves et certitudes conservées ;
- relations vers les moments fondées sur les preuves ;
- idempotence et absence de doublon après génération et reload.

### Passe D — arrivée intelligente dans le Jour J

- ouverture directe de `TimelineStudio` ;
- cadrage sur la plage réellement créée ;
- premier moment visible immédiatement ;
- focus cohérent si l’entrée vient du Calendrier, de la recherche ou du rapport ;
- MomentHub ouvrable sans changement mental de produit.

### Passe E — simulation visible

- projection temporaire sur les cartes réelles ;
- retard, avance, durée et propagation ;
- conflits et marges visibles ;
- météo simulée et moments extérieurs identifiés ;
- scénario appliqué uniquement après validation ;
- retour à la journée réelle sans écriture cachée.

### Passe F — nettoyage UX

- navigation mobile lisible ;
- actions sorties de la barre globale ;
- pictogrammes sémantiques unifiés avec `Icons.tsx` ;
- une information = un signal principal ;
- suppression des badges redondants ;
- revue visuelle 1440 / 1024 / 768 / 390 px.

## 24. Acceptation de l’architecture avant modification

Les décisions à confirmer avant le premier changement de code sont :

1. `Composer` sort-il bien de la navigation principale comme poste de pilotage ?
2. Ses fiches transverses restent-elles accessibles dans une surface secondaire,
   sans onglet `Ordre du jour` ?
3. `MomentHub` devient-il la porte unique d’édition directe d’un moment ?
4. `MirrorTimeline` reste-t-elle une lecture éditoriale, sans accès World ?
5. La simulation doit-elle projeter les horaires sur les cartes existantes sans
   jamais modifier `phases` avant validation ?
6. Le premier cadrage après génération doit-il se faire sur la plage occupée,
   avec le premier moment réel visible ?

### Recommandation

Je recommande de valider les six points ci-dessus. Ils respectent le moteur
existant, évitent une refonte et donnent une règle simple :

> **La Timeline lit et pilote la journée. Le MomentHub édite un moment. Les
> fiches transverses éditent une entité. Le Calendrier navigue. Le récit lit.
> L’Administration reste séparée.**

**État final : audit complété, matrice des responsabilités produite, aucune
modification de code réalisée. Arrêt avant implémentation.**
