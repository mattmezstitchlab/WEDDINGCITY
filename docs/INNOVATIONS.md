# AUDIT DES INNOVATIONS — LE GRAND JOUR®

Établi à partir de ce que le moteur sait **déjà** faire (timeline, moments-hub,
propagation, personnes, relations, prestataires, musique, documents, tables,
import local, recherche universelle, Lab). **Rien de ce qui suit n'est
implémenté** : c'est une liste pour décision.

Difficulté : ● faible · ●● moyenne · ●●● élevée.

---

### 01 — Scénarios réels (Plan A / B / C)
- **Problème** : la pluie, un retard, une salle changée obligent à tout refaire.
- **Fonctionnement** : dupliquer la timeline en mémoire, appliquer des règles (déplacer un moment, changer son lieu), afficher les deux journées côte à côte, basculer en un clic.
- **Valeur** : préparer l'imprévu sans casser le plan principal.
- **Données** : phases, lieux, prestataires. **Difficulté** : ●●
- **Existe déjà** : la démonstration visuelle sur la landing ; `previewMoveToIndex` calcule déjà un « et si ». **Doublon** : non, à condition de réutiliser ce calcul.

### 02 — Feuille de route par personne
- **Problème** : chacun demande « je fais quoi, où, à quelle heure ? ».
- **Fonctionnement** : projection de la timeline filtrée sur une personne, exportable en une page.
- **Valeur** : un témoin, un parent, un prestataire reçoit sa propre journée.
- **Données** : `phase.personIds`, `vendorIds`. **Difficulté** : ●
- **Existe déjà** : les liens personne↔moment. **Doublon** : non (nouvelle projection, pas de nouvelle donnée).

### 03 — Feuille de service prestataire
- **Problème** : le traiteur veut ses heures, pas votre mariage entier.
- **Fonctionnement** : même projection, filtrée sur un prestataire, avec ses documents et son contact.
- **Valeur** : remplace les e-mails de coordination.
- **Données** : `vendorIds`, médias. **Difficulté** : ● **Doublon** : non.

### 04 — Détection de conflits de personnes
- **Problème** : la même personne est attendue à deux endroits à la même heure.
- **Fonctionnement** : intersection des fenêtres horaires par `personId`.
- **Valeur** : évite l'erreur la plus fréquente d'un planning.
- **Données** : phases + personIds. **Difficulté** : ●
- **Existe déjà** : `projectFindings` détecte les chevauchements de moments. **Doublon** : à fusionner dans le Lab, pas à côté.

### 05 — Budget par moment, cumulé dans le temps
- **Problème** : on sait ce que coûte un prestataire, pas ce que coûte 19:30.
- **Fonctionnement** : `getTimelineBudget` existe ; l'exposer comme courbe le long de la pellicule + reste à payer.
- **Valeur** : voir où part l'argent, à l'heure près.
- **Données** : `phase.budget`. **Difficulté** : ● **Doublon** : non.

### 06 — Chemin des invités (transport et flux)
- **Problème** : 120 personnes doivent passer d'un lieu à un autre.
- **Fonctionnement** : entre deux moments de lieux différents, calculer le temps de transfert déclaré et signaler s'il est absent.
- **Valeur** : révèle les trous de logistique.
- **Données** : `primaryPlaceId`, horaires. **Difficulté** : ●● **Doublon** : non.

### 07 — Timeline partagée en lecture seule
- **Problème** : envoyer le déroulé sans donner les clés.
- **Fonctionnement** : export d'un instantané JSON + rendu lecture seule.
- **Valeur** : ce que les invités et prestataires reçoivent.
- **Données** : projection existante. **Difficulté** : ●● (hors ligne : export fichier) **Doublon** : le « récit » existe déjà — à fusionner, pas à dupliquer.

### 08 — Journal du jour J
- **Problème** : le jour venu, tout dérape de dix minutes.
- **Fonctionnement** : en mode Jour J, un bouton « on démarre » par moment ; l'écart réel est enregistré et propagé.
- **Valeur** : le planning suit la réalité au lieu de la contredire.
- **Données** : phases + horodatage réel. **Difficulté** : ●● **Doublon** : non (le mode NOW existe, il ne mesure rien).

### 09 — Souvenirs alignés sur le temps
- **Problème** : 2 000 photos, aucun ordre.
- **Fonctionnement** : à l'import, lire l'heure EXIF si présente et rattacher la photo au moment correspondant.
- **Valeur** : l'album se range tout seul, sur la même pellicule.
- **Données** : médias + heures. **Difficulté** : ●● (lecture EXIF locale) **Doublon** : non.

### 10 — Bande-son continue
- **Problème** : la playlist ne colle pas à la durée réelle des scènes.
- **Fonctionnement** : additionner les durées par moment, afficher le silence ou le débordement, proposer un ordre.
- **Valeur** : une soirée sans trou ni coupure.
- **Données** : `track.duration`, `phase.trackIds`. **Difficulté** : ●
- **Existe déjà** : l'alerte de dépassement. **Doublon** : extension, pas doublon.

### 11 — Table intelligente (contraintes déclarées)
- **Problème** : « surtout ne pas mettre X à côté de Y ».
- **Fonctionnement** : déclarer des contraintes entre personnes, les vérifier à chaque placement.
- **Valeur** : le plan de table cesse d'être un casse-tête mental.
- **Données** : `relationships` (existe), tables. **Difficulté** : ●● **Doublon** : non.

### 12 — Relances et échéances
- **Problème** : les acomptes et confirmations se perdent.
- **Fonctionnement** : dériver des échéances des documents lus (montants, dates) et les poser comme tâches datées.
- **Valeur** : l'administratif devient une conséquence des documents.
- **Données** : `documentIntelligence`, tâches. **Difficulté** : ●● **Doublon** : non.

### 13 — Comparaison de devis
- **Problème** : trois devis de traiteur, aucun tableau.
- **Fonctionnement** : regrouper les documents d'une même catégorie et aligner les montants extraits.
- **Valeur** : décider sans tableur.
- **Données** : montants extraits. **Difficulté** : ●● **Doublon** : non.

### 14 — Répétition (mode simulation)
- **Problème** : personne ne sait si la journée « tient ».
- **Fonctionnement** : faire défiler la journée en accéléré et signaler ce qui casse (chevauchements, transferts impossibles).
- **Valeur** : une répétition générale sans répétition.
- **Données** : phases, lieux, personnes. **Difficulté** : ●●
- **Existe déjà** : la simulation temporelle du World (`tick`), non exposée. **Doublon** : à récupérer plutôt qu'à réécrire.

### 15 — Album d'après
- **Problème** : après le mariage, le produit n'a plus de rôle.
- **Fonctionnement** : la même pellicule, en arrière : ce qui a eu lieu, avec les photos rattachées, en lecture.
- **Valeur** : le produit devient un souvenir, pas un outil jeté.
- **Données** : phases + médias. **Difficulté** : ● **Doublon** : non.

### 16 — Import par lot d'e-mails exportés
- **Problème** : l'essentiel de l'organisation vit dans une boîte mail.
- **Fonctionnement** : lire un export `.eml`/`.txt` et en extraire dates, montants, contacts, comme un document.
- **Valeur** : la porte d'entrée la plus large possible, sans connecteur.
- **Données** : `documentIntelligence`. **Difficulté** : ● **Doublon** : non (même moteur).

### 17 — Vérification d'adresse et d'itinéraire *(bloqué)*
- **Problème** : vérifier qu'un lieu existe et combien de temps on met.
- **Fonctionnement** : nécessiterait un service extérieur (cartographie).
- **Statut** : **non réalisable ici** — aucun accès réseau, services externes interdits. À ne pas simuler.

---

## Recommandation d'ordre (si vous en choisissez trois)

1. **02 + 03** (feuilles de route personne / prestataire) : coût faible, valeur immédiate, aucune donnée nouvelle.
2. **04 + 05** dans le Lab : conflits de personnes et argent dans le temps.
3. **01** (scénarios réels) : la vraie nouveauté de catégorie, une fois les deux premiers acquis.
