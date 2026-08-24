# INNOVATIONS — V4

Propositions issues du moteur **tel qu'il existe après la passe « convergence finale »**.
**Aucune n'est implémentée.** Chacune n'utilise que des données déjà présentes dans le store et
respecte les règles absolues : une seule pellicule, un seul système documentaire, un seul système de
personnes, un seul moteur de scénarios, une seule recherche, aucune nouvelle base, aucun service
réseau.

Format imposé : NOM · PROBLÈME · SOLUTION · DONNÉES · FONCTIONNEMENT · VALEUR · DIFFICULTÉ · RISQUE
DE DOUBLON.

---

## A · NOUVELLES UTILISATIONS DE LA PELLICULE

### V4-01 · La ligne de flottaison
- **Problème** : à J-90, on ne sait pas si l'on est en avance ou en retard sur la préparation.
- **Solution** : une seconde règle, très fine, sous la pellicule : non plus les heures du jour, mais
  les semaines qui restent, avec les décisions qui auraient dû être prises.
- **Données** : `weddingDate`, `tasks.dueHour`, `vendor.status`, `phase.confidence`, `media`.
- **Fonctionnement** : projection pure ; une décision « attendue » est déduite d'un fait présent
  (un prestataire au statut `quoted` à trois semaines de la date), jamais d'une norme inventée.
- **Valeur** : transforme l'angoisse diffuse en une liste courte et datée.
- **Difficulté** : moyenne. **Doublon** : nul (nouvelle lecture, aucune nouvelle donnée).

### V4-02 · La journée comparée à elle-même
- **Problème** : après trente modifications, on ne sait plus ce qui a changé depuis la version
  montrée aux prestataires.
- **Solution** : figer une version datée de la pellicule et lire la différence, exactement comme un
  scénario — mais avec le passé au lieu d'une hypothèse.
- **Données** : `TimelineScenario` (structure inchangée), `scenarioDiff`.
- **Fonctionnement** : un « instantané » est un scénario créé à partir de l'état courant et jamais
  destiné à être appliqué.
- **Valeur** : « voici ce qui a bougé depuis votre dernier envoi » devient une phrase vraie.
- **Difficulté** : faible. **Doublon** : nul si aucun second moteur n'est écrit — c'est la condition.

### V4-03 · La pellicule à deux jours
- **Problème** : un festival, un séminaire résidentiel ou un mariage avec brunch se jouent sur deux
  ou trois jours ; le modèle s'arrête à 30 h.
- **Données** : `TimelinePhase.startHour` (déjà un nombre non borné en pratique).
- **Fonctionnement** : une échelle qui accepte J+1, J+2, avec des séparateurs de jour ; aucune
  nouvelle entité, seulement une lecture plus large de la même heure décimale.
- **Valeur** : ouvre réellement les types festival, spectacle et séminaire.
- **Difficulté** : élevée (échelle, zoom, glisser-déposer, tests). **Doublon** : nul, mais **risque
  de régression réel** sur la pellicule existante — à ne tenter que seul, sur une passe entière.

---

## B · AUTOMATISATION ADMINISTRATIVE

### V4-04 · Le document se met à jour quand la journée bouge
- **Problème** : une feuille de route générée hier ment aujourd'hui.
- **Solution** : marquer un document produit par le moteur comme *dérivé*, et signaler
  « la journée a bougé depuis » avec un bouton « reproduire ».
- **Données** : `MediaAsset.createdAt`, `provenance`, `phase.startHour`.
- **Fonctionnement** : comparaison de dates, aucune régénération automatique — on ne réécrit jamais
  un document dans le dos de quelqu'un.
- **Valeur** : supprime la classe entière des documents périmés.
- **Difficulté** : faible. **Doublon** : nul (`MediaAsset` reste le seul système).

### V4-05 · Le dossier d'un prestataire, en un geste
- **Problème** : envoyer « tout ce qui concerne le traiteur » suppose de rassembler à la main devis,
  contrat, horaires et plan.
- **Données** : `getMediaFor('vendor')`, `phases` du prestataire, `getCallSheet`.
- **Fonctionnement** : un unique document texte assemblé depuis l'existant, avec « À CONFIRMER »
  partout où le projet ignore.
- **Valeur** : le geste que tout le monde fait à la main, fait par le moteur.
- **Difficulté** : faible. **Doublon** : nul (même `generateAdminDocument`, un cas de plus).

### V4-06 · La numérotation qui tient debout
- **Problème** : un devis puis une facture doivent porter des numéros cohérents et suivis.
- **Données** : les `MediaAsset` de type document déjà produits.
- **Fonctionnement** : compteur dérivé du nombre de documents du même genre, affiché mais
  **modifiable** — la comptabilité de quelqu'un ne s'invente pas.
- **Valeur** : rend les documents produits réellement utilisables.
- **Difficulté** : faible. **Risque** : donner l'illusion d'une conformité comptable. À encadrer par
  une mention explicite.

---

## C · ORCHESTRATION MULTI-ÉVÉNEMENTS

### V4-07 · Le mois de celui qui pilote
- **Problème** : l'administration répond « où en est chaque événement », pas « à quoi ressemble
  mon mois ».
- **Données** : `getStoredProjects()`, `weddingDate`, `adminAlerts()`.
- **Fonctionnement** : une bande verticale de dates, une ligne par jour occupé. Pas un calendrier à
  cases : une liste typographique.
- **Valeur** : la seule vue qui manque encore à un organisateur.
- **Difficulté** : moyenne. **Doublon** : réel si elle devient un second tableau de bord — la
  contrainte est qu'elle reste une liste.

### V4-08 · La double réservation, avant qu'elle n'existe
- **Problème** : `crossEventConflicts()` constate le conflit après coup.
- **Solution** : au moment où l'on rattache une personne à un moment, dire immédiatement « cette
  personne travaille déjà ce jour-là sur un autre événement (rapprochement par nom, à confirmer) ».
- **Données** : la même lecture croisée, déclenchée à l'écriture.
- **Valeur** : empêche l'erreur plutôt que de la signaler.
- **Difficulté** : faible. **Doublon** : nul.

### V4-09 · L'identité confirmée une fois pour toutes
- **Problème** : le rapprochement inter-événements repose sur le nom, et le restera.
- **Solution** : permettre à un humain de dire « oui, c'est la même personne », et conserver cette
  confirmation.
- **Données** : un identifiant partagé, optionnel, sur `Person` — pas une nouvelle entité, pas un
  annuaire central.
- **Valeur** : la seule façon honnête de fiabiliser le multi-événements.
- **Difficulté** : moyenne. **Risque** : la tentation d'un annuaire global. Il faut s'y refuser :
  la personne reste dans son événement.

---

## D · COORDINATION DES ARTISTES ET DES PRESTATAIRES

### V4-10 · La feuille de route imprimable
- **Problème** : sur le terrain, on travaille sur papier, sans réseau.
- **Données** : `getCallSheet(personId)`.
- **Fonctionnement** : une feuille de style d'impression ; rien d'autre. Aucune dépendance.
- **Valeur** : le produit sort enfin de l'écran.
- **Difficulté** : faible. **Doublon** : nul (même projection, autre rendu).

### V4-11 · Ce que cette personne a demandé, réuni
- **Problème** : les besoins techniques sont déclarés par personne ; le régisseur les veut par lieu
  et par heure.
- **Données** : `craft.requirements`, `phases`, `places`.
- **Fonctionnement** : regroupement par lieu puis par heure. Lecture pure.
- **Valeur** : la fiche technique de l'événement, sans la saisir.
- **Difficulté** : faible. **Doublon** : nul.

### V4-12 · La mission qui se relance toute seule
- **Problème** : une mission déléguée reste `to_confirm` et personne ne le voit.
- **Données** : `TaskEntity.status`, `assignedPersonId`, `weddingDate`.
- **Fonctionnement** : remontée dans `adminAlerts()` à mesure que la date approche. **Aucun envoi**,
  aucun message : le produit signale, l'humain relance.
- **Difficulté** : faible. **Doublon** : nul.

---

## E · DISPONIBILITÉS ET SCÉNARIOS

### V4-13 · L'indisponibilité déclarée
- **Problème** : on ne peut dire que quelqu'un travaille, jamais qu'il ne peut pas.
- **Données** : une plage optionnelle sur `PersonCraft` — pas une entité « disponibilité ».
- **Fonctionnement** : `findReplacements()` et `phaseFindings()` la lisent ; rien n'est déduit d'un
  silence.
- **Valeur** : ferme la boucle du remplacement.
- **Difficulté** : moyenne. **Doublon** : nul si cela reste un champ de `craft`.

### V4-14 · Le scénario qui porte son équipe
- **Problème** : un scénario déplace des heures, pas des rattachements. Or un plan B, c'est souvent
  « quelqu'un d'autre joue ».
- **Données** : `TimelineScenario.phases` porte déjà `personIds` (copiés, non exploités).
- **Fonctionnement** : autoriser le diff sur les personnes, avec la même application ligne à ligne.
- **Valeur** : le plan B devient complet.
- **Difficulté** : moyenne. **Doublon** : nul — c'est exactement le moteur existant, un champ de
  plus dans la comparaison.

### V4-15 · Ce que coûte un plan B
- **Problème** : on choisit entre deux scénarios sans savoir lequel coûte plus cher.
- **Données** : `phase.budget`, `craft.fee`, `getTimelineBudget()`.
- **Fonctionnement** : additionner ce qui est saisi, afficher explicitement ce qui manque plutôt
  qu'un total faux.
- **Difficulté** : faible. **Risque** : présenter un total incomplet comme un total. À dire.

---

## F · EXPÉRIENCE DU JOUR J

### V4-16 · « Où dois-je être maintenant ? »
- **Problème** : le jour J, personne n'ouvre une pellicule : on veut une phrase.
- **Données** : `getCallSheet`, l'heure réelle, le repère NOW existant.
- **Fonctionnement** : une phrase, une heure, un lieu, et la suivante. Rien d'autre à l'écran.
- **Valeur** : l'usage le plus fort du produit, le jour où tout se joue.
- **Difficulté** : faible. **Doublon** : nul (le mode « Aujourd'hui » existe déjà et l'accueillerait).

### V4-17 · Le retard réel
- **Problème** : le jour J, on ne simule pas : on constate.
- **Solution** : « nous avons 20 minutes de retard » → `propagationImpact` sur la suite, et les
  conflits nommés.
- **Données** : le moteur de propagation livré dans cette passe.
- **Difficulté** : faible. **Doublon** : nul.

### V4-18 · Le journal de la journée
- **Problème** : après coup, personne ne sait ce qui s'est réellement passé.
- **Données** : les moments effectivement marqués comme faits, avec leur heure réelle.
- **Fonctionnement** : deux rails, prévu et vécu — la même comparaison visuelle que les scénarios.
- **Valeur** : le souvenir, et le retour d'expérience pour l'événement suivant.
- **Difficulté** : moyenne. **Doublon** : réel si un second système de comparaison est écrit.

---

## G · RÔLES

### V4-19 · Le lien qui ne montre qu'une journée
- **Problème** : un artiste n'a pas à recevoir tout l'événement pour lire ses trois heures.
- **Données** : `Invitation` + `ProjectMembership` (existants), `getCallSheet`.
- **Fonctionnement** : un code d'invitation ouvre la feuille de route de cette personne, et rien
  d'autre — la restriction passe par `store.can()`, branché dans cette passe.
- **Valeur** : la diffusion sans pièce jointe ni compte.
- **Difficulté** : moyenne. **Doublon** : nul.

### V4-20 · Voir la journée avec les yeux d'un autre
- **Problème** : celui qui pilote ne sait pas ce que voient les mariés.
- **Données** : `currentRole()`, `isOrchestrator()`.
- **Fonctionnement** : un sélecteur de lecture, purement visuel, qui n'écrit rien.
- **Valeur** : vérifier que l'on ne montre pas un cachet à qui ne doit pas le voir.
- **Difficulté** : faible. **Risque** : passer pour une sécurité — ce n'en est pas une, et
  l'interface devrait le dire.

---

## CE QUI RESTE REFUSÉ, ET LE RESTERA SANS DÉCISION EXPLICITE

- Recherche Web d'entreprise ou d'association : **aucun accès réseau**. Jamais simulée.
- Envoi réel d'un document : **aucun transport connecté**. Jamais simulé.
- OCR, lecture de PDF/DOCX/XLSX, IA externe, Google, Supabase, OAuth, Spotify.
- Lecture audio réelle (`itunes.apple.com` injoignable depuis cet environnement).
- Toute déduction de statut social, de cachet légal ou de conformité administrative.
