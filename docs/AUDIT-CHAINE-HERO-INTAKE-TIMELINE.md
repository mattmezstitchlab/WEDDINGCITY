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
