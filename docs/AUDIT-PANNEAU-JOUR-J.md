# AUDIT UX — LE PANNEAU DU JOUR J ET SES DOUBLONS

Dépôt `mattmezstitchlab/WEDDINGCITY` · branche `arena/01a02c94-weddingcity` · HEAD audité **`48d2d52`**.
Mesuré dans le code et dans Chromium. **Aucune modification n'a été faite avant cet audit.**

---

## 0. Ce que « le panneau latéral droit » est réellement

Cliquer sur **« Ouvrir »** sur une carte de la pellicule ouvre `MomentHub`
(`timeline.css` : `.wc-hub { position: fixed; right: 0; top: 0; bottom: 0; width: min(560px, 100vw) }`).
C'est bien un panneau latéral droit — et c'est **le panneau d'un MOMENT**, pas celui de l'événement.

Il contient aujourd'hui, dans **un seul défilement continu** : une couverture photo, l'état du moment,
trois actions, puis **douze sections** ouvertes en permanence — Heure, Lieu, Personnes, Prestataires,
Musique, Photo/Vidéo, Repas, Logistique, Budget, Documents, Notes, plus la suppression.
**860 lignes de composant, aucune section repliable.** C'est le mur de formulaires décrit.

**Et il existe une deuxième surface d'édition** : `CanvasCore` (`MirrorCanvasShell`, plein écran,
z-index 860), atteignable par les boutons « Composer » de la partie éditoriale sous la pellicule.

---

## 1. Quelles données sont modifiables à plusieurs endroits ?

Relevé exhaustif des appels d'écriture, par surface.

| Donnée | Pellicule | Panneau du moment | Canvas (« Composer ») | Verdict |
|---|---|---|---|---|
| **Heure d'un moment** | glisser-déposer | `setPhaseTime` (champ) | `setPhaseTime` | **doublon à 3 portes** |
| Durée | — | `setPhaseDuration` | — | une porte ✓ |
| **Titre du moment** | — | — | `setPhaseTitle` | **éditable uniquement hors du moment** |
| **Sous-titre** | — | `setPhaseSubtitle` | — | une porte ✓ |
| **Notes du moment** | — | `setPhaseNotes` | `setPhaseNotes` | **doublon** |
| **Lieu du moment** | — | `setPhasePlace` | `setPhasePlace` | **doublon** |
| **Prestataire rattaché** | — | `attachVendorToPhase` | `attachVendorToPhase` | **doublon** |
| Personnes rattachées | — | attach/detach | — | une porte ✓ |
| Musique, plans photo, repas, logistique, budget, documents, tâches | — | oui | — | une porte ✓ |
| Fiche d'une personne (contact, notes) | — | — | `setPersonContact`, `setPersonNotes`, `updatePerson` | une porte ✓ |
| RSVP, côté, régime d'un invité | — | — | `setGuestRsvp`, `setGuestSide`, `setGuestDietary` | une porte ✓ |
| Fiche prestataire / lieu | — | — | `updateVendor` ×6, `updatePlace` ×5 | une porte ✓ |
| **Nom, date, lieu, nature de l'ÉVÉNEMENT** | — | — | — | **éditable nulle part** |

**Cinq doublons réels** : heure, titre, notes, lieu, prestataire — tous entre le panneau du moment et
le Canvas. Et **un manque** : depuis la passe de convergence, `ProjectSettingsModal` est conditionné
à `projection === 'world'` ; **le nom, la date et le lieu d'un événement ne sont donc plus modifiables
nulle part dans le produit.** C'est le vrai trou de cette page, et il est passé inaperçu parce que la
création les demande une fois.

## 2. Où l'utilisateur risque-t-il de ne pas comprendre où modifier ?

1. **L'heure.** Trois gestes possibles, aucune hiérarchie annoncée.
2. **Le titre d'un moment.** Le panneau du moment affiche le titre… et ne permet pas de le corriger.
   Il faut aller dans « Composer », c'est-à-dire quitter le moment.
3. **Le lieu.** Deux formulaires identiques, à deux endroits, sans lien entre eux.
4. **La date de l'événement.** Introuvable — l'utilisateur la cherchera dans le panneau du moment,
   qui est le seul panneau qu'il connaît.
5. **« Composer »** ne dit pas ce qu'il ouvre : un mot de designer, pas un mot d'utilisateur.

## 3. Quelles actions doivent aller au moment concerné ?

Le **titre** (aujourd'hui uniquement dans le Canvas). Rien d'autre à déplacer : les personnes, les
prestataires, la musique, le repas, la logistique, le budget, les documents et les tâches y sont déjà.
Le panneau du moment est déjà le bon endroit — il est seulement illisible.

## 4. Quelles informations doivent rester globales à l'événement ?

Nom, nature, date, lieu principal, participants attendus, et l'état d'ensemble de la journée
(nombre de moments, horaires non confirmés, scénarios). **Aucune de ces cinq n'appartient à un
moment**, et aucune n'a de porte aujourd'hui.

## 5. Que doit contenir le panneau de droite ?

Deux contextes, **une seule géométrie et un seul composant** :

- ouvert depuis une carte → **le moment** (son état, ses actions, ses dimensions) ;
- ouvert depuis l'en-tête de la journée → **l'événement** (le global du §4).

Créer deux panneaux différents serait exactement le second système que le brief interdit. Un
panneau, deux contenus, la même mécanique d'accordéon.

## 6. Le panneau est-il trop long et trop dense ?

Oui, mesurable : **douze sections toujours dépliées**, une hauteur de contenu très supérieure à
l'écran, aucun résumé, aucune hiérarchie. À 390 px il occupe toute la largeur : le mur devient un
tunnel.

## 7. Peut-on réduire la charge sans supprimer de fonctionnalité ?

Oui — et sans en retirer une seule. **Regrouper** les douze sections en six, **replier** ce qui n'est
pas l'essentiel, et **résumer chaque section fermée par son état réel** (« 2 personnes · 1
prestataire », « aucun document »). L'information reste à un clic, mais le panneau devient une carte
de contrôle plutôt qu'un formulaire.

---

## Décisions retenues pour l'implémentation

| # | Décision | Justification |
|---|---|---|
| D1 | Panneau du moment en **six accordéons**, chacun résumé quand il est fermé | §4 et §7 du brief |
| D2 | **QUAND & OÙ ouvert par défaut**, le reste fermé | c'est ce qu'on vient corriger neuf fois sur dix |
| D3 | Le **titre du moment** devient éditable dans le moment | supprime un doublon inversé (§3) |
| D4 | Un **panneau « L'événement »**, même composant, même géométrie, ouvert depuis l'en-tête | comble le manque du §1, sans second système |
| D5 | Le Canvas **reste** la fiche des personnes, prestataires et lieux ; ses champs qui appartiennent à un moment (heure, lieu, notes, prestataire) deviennent **lecture seule avec un lien vers le moment** | supprime les doublons **sans supprimer la fonctionnalité** (§6 du brief) |
| D6 | Une seule mécanique d'ouverture contextuelle : **`store.openMoment(phaseId, projectId?)`** | remplace le `querySelector(...).click()` que la recherche utilisait, et sert au Calendrier, à la recherche et à l'Administration (§8) |
| D7 | Le Calendrier gagne la **liste des moments** d'une journée, chacun ouvrant son moment | §8 : « Calendrier → 18 juillet → Cérémonie » |
| D8 | **Rien ne change** dans le moteur temporel : ni les 30 heures, ni le multi-jour, ni Chronos | §9 |

**Ce qui ne sera pas fait** : aucune fonctionnalité retirée, aucune section supprimée, aucun test
supprimé, aucune seconde source de vérité.

---

## ÉTAT APRÈS IMPLÉMENTATION

Vérifié dans Chromium réel (149.0.7827.0) à **1440 / 768 / 390 px** :
`scripts/acceptance-panneau.mjs` — **0 échec aux trois largeurs**.
`pnpm run verify` — 0 échec. Build : `✓ built in 7,6 s`.
Les **huit** acceptations navigateur (`jourj`, `spectacle`, `grandjour`, `v2`, `convergence`,
`convergence-finale`, `chronos`, `panneau`) — **0 échec**.

### Les dix critères d'acceptation du brief

| Critère | Où c'est vérifié |
|---|---|
| Les sections sont visiblement dépliables | six têtes de section cliquables, chevron qui tourne, `aria-expanded` |
| Chaque section fermée dit son état | mesuré : `17:30 → 19:00 · aucun lieu`, `personne · aucun prestataire`, `aucun document · aucune tâche` |
| Plus de mur de formulaires | mesuré : **0 champ monté** à l'ouverture, hors « Quand & où » |
| Aucune donnée éditable à deux endroits sans raison | les cinq doublons supprimés, vérifiés un par un par test |
| Le moment reste le centre de son contexte | le **nom** du moment y est enfin éditable ; tout le reste y était déjà |
| Le Calendrier ne possède aucune copie | déjà garanti par la passe Chronos, re-vérifié |
| Calendrier → moment | une journée liste ses moments ; chacun ouvre le sien |
| Document / tâche / personne → contexte | Administration : une mission et un document ouvrent leur moment |
| Source de vérité unique | `updateEvent()` est **le seul** écrivain du nom, de la date, du lieu et de la nature |
| Aucune fonctionnalité supprimée | tous les champs subsistent ; ceux du Canvas sont devenus lecture + lien |

### Ce qui a changé, précisément

1. **Le panneau du moment se replie en six sections** — Quand & où (ouverte), Qui, Ce qu'on y vit,
   Logistique & budget, Documents & tâches, Notes. Les douze blocs d'origine sont **tous** là,
   regroupés, avec un « Tout déplier » pour qui préfère l'ancien mur.
2. **Le nom d'un moment s'édite sur le moment.** C'était le doublon le plus absurde : le panneau
   affichait le titre sans permettre de le corriger, et la seule porte était ailleurs.
3. **Un panneau « L'événement »**, ouvert depuis l'en-tête de la journée, **dans la même coquille**
   (`.wc-hub`) et avec le **même composant d'accordéon** — un panneau, deux contextes. Il comble un
   trou réel : depuis la fermeture des surfaces World, le nom, la date, le lieu et la nature d'un
   événement n'étaient éditables **nulle part**.
4. **Cinq doublons supprimés du Canvas** — heure, titre, lieu, notes, prestataires. Ils y restent
   **affichés** (composer, c'est lire), avec un bouton « Régler ce moment → » qui ouvre le moment.
5. **Une seule porte pour ouvrir un moment** : `store.openMoment(phaseId, projectId?)`. La recherche
   le faisait auparavant en attrapant le DOM (`querySelector(...).click()`) — un attribut renommé et
   le lien mourait en silence. Le Calendrier, la recherche, l'Administration et le panneau de
   l'événement passent désormais tous par là.
6. **La navigation ne repasse plus sur deux lignes** à 1440 px : « Calendrier » a rejoint les *lieux*
   du produit plutôt que les *actions* — ce qu'il est.

### Tests existants adaptés — aucun supprimé

Cinq acceptations reçoivent un helper `unfoldHub()` documenté **LOCATOR ADAPTED** : une section
repliée démonte réellement ses champs, donc le test déplie le panneau avec **le bouton du produit**,
comme le ferait un utilisateur. La garantie est inchangée : chaque champ existe et écrit au même
endroit. Une section **[15/15]** a été ajoutée à `check-timeline.mjs` — 23 vérifications, dont les
cinq doublons disparus, l'écrivain unique de l'événement et la porte unique vers un moment.

### Non fait dans cette passe

- Le Canvas garde l'édition des **fiches** personne / prestataire / lieu et le **réordonnancement**
  des moments : ce ne sont pas des doublons, ils n'existent qu'à cet endroit.
- Aucun changement du moteur temporel : ni les 30 heures, ni le multi-jour, ni Chronos (§9 respecté).
- Les préférences d'affichage de la Timeline évoquées au §3 du brief (niveau de détail, rappels,
  comportement des conflits) **n'ont pas été créées** : elles n'existent pas dans le moteur, et
  inventer des réglages sans effet serait pire qu'un panneau trop long.
