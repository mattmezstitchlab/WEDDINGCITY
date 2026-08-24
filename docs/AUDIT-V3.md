# AUDIT V3 — consolidation

Audit conduit **avant** toute modification, sur l'état publié `6d4b26d`, par
lecture du code (`src/game/**`, `src/components/**`, `scripts/check-*.mjs`).

Décisions possibles : **GARDER** · **FUSIONNER** · **CONNECTER** · **SUPPRIMER**
· **NE PAS EXPOSER**.

---

## 1. Matrice

| Fonction | Existe | Source de vérité | Doublon | Décision |
|---|---|---|---|---|
| `projectIntake` (lecture du chaos) | oui | `src/game/projectIntake.ts` (pur) | `importChaosFile` (World, invente) | **GARDER** · l'autre **NE PAS EXPOSER** |
| Création de projet | oui | `createRealWedding` | `CreateWeddingModal` (World) et `WeddingCreationModal` (site) → **un seul flux** via `startWeddingCreation` | **FUSIONNÉ** (déjà) |
| `WeddingWorld` / scène 3D | oui | `components/3d/**` | — | **NE PAS EXPOSER** (monté, chrome rendu seulement si `projection === 'world'`) |
| Phases / moments | oui | `weddingStore.phases` | — | **GARDER** — source unique |
| Timeline produit (pellicule) | oui | `TimelineStudio` | `MirrorTimeline` (lecture du récit), `LivingTimelineView` (World, non exposée) | **GARDER** + **NE PAS EXPOSER** la 3ᵉ |
| Pellicule publique | oui | `LandingFilm` (constante `DEMO_DAY`) | — | **GARDER** — ne touche jamais le store |
| Moment-hub | oui | `MomentHub` | onglets du Canvas | **GARDER** les deux : même store, deux contextes |
| HERA / musique | oui | `tracks` + `TrackArt` + `musicPlayer` | DJ Booth (World) | **GARDER** · DJ Booth **NE PAS EXPOSER** |
| People | oui | `persons` / `guests` | `MirrorPeople` (récit) | **CONNECTER** (même données, deux vues) |
| Prestataires | oui | `vendors` + `phase.vendorIds` | section Organisation + hub | **CONNECTER** |
| Documents | oui | `media` (ownerKind `event`) | `docs` (DocumentEntity, World) | **GARDER** `media` · `docs` **NE PAS EXPOSER** |
| Plan de table | oui | `seatingTables` + `guests.seating` | liste du Canvas | **GARDER** le spatial, la liste reste secondaire |
| Recherche universelle | oui | `store.searchEverything` | `WorldResearchModal` (simulée) | **GARDER** · l'autre **NE PAS EXPOSER** |
| Lab | oui | `store.projectFindings` | System Nerve (technique) | **GARDER** · Nerve **NE PAS EXPOSER** |
| Scénarios | oui (V2) | `store.scenarios` + `scenarioDiff` | — | **GARDER** |
| Causalité / propagation | oui | `shiftPhasesAfter`, `previewMoveToIndex` | — | **GARDER** — un seul moteur |
| Persistance | oui | `PERSISTED_FIELDS` | — | **GARDER** |
| Isolation multi-projets | oui | `wedding_city_state_<id>` | — | **GARDER** |

**Aucune nouvelle fonctionnalité n'a été créée dans cette passe** : la V3 est
une consolidation de surface (sections, vocabulaire, ergonomie).

---

## 2. Ce qui a changé en V3, et pourquoi

| Sujet | Avant | Après | Motif |
|---|---|---|---|
| Types d'événement | mariage, anniversaire, corporate, séminaire, soirée, baptême, autre | **mariage, anniversaire, fête, séminaire, convention, soirée, autre** | liste demandée ; « corporate » devient « convention », « baptême » reste joignable par « autre » |
| Étape d'analyse | « Votre journée prend forme » | surtitre **« Lecture du projet »** conservant le titre | vocabulaire demandé |
| Sections de la page | 11 | **9** (hero, timeline+causalité, musique, people, plan de table, scénarios, documents, aperçu, finale) | « quelques grandes séquences », chacune prouvant une innovation |
| Causalité | section séparée | **posée sur la pellicule** | la conséquence se lit sans quitter le film |
| Scénarios (page) | trois onglets décoratifs | **deux rails comparés** (journée réelle / plan B pluie) | même lecture que l'outil réel |
| Documents (page) | absente | **section : le document vit à l'heure qu'il concerne** | demandée |
| Moments / Import (sections) | deux sections | fondues dans la pellicule et le hero | doublons assumés |
| People | rôle seul | **prénom + rôle + fil horaire** | « Émilie → 08:30 → 11:00 → 17:30 → 21:00 » |

---

## 3. Plan de table — audit d'usage

| Point | État mesuré |
|---|---|
| Souris / trackpad | la vignette de l'invité suit le pointeur (vérifié en navigateur) |
| Tactile | même chemin (événements pointeur, `touch-action: none` sur la puce) |
| Dépôt | cible lue dans une **référence** — corrigé en V2, un dépôt rapide n'est plus perdu |
| Table pleine | message explicite « X est complète : n places occupées sur m » |
| Capacité | refus contrôlé par `assignGuestToTable`, jamais silencieux |
| Persistance | placement enregistré et restitué après reload |
| Isolation | placement rangé dans l'instantané du projet |
| Zoom / recherche dans le plan | **absents** — non demandés par un usage réel constaté, notés en réserve |

---

## 4. Colonne vertébrale vérifiée

`CHAOS → COMPRÉHENSION → STRUCTURE → TIMELINE → PROPAGATION → SCÉNARIOS → JOUR J → SOUVENIR`

- CHAOS : barre du hero + import de fichiers ✔
- COMPRÉHENSION : `projectIntake`, typé par l'événement ✔
- STRUCTURE : « Lecture du projet », correction avant création ✔
- TIMELINE : `TimelineStudio` ✔
- PROPAGATION : proposition puis application ✔
- SCÉNARIOS : branche, comparaison, application ✔
- JOUR J : mode NOW ✔
- SOUVENIR : section Médias/Souvenirs ✔ (album d'après = innovation B, non construite)
