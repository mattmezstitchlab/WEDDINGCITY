# AUDIT DE CONVERGENCE — LE GRAND JOUR®

Audit conduit **avant toute implémentation**, sur le code réellement présent
(HEAD `ff0c683`). Objectif : décider ce qui reste, ce qui fusionne, ce qui est
récupéré du World / Lab, et ce qui disparaît de l'expérience.

Méthode : lecture exhaustive des composants `src/components/**`, des entrées
d'interface (`onClick`, raccourcis clavier, modales de `App.tsx`) et des
moteurs (`src/game/**`). Chaque verdict est justifié par ce que le code fait
**réellement**, pas par son nom.

---

## 1. Entrées utilisateur vers le World / le Lab (état avant cette passe)

| Entrée | Fichier | Visible pour un utilisateur du produit ? | Verdict |
|---|---|---|---|
| Capsule WORLD / MIRROR / CANVAS | `ProjectionSwitcher.tsx` | Non — retirée à la passe Jour J | déjà supprimée, composant dormant |
| Lien « Monde 3D ↗ » du rail éditorial | `MirrorNav.tsx` | Non — retiré à la passe Jour J | déjà supprimé |
| « Explorer le Monde 3D » (pied du récit) | `MirrorSite.tsx` | Non — retiré | déjà supprimé |
| Menu de marque (World Lab, Worldmap, Recherche Web…) | `BrandMenuModal.tsx` | **Uniquement dans le World**, qui n'est plus atteignable | conservé comme outillage interne du World |
| Barre HUD (Nerve, Connecteurs, World Lab, DJ, Importer, Recherche, Agent) | `TopNavigation.tsx` | idem | idem |
| « Voir dans Mirror → » | `EntityInspector.tsx` | idem | **texte à renommer** (le mot Mirror est interdit) |
| Raccourci `⇧M` | `App.tsx` | Non annoncé | conservé (chemin interne assumé) |
| Vue « LivingTimeline » (`setViewMode('world')`) | `LivingTimelineView.tsx` | Non atteignable depuis le produit | conservé, non exposé |

**Conclusion §1** : aucune entrée du produit ne mène au World. Restait une
chaîne « Mirror » visible dans un panneau interne — corrigée dans cette passe.

---

## 2. Matrice des fonctions

Légende destination : **GARDER** (déjà au bon endroit) · **FUSIONNER** ·
**RÉCUPÉRER** (déplacer dans LE GRAND JOUR) · **NE PAS RÉCUPÉRER** (avec motif).

| Fonction | Où elle existe | Surface | Doublon ? | Valeur réelle | Destination |
|---|---|---|---|---|---|
| Timeline du jour | `TimelineStudio.tsx` | Grand Jour | `MirrorTimeline` (lecture), `LivingTimelineView` (World) | **Élevée** — le produit | **GARDER** (source de vérité) |
| Moment = hub | `MomentHub.tsx` | Grand Jour | Canvas (6 surfaces) | Élevée | **GARDER**, le Canvas devient secondaire |
| Création de mariage | `WeddingCreationModal` + `CreateWeddingModal` (World) | 2 surfaces | **Oui** | Élevée | **FUSIONNER** — un seul flux (`startWeddingCreation`) |
| Import de fichiers | `MomentHub` (réel) + `importChaosFile` (World) | 2 | **Oui** | Élevée | **FUSIONNER** sur `documentIntelligence` |
| Extraction documentaire | `documentIntelligence.ts` (réel, local) | Grand Jour | `importChaosFile` **invente** dates et liens | Élevée | **GARDER** le réel, **NE PAS RÉCUPÉRER** le simulé |
| Propagation temporelle | `shiftPhasesAfter`, `previewMoveToIndex` | store | — | Élevée | **GARDER** |
| Plan de table | `assignGuestToTable`, `seatingTables` (store) ; UI dans `CanvasCore` (liste) | Canvas | UI pauvre | Élevée | **RÉCUPÉRER** → Organisation, spatial |
| Contraintes de capacité | `assignGuestToTable` (refus silencieux) | store | — | Moyenne | **FUSIONNER** — le refus doit se dire |
| Constellation d'invités | `GuestConstellation.tsx` (`G`) | World, raccourci | partiel avec Personnes | Moyenne | **RÉCUPÉRER** plus tard, non exposé |
| Musique / HERA | `TrackArt`, `musicPlayer`, `MomentHub` | Grand Jour | DJ Booth (World) | Élevée | **GARDER**, DJ Booth non exposé |
| Enrichissement iTunes | `enrichment/*` (flag off, réseau inaccessible ici) | Canvas | — | Moyenne | **GARDER** tel quel |
| System Nerve | `SystemNerveCenterModal`, `probes.ts` | World (`N`) | — | Interne | **GARDER** comme outil de diagnostic, non exposé |
| Recherche « Web » | `researchEngine.ts` + `WorldResearchModal` | World | — | **Nulle voire négative** | **NE PAS RÉCUPÉRER** — voir §3 |
| Connecteurs (Google, Spotify…) | `connectorEngine.ts` | World | — | Nulle ici | **NE PAS RÉCUPÉRER** — `network: false`, et services externes interdits |
| World Lab (génération de monde) | `worldEngine.generateWorldFromDescription` | World | — | Moyenne | **RÉCUPÉRER PARTIELLEMENT** : la lecture d'une description devient l'analyse du Hero, sans génération d'entités fictives |
| Agent spatial / IA | `SpatialAiAgentDrawer` | World | — | Nulle (aucune IA) | **NE PAS RÉCUPÉRER** |
| Publicité / AdSlots | `advertisingEngine`, `AdSlotModal` | World | — | Hors produit | **NE PAS RÉCUPÉRER** |
| Scène 3D, agents voxel, intérieurs | `components/3d/**` | World | — | Décorative pour ce produit | **CONSERVER EN CODE**, jamais exposée |
| Recherche universelle | *n'existait pas* | — | — | Élevée | **CRÉER** (§18 du brief) |
| Lab / intelligence de projet | *n'existait pas* sous cette forme (`projectAvailability`, `probes` s'en approchent) | — | — | Élevée | **CRÉER** à partir des données réelles |

---

## 3. Deux refus argumentés

**a) La « recherche Web » du World ne peut pas être récupérée telle quelle.**
`researchEngine.ts` déclare lui-même `network: false, simulated: true` : ce sont
des tableaux TypeScript statiques (Lenôtre, « Studio Lumière »…), avec des
`source: 'Google Places API'` qui n'ont jamais interrogé quoi que ce soit.
Les injecter dans un vrai mariage reviendrait à fabriquer des prestataires —
interdit — et Google est explicitement hors périmètre. **Décision** : la
« Recherche » du produit devient une **recherche universelle du projet**
(§18) ; l'absence de recherche Web est dite explicitement dans l'interface.

**b) `importChaosFile` ne peut pas être récupéré.**
Il fabrique `extractedDate: '14 Juin 2025'`, rattache d'office
`connectedAgentIds: ['agent_planner', 'agent_bride']` et invente un acompte à
30 %. Le pipeline d'import de cette passe s'appuie exclusivement sur
`documentIntelligence` (extraction locale, déterministe, qui déclare
« illisible » plutôt que d'inventer).

---

## 4. Doublons supprimés ou neutralisés dans cette passe

| Doublon | Résolution |
|---|---|
| Deux surfaces de création | Une seule (`startWeddingCreation`) — fait à la passe précédente |
| Deux imports de documents | Un seul pipeline, réutilisé par le Hero et par le moment |
| Deux vues de programme (Canvas liste / pellicule) | Le Canvas reste l'édition tabulaire, la pellicule est la vue principale ; **même store, mêmes mutations** |
| Deux vocabulaires (Mirror / Grand Jour) | Un seul : LE GRAND JOUR® |

---

## 5. Architecture retenue

```
LE GRAND JOUR®
├── ACCUEIL / IMPORT      Hero-outil : décrire, importer, choisir le type
│   └── CHAOS → ANALYSE → STRUCTURATION → VALIDATION → TIMELINE
├── AUJOURD’HUI           Mode Jour J (NOW)
├── TIMELINE              la pellicule — source de vérité
│   └── Moment = hub (personnes, lieux, prestataires, musique, docs, …)
├── PERSONNES             recherche et contexte d’une personne
├── ORGANISATION          plan de table spatial, prestataires, contraintes
├── MUSIQUE               couche temporelle
├── DOCUMENTS             rattachés aux moments
├── RECHERCHE             universelle, sur les données réelles
└── LAB                   ce qui manque, ce qui se contredit — sur les données
```

Le World 3D reste dans le dépôt comme technologie interne. Il n'a plus aucune
entrée utilisateur.

---

## 6. Ce qui reste non fait, et pourquoi

- **Recherche Web réelle** : nécessiterait un fournisseur externe (interdit) et
  un accès réseau (absent de cet environnement).
- **Analyse de PDF** : pas de lecture binaire ; seuls le texte lisible et le nom
  de fichier sont analysés, et le produit le dit.
- **Constellation, System Nerve, DJ Booth, Connecteurs, AdSlots** : conservés en
  code, non exposés — leur valeur pour un couple est nulle ou négative.
