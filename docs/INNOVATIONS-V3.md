# INNOVATIONS V3 — ce que le moteur permet, et que personne ne fait

Établi après l'audit V3, à partir des fonctions **déjà construites** : pellicule,
propagation, scénarios, ingestion, People, HERA, documents, plan de table,
prestataires, recherche. Aucune n'est implémentée — cette liste est faite pour
être arbitrée.

Difficulté : ● faible · ●● moyenne · ●●● élevée.
Priorité : **A** immédiat · **B** prochain · **C** réserve.

---

### V3-01 — « Où dois-je être maintenant ? » (vue invité)
- **Problème** : le jour J, cent personnes posent la même question.
- **Fonctionnement** : la pellicule filtrée sur une personne + le repère NOW → une seule phrase : « Vous êtes attendu au cocktail, jardin, dans 12 minutes ».
- **Réutilise** : `phase.personIds`, mode Jour J, `searchEverything`.
- **Données** : déjà là. **Doublon** : non. **Difficulté** : ● · **Priorité A**.

### V3-02 — Feuille de route imprimable par personne et par prestataire
- **Problème** : le traiteur veut ses heures, le témoin les siennes.
- **Fonctionnement** : projection filtrée + mise en page A4, sans compte ni partage réseau.
- **Réutilise** : la même projection que V3-01. **Difficulté** : ●● · **Priorité A**.

### V3-03 — Conflit de présence
- **Problème** : la même personne attendue à deux endroits à la même heure.
- **Fonctionnement** : intersection des fenêtres par `personId`, une ligne de plus dans le Lab.
- **Réutilise** : `projectFindings`. **Doublon** : à ajouter DANS le Lab, pas à côté. **Difficulté** : ● · **Priorité A**.

### V3-04 — Scénario « retard réel »
- **Problème** : le jour J, tout glisse de vingt minutes.
- **Fonctionnement** : un bouton « on a 20 min de retard » crée une branche à partir de l'heure courante et propose la journée recalculée.
- **Réutilise** : scénarios + mode NOW. **Difficulté** : ● · **Priorité A**.

### V3-05 — Diff de scénarios sur les personnes et les prestataires
- **Problème** : une branche ne dit aujourd'hui que les heures et le lieu.
- **Fonctionnement** : étendre `scenarioDiff` aux rattachements (qui gagne/perd un moment).
- **Réutilise** : `scenarioDiff`. **Difficulté** : ●● · **Priorité B**.

### V3-06 — Budget dans le temps
- **Problème** : on connaît le coût d'un prestataire, pas celui de 19:30.
- **Fonctionnement** : courbe cumulée le long de la pellicule + reste à payer.
- **Réutilise** : `getTimelineBudget`, `phase.budget`. **Difficulté** : ● · **Priorité B**.

### V3-07 — Bande-son continue (HERA II)
- **Problème** : la playlist ne colle pas à la durée réelle des scènes.
- **Fonctionnement** : somme des durées par moment, trous et débordements affichés, ordre proposé.
- **Réutilise** : `track.duration`, alerte de dépassement existante. **Difficulté** : ● · **Priorité B**.

### V3-08 — Contraintes de placement déclarées
- **Problème** : « surtout pas X à côté de Y ».
- **Fonctionnement** : relations `PersonRelationship` étendues d'un type « à séparer », vérifiées au dépôt.
- **Réutilise** : `relationships`, plan de table. **Difficulté** : ●● · **Priorité B**.

### V3-09 — Photos rangées par l'heure (EXIF)
- **Problème** : deux mille photos sans ordre.
- **Fonctionnement** : lecture EXIF locale, rattachement automatique au moment correspondant, confirmation humaine.
- **Réutilise** : médias, moments. **Difficulté** : ●● · **Priorité B**.

### V3-10 — Répétition accélérée
- **Problème** : personne ne sait si la journée « tient ».
- **Fonctionnement** : dérouler la journée en accéléré, signaler chevauchements et transferts impossibles.
- **Réutilise** : la simulation du World (déjà écrite, non exposée) + `projectFindings`. **Difficulté** : ●● · **Priorité C**.

### V3-11 — Chaîne de dépendances explicite
- **Problème** : la propagation suppose que « ce qui suit » dépend de ce qui précède.
- **Fonctionnement** : déclarer « le dîner dépend de la fin du cocktail », et propager le long du graphe plutôt que de l'ordre horaire.
- **Réutilise** : `shiftPhasesAfter`. **Doublon** : remplacerait la règle actuelle, à ne pas doubler. **Difficulté** : ●●● · **Priorité C**.

### V3-12 — Import par copier-coller structuré
- **Problème** : la moitié des informations vit dans un fil de messages.
- **Fonctionnement** : coller un bloc de texte dans la barre du hero et le lire comme un document.
- **Réutilise** : `projectIntake` (déjà capable). **Difficulté** : ● · **Priorité B** *(quasi gratuit)*.

### V3-13 — Relances datées depuis les documents
- **Problème** : les acomptes se perdent.
- **Fonctionnement** : les montants et dates extraits deviennent des tâches datées, à confirmer.
- **Réutilise** : `documentIntelligence`, tâches. **Difficulté** : ●● · **Priorité B**.

### V3-14 — Album d'après
- **Problème** : après le jour J, le produit n'a plus de rôle.
- **Fonctionnement** : la même pellicule, en lecture, avec les photos rattachées.
- **Réutilise** : tout. **Difficulté** : ● · **Priorité B**.

### V3-15 — Vue « prestataire » partagée hors ligne
- **Problème** : envoyer le déroulé sans donner les clés du projet.
- **Fonctionnement** : export d'un fichier lisible (HTML autonome), sans compte ni serveur.
- **Réutilise** : projections existantes. **Difficulté** : ●● · **Priorité C**.

---

## Refus argumentés

| Idée | Refus |
|---|---|
| Recherche web / vérification d'adresse | aucun réseau ici, fournisseurs externes interdits. Simuler serait fabriquer une source. |
| Suggestions « IA » de déroulé | aucune IA disponible ; un générateur local qui « propose » un mariage type inventerait des données. |
| Connecteurs Google/Spotify | interdits, et l'engin existant est déclaré simulé. |

## Recommandation

Construire **A** dans l'ordre : V3-01, V3-03, V3-04, V3-02. Ces quatre-là ne
demandent aucune donnée nouvelle, ne créent aucun doublon, et transforment la
pellicule en compagnon du jour J.
