# AUDIT V2 — cohérence visuelle, médias éditoriaux, scénarios

Audit conduit **avant** implémentation, sur l'état publié `cd1b22a`.

---

## 1. La distinction, désormais structurelle

| | A — Assets éditoriaux du produit | B — Données utilisateur |
|---|---|---|
| Où | `src/design/editorialRegistry.ts`, `src/design/momentImagery.ts`, `/public/editorial/**` | `weddingStore` → `wedding_city_state_<projectId>` |
| Contenu | photographies de scènes, portraits, pochettes abstraites, illustrations | uniquement ce que l'utilisateur a écrit ou importé |
| Peuvent-ils se croiser ? | **Non** : le registre n'importe rien de `src/game` — il ne *peut pas* atteindre le store | — |
| Garantie testée | aucune chaîne `/editorial/` dans un instantané de projet ; `media = 0` après création | idem |
| Étiquetage | chaque surface de démonstration affiche `EDITORIAL_DISCLAIMER` | — |

**Conséquence assumée** : la landing peut être spectaculaire (portraits, pochettes, 19 images chargées) sans qu'un seul octet n'entre dans un mariage.

---

## 2. Audit visuel des 11 sections

| # | Section | Vraie démonstration ? | Info nouvelle ? | Doublon | Assez visuelle ? | Verdict |
|---|---|---|---|---|---|---|
| 01 | Hero | oui (outil réel) | la promesse | non | oui | **garder** |
| 02 | Timeline | oui (composant du produit) | le cœur | non | oui | **garder** |
| 03 | Causalité | oui (+30 min réel) | la propagation | recoupe 09 | moyenne → cascade ajoutée | **garder** |
| 04 | Moments | partielle (photo + texte) | la scène | recoupe 02 | oui | **garder**, action « ouvrir une scène » |
| 05 | Musique | **était un texte d'excuse** | HERA | non | **non** → refaite | **refaite** : pochettes, play, durée, heure, moment, interaction |
| 06 | People | **était trois initiales** | le fil d'une personne | non | **non** → refaite | **refaite** : portraits éditoriaux + fil horaire |
| 07 | Plan de table | non (texte) | la spatialité | l'outil réel est dans Organisation | moyenne | **garder** tel quel |
| 08 | Import | oui (5 étapes) | la porte d'entrée | recoupe 01 | faible | **garder**, court |
| 09 | Scénarios | **était décorative** | l'innovation | — | moyenne | **promue en vraie fonctionnalité** (§4) |
| 10 | Édition | oui (renvoie au composant réel) | l'outil | recoupe 02 | oui | **garder** |
| 11 | Souvenirs / clôture | oui (plein écran) | l'émotion | non | oui | **garder**, accroche universalisée |

Aucune section supprimée : les deux plus faibles (05, 06) ont été **refaites** plutôt que jetées, et la 09 est devenue une fonctionnalité.

---

## 3. Mini-audit technique avant les scénarios

| Question | Réponse mesurée dans le code |
|---|---|
| Source de vérité | `weddingStore.phases`, unique. Toute surface la projette. |
| Snapshot possible ? | Oui : `serializeDomain`/`applyDomain` clonent déjà tout le domaine ; cloner les seules `phases` est sûr et peu coûteux. |
| Rollback | Immédiat : abandonner un scénario supprime la branche, rien d'autre n'a été touché. `beginMutation` couvre chaque écriture d'un pas d'annulation. |
| Relations impactées | Aucune : la branche ne copie pas les personnes, documents, budget — ils restent sur les moments réels, retrouvés par **id identique**. |
| Contraintes | `canPlacePhase` (0 → 30 h) est réutilisée telle quelle ; un scénario impossible est refusé **avant** toute écriture. |
| Propagation | Même arithmétique que la timeline réelle (décaler le moment, porter les suivants). Aucun second moteur. |
| Risque de doublon | Nul : pas de seconde timeline, pas de second store, pas de seconde persistance. |
| Isolation multi-projets | Structurelle : `scenarios` est un champ de `PersistedDomainState`, donc rangé dans `wedding_city_state_<projectId>`. |

**Conclusion** : architecture propre → implémentation autorisée. Faite.

---

## 4. Ce qui a été construit

- `TimelineScenario` (type) + champ persisté `scenarios` + `activeScenarioId`.
- Store : `createScenario`, `renameScenario`, `setActiveScenario`, `scenarioShiftPhase`, `scenarioSetPhasePlace`, `scenarioDiff`, `applyScenario(only?)`, `discardScenario`.
- UI `ScenariosPanel` (Organisation) : deux rails synchronisés — **votre journée** / **le scénario** —, différences surlignées, écart en minutes, `Appliquer cette ligne`, `Appliquer tout`, `Abandonner`.

**Règle tenue** : la journée principale ne bouge jamais avant validation (vérifié à trois reprises dans le test navigateur).

---

## 5. Classement des 17 innovations

### A — À construire immédiatement
| # | Innovation | Pourquoi |
|---|---|---|
| 01 | **Scénarios réels** | **FAIT dans cette passe.** |
| 02 | Feuille de route par personne | données déjà là, valeur immédiate, aucun doublon |
| 04 | Conflits de personnes | une ligne de plus dans le Lab, évite l'erreur la plus fréquente |

### B — À construire prochainement
| # | Innovation | Pourquoi |
|---|---|---|
| 03 | Feuille de service prestataire | même projection que 02, autre filtre |
| 05 | Budget par moment, cumulé | `getTimelineBudget` existe déjà, il manque la lecture dans le temps |
| 10 | Bande-son continue | prolonge l'alerte de dépassement déjà en place |
| 15 | Album d'après | donne une vie au produit après le jour J |

### C — À garder en réserve
| # | Innovation | Pourquoi |
|---|---|---|
| 06 | Chemin des invités | demande des durées de transfert que personne ne saisit encore |
| 08 | Journal du jour J | dépend d'un usage réel le jour même |
| 09 | Souvenirs alignés (EXIF) | lecture binaire à écrire, valeur forte mais coût réel |
| 11 | Table intelligente | dépend de contraintes déclarées, à concevoir |
| 12 | Relances et échéances | dépend de la qualité de lecture des documents |
| 13 | Comparaison de devis | même dépendance |
| 14 | Répétition (simulation) | récupérable du World, mais spectaculaire avant d'être utile |
| 16 | Import d'e-mails exportés | facile, mais faible différenciation |
| 07 | Timeline partagée en lecture seule | à fusionner avec le « récit » existant plutôt qu'à ajouter |

### D — À refuser
| # | Innovation | Pourquoi |
|---|---|---|
| 17 | Vérification d'adresse / itinéraire | exige un service extérieur : pas de réseau ici, et fournisseurs interdits. Simuler serait mentir. |
