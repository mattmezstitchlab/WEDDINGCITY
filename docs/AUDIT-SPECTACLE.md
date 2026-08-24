# AUDIT SPECTACLE — avant implémentation

Audit conduit sur `3b786dc`, par lecture du code, **avant** d'écrire une ligne.
Objectif : savoir ce qui existe déjà pour ne rien dupliquer.

---

## 1. Ce qui existe et couvre déjà une partie du besoin

| Besoin « spectacle » | Ce qui existe déjà | Fichier | Conclusion |
|---|---|---|---|
| Une personne | `Person` (id, displayName, email, phone, portrait, notes) | `types/identity.ts` | **réutiliser** |
| Une société / structure | `Vendor` (companyName, category, statut, docs, contacts) | `types/identity.ts` | **réutiliser** — la structure d'un artiste EST un Vendor |
| Présence à un moment | `TimelinePhase.personIds` / `vendorIds` | `types/wedding.ts` | **réutiliser** — pas de nouvelle table d'affectation |
| Tâche datée | `TaskEntity` (+ `phaseId`) | `types/wedding.ts` | **réutiliser** pour installation / démontage |
| Document | `MediaAsset` (`ownerKind: 'event' | 'person' | 'vendor'`) | `types/identity.ts` | **réutiliser** — contrat, fiche technique |
| Relations | `PersonRelationship` | `types/identity.ts` | réutiliser si besoin, non requis ici |
| Timeline & propagation | `phases`, `shiftPhasesAfter`, `previewMoveToIndex` | `game/weddingStore.ts` | **réutiliser** — une feuille de route est une PROJECTION, jamais une copie |
| Scénarios | `scenarios`, `scenarioDiff`, `applyScenario` | `game/weddingStore.ts` | **réutiliser** tel quel |
| Import du chaos | `projectIntake` + `documentIntelligence` | `game/**` | **étendre** le vocabulaire, pas le moteur |
| Recherche | `searchEverything` | `game/weddingStore.ts` | **étendre** aux métiers |
| Lab / conflits | `projectFindings` | `game/weddingStore.ts` | **étendre** d'une règle de conflit d'équipe |
| Hub du moment | `MomentHub` (personnes, prestataires, musique, docs…) | `components/mirror/timeline/` | **étendre** l'affichage, pas dupliquer |

---

## 2. Entités demandées par le brief, et décision

| Entité proposée | Décision | Motif |
|---|---|---|
| `Performer` | **NON créée** | c'est une `Person` avec un métier |
| `Technician` | **NON créée** | idem |
| `CrewMember` | **NON créée** | idem — un seul type de personne, plusieurs rôles |
| `Service` (prestation) | **NON créée** | une prestation = la présence d'une personne sur un `TimelinePhase` (déjà modélisée) |
| `CallSheet` (feuille de route) | **NON créée** | **dérivée** de la timeline à la lecture : la stocker créerait une seconde vérité et des horaires périmés |
| `TechnicalRequirement` | **partiellement** | ajoutée comme **champ optionnel** de la personne (`craft.requirements`), pas comme entité séparée |

**Ajout minimal retenu** : un bloc optionnel `Person.craft` — métier, spécialité,
statut (dont « intermittent du spectacle »), structure, zone, tarif, temps
d'installation et de démontage, besoins techniques, notes. Aucune nouvelle
liste, aucune nouvelle persistance : `persons` est déjà persisté.

---

## 3. Architecture retenue (minimale)

```
Person  ──(craft?)──►  métier, statut, besoins techniques
   │
   └──(phase.personIds)──►  TimelinePhase  ──► heures (source de vérité unique)
                                  │
                                  ├── MediaAsset (contrat, fiche technique)
                                  └── TaskEntity (installation, démontage)

getCallSheet(personId)   = PROJECTION pure de la timeline  → « Ma journée »
crewConflicts()          = lecture pure → chevauchements et besoins non couverts
```

Une seule source de vérité : `phases`. Déplacer un moment recalcule
automatiquement toutes les feuilles de route, puisqu'elles ne sont jamais
stockées.

---

## 4. Ce qui n'est PAS fait, et pourquoi

- **Aucune donnée administrative inventée** : numéro d'objet, cachet, nombre de
  services et heures sont des champs **optionnels vides**. Le produit ne calcule
  pas une paie et ne prétend pas le faire.
- **Aucun portail professionnel séparé** : la vue « pro » est la même page,
  filtrée sur une personne.
- **Aucune vérification de statut** (Pôle emploi, congés spectacles…) :
  impossible sans service extérieur, interdit ici.
