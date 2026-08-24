# AUDIT — CONVERGENCE UX FINALE DE LA TIMELINE

Dépôt `mattmezstitchlab/WEDDINGCITY` · branche `arena/01a02c94-weddingcity` · HEAD audité **`6d15128`**.
Mesuré dans le code et dans Chromium. **Aucune ligne n'a été écrite avant cet audit.**

---

## 1. Toutes les interfaces existantes

| # | Surface | Fichier | Nature | Atteinte par |
|---|---|---|---|---|
| S1 | **Pellicule sombre** | `timeline/TimelineStudio.tsx` (900 l.) | orchestration | l'arrivée dans un événement |
| S2 | **Panneau du moment** | `timeline/MomentHub.tsx` (1 000 l.) | édition | clic « Ouvrir » sur une carte |
| S3 | **Panneau de l'événement** | `timeline/EventPanel.tsx` | édition | bouton « L'événement » |
| S4 | **Composer clair** | `canvas/CanvasCore.tsx` (1 400 l.) + `MirrorCanvasShell` | édition/composition | 14 boutons « Composer » dans le récit éditorial |
| S5 | **Calendrier** | `calendar/CalendarStudio.tsx` | navigation temporelle | nav « Calendrier » |
| S6 | **Administration** | `admin/AdminConsole.tsx` | exploitation | nav « Administration » |
| S7 | **Recherche** | `GlobalSearch.tsx` | navigation | nav « Rechercher » |
| S8 | **Organisation** | `organisation/{OrganisationSection,CrewPanel,ScenariosPanel,SeatingPlan}` | lecture + édition métier | scroll sous la pellicule |
| S9 | **Récit éditorial** | `MirrorSite` → `MirrorHero/Timeline/People/Sections` | lecture publique | scroll |
| S10 | **Landing** | `MirrorLanding.tsx` | démonstration | hors projet |
| S11–S25 | modales de l'ère World | `ui/*.tsx` | — | **inatteignables** (`projection === 'world'`) |

**Neuf surfaces vivantes.** Trois d'entre elles éditent les mêmes objets.

## 2. Toutes les fonctionnalités, et leur porte

## 3. Matrice des doublons (mesurée, appel par appel)

| Fonction | Où elle existe aujourd'hui | Doublon ? | Porte principale retenue |
|---|---|---|---|
| **Heure d'un moment** | S1 (glisser), S2 (champ) | non — un geste, un champ, même objet | **S2**, le geste reste un raccourci |
| **Titre** | S2 | non (corrigé la passe précédente) | S2 |
| **Lieu du moment** | S2 · S4 (affichage seul) | non | S2 |
| **Personnes du moment** | S2 · S4 (affichage) · S9 (lecture) | non | S2 |
| **Prestataires du moment** | S2 · S4 (affichage) | non | S2 |
| **Documents** | S2 · S8 (liste par moment) · S6 (recherche) | **lecture multiple, édition unique** | S2 |
| **Tâches** | S2 · S8 | lecture multiple | S2 |
| **Musique du moment** | S2 · S4 (chips) · S9 | lecture multiple | S2 |
| **Plan B / scénarios** | S1 (barre de propagation) · S2 (action) · S8 (`ScenariosPanel`) | **3 portes de création** | **S2** ; S1 = raccourci contextuel ; S8 = comparaison |
| **Fiche personne** | S4 · S9 (lecture) | non | S4 |
| **Fiche prestataire / lieu** | S4 | non | S4 |
| **RSVP / table / régime** | S4 · `SeatingPlan` (table) | **table éditable deux fois** | `SeatingPlan` pour la table, S4 pour le reste |
| **Événement (nom/date/lieu/nature)** | S3 | non | S3 |
| **Réordonner les moments** | S4 (flèches) · S1 (glisser) | **oui, deux gestes différents** | **S1** |
| **Météo** | **nulle part** | — | à créer |
| **Retard / simulation** | S1 (uniquement en déplaçant réellement une carte) | — | à étendre |
| **Ouvrir un moment** | S1, S3, S5, S6, S7 → `store.openMoment()` | non — une porte unique | ✓ |

**Trois doublons réels subsistent** : la création d'un plan B (3 portes), le réordonnancement
(2 gestes), l'affectation à une table (2 endroits). Plus une **surface entière en question** : S4.

## 4. Toutes les portes d'édition

`setPhase*` : S2 uniquement (après la passe précédente). `updateEvent` : S3 uniquement.
`updatePerson/Vendor/Place`, `setGuest*` : S4 uniquement. `assignGuestToTable` : S4 + `SeatingPlan`.
`createScenario` : S1 + S2 + S8. `movePhaseToIndex` : S4 uniquement (les flèches) — alors que le
même résultat s'obtient au glisser sur S1.

## 5. La question du §3 du brief — le Composer apporte-t-il quelque chose ?

**Réponse : oui, mais pas ce qu'on croit — et pas là où il est.**

Ce que S4 fait **et que rien d'autre ne fait** : éditer la **fiche d'une personne** (contact, notes,
relations), la **fiche d'un prestataire**, la **fiche d'un lieu**, le **RSVP** et le **régime** d'un
invité. Ce sont des objets **transverses**, qui n'appartiennent à aucun moment.

Ce que S4 fait **en double** : afficher le programme avec des flèches de réordonnancement, c'est-à-dire
une deuxième lecture ordonnée de la journée — **le début d'une Timeline 2**.

**Décision :** le Composer **n'est pas supprimé** (il détient cinq éditions uniques), mais :
1. sa surface « Programme » — la seule qui imite la Timeline — est **retirée de ses onglets** ;
2. ses quatorze boutons « Composer » disparaissent du récit ; on y entre **par l'objet** (une
   personne, un prestataire, un lieu), jamais par une vue du temps ;
3. il est renommé dans l'interface par ce qu'il est : **« Fiches »**.

Il cesse d'être une seconde Timeline sans qu'aucune fonction ne disparaisse.

## 6. Composants à conserver tels quels

`TimelineStudio` (la Timeline), `MomentHub` (six accordéons), `EventPanel`, `PanelSection`,
`CalendarStudio` (navigation), `GlobalSearch`, `ScenariosPanel` (comparaison de rails),
`SeatingPlan`, `CrewPanel`, tout le moteur.

## 7. Composants transformés en projection (lecture) ou en accès par l'objet

- **`CanvasCore`** : onglet « Programme » retiré ; entrée par objet ; libellé « Fiches ».
- **Récit éditorial (S9)** : reste en lecture ; ses boutons « Composer » deviennent des liens vers
  le bon objet ou le bon moment.

## 8. Composants rendus inaccessibles

Aucun de plus : les quinze modales de l'ère World le sont déjà. **L'Administration** cesse d'être
visible pour un couple (voir §11).

## 9. Nouvelle architecture de navigation

Aujourd'hui : **huit** entrées + trois actions + le logo = douze objets dans une barre.
Mesuré : à 1440 px la barre tenait sur deux lignes avant correction.

Proposition, quatre entrées et deux actions :

| Entrée | Ce qu'elle contient |
|---|---|
| **La journée** | la pellicule (`jour-j`) — et « Aujourd'hui » n'est plus une entrée séparée : c'est un mode de la pellicule |
| **Calendrier** | l'échelle supérieure |
| **Les gens** | Personnes + Spectacle (équipe) — un seul mot pour les humains |
| **L'organisation** | Organisation + Documents + Musique + Souvenirs |
| *action* Rechercher | inchangée |
| *action* Créer / Mes événements | inchangées |
| *action* **Administration** | **seulement** pour qui pilote plusieurs événements (§11) |

## 10. Hiérarchie UX visée

```
LA JOURNÉE (pellicule)
   └── un moment          → panneau contextuel, six sections fermées
   └── « ET SI… »         → simulation dans la pellicule, jamais ailleurs
   └── l'événement        → panneau contextuel, même coquille
CALENDRIER                → une échelle au-dessus, aucune édition
LES GENS / L'ORGANISATION → projections, et les fiches transverses
ADMINISTRATION            → hors du parcours d'un couple
```

## 11. L'Administration et les mariés

Mesuré : `isOrchestrator()` renvoie `owner || planner`, et **le couple est `owner`** de son propre
mariage. L'entrée « Administration » leur est donc visible aujourd'hui — exactement ce que le brief
refuse.

**Règle retenue, honnête et mesurable** : l'Administration n'apparaît que si l'une des deux
conditions est vraie —
1. le rôle est `planner` (quelqu'un qui organise pour autrui) ;
2. **ce navigateur détient plus d'un événement réel** (hors démonstration) — c'est la définition
   même de « piloter plusieurs événements ».

Un couple avec son seul mariage ne la voit jamais, et rien n'est inventé : les deux conditions se
lisent dans des données existantes.

## 12. Risques de régression

| # | Risque | Parade |
|---|---|---|
| R1 | Retirer l'onglet Programme du Composer casse `check-mirror-canvas` / `check-canvas` | vérifier, et adapter le localisateur en documentant la garantie |
| R2 | Regrouper la navigation casse les acceptations qui cliquent `nav-people`, `nav-music`… | **conserver tous les `data-jourj` existants** sur les entrées regroupées |
| R3 | Fermer « Quand & où » par défaut rallonge le parcours le plus fréquent | mesurer : la section porte déjà son résumé ; un clic |
| R4 | Une simulation météo sans donnée météo serait une invention | la condition est **saisie par l'utilisateur** ; le caractère extérieur d'un moment est **déclaré**, jamais deviné |
| R5 | Cacher l'Administration à un `owner` la rend introuvable pour un vrai administrateur mono-événement | il suffit d'un second événement, ou du rôle `planner` ; c'est documenté ici |
| R6 | Remplacer les emojis par des icônes SVG alourdit le rendu | réutiliser `ui/Icons.tsx`, déjà présent, **jamais un second jeu** |

## 13. Ce qui sera réellement implémenté dans cette passe

1. **Composer → « Fiches »** : onglet Programme retiré, entrées « Composer » du récit remplacées par
   des liens vers l'objet ou vers le moment.
2. **Navigation regroupée** : huit entrées → quatre, sans perdre un seul point d'entrée.
3. **Administration invisible à un couple** (règle du §11).
4. **« ET SI… » dans la pellicule** : un curseur de retard qui appelle le vrai `propagationImpact()`
   — moments décalés, personnes et prestataires nommés, conflits — et les quatre issues.
5. **Simulation météo honnête** : un curseur soleil → pluie, une heure, et l'identification des
   moments **déclarés en extérieur** (nouveau drapeau `outdoor`, saisi dans le panneau du moment).
   Plan B proposé, jamais appliqué.
6. **Section « Scénarios » dans le panneau du moment**, pour que la création d'un plan B ait une
   porte évidente à l'endroit du moment.
7. **Icônes** : les emojis des surfaces produit remplacés par `ui/Icons.tsx` (jeu existant, trait
   1,8, 24×24) — aucun second jeu d'icônes.
8. **Toutes les sections du panneau fermées par défaut** (§5 du brief).
9. **`acceptance-timeline-convergence.mjs`** à **1440 / 1024 / 768 / 390**.

## 14. Ce qui est explicitement refusé

- **Une météo réelle** : aucun service réseau n'est connecté. Le curseur est une **simulation
  pilotée par l'utilisateur**, et l'interface l'écrit noir sur blanc. Aucune prévision n'est
  affichée, aucune API n'est appelée.
- **Deviner qu'un moment est en extérieur** à partir de son nom (« Photos », « Cocktail ») : ce
  serait une invention. L'utilisateur le déclare, en un clic.
- **Supprimer le Composer** : il détient cinq éditions qui n'existent nulle part ailleurs.
- **Supprimer une entrée de navigation** : elles sont regroupées, aucune destination ne disparaît.
- **Toucher au moteur temporel** : ni les 30 heures, ni Chronos, ni les scénarios.
- **Un second jeu d'icônes**, un second panneau, une seconde Timeline.


---

## 15. ÉTAT APRÈS IMPLÉMENTATION

Vérifié dans Chromium réel (149.0.7827.0) à **1440 / 1024 / 768 / 390 px** :
`scripts/acceptance-timeline-convergence.mjs` — **0 échec aux quatre largeurs**.
`pnpm run verify` — 0 échec. Build : `✓ built in 8,0 s`.
Les **neuf** acceptations navigateur (`jourj`, `spectacle`, `grandjour`, `v2`, `convergence`,
`convergence-finale`, `chronos`, `panneau`, `timeline-convergence`) — **0 échec**.

### Une décision de l'audit a été corrigée par les tests — et c'est le point important

L'audit (§5) concluait que la surface « Programme » du Composer devait disparaître : une seconde
lecture du jour, donc une Timeline 2. **Je l'ai retirée, et une acceptation existante est passée au
rouge — elle avait raison.** Cette surface porte le **geste de poignée** explicitement demandé au
cours du projet : *le bloc reste immobile, seule la poignée voyage, puis « Modifications
détectées » valide*. Ce geste n'existe nulle part ailleurs, et supprimer une fonction pour ranger une
interface est exactement ce que cette passe interdit.

**Décision révisée, appliquée :** la surface reste, **vidée de ce qui était réellement dupliqué** —
ses cinq éditeurs de champs (heure, titre, lieu, notes, prestataires) sont partis, le moment les
détient. Ce qui reste est un **ordre**, et le rail l'appelle désormais « Ordre du jour ».

### Livré

| # | Ce qui a changé |
|---|---|
| 1 | **Navigation** : huit destinations → **quatre** (+ Calendrier). Aucune n'a disparu : les portes fusionnées gardent leur `data-jourj` dans `data-jourj-also`, et le test le vérifie. |
| 2 | **Administration invisible à un couple** : la règle n'est plus « owner ou planner » — un couple *est* owner de son mariage — mais **`pilotsSeveralEvents()`** : le rôle `planner`, ou plus d'un événement réel dans ce navigateur. |
| 3 | **Panneau du moment** : **sept** sections, **toutes fermées à l'arrivée**, chacune annonçant son état. Une septième est née : « Scénarios », pour que le plan B ait une porte évidente sur le moment. |
| 4 | **Réordonnancement au clavier sauvé** : en retirant les champs du Composer j'allais emporter le seul chemin non-souris. Les deux contrôles vivent maintenant **dans le moment** (« Plus tôt / Plus tard »), annoncés en `aria-label`. |
| 5 | **« ET SI… » dans la pellicule** : un retard réglable qui appelle le vrai `propagationImpact()` — moments suivants, personnes et prestataires nommés, conflits — et quatre issues. Vérifié : changer le curseur recalcule, et **la journée ne bouge pas tant qu'on n'applique pas**. |
| 6 | **Simulation d'averse honnête** : un curseur soleil → pluie et une heure. Elle ne cite que les moments **déclarés en extérieur** (nouveau `outdoor`, coché à la main), écrit noir sur blanc qu'aucune météo réelle n'existe ici, et propose un plan B — jamais appliqué seul. |
| 7 | **Un seul langage iconographique** : les emojis des surfaces produit ont disparu (vérifié : **0 emoji** dans le DOM) au profit du jeu `ui/Icons` qui existait déjà et ne servait qu'aux écrans retirés. Aucun second jeu créé. |
| 8 | **Deux défauts d'heure corrigés** : entre 05:00 et 08:00, le repère « maintenant » disparaissait sans un mot — de la pellicule de démonstration *et* du mode Jour J. Les deux le disent maintenant. |
| 9 | **Un bug réel trouvé par le test** : la barre de simulation contenait un `return null` **avant deux hooks**. La journée démarrant vide, le premier moment créé changeait le nombre de hooks et React démontait toute la pellicule — cinq moments saisis, un seul survivant. Corrigé. |

### Tests existants adaptés — aucun supprimé

Six assertions, chacune commentée sur place (**PRODUCT DECISION** / **LOCATOR ADAPTED**) : les
onze→quatorze types déjà traités, la navigation regroupée (garantie renforcée : *toutes* les
destinations existent encore, et la barre n'en affiche plus que cinq), l'administration réservée,
les six→sept sections du panneau, le libellé « Ordre du jour », et l'entrée « Ouvrir les fiches ».
`check-timeline.mjs` conserve sa section **[15/15]**, `check-render.mjs` gagne deux vérifications sur
le réordonnancement clavier.

### Non fait, et pourquoi

- **Regrouper la navigation en menus déroulants** (§14 du brief) : quatre entrées tiennent sur une
  ligne ; un menu qui cache quatre mots serait une complication, pas une simplification.
- **Les réglages d'affichage de la Timeline** (niveau de détail, rappels, comportement des conflits) :
  ils n'existent pas dans le moteur. Inventer des boutons sans effet serait pire qu'un panneau long.
- **Le ciel qui change réellement au-dessus de la pellicule** : la simulation refroidit le bloc et le
  dit ; peindre une averse sur les photographies éditoriales laisserait croire à une donnée météo.
- **Toucher au moteur** : ni les 30 heures, ni Chronos, ni les scénarios, ni la persistance.
