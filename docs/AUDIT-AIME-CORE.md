# AUDIT — AIME CORE / LE GRAND JOUR® COMME PREMIÈRE VERTICALE

Dépôt `mattmezstitchlab/WEDDINGCITY` · branche `arena/01a02c94-weddingcity` · HEAD audité **`1b04c36`**.
Les 28 sections du brief, confrontées au code réel. **Audit écrit avant toute modification.**

---

## A. LE CONSTAT PRINCIPAL

**Le moteur demandé existe déjà à 80 %, et il n'est presque jamais spécifique au mariage.**
Ce qui est spécifique au mariage, ce sont les **noms**, pas les structures.

| Ce que le brief appelle AIME CORE | Ce qui existe | Nom actuel |
|---|---|---|
| Project | `WeddingProject` | ⚠ nom matrimonial |
| Ceremony / CEREMONY_TYPE | `EventTypeSchema` + `eventTypeId` — **14 natures** | ✓ générique |
| People / Roles / Relationship | `Person`, `PersonCraft`, `MembershipRole`, `PersonRelationship` | ✓ générique |
| Places | `Place` | ✓ |
| Providers | `Vendor` | ✓ |
| Moments / Timeline | `TimelinePhase` + `TimelineStudio` | ✓ générique |
| Tasks / Missions | `TaskEntity` + `createMission` | ✓ |
| Documents / Media | `MediaAsset` (un seul système) | ✓ |
| Music | `TrackEntity` avec durée et heure | ✓ |
| Budget | `phase.budget` + `getTimelineBudget()` | ✓ |
| Scenarios | `TimelineScenario` + diff + application | ✓ |
| Constraints / Conflicts | `projectFindings`, `phaseFindings`, `crewFindings`, `crossEventConflicts` | ✓ |
| Coordination | `propagationImpact()` — nomme qui bouge et ce qui casse | ✓ |
| Roadmaps | `getCallSheet()` — dérivée, jamais saisie | ✓ |
| Permissions | `Capability` × `MembershipRole` × `can()` | ✓ (déclaratif) |
| Memories | `MediaAsset` + section Souvenirs | partiel |
| Notifications | **inexistant** — et impossible sans serveur | ✗ |
| Audit / historique | **inexistant** (seul un undo mémoire existe) | ✗ |

**Conclusion : il n'y a pas de moteur à construire. Il y a un vocabulaire à décoller du mariage.**

## B. Section par section — ce qui existe, ce qui manque

| § | Demande | État réel |
|---|---|---|
| 1 | INTENTION → … → SOUVENIR | **fait** : hero → analyse → confirmation → pellicule → scénarios → souvenirs |
| 2-3 | AIME CORE / verticale, `CEREMONY_TYPE` | **partiel** : `eventTypes` fait déjà le travail (14 natures, vocabulaire et trame par nature) ; les *noms* du code disent « wedding » |
| 4 | Accueil sans formulaire | **fait** : une phrase, un import, une nature, une flèche |
| 5 | Cockpit « MON GRAND JOUR » | **manque** — seul le mode « Aujourd'hui » existe |
| 6-7 | Timeline centre, pas de double interface | **fait à la passe précédente** : un panneau contextuel, une seule pellicule |
| 8 | Modules universels d'un moment | **fait** : 7 sections, 12 dimensions |
| 9 | Moteur de coordination + SIMULER/APPLIQUER/ANNULER | **fait** : `propagationImpact()` et « ET SI… », avec quatre issues |
| 10 | Personnes complètes, rôles non codés en dur | **fait** ; réserve : la photo et la relation existent, le rôle « métier » est un texte libre |
| 11 | Prestataires vivants | **fait** sauf échéances de paiement |
| 12 | Invités, RSVP, régimes, hébergement | **partiel** : RSVP, régime, table oui ; hébergement/transport seulement côté équipe (`craft.travel`) |
| 13 | Tables + proposition assistée | **partiel** : plan de table spatial oui ; **proposition automatique non** |
| 14 | Musique = temps | **fait** : durée, heure, recalage |
| 15 | Budget relié au réel | **partiel** : par moment oui ; échéances et paiements non |
| 16 | Documents contextuels | **fait** |
| 17 | Assistant AIME | **refusé en l'état** — voir §D |
| 18 | Missions | **fait** : mission = tâche assignée, avec statut ; feuille de route dérivée |
| 19 | Mode LIVE | **partiel** : mode « Jour J » avec MAINTENANT / ENSUITE ; pas de vue par personne |
| 20 | Mode coordinateur + états 🟢🟡🟠🔴 | **partiel** : `phaseFindings` a déjà ok/gap/conflict ; pas de vue dédiée |
| 21 | Mémoire | **partiel** : section Souvenirs ; pas de bascule « après la cérémonie » |
| 22 | Design | **fait et verrouillé** : noir profond, ivoire, photographie, typographie monumentale |
| 23 | Navigation | **fait** : quatre destinations, volontairement moins que les dix proposées |
| 24 | Composants réutilisables | **partiel** : les surfaces existent, elles ne sont pas encore une bibliothèque nommée |
| 25 | Modèle de données générique | **partiel** : voir §C |
| 26 | AIME propose, l'humain valide | **fait, et c'est la règle du produit depuis le début** |
| 27-28 | AIME CÉRÉMONIES | possible sans refonte — voir §C |

## C. Le renommage « wedding → ceremony » : ce qu'il coûte vraiment

Mesuré : **`wedding` apparaît dans les noms de `weddingStore`, `WeddingProject`, `weddingDate`,
`weddingCreationOpen`, `createRealWedding`, `switchToDemoWedding`, `MirrorSite`, 21 suites de tests**,
et surtout dans **les clés de persistance** `wedding_city_*` et `wedding_city_state_<id>`.

- Renommer les **types et méthodes** : mécanique, large, sans risque fonctionnel mais touchant des
  centaines de lignes et toutes les suites.
- Renommer les **clés de stockage** : **destructif** — tout projet déjà créé dans un navigateur
  deviendrait invisible sans migration.

**Verdict : le renommage n'apporte aujourd'hui aucune capacité nouvelle.** Ce qui enferme un produit
dans le mariage, ce n'est pas le mot `weddingStore` — invisible pour l'utilisateur — c'est un
vocabulaire matrimonial **dans l'interface** et des règles matrimoniales **dans le moteur**. Or
`eventTypes` a déjà découplé les deux : quatorze natures, chacune avec ses questions, ses moments et
sa trame ; aucune n'est traitée à part dans le moteur.

**Recommandé** : ajouter la notion de **cérémonie** là où elle manque vraiment — les huit natures du
§27 (naissance, hommage, transmission, engagement…) comme natures supplémentaires d'`EVENT_TYPES`,
exactement comme mariage, concert ou voyage. Le renommage interne reste possible plus tard, comme
une passe dédiée, avec migration des clés — **jamais en même temps qu'une fonctionnalité.**

## D. Les deux contradictions qu'il faut trancher, pas contourner

### D1 — La signature

Le brief signe désormais :
> LE GRAND JOUR® · **Vous vivez le moment. AIME s'occupe du reste.** · Par LE MONDE AIME®

Le produit affiche aujourd'hui, sur la landing, dans le hero et dans le pied de page :
> LE GRAND JOUR® · **L'amour en vrai.**

Cette signature avait été posée comme une contrainte ferme. Deux marques ne peuvent pas cohabiter
dans un même hero. **Je ne l'ai pas changée sans votre confirmation** : c'est un choix de marque, pas
un détail d'implémentation. La bascule est d'une ligne (`productIdentity.ts`) et propage partout.

### D2 — « Le moteur AIME » (§17)

Le brief demande un assistant qui « analyse le projet » et répond en langage naturel. Deux faits :

1. **Aucune IA externe n'est autorisée** dans ce produit (contrainte posée, et aucun réseau n'est
   connecté). Un assistant qui *semblerait* comprendre serait une mise en scène.
2. **Le comportement décrit existe déjà, en déterministe** : « Cela impacte 6 éléments, le cocktail
   passe à 18h, le photographe reste 30 minutes de plus » est exactement ce que produit
   `propagationImpact()`, avec les noms réels, et ses trois issues SIMULER / APPLIQUER / ANNULER.

**Verdict : le moteur est là, il ne s'appelle pas AIME et il ne parle pas.** Le nommer « AIME »
serait honnête *à condition* de ne jamais laisser croire qu'il devine : il calcule à partir de ce que
vous avez écrit. Un champ de conversation qui simulerait la compréhension est **refusé**.

## E. Ce qui est refusé, et pourquoi

| Demande | Refus | Raison |
|---|---|---|
| Assistant conversationnel « AIME » | **refusé** | aucune IA, aucun réseau ; ce serait une simulation |
| Notifications (§ AIME CORE) | **refusé** | aucun transport n'existe (`Invitation.scope: 'local'`) |
| Proposition automatique des tables (§13) | **différé** | possible en déterministe (relations, familles, capacité), mais l'appeler « IA » serait faux ; à faire comme *proposition explicite*, avec sa règle affichée |
| Renommage global wedding → ceremony | **différé** | coût élevé, gain utilisateur nul aujourd'hui, risque de perte de données ; passe dédiée avec migration |
| Un pourcentage d'avancement inventé | **refusé tel quel** | « 68 % » n'a de sens que si l'on montre sur quoi il porte — voir §F |
| Historique / audit trail | **différé** | utile, mais c'est un système à part entière (et il touche la confidentialité, cf. `AUDIT-CONTEXTE-VIVANT`) |

## F. Ce qui est implémenté dans cette passe : le cockpit (§5)

Une seule chose, parce qu'elle manque vraiment et qu'elle ne duplique rien : **« MON GRAND JOUR »**,
en tête de la pellicule — **pas une page de plus**, une bande éditoriale au-dessus du film.

Elle affiche quatre choses, toutes **dérivées** de données réelles :

1. **L'avancement** — et le produit dit sur quoi il compte : **huit repères** (une date, un lieu, des
   moments, des horaires confirmés, un lieu par moment, des personnes attendues, un prestataire
   engagé, un document). Le score est le nombre de repères tenus. Rien n'est pondéré en secret, et la
   liste est visible : un pourcentage dont on ne peut pas voir la règle est une invention.
2. **La prochaine action** — la première lacune de `projectFindings()`, telle quelle.
3. **Les alertes** — le nombre de conflits réels, jamais un badge décoratif.
4. **Le prochain moment** — lu sur la pellicule.

Aucun stockage, aucune entité, aucune clé : une projection de plus, comme le calendrier.


---

## G. ÉTAT APRÈS IMPLÉMENTATION

Vérifié dans Chromium réel à **1440 / 1024 / 768 / 390 px** :
`acceptance-timeline-convergence.mjs` (section « MON GRAND JOUR » ajoutée) — **0 échec aux quatre
largeurs**. `pnpm run verify` — 0 échec. Neuf acceptations navigateur — 0 échec.

**Livré : le cockpit, et rien d'autre.** Une bande de typographie au-dessus de la pellicule — pas une
page, pas un tableau de bord : quatre phrases, et un chiffre qu'on peut auditer. Le pourcentage ouvre
les **huit repères** dont il est fait, chacun avec sa réponse réelle (« Une date · 2027-07-18 »,
« Un document · aucun document »), et le produit écrit sous la liste : *aucun n'est pondéré, aucun
n'est deviné ; un repère sans réponse compte comme non tenu.*

`readiness()` est une projection : elle ne stocke rien, ne crée aucune entité, aucune clé.

**Non livré dans cette passe, et assumé** : l'assistant conversationnel (§17, refusé — voir §D2), les
notifications (aucun transport), la proposition automatique de tables (§13, faisable en déterministe,
à ne pas appeler « IA »), le renommage `wedding → ceremony` (§C : coût élevé, gain utilisateur nul
aujourd'hui, risque de perte de données ; passe dédiée avec migration), l'historique d'audit.

**En attente de votre décision** : la signature. Le produit affiche « L'amour en vrai. » ; le brief
signe « Vous vivez le moment. AIME s'occupe du reste. » et « Par LE MONDE AIME® ». Je n'ai pas
tranché à votre place — c'est un choix de marque, et il change le hero, la landing et le pied de page
d'une seule ligne (`src/design/productIdentity.ts`).
