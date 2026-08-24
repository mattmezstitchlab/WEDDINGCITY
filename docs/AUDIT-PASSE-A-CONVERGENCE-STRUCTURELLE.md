# AUDIT DE PASSE A — CONVERGENCE STRUCTURELLE

Date : 24 août 2026  
Dépôt : `mattmezstitchlab/WEDDINGCITY`  
Branche : `arena/01a03367-weddingcity`

## 1. Périmètre exécuté

Cette passe implémente uniquement la décision d’architecture validée :

> La Timeline donne le contexte temporel. Le MomentHub édite le moment. Les
> fiches transverses éditent les entités. Le Calendrier navigue. MirrorTimeline
> lit.

Exclus volontairement de cette passe :

- refonte Hero → Intake ;
- correction de l’analyse métier ;
- documents, preuves et relations issus du rapport ;
- cadrage intelligent après génération ;
- simulation de retard ou météo ;
- nouvelle entité ou nouveau moteur temporel ;
- refonte de marque ou renommage produit de Composer.

## 2. Ce qui a été supprimé

### 2.1 Composer ne pilote plus la journée

Supprimé de `CanvasCore.tsx` et de `CanvasSection` :

- l’onglet `Programme` / `Ordre du jour` ;
- `ProgrammeSurface` ;
- le geste de poignée propre au Canvas ;
- les flèches de réorganisation dans le Canvas ;
- les cartes de moments du Canvas ;
- l’ajout de musique sur un moment depuis le Canvas ;
- l’ajout de médias sur un moment depuis le Canvas ;
- toute écriture directe d’heure, titre, lieu, note ou prestataire depuis cette
  surface.

Le bloc supprimé représentait la seconde surface d’édition de la journée. La
Timeline conserve le déplacement temporel de sa propre pellicule et le
MomentHub conserve les réglages du moment.

### 2.2 Accès World retirés de l’expérience principale

Supprimés des surfaces Mirror / produit :

- `Voir dans le Monde` ;
- `Explorer dans le Monde` ;
- les appels Mirror à `showEventInWorld()` ;
- les appels Mirror à `showPlaceInWorld()` ;
- les appels Mirror à `showPersonInWorld()` ;
- les appels Mirror à `showVendorInWorld()`.

Le World et ses méthodes restent techniquement présents pour les surfaces
legacy et les tests de l’ancien outil. Les boutons World du `CanvasCore` ne sont
rendus que lorsque le shell World est explicitement actif ; ils ne sont plus
rendus dans le shell produit.

### 2.3 Calendrier retiré de la barre principale

Le bouton Calendrier n’est plus au même niveau que les quatre lieux principaux.
Il est accessible depuis le panneau événement avec une navigation contextuelle
vers le `CalendarStudio` existant.

Aucun stockage ou moteur de calendrier supplémentaire n’a été créé.

## 3. Ce qui a été conservé

- `TimelineStudio` comme poste de pilotage principal ;
- `MomentHub` comme éditeur direct du moment ;
- `EventPanel` comme éditeur de l’événement global ;
- `CanvasCore` pour les cinq fiches transverses : Personnes, Prestataires,
  Lieux, Musique, Médias ;
- `MirrorTimeline` comme projection de lecture ;
- `CalendarStudio` comme projection temporelle ;
- `OrganisationSection` pour les besoins transverses, sans édition directe d’un
  moment ;
- les méthodes existantes du store et le moteur temporel ;
- `Person`, `Vendor`, `Place`, `TrackEntity`, `MediaAsset` et `TimelinePhase` ;
- les scénarios existants ;
- les outils World en état dormant / legacy.

Le nom Composer n’a pas été renommé. Dette d’identité documentée : il désigne
encore une surface de fiches alors qu’il ne compose plus la journée. Le
renommage est volontairement différé à une passe dédiée.

## 4. Coquille contextuelle relation → fiche → retour

Un contexte transitoire `canvasReturnPhaseId` a été ajouté au store. Il n’est pas
persisté et ne constitue pas une nouvelle donnée métier.

Parcours vérifié :

```text
Timeline
→ MomentHub / Cérémonie
→ relation Personne
→ fiche transverse Personnes
→ Retour au moment
→ même MomentHub / Cérémonie
```

Le même mécanisme est disponible pour les fiches de prestataire, lieu et
morceau lorsqu’elles sont ouvertes depuis un moment.

La fiche transverse est maintenant un tiroir latéral à droite de l’expérience,
pas une page pleine indépendante. À 1440 px, elle mesure 720 px et laisse la
journée derrière elle ; à 390 px, elle occupe la largeur disponible sans créer
de seconde navigation de journée.

## 5. Matrice finale : donnée → propriétaire → porte d’écriture → interface

| Donnée | Propriétaire | Porte d’écriture | Interface |
|---|---|---|---|
| `TimelinePhase.name` | moment | `setPhaseTitle()` | MomentHub, section Quand & où |
| `TimelinePhase.startHour/endHour` | moment | `setPhaseTime()` / `setPhaseDuration()` | MomentHub ; déplacement temporel de la pellicule |
| `TimelinePhase.subtitle` | moment | `setPhaseSubtitle()` | MomentHub |
| `TimelinePhase.notes` | moment | `setPhaseNotes()` | MomentHub, section Notes |
| `TimelinePhase.outdoor` | moment | `setPhaseOutdoor()` | MomentHub, section Quand & où |
| `TimelinePhase.primaryPlaceId` | relation moment → lieu | `setPhasePlace()` | MomentHub uniquement |
| `TimelinePhase.personIds` | relation moment → personnes | `attachPersonToPhase()` / `detachPersonFromPhase()` | MomentHub uniquement |
| `TimelinePhase.vendorIds` | relation moment → prestataires | `attachVendorToPhase()` / `detachVendorFromPhase()` | MomentHub uniquement |
| `TimelinePhase.trackIds` | relation moment → morceaux | `attachTrackToPhase()` / `detachTrackFromPhase()` | MomentHub uniquement |
| médias du moment | relation moment → `MediaAsset` | `attachMediaToPhase()` | MomentHub uniquement |
| tâches du moment | `TaskEntity.phaseId` | `createTaskForPhase()` / `toggleTaskDone()` | MomentHub |
| budget du moment | `TimelinePhase.budget` | `setPhaseBudget()` | MomentHub |
| repas du moment | `TimelinePhase.meal` | `setPhaseMeal()` | MomentHub |
| logistique du moment | `TimelinePhase.logistics` | `setPhaseLogistics()` | MomentHub |
| scénario du moment | `TimelineScenario` | `createScenario()` / mutations scénario | MomentHub ou SimulationBar |
| `Person` | entité transverse | `createPerson()` / `updatePerson()` | fiche Personnes |
| `Guest` / RSVP / table | entité transverse | mutations invité existantes | fiche Personnes / plan de table |
| `PersonCraft` | entité transverse | `setPersonCraft()` | fiche Personnes / équipe |
| `Vendor` | entité transverse | `createVendor()` / `updateVendor()` | fiche Prestataires |
| `Place` | entité transverse | `createPlace()` / `updatePlace()` | fiche Lieux |
| `TrackEntity` hors relation | entité transverse | création / fiche musique | fiche Musique |
| média de morceau | relation morceau → `MediaAsset` | `addMedia()` avec owner song | fiche Musique |
| `MediaAsset` global | entité transverse | `addMedia()` / `removeMedia()` | fiche Médias |
| `WeddingProject` nom/date/lieu/nature/jauge | événement | `updateEvent()` | EventPanel |
| heure et relation lues | projection | aucune écriture | MirrorTimeline |
| journée multi-échelle | projection | aucune écriture de phase | CalendarStudio |
| état global | projection | aucune écriture | Cockpit / Organisation / Administration |

Exception explicitement assumée : le glissement d’une carte est le geste
natif de pilotage temporel de `TimelineStudio`. Il n’est pas un second
formulaire de moment ; il utilise le même store et la même règle temporelle que
le champ de temps du MomentHub. Toutes les autres propriétés directes du moment
ont le MomentHub comme porte visible unique.

## 6. Vérifications structurelles

Les assertions suivantes sont désormais verrouillées :

- Timeline → ouvre un moment ;
- MomentHub → modifie le moment ;
- une relation → ouvre une fiche transverse ;
- une fiche ouverte depuis un moment → affiche le contexte de retour ;
- Retour → rouvre le même MomentHub ;
- Composer ne contient plus d’onglet Programme ;
- Composer ne contient plus de carte de moment ;
- Composer ne contient plus d’écriture de relation moment → musique/média ;
- la Timeline reste la seule pellicule de pilotage montée ;
- aucun contrôle actif du produit ne mène au World ;
- le Calendrier se déclenche depuis le contexte événement ;
- aucune donnée temporelle parallèle n’a été ajoutée.

## 7. Vérifications exécutées

### TypeScript et suite complète

```text
./node_modules/.bin/tsc --noEmit   OK
pnpm run verify                    OK
```

La suite complète reste verte. Les diagnostics audio affichés sur stderr dans
les tests Node correspondent à l’absence d’AudioContext dans Node et ne sont
pas des échecs de produit.

### Acceptations Chromium

```text
node scripts/acceptance-passe-a.mjs 1440   OK
node scripts/acceptance-passe-a.mjs 1024   OK
node scripts/acceptance-passe-a.mjs 768    OK
node scripts/acceptance-passe-a.mjs 390    OK
```

La nouvelle acceptation vérifie réellement :

- création puis arrivée dans la Timeline ;
- ouverture d’un moment ;
- sections du MomentHub fermées et résumées ;
- ajout d’une personne dans la relation du moment ;
- ouverture de la fiche transverse ;
- retour au même moment ;
- modification du titre dans le MomentHub ;
- relecture du titre dans la Timeline ;
- cinq fiches Canvas, sans Programme ;
- absence de boutons World ;
- une seule pellicule ;
- Calendrier accessible depuis EventPanel et sans formulaire d’édition.

Acceptations existantes adaptées et vérifiées à 1440 px :

```text
node scripts/acceptance-grandjour.mjs 1440
node scripts/acceptance-panneau.mjs 1440
node scripts/acceptance-timeline-convergence.mjs 1440
node scripts/acceptance-chronos.mjs 1440
```

Résultat : **0 échec** sur chacune.

## 8. Limites laissées volontairement pour les passes suivantes

- le parcours champ Hero vide → Intake unique n’est pas encore fusionné ;
- les erreurs d’analyse `Table & Feu`, dates invalides et doublons de moments
  restent pour la Passe B ;
- les valeurs par défaut budget / invités restent pour la Passe B ;
- les documents et preuves du plan restent pour la Passe C ;
- le cadrage initial sur la plage occupée reste pour la Passe D ;
- la projection graphique du retard et de la météo reste pour la Passe E ;
- le nettoyage des badges et pictogrammes reste pour la Passe F ;
- le nom Composer reste inchangé, dette documentée.

**Passe A terminée. Aucune Passe B n’a été lancée.**
