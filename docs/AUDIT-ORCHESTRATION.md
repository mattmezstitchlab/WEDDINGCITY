# AUDIT ORCHESTRATION — avant implémentation

Audit conduit sur `1213b80`, par lecture du code, **avant** d'écrire une ligne.
Verdicts : **GARDER** · **ÉTENDRE** · **FUSIONNER** · **CRÉER** · **REFUSER**.

---

## 1. Inventaire

| Élément demandé | Ce qui existe | Verdict |
|---|---|---|
| `WeddingWorld` | scène 3D non exposée, chrome rendu seulement si `projection === 'world'` | **GARDER** (non exposé) |
| `Person` | identité unique, `craft` optionnel (métier, statut, besoins, installation) | **ÉTENDRE** (voyage) |
| `Provider` | `Vendor` (raison sociale, catégorie, docs, contacts) | **GARDER** — la structure d'un artiste EST un Vendor |
| `Moment` | `TimelinePhase` + `personIds` / `vendorIds` / `trackIds` / `taskIds` | **GARDER** |
| `Place / Venue` | `Place` | **GARDER** |
| `Task` | `TaskEntity` (`phaseId`, `dueHour`, `isDone`, `cost`) | **ÉTENDRE** (délégation : destinataire + statut) |
| `Document` | `MediaAsset` (`ownerKind: event/person/vendor/song/wedding`) | **GARDER** — un seul système |
| `Relation` | `PersonRelationship` | **GARDER** |
| `PlaylistItem` | `TrackEntity` (+ `linkedPhaseId`, `duration`) | **GARDER** |
| `Scenario` | `TimelineScenario` + `scenarioDiff` / `applyScenario` | **GARDER** — un seul moteur |
| `Timeline` | `phases`, source de vérité unique | **GARDER** |
| Causalité | `shiftPhasesAfter`, `previewMoveToIndex` | **GARDER** |
| Import | `projectIntake` + `documentIntelligence` | **GARDER** |
| Recherche | `searchEverything` (métiers inclus) | **ÉTENDRE** si besoin |
| Landing / navigation | 10 séquences, nav à 10 entrées | **GARDER** |
| Création de projet | `startWeddingCreation` → `createRealWedding` | **GARDER** |
| Partage | *n'existe pas* (aucun réseau) | **REFUSER** ici |
| Plan de table | `seatingTables` + drag réel | **GARDER** |
| Profils professionnels | `Person.craft` + `CrewPanel` + `getCallSheet` | **ÉTENDRE** |
| Multi-événements | un instantané par projet (`wedding_city_state_<id>`) | **ÉTENDRE** (lecture croisée, sans mélange) |

---

## 2. Décisions de cette passe

| Demande du brief | Décision | Motif |
|---|---|---|
| Entité `Performer` | **REFUSER** | `Person.craft` existe déjà |
| Deuxième système de documents | **REFUSER** | `MediaAsset` couvre tout |
| Deuxième Timeline / scénarios | **REFUSER** | un seul moteur, déjà branché |
| Délégation de missions (§9) | **ÉTENDRE `TaskEntity`** | ajout de `assignedPersonId` et `status` — pas d'entité « Mission » |
| Transport / hébergement (§10) | **ÉTENDRE `Person.craft.travel`** | champs libres optionnels ; une *travel sheet* est une **projection**, pas un stockage |
| Conflits inter-événements (§8) | **CRÉER une lecture** `crossEventConflicts()` | lit les instantanés des autres projets **en lecture seule** ; aucune donnée n'est copiée d'un projet à l'autre |
| Remplaçants (§12) | **CRÉER une lecture** `findReplacements()` | propose, ne remplace jamais |
| Générateur de documents (§4/§6) | **CRÉER un producteur** vers `MediaAsset` | le document produit est un média du projet, pas une nouvelle base |
| Recherche Web d'une structure (§5) | **REFUSER ici, et le dire** | aucun accès réseau dans cet environnement, fournisseurs externes interdits. Le brief l'exige : ne jamais simuler |
| Envoi du document (§6 « ENVOYER ») | **REFUSER ici** | aucun service d'envoi ; le document est produit et téléchargeable |
| Dashboard organisateur (§19) | **partiellement** | la vue « problèmes à traiter » existe via Lab + conflits d'équipe ; pas de tableau de bord séparé |

---

## 3. Isolation, explicitement préservée

`crossEventConflicts()` ouvre les instantanés des autres projets **pour lire des
noms et des heures**, puis rend un **rapport**. Il n'écrit rien, ne recopie
aucune entité, et le rapprochement se fait sur le **nom affiché** — donc chaque
ligne est marquée « à confirmer » : deux personnes homonymes dans deux mariages
ne sont pas la même personne, et le produit ne le décide pas à votre place.

---

## 4. Innovations (§22)

| # | Innovation | Problème | Données | Moteur réutilisé | Valeur | Complexité | Doublon | Classe |
|---|---|---|---|---|---|---|---|---|
| O-01 | Conflit inter-événements | la même personne réservée deux fois le même jour | instantanés projets | lecture pure | très forte | ●● | non | **A — fait** |
| O-02 | Missions déléguées | « vérifier le contrat de Matt » se perd dans un fil | `TaskEntity` | tâches | forte | ● | non | **A — fait** |
| O-03 | Travel sheet | l'artiste étranger a besoin de 6 informations, pas de 60 | `craft.travel` | feuille de route | forte | ● | non | **A — fait** |
| O-04 | Remplaçants possibles | un artiste se décommande | personnes + phases | lecture pure | forte | ●● | non | **A — fait** |
| O-05 | Générateur de documents | devis/contrat/fiche technique à produire | personnes, moments | `MediaAsset` | forte | ●● | non | **A — fait** |
| O-06 | Agenda du mois d'une personne | « mes événements » | multi-projets | lecture croisée | forte | ●● | non | **B** |
| O-07 | Signature / accusé | savoir qui a validé quoi | documents | — | moyenne | ●● | non | **B** |
| O-08 | Coût d'un scénario | « le plan B coûte combien ? » | budgets moments | scénarios | forte | ●● | non | **B** |
| O-09 | Vue organisateur multi-événements | superviser 4 événements | projets | Lab | forte | ●●● | risque de dashboard | **B** |
| O-10 | Recherche d'entreprise / association | préremplir un document | — | — | forte | ●●● | — | **C — service externe requis** |
| O-11 | Envoi e-mail du document | transmettre | — | — | moyenne | ●● | — | **C** |
| O-12 | Vols et horaires réels | mobilité internationale | — | — | forte | ●●● | — | **C** |
| O-13 | Calcul de paie / cachets | administratif | — | — | — | — | — | **D — hors périmètre, jamais calculé** |
| O-14 | Vérification de statut (Congés spectacles) | conformité | — | — | — | — | — | **D — impossible et sensible** |
