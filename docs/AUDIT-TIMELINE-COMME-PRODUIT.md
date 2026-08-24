# AUDIT — LA TIMELINE COMME PRODUIT

Date : 24 août 2026  
Dépôt : `mattmezstitchlab/WEDDINGCITY`  
Branche : `arena/01a03367-weddingcity`  
État audité : Passe A structurelle, commit `b455dca`

## 1. Objet

Nouvelle direction auditée :

> **Pour l’expérience Mariage, la Timeline n’est plus une destination parmi
d’autres. Elle devient le produit.**

Chaîne cible :

```text
HERO → RAPPORT → ÉVÉNEMENT → JOUR J → TIMELINE
```

Responsabilités cibles :

```text
Timeline       = organiser, comprendre, modifier, simuler, naviguer
MomentHub      = éditer un moment dans son contexte
Fiche          = éditer une entité transverse
Calendrier     = projeter et naviguer dans le temps
MirrorTimeline = lire
Administration = exploiter plusieurs événements, séparément
```

Cet audit précède l’implémentation de convergence. Il n’ajoute aucune
fonctionnalité métier et ne crée aucune nouvelle source de vérité.

## 2. Méthode et état réel

### Code inspecté

- `src/App.tsx` ;
- `MirrorLanding.tsx` et `LandingFilm.tsx` ;
- `MirrorSite.tsx` et `MirrorTimeline.tsx` ;
- `TimelineStudio.tsx`, `MomentHub.tsx`, `EventPanel.tsx`, `SimulationBar.tsx` ;
- `MirrorCanvasShell.tsx`, `CanvasCore.tsx` ;
- `OrganisationSection.tsx`, `ScenariosPanel.tsx`, `CalendarStudio.tsx` ;
- `weddingStore.ts`, `projectWorldModel.ts` ;
- tests et acceptations de la Passe A.

### Rendu Chromium observé

Parcours : projet réel créé depuis le Hero, puis Timeline, fiche transverse,
MomentHub et simulation.

À 1440 px :

- la barre produit possède 7 boutons ;
- la Timeline sombre est montée dans `MirrorSite` ;
- `OrganisationSection` est montée directement sous la Timeline ;
- `MirrorProjection` est montée ensuite avec `MirrorTimeline`, personnes,
  lieux, musique et médias ;
- le Canvas transverse s’ouvre encore dans une coquille dédiée de 720 px ;
- il expose 5 onglets : Personnes, Prestataires, Lieux, Musique, Médias ;
- le MomentHub est un panneau fixe séparé de 560 px.

À 390 px :

- la barre produit mesure environ 135 px de haut ;
- les 4 destinations sont sur une ligne secondaire ;
- les actions sont sur des lignes supérieures ;
- la navigation reste lisible après la Passe A, mais occupe une part importante
  du premier écran.

La chaîne technique fonctionne, mais l’expérience donne encore plusieurs
impressions successives : site éditorial, Timeline, Organisation, récit,
coquille de fiches, calendrier et panneaux.

### Vérifications de base

- `./node_modules/.bin/tsc --noEmit` : OK avant l’audit ;
- `pnpm run verify` : OK avant l’audit ;
- acceptation Passe A à 1440, 1024, 768 et 390 px : OK avant l’audit.

## 3. Diagnostic global

### 3.1 Source de vérité

La bonne nouvelle : la source temporelle reste unique.

- les moments réels sont `weddingStore.phases` ;
- `TimelineStudio`, `MirrorTimeline`, `CalendarStudio`, `OrganisationSection`
  et les scénarios lisent le même store ;
- le calendrier ne possède pas de copie d’heures ;
- les scénarios utilisent `TimelineScenario` et le moteur existant ;
- le MomentHub écrit dans les mêmes entités.

Le problème n’est donc pas un second store. Le problème est le nombre de
surfaces qui donnent l’impression d’être des lieux de pilotage.

### 3.2 Surfaces actuellement montées dans l’expérience Mariage

| Surface | Rôle réel aujourd’hui | Écriture ? | Problème de perception | Décision auditée |
|---|---|---:|---|---|
| `MirrorLanding` | Hero, démonstration, entrée Intake, page éditoriale | état local de démo | ressemble à une landing séparée du produit | rapprocher visuellement de la Timeline ; ne pas faire lire le store démo |
| `TimelineStudio` | film sombre, temps, création, déplacement, simulation | oui | aucune : c’est la bonne surface centrale | **produit principal** |
| `MomentHub` | édition complète d’un moment | oui | panneau séparé mais contextuel | **seul éditeur du moment** |
| `EventPanel` | édition de l’événement entier | oui | panneau contextuel cohérent | garder dans le shell Timeline |
| `OrganisationSection` | Lab, équipe, scénarios, plan de table, documents | oui pour scénarios / plan | grande section verticale sous la Timeline | réduire en projections et renvois contextuels |
| `MirrorProjection` | récit, programme, personnes, lieux, musique, médias | lecture + ouvertures | seconde longue expérience de lecture | conserver seulement comme récit ou projection secondaire, jamais comme pilotage |
| `MirrorTimeline` | lecture éditoriale des mêmes phases | non | seconde représentation du programme | lecture uniquement, CTA vers MomentHub |
| `MirrorCanvasShell` | fiches transverses | oui pour entités | tiroir clair avec 5 onglets | conserver comme fiche contextuelle, pas comme Composer |
| `CalendarStudio` | année, mois, semaine, jour | non sur phases | modale indépendante | projection navigable depuis Timeline/EventPanel |
| `ScenariosPanel` | création, comparaison, application de scénarios | oui | troisième endroit de scénario après Hub/SimulationBar | projection comparative ; création depuis Timeline/Hub |
| `AdminConsole` | plusieurs événements, dossiers, alertes | lecture | doit rester séparée | hors expérience du couple |

## 4. Audit fonctionnel complet

| Fonction | Donnée | Propriétaire | Porte d’édition actuelle | Surface actuelle | Doublon | Décision cible |
|---|---|---|---|---|---|---|
| Décrire le mariage | texte / fichiers | intention | Hero → Intake | Landing | pas encore une seule arrivée | Hero ouvre toujours le même Intake |
| Voir ce qui a été compris | `IntakePlan` | proposition | IntakeStudio | écran de revue | non | Rapport temporaire |
| Nom du mariage | `WeddingProject.coupleNames/title` | événement | EventPanel, anciennes modales | EventPanel + legacy | oui hors principal | EventPanel |
| Date du mariage | `WeddingProject.weddingDate` | événement | EventPanel, anciennes modales | EventPanel + legacy | oui hors principal | EventPanel |
| Lieu principal | `WeddingProject.locationName` | événement | EventPanel, anciennes modales | EventPanel + legacy | oui hors principal | EventPanel |
| Ajouter un moment | `TimelinePhase` | moment | `createPhase()` | TimelineStudio | non | TimelineStudio |
| Titre du moment | `TimelinePhase.name` | moment | `setPhaseTitle()` | MomentHub | non | MomentHub |
| Heure / durée | `startHour/endHour` | moment | Hub + glissement Timeline | Hub + Timeline | geste temporel assumé | Hub pour champ, Timeline pour geste |
| Réordonner | ordre des phases | journée | Timeline + Hub | Timeline + Hub | deux gestes cohérents | Timeline, contrôle contextuel Hub |
| Lieu d’un moment | `primaryPlaceId` | relation moment → lieu | MomentHub | Hub | non | MomentHub |
| Personne d’un moment | `personIds` | relation moment → personne | MomentHub | Hub | non | MomentHub |
| Prestataire d’un moment | `vendorIds` | relation moment → prestataire | MomentHub | Hub | non | MomentHub |
| Musique d’un moment | `trackIds/linkedPhaseId` | relation moment → morceau | MomentHub | Hub | Canvas relation supprimée en Passe A | MomentHub |
| Média d’un moment | `MediaAsset.ownerId` | relation moment → média | MomentHub | Hub | Canvas moment supprimé en Passe A | MomentHub |
| Tâche d’un moment | `TaskEntity.phaseId` | tâche | MomentHub + surfaces d’équipe | Hub + Organisation | oui pour la lecture / action | création depuis Hub, lecture ailleurs |
| Budget d’un moment | `phase.budget` | moment | MomentHub | Hub | non | MomentHub |
| Note d’un moment | `phase.notes` | moment | MomentHub | Hub | non | MomentHub |
| Personne générale | `Person` / `Guest` | entité transverse | Canvas People, CrewPanel | fiche + Organisation | plusieurs fiches de lecture | fiche contextuelle, Crew en projection |
| Fiche prestataire | `Vendor` | entité transverse | Canvas Vendors, CrewPanel | fiche + Organisation | plusieurs lectures | fiche contextuelle |
| Fiche lieu | `Place` | entité transverse | Canvas Places, MirrorPlaces | fiche + récit | plusieurs lectures | fiche contextuelle |
| Fiche morceau | `TrackEntity` | entité transverse | Canvas Music, Hub partiel | fiche + récit | plusieurs lectures | fiche contextuelle, relation dans Hub |
| Fiche média | `MediaAsset` | entité transverse | Canvas Media, galerie | fiche + récit | plusieurs lectures | fiche contextuelle, rattachement dans Hub |
| Risques du moment | `phaseFindings()` | projection | Timeline + MomentHub | carte + Hub | même moteur, deux niveaux | carte résumé + Hub détail |
| État global | `readiness()` / `projectFindings()` | projection événement | Cockpit + Lab | Timeline + Organisation | portée différente | Cockpit global, détail contextuel |
| Retard | projection / phase réelle / scénario | simulation | drag, SimulationBar, ScenariosPanel | 3 surfaces | oui | SimulationBar dans Timeline + Hub si moment sélectionné |
| Météo | `weatherImpact()` | projection | SimulationBar | Timeline | moteur unique | Timeline, projection visuelle temporaire |
| Plan B | `TimelineScenario` | branche journée | SimulationBar, Hub, EventPanel, Organisation | 4 surfaces | oui | créer depuis Timeline/Hub ; comparer en projection |
| Calendrier | `calendarDays()` | projection | CalendarStudio | modale | destination secondaire | ouvrir depuis Timeline/EventPanel, aucune écriture |
| Récit du programme | `MirrorTimeline` | projection | MirrorProjection | longue section | seconde Timeline visuelle | lecture seule, pas de pilotage |
| Administration | projets / alertes | exploitation | AdminConsole | nav conditionnelle | non, mais trop proche du produit | séparée |

## 5. Verdict sur Composer

### Ce qu’il ne doit plus être

Composer ne doit plus :

- représenter la journée ;
- lister des cartes de moments ;
- réordonner les phases ;
- modifier une relation moment → musique ;
- modifier une relation moment → média ;
- éditer un champ appartenant à `TimelinePhase` ;
- ouvrir le World ;
- être présenté comme un lieu de composition du mariage.

Ces responsabilités sont désormais hors du Canvas.

### Ce qu’il peut encore être techniquement

La surface claire conserve une valeur uniquement pour l’édition d’entités
transverses : Personne, Prestataire, Lieu, Morceau, Média.

Mais elle ne doit plus se présenter comme une application parallèle. La forme
cible est un tiroir contextuel ouvert depuis la Timeline ou le MomentHub, avec :

- une seule fiche active à la fois ;
- les autres onglets conservés seulement comme accès secondaire transverse ;
- un contexte de retour explicite ;
- aucun programme ;
- aucune relation de moment éditée dans ce tiroir.

Le nom `Composer` reste une dette d’identité et ne doit pas être renommé dans
cette passe si cela force une refonte de vocabulaire.

## 6. Verdict sur la Landing Mariage

### État actuel

`MirrorLanding` est encore une page éditoriale autonome :

- Hero plein écran ;
- champ et import ;
- `LandingFilm` de démonstration ;
- plusieurs sections de démonstration ;
- scénarios de démonstration ;
- équipe, musique, documents et administration racontés dans la page.

Ce contenu est utile comme présentation produit, mais il ne donne pas le
sentiment « je suis déjà en train de construire mon mariage ». Il existe une
rupture nette entre cette landing et `TimelineStudio`.

### Décision proposée

- conserver les assets éditoriaux statiques du produit ;
- ne jamais faire lire la démo comme les données d’un mariage ;
- réduire la page d’entrée à Hero + apparition de la pellicule de démonstration
  comme objet visuel ;
- faire du champ Hero la première action de cette pellicule, pas une porte vers
  une autre application ;
- après génération, entrer directement dans `TimelineStudio` ;
- ne pas monter simultanément la landing et une autre journée réelle.

La démonstration publique peut rester un récit statique distinct des données,
mais elle ne doit pas être présentée comme un second outil de planification.

## 7. Verdict sur le MomentHub

Le Hub contient aujourd’hui sept sections, toutes repliées :

- Quand & où ;
- Qui ;
- Ce qu’on y vit ;
- Logistique & budget ;
- Documents & tâches ;
- Scénarios ;
- Notes.

Cette structure est acceptable et progressive. Le risque actuel ne vient pas du
nombre de sections mais des actions placées hors contexte :

- l’état et ses actions sont affichés avant les sections ;
- les scénarios sont également pilotables depuis Organisation et SimulationBar ;
- les fiches transverses ne sont pas encore toutes accessibles avec un retour
  explicite au moment depuis le Hub.

Décision : conserver la structure et réduire les portes concurrentes, plutôt
qu’ajouter de nouvelles sections.

## 8. Verdict sur la simulation

### Moteur existant

Le même moteur peut porter les cas suivants :

| Cas | Mécanisme réutilisable |
|---|---|
| retard / avance | delta de temps + propagation |
| changement de durée | nouvelle fin + propagation |
| pluie / canicule | filtrage des moments `outdoor` déclarés |
| prestataire indisponible | relation simulée absente + conflits |
| déplacement de lieu | changement de `primaryPlaceId` dans une branche |
| annulation | phase absente ou désactivée dans la branche |
| dépendance | recalcul des phases suiveuses et collisions |

### Rendu actuel

Le retard et la météo sont encore principalement textuels. Les cartes de la
Timeline ne reçoivent pas d’état projeté temporaire.

Décision : ajouter plus tard une projection temporaire dans les cartes
existantes, sans toucher au store réel avant validation. La pluie peut modifier
l’atmosphère visuelle de la Timeline, mais ne doit jamais devenir une
prévision réelle ni une seconde scène interactive.

## 9. Verdict sur les pictogrammes et badges

`Icons.tsx` fournit déjà la bonne famille SVG, mais les surfaces utilisent
encore des caractères Unicode pour des informations sémantiques :

- `⚠` et `✓` ;
- `☀` et `☔` ;
- flèches et symboles d’historique ;
- poignée et suppressions.

Les cartes cumulent parfois :

```text
ESTIMÉ + ⚠ Horaire estimé + ⚠ Lieu à définir + compteurs
```

Décision : une information importante doit recevoir un signal principal. Les
icônes météorologiques, alertes et états sémantiques doivent être harmonisés ;
les flèches de manipulation peuvent rester des contrôles si leur aria-label
est clair.

## 10. Navigation et permissions

La navigation principale doit devenir un accès au contexte, pas un catalogue.

Proposition :

- garder le wordmark ;
- garder un accès court à `La journée` si nécessaire ;
- garder `Rechercher`, `Mes mariages` et `Créer` comme actions ;
- retirer les destinations `Les gens`, `Organisation`, `Souvenirs` de la barre
  principale si elles sont accessibles depuis la Timeline et les fiches ;
- ouvrir le Calendrier depuis l’événement ou la Timeline ;
- laisser l’Administration dans une surface distincte, jamais dans le parcours
  du couple.

Comme il n’existe pas de serveur, aucune condition d’affichage ne doit être
présentée comme une sécurité. L’autorité technique reste absente en mode local.

## 11. Plan d’implémentation proposé

### Passe 1 — Timeline = expérience principale

- réduire `MirrorSite` à Timeline + contextes nécessaires ;
- ne plus monter Organisation et le récit comme des pages de pilotage sous la
  Timeline ;
- conserver leurs capacités utiles comme projections ou fiches contextuelles ;
- conserver `MirrorTimeline` uniquement en lecture secondaire ;
- faire du tiroir transverse une coquille depuis la Timeline, pas une destination
  Composer.

### Passe 2 — Hero continu avec la Timeline

- moderniser le Hero pour reprendre la grammaire de la pellicule ;
- laisser percevoir la Timeline sous le champ ;
- conserver le rapport Intake comme revue temporaire ;
- entrée réelle après validation vers la Timeline.

### Passe 3 — Convergence métier du rapport

- corriger faux couple, dates et doublons ;
- supprimer valeurs par défaut inventées ;
- préserver preuves, documents et relations.

### Passe 4 — Focus d’arrivée

- centrer la pellicule sur la plage effectivement créée ;
- garantir que le premier moment est visible ;
- conserver un seul `TimelineStudio`.

### Passe 5 — Simulation visuelle

- projection temporaire des heures et impacts sur les cartes ;
- retard, avance, durée, conflits, marges ;
- météo visuelle dans la même Timeline ;
- aucune écriture avant validation.

### Passe 6 — Nettoyage premium

- une information = un signal ;
- pictogrammes SVG cohérents ;
- badges réduits ;
- navigation mobile courte ;
- revue 1440 / 1024 / 768 / 390 px.

## 12. Conclusion

La Passe A a supprimé le doublon le plus évident : le programme éditable du
Composer. Mais le produit conserve encore trois impressions concurrentes :

1. la Landing éditoriale ;
2. la Timeline de pilotage ;
3. les grandes sections Organisation / récit sous la Timeline.

Le prochain travail doit donc viser la **convergence de la surface principale**,
pas l’ajout de fonctionnalités.

La règle finale recommandée est :

> **Une journée réelle est montrée et pilotée par une seule Timeline. Un moment
> ouvre un seul MomentHub. Une entité ouvre une seule fiche contextuelle. Le
> Calendrier navigue. Le récit lit. L’Administration reste ailleurs.**

**Audit réalisé. Aucune modification de code n’a été effectuée pendant cette
étape d’audit.**

## 13. État après implémentation de la convergence

L’audit précédent a été suivi d’une implémentation ciblée. Aucun nouveau moteur
ni aucune nouvelle entité métier n’a été ajouté.

### Surface principale

`MirrorSite` rend maintenant :

1. `TimelineStudio` ;
2. un contexte replié `Ressources transverses` ;
3. un contexte replié `Lire le déroulé` qui réutilise `MirrorTimeline`.

`OrganisationSection` n’est plus une section autonome placée sous la Timeline.
Elle ne s’ouvre qu’à la demande. Son éditeur de scénarios a été retiré : les
scénarios se créent et se testent depuis la Timeline ou le moment concerné.

`MirrorProjection` n’est plus monté dans l’expérience active. Ses anciens
rendus restent dans le code legacy, mais ils ne forment plus une page de gestion
accessible au couple.

### Landing publique

`MirrorLanding` est réduite à :

- un Hero visuel ;
- le champ d’intelligence d’entrée ;
- la pellicule de démonstration existante, explicitement non réelle ;
- une explication courte du rapport ;
- la liste des événements réellement créés dans ce navigateur.

Le champ vide et le champ rempli passent par le même `IntakeStudio`. La
pellicule publique est une démonstration statique du produit, pas un second
projet ni un second store.

Le Hero a été raccourci pour laisser apparaître la première partie de la
pellicule avant la fin du premier écran. Le rendu est passé d’un Hero isolé à
une continuité visuelle Hero → film.

### Composer / fiches

`CanvasCore` n’a plus de surface Programme. Ses cinq fiches transverses restent
accessibles par le bouton `Fiches` situé dans la Timeline et depuis les
relations.

La coquille Mirror est maintenant un tiroir latéral :

- 720 px maximum sur grand écran ;
- largeur totale sur téléphone ;
- Timeline visible derrière elle ;
- retour explicite au moment quand elle a été ouverte depuis MomentHub.

### Simulation

`SimulationBar` transmet une projection temporaire à `TimelineStudio`.

Le rendu vérifié montre maintenant :

- les cartes déplacées temporairement ;
- les heures réelles et projetées ;
- les cartes impactées ;
- une barre explicite `Simulation` ;
- un bouton `Revenir à la réalité` ;
- une atmosphère de pluie simulée dans la pellicule ;
- les moments extérieurs identifiés par le moteur existant.

La journée réelle n’est pas modifiée pendant le déplacement du curseur. Les
seules écritures restent les actions explicites d’application ou de création
d’un scénario.

### Hiérarchie visuelle

- le signal `Horaire estimé` n’est plus répété dans les lignes d’état de chaque
  carte quand le niveau de certitude est déjà affiché près de l’heure ;
- les alertes et confirmations des cartes, du Hub et de l’Organisation
  utilisent les icônes SVG existantes ;
- les pictogrammes météo Unicode ont été remplacés par la famille existante ;
- les contrôles de déplacement gardent leurs flèches car elles décrivent une
  action de clavier ou de mouvement, et non une information décorative.

### Cadrage de la journée

À l’arrivée sur un projet actif, `TimelineStudio` centre automatiquement le
premier moment réel. Cette opération modifie uniquement le scroll de la
pellicule : elle ne modifie aucune phase.

## 14. Vérifications après implémentation

### TypeScript, tests et build

```text
./node_modules/.bin/tsc --noEmit   OK
pnpm run verify                    OK
pnpm run build                     OK
```

### Chromium

L’acceptation dédiée `acceptance-timeline-convergence.mjs` couvre :

- Landing Hero + pellicule de démonstration ;
- une seule pellicule active ;
- MomentHub replié ;
- simulation de retard dans les cartes ;
- projection météo dans les cartes ;
- aucune écriture réelle avant validation ;
- calendrier sans formulaire ;
- absence d’administration pour un couple.

L’acceptation `acceptance-passe-a.mjs` couvre :

- Hero → Intake → Timeline ;
- centrage du premier moment ;
- Timeline → MomentHub ;
- relation → fiche transverse ;
- fiche → retour au même MomentHub ;
- cinq fiches Canvas ;
- navigation réduite ;
- aucun bouton World ;
- une seule pellicule.

Les deux acceptations sont prévues aux largeurs 1440, 1024, 768 et 390 px.

## 15. Limites conservées volontairement

Cette implémentation n’a pas corrigé les problèmes métiers identifiés dans
`docs/AUDIT-CHAINE-HERO-INTAKE-TIMELINE.md` :

- faux couple `Table & Feu` ;
- validation sémantique des dates ;
- valeurs par défaut budget / invités ;
- conservation des documents et preuves du rapport ;
- application unique et relations rapport → moments.

Ces points restent une passe métier séparée. L’ajout de la projection de
simulation ne change pas cette séparation.

**Convergence de surface implémentée. La prochaine passe ne doit pas démarrer
automatiquement.**
