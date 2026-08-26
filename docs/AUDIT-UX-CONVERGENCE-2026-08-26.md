# Audit UI/UX de convergence — Le Grand Jour

**Date :** 26 août 2026  
**Périmètre :** démarrage, création, bureau Jour J, panneau latéral, organisation et mini-site immersif.  
**Principe directeur :** une donnée possède un seul lieu d’édition ; toutes les autres surfaces sont des projections en lecture.

## Résumé exécutif

Le produit possède désormais une trajectoire compréhensible : **hero → analyse → clarification → timeline → panneau latéral → mini-site**. Le store reste l’unique source de données. Les ambiguïtés restantes ne viennent plus principalement du modèle, mais de vestiges d’interfaces antérieures encore présents dans le bundle et parfois dans les parcours secondaires.

Le défaut visuel signalé au démarrage était confirmé : `WeddingWorld` était monté avant que le chunk paresseux de `MirrorSite` soit disponible. Pendant ce délai, la scène noire 3D et ses badges étaient visibles. Le World n’est désormais monté que lorsque sa projection est explicitement active et un écran de chargement produit neutre couvre le chargement du site.

## Architecture visible cible

1. **Accueil** — seule porte de création.
2. **Intake** — lecture locale et questions manquantes une par une.
3. **Timeline horizontale sombre** — seul bureau temporel.
4. **Panneau droit** — seul éditeur d’un événement ou d’un moment.
5. **Organisation** — uniquement les décisions transversales.
6. **Programme immersif** — mini-site en lecture seule.

## Constats vérifiés

### P0 — Premier affichage contaminé par le World — corrigé

- `App.tsx` montait systématiquement `<WeddingWorld />`.
- `MirrorSite` est chargé avec `lazy()` et utilisait `fallback={null}`.
- Le navigateur montrait donc le World pendant le chargement du chunk principal.
- Correction : montage conditionnel du World et fallback de marque `ProductBoot`.

### P0 — Le mini-site n’est pas encore réellement publiable

Le « mini-site » est aujourd’hui une section de la même application locale. Il ne possède pas :

- d’URL publique propre à l’événement ;
- de mode invité isolé de la navigation de travail ;
- de contrôle de publication/brouillon ;
- de permissions ;
- de rendu partageable sur un autre appareil.

**À terminer :** introduire une route de lecture publique et un snapshot publié. Le snapshot doit rester une projection du projet, pas une seconde base éditable.

### P0 — Authentification et permissions absentes

L’état est principalement local. Les modales d’authentification et d’invitation existent, mais le diagnostic historique confirme l’absence de session serveur et de permissions effectives. Avant publication réelle, il faut distinguer : propriétaire, organisateur, prestataire et invité.

### P1 — `MirrorSite` contient encore une ancienne page éditoriale morte

`MirrorProjection({ embedded: true })` retourne désormais le programme immersif très tôt, mais le même fichier contient encore l’ancienne branche complète : personnes, prestataires, lieux, musique, galerie et boutons Canvas. Cette branche n’est plus utilisée par le parcours produit, mais :

- elle augmente la taille et la complexité du chunk ;
- elle entretient deux architectures mentales ;
- elle conserve des liens vers le World et le Canvas ;
- elle peut être réexposée accidentellement.

**À terminer :** extraire ou archiver la projection historique hors du chemin produit, puis supprimer ses imports du chunk `MirrorSite`.

### P1 — Le Canvas reste accessible par raccourci dans le produit

La touche `K` ouvre encore `openCanvas()` lorsqu’un projet est actif dans la projection Mirror. Cela contredit la décision « panneau droit = seul éditeur ». Même invisible dans la navigation, cette porte demeure fonctionnelle.

**Décision recommandée :** retirer `K` du produit public. Le conserver uniquement dans le World de développement si nécessaire.

### P1 — Les actions globales ne convergent pas toutes vers le panneau droit

La timeline et les recherches de moments convergent correctement vers `MomentHub`. En revanche, des composants historiques contiennent encore :

- `showEventInWorld` ;
- `showPersonInWorld` ;
- `showVendorInWorld` ;
- `showPlaceInWorld` ;
- `openCanvas`.

Ils sont majoritairement situés dans l’ancienne projection blanche non rendue, mais doivent disparaître du code produit final afin d’empêcher toute régression.

### P1 — Organisation doit rester strictement transversale

Les doublons « prestataires par moment » et « documents par moment » ont été retirés. Les blocs restants sont légitimes s’ils gardent cette responsabilité :

- diagnostic global ;
- équipe traversant plusieurs moments ;
- scénarios ;
- plan de table.

Le `CrewPanel` doit toutefois éviter d’éditer une relation propre à un seul moment si cette relation existe déjà dans `MomentHub`.

### P1 — Le programme immersif ne prend en charge que les images

Le modèle `MediaAsset` connaît plusieurs types, mais le programme utilise actuellement le premier média `kind === 'image'`. Une vidéo rattachée à un moment n’est pas rendue comme fond.

**À terminer :** ajouter un composant média commun :

1. vidéo réelle du moment, silencieuse et contrôlée selon les préférences ;
2. image réelle du moment ;
3. couverture réelle de l’événement ;
4. illustration produit temporaire ;
5. couleur de repli.

Prévoir poster, pause, économie de données, `prefers-reduced-motion` et absence d’autoplay sonore.

### P1 — Le mini-site et le bureau sont dans le même long scroll

Le programme immersif est placé après Organisation. C’est cohérent pour une prévisualisation, mais la frontière « travailler / voir le site » reste faible.

**Recommandation :** un bouton explicite **Prévisualiser le mini-site** ouvre un mode lecture plein écran. Le bureau ne doit pas obliger à traverser toutes les scènes immersives pour atteindre une autre fonction.

### P2 — Navigation du bureau trop large

La barre contient encore La journée, Les gens, L’organisation, Souvenirs, Calendrier, Recherche, Administration éventuelle, Mes mariages et Créer. Après convergence, certaines destinations n’existent plus comme sections visibles dans la page principale.

**Recommandation :** limiter la barre primaire à :

- Jour J ;
- Organisation ;
- Prévisualiser ;
- Recherche ;
- menu projet.

Calendrier et administration deviennent des outils du menu projet selon le rôle.

### P2 — Le Cockpit et le Lab se recouvrent conceptuellement

`Cockpit` expose préparation, prochaine action et conflits. `OrganisationSection` propose ensuite « Analyser ma journée » et affiche `projectFindings()`. Les deux lisent des diagnostics proches.

**Recommandation :** le Cockpit devient la synthèse toujours visible ; un clic ouvre une seule vue détaillée des constats. Supprimer le second bouton « Analyser » si le diagnostic est déjà calculable immédiatement.

### P2 — Création rapide d’un moment

Le compositeur inline de la timeline (nom, heure, durée et modèles) n’est pas un doublon du panneau : il sert à créer, tandis que le panneau sert à enrichir. Il doit rester compact et disparaître dès la création. Verdict : **à garder**.

### P2 — Données textuelles non sélectionnables

`App.css` applique `user-select: none` à tous les éléments. Cela empêche de copier une adresse, une heure, un nom ou une note.

**À corriger :** réserver `user-select: none` aux contrôles de drag et réautoriser `user-select: text` sur les contenus et champs.

### P2 — Accessibilité du programme immersif

Les fonds sont décoratifs (`alt=""`) et le contenu textuel est présent, ce qui est correct. Il reste à vérifier :

- contraste sur chaque image réelle ;
- ordre des titres ;
- lecture clavier du long programme ;
- réduction des mouvements ;
- comportement des vidéos ;
- focus lors de l’ouverture/fermeture du panneau latéral.

### P2 — Performance

Le World 3D n’est plus monté au démarrage, ce qui supprime un coût majeur. Restent :

- le chunk Mirror importe encore des composants morts ;
- toutes les scènes du programme existent dans le DOM ;
- les images sont lazy-loadées sauf la première, ce qui est correct ;
- aucune stratégie vidéo n’existe encore ;
- le store peut notifier très fréquemment dans certains modes historiques.

## Ce qui est cohérent et doit être conservé

- `weddingStore` comme source de vérité unique ;
- `TimelineStudio` comme seule timeline de travail ;
- `MomentHub` comme éditeur unique du moment ;
- `EventPanel` pour les propriétés globales de l’événement ;
- cinq niveaux de certitude ;
- aucune donnée inventée silencieusement ;
- média réel prioritaire sur l’illustration produit ;
- programme immersif strictement en lecture ;
- scénarios comme branches, jamais comme copie automatique de la journée.

## Plan de finition recommandé

### Lot 1 — Convergence finale du bureau

1. Retirer le raccourci Canvas du produit.
2. Supprimer la branche éditoriale morte de `MirrorSite`.
3. Remplacer la navigation par Jour J / Organisation / Prévisualiser / Recherche / Projet.
4. Fusionner Cockpit et Lab en un diagnostic unique.

### Lot 2 — Prévisualisation immersive

1. Séparer la prévisualisation du scroll de travail.
2. Ajouter vidéo/image/couverture/fallback dans un composant média unique.
3. Ajouter navigation entre scènes et sortie explicite de la prévisualisation.
4. Tester mobile, contraste et réduction des mouvements.

### Lot 3 — Publication réelle

1. Route publique stable par événement.
2. État brouillon/publié.
3. Snapshot de lecture généré depuis la source de vérité.
4. Authentification, rôles et permissions.
5. Invitations inter-appareils et persistance serveur.

## Critère de réussite

Une personne doit pouvoir répondre sans hésiter à ces trois questions :

- **Où changer une information ?** Dans le panneau droit.
- **Où organiser le temps ?** Dans la timeline horizontale.
- **Où voir ce que les invités verront ?** Dans la prévisualisation immersive.

Toute surface qui donne une autre réponse doit être fusionnée, rendue strictement passive ou retirée du produit.
