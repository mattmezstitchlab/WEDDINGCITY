# Rapport de logique — Jour J (pellicule)

Date : 2026-08-27 · Branche `arena/01a0407c-weddingcity` · **ne pas fusionner PR #5 sans validation**

Ce document explique **pourquoi** chaque surface existe, **ce qui doublonnait**, et **la règle unique** retenue après audit.

---

## 1. Le problème (ce que montrait l’UI)

Plusieurs portes disaient « éditer / ajouter / planifier » sans hiérarchie claire :

| Surface | Ce qu’elle faisait | Problème |
|---|---|---|
| **Pin + capsule** (heure figée → Nom / min / Créer) | Créer un moment | Formulaire superposé à la pellicule, badge blanc + × moche, 2e étape inutile |
| **Clic vide + « Ajouter un moment »** | Même création | Encore une confirmation après avoir déjà choisi l’heure |
| **Header « L’événement »** | Identité du jour (noms, date, lieu…) | Panneau séparé alors que les noms sont déjà au-dessus du film |
| **Clic carte** | Sélection + dock bas | OK, mais concurrencé par d’autres portes |
| **Dock bas** | Heure, titre, durée, lieu, €, + | Doublonnait heure/titre déjà sur la carte |
| **Menu `+` sur la carte** | Doc, tâche, Plan B, personne, presta, supprimer, plus tôt/tard | Fourre-tout ; Plan B et décalage déjà gérés au **déplacement** (barre ripple) |
| **Zoom « moments » vs « Toute la journée »** | Deux densités | Le glisser-déposer marchait dans les deux, mais le bouton suggérait **deux modes** — confusion |
| **Cockpit « 63 % »** | Score de préparation (8 repères) | Utile, mais **opaque** si on ne clique pas « lesquels ? » — on croit que c’est un widget magique |
| **SimulationBar** (Météo / Retard / Annulation / Budget) | « Et si… » | Plan B / conséquences **ailleurs encore** |

Résultat ressenti : *« y’a plein d’infos qui apparaissent, faut le savoir »*.

---

## 2. Règle unique (source de vérité)

```
La pellicule = le temps réel du jour.
Tout ce qui est temporel se lit et se change SUR le film.
Tout le reste (pièces jointes humaines) s’accroche au moment sélectionné.
L’identité du JOUR s’édite dans le bandeau au-dessus du film — pas dans un panneau latéral.
```

| Intention | Où | Comment |
|---|---|---|
| **Créer un moment** | Pellicule vide | **Un clic** sur une heure vide → moment créé à cet instant, sélectionné. Pas de capsule, pas de pin intermédiaire. |
| **Déplacer** | Corps de la carte | Glisser (seuil ~6 px pour distinguer du clic). Toujours possible — **vue journée par défaut**. |
| **Régler début / fin** | **Bords** de la carte | Poignées gauche/droite : étirer = changer start ou end (durée). Badge live `HH:MM → HH:MM`. |
| **Changer l’heure sans drag** | Clic sur **l’heure** de la carte | Roue HH:MM. |
| **Renommer le moment** | Clic sur le **titre** de la carte | Input inline. |
| **Lieu / durée fine / budget / outdoor** | Dock bas (secondaire) | Une fois le moment sélectionné. |
| **Doc / tâche / personne / presta / supprimer** | **`+` sur la carte** | Menu court, pictos traits modernes. **Pas** de Plan B ici. |
| **Plan B / décalage en chaîne** | **Après un déplacement** qui a des suivants | Barre ripple : Appliquer · Créer un plan B · Ce moment seulement. C’est le seul moment où la question a un sens. |
| **Identité du jour** (noms, date, lieu) | **Titre + meta au-dessus du film** | Clic sur le nom / la date / le lieu → edit. Bouton « L’événement » **supprimé**. |
| **Préparation 0–100 %** | Cockpit au-dessus | Score = **N repères tenus / 8**. Clic → liste auditable. Ce n’est **pas** un second éditeur. |
| **Et si météo / retard…** | SimulationBar sous le film | Scénarios globaux — pas l’édition du moment courant. |

---

## 3. Décisions de ce passage (implémentées)

### 3.1 Capsule / pin — **supprimés**
- Plus de `create-capsule`, plus de `pinned-time` + formulaire.
- `createAtClientX` : clic vide → `store.createPhase` immédiat → sélection.
- Jour vide : bouton « + Ajouter le premier moment » **ou** même clic sur le film une fois affiché.

### 3.2 Un seul mode spatial
- Zoom initial = **journée entière** (fit largeur, comme l’ancien « Toute la journée »).
- Glisser les cartes **toujours** actif (pas de mode « précision » à débloquer pour bouger).
- Le zoom ± reste un **outil de lecture**, pas un mode d’édition.

### 3.3 Étirement des extrémités
- Handles `moment-resize-start` / `moment-resize-end`.
- `setPhaseTime(id, start, end)` — min 15 min.
- Pendant le geste : badge d’heures sur la carte.

### 3.4 « L’événement » — **supprimé**
- Identité éditée inline : `event-name-edit`, `event-date-edit`, `event-place-edit`.
- `EventPanel` n’est plus monté depuis `TimelineStudio` (fichier conservé pour d’éventuels tests d’identité pure / non régression store).

### 3.5 Menu `+` — audit d’utilité

| Action | Gardée dans `+` ? | Pourquoi |
|---|---|---|
| Document | **Oui** | Attache admin au moment (GUSO, contrat…) — n’a pas de place temporelle |
| Tâche | **Oui** | To-do liée au moment |
| Personne / Presta | **Oui** | Qui est sur ce créneau |
| Supprimer | **Oui** | Action destructive, volontaire |
| Plan B | **Non** | Naît d’un **déplacement** (ripple) ou de la SimulationBar — le proposer à froid dans `+` est hors contexte |
| Plus tôt / plus tard | **Non** (déjà retiré) | Redondant avec drag + étirement + roue d’heure |

Pictos : traits SVG (`IconDocument`, `IconTask`, `IconUser`, `IconVendor`, `IconTrash`, `IconPlus`) — plus d’emojis 📄👤🏢.

### 3.6 Cockpit « 63 % » — ce que c’est vraiment
- Projection `store.readiness()` : **8 repères binaires** (date posée, lieu, moments, conflits, docs manquants, etc.).
- `score / total` → pourcentage. **Aucun poids secret**.
- Sans ouvrir la liste, le chiffre est une **synthèse** ; le détail est derrière « lesquels ? ».
- **Ce n’est pas** un contrôle d’édition. On ne « règle » pas le 63 % : on complète les repères manquants (sur le film, l’identité, les docs).

---

## 4. Flux utilisateur cible (court)

```
Ouvrir le jour
    │
    ├─ Lire le film (vue journée, glisser OK)
    ├─ Clic nom / date / lieu  → corriger l’identité
    ├─ Clic heure vide         → nouveau moment (sélectionné)
    ├─ Clic carte              → sélection ; dock secondaire
    │     ├─ clic heure carte  → roue
    │     ├─ clic titre carte  → rename
    │     ├─ bord carte        → étirer durée
    │     └─ +                 → doc / tâche / gens / delete
    ├─ Glisser carte           → si suivants : ripple (appliquer / plan B / seul)
    └─ Cockpit %               → audit préparation (lecture)
```

---

## 5. Ce qui reste volontairement hors de ce passage

- **Mode d’emploi** page dédiée (parked).
- Fusion PR #5 (parked — validation humaine + shots).
- Refonte profonde SimulationBar / Organisation.
- Suppression physique du fichier `EventPanel.tsx` (plus monté ; cleanup possible plus tard).
- `MomentHub.tsx` legacy non monté par le studio.

---

## 6. Fichiers touchés

- `TimelineStudio.tsx` — create instant, resize edges, identity head, no EventPanel/pin
- `MomentDock.tsx` — `+` allégé + icônes ; dock secondaire
- `timeline.css` — edges, identity buttons
- `Icons.tsx` — Trash, Task, Branch, Vendor, Sun
- `scripts/check-timeline.mjs`, `shoot-validation.mjs`
- ce rapport

---

## 7. Critères d’acceptation rapides

1. Aucune UI « Nom / durée / Créer » au pin.
2. Clic vide → un moment de plus, sélectionné.
3. Pas de bouton « L’événement ».
4. Nom du couple cliquable au-dessus du film.
5. Poignées visibles au survol / sélection ; étirer change l’heure.
6. Vue initiale = journée ; drag marche sans zoomer.
7. `+` sans Plan B ni plus tôt/tard ; Plan B seulement sur ripple après move.
8. Pictos SVG, pas emoji dans le menu `+`.
