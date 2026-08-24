# AUDIT STRATÉGIQUE — « LE CONTEXTE VIVANT »

Dépôt `mattmezstitchlab/WEDDINGCITY` · branche `arena/01a02c94-weddingcity` · HEAD audité **`0f34488`**.

*Révision 2 : ajout de l'audit de la « Timeline infinie » mesuré dans le code (§1.19), des douze
points de sécurité traités un par un (§8 bis) et des vingt innovations entièrement spécifiées, dix
champs chacune (§11).*
**Aucune ligne de code n'a été écrite pour cet audit. Rien n'est implémenté.**

Objet : déterminer si le moteur existant peut porter le temps, les personnes, le contexte, le
consentement et la proximité — sans devenir un réseau social, une application médicale, un outil de
surveillance, ni un second produit.

Ce document répond aux onze livrables demandés, dans l'ordre.

> **La conclusion en une phrase, avant le détail :** le moteur peut porter le contexte et le
> consentement avec **deux entités nouvelles seulement**, mais la **proximité géographique doit être
> refusée en l'état** — et, plus urgent que toute innovation, **le produit détient déjà une donnée de
> santé (`Guest.dietary`) qu'il affiche aujourd'hui sans le moindre contrôle d'accès.**

---

## 1. AUDIT DE L'EXISTANT

### 1.1 `Person` — `src/types/identity.ts`
`id, displayName, givenName, familyName, email, phone, agentId, dmcIdentityId, accountId,
portraitMediaId, notes, craft?, origin` + `createdAt/updatedAt`.
**Une seule entité humaine dans tout le produit.** Pas de `Performer`, pas de `Technician`, pas de
`Client`. Une personne n'est jamais dupliquée à l'intérieur d'un projet.
→ **GARDER. C'est le point d'ancrage naturel du contexte déclaré.**

Manque, au regard de l'objectif : aucun champ de consentement, aucune notion de visibilité, aucune
disponibilité, aucune compétence déclarée hors métier, aucun contact d'urgence, aucune langue.

### 1.2 `Person.craft` — `PersonCraft`
`role, speciality, status, vendorId, zone, fee, setupMinutes, teardownMinutes, requirements[],
notes, travel{from,arrival,transport,hotel,shuttle,departure}, professionalNumber, services, hours`.
Tout optionnel, jamais rempli automatiquement.
→ **GARDER.** C'est déjà un « contexte professionnel déclaré ». Le contexte personnel ne doit **pas**
y être ajouté : un cachet et une allergie n'ont ni la même sensibilité, ni le même public.

### 1.3 « Provider » / `Vendor`
`companyName, category, status(prospect|quoted|contracted|cancelled), contactPersonId, phone, email,
websiteUrl, documentIds, taskIds, placeIds, notes`.
Une **structure**, distincte de la personne qui l'exerce (`craft.vendorId` fait le lien).
→ **GARDER.** La séparation personne / structure est correcte et rare ; elle sera indispensable pour
dire « le traiteur voit les contraintes alimentaires » sans dire « M. X voit les allergies ».

### 1.4 « Performer » et « Technician »
**N'existent pas, et ne doivent pas exister.** Un artiste est une `Person` avec un `craft`. La
distinction artiste/technicien est aujourd'hui **déduite du libellé du métier** — c'est une déduction,
pas une donnée, et l'interface doit continuer à le dire.

### 1.5 Relations — `PersonRelationship`
`fromPersonId, toPersonId, kind, note, createdAt`, avec
`kind: partner|parent|child|sibling|family|friend|colleague|witness|works_with`.
→ **ÉTENDRE.** Un contact d'urgence **est une relation**, pas une entité. Il manque exactement un
`kind` et un drapeau de consentement du tiers.

### 1.6 Timeline — `TimelinePhase`
`startHour/endHour` (jour modèle 0→30 h), `name, subtitle, primaryPlaceId, personIds[], vendorIds[],
trackIds[], taskIds[], shots[], meal{menu,allergies,headcount}, logistics, budget, notes,
confidence?, confidenceNote?`.
→ **GARDER — source de vérité unique.** Point capital pour la suite : **`personIds` + `startHour` +
`primaryPlaceId` constituent déjà une présence déclarée dans le temps et dans l'espace.** C'est une
proximité, obtenue sans un seul capteur.
À noter : `meal.allergies` est un **champ texte libre au niveau du moment** — un doublon latent avec
`Guest.dietary` (voir §3).

### 1.7 Moment comme hub — `getPhaseHub`, `phaseFindings`, `missingDocumentsForPhase`
Onze dimensions dans l'interface ; un état dérivé (`ok | gap | conflict`) ; des documents manquants
proposés seulement quand le contexte suffit.
→ **GARDER et ÉTENDRE.** `phaseFindings()` est exactement la place d'une ligne
« 4 informations alimentaires à prendre en compte » — **agrégée, jamais nominative**.

### 1.8 Scénarios — `TimelineScenario`
`{id, name, createdAt, phases[]}` persisté, `scenarioDiff`, `applyScenario(only?)`, `discardScenario`.
Porte les heures et le lieu. Les `personIds` sont copiés dans les phases du scénario **mais ne sont
pas exploités par le diff**.
→ **ÉTENDRE, jamais dupliquer.** Un « Plan C — imprévu » et une « procédure » sont des scénarios
nommés, pas un moteur de plus. Réserve : une **procédure de sécurité** n'est pas un scénario — elle
n'a pas vocation à être « appliquée » à la timeline (voir §4.4).

### 1.9 Causalité — `propagationImpact`, `shiftPhasesAfter`
Projection pure, nomme les personnes et prestataires touchés, liste les conflits créés, quatre
issues. Vérifié par test : lire l'impact ne déplace rien.
→ **GARDER.** C'est le socle de « quelle est la conséquence sur la Timeline ? ».

### 1.10 Administration — `adminEvents`, `adminAlerts`, `searchAcrossEvents`, `personDossier`
Lecture seule sur les projets stockés ; n'écrit rien (vérifié par test) ; la démonstration est
étiquetée et ne produit pas de travail ; le rapprochement inter-événements se fait **par nom** et le
dit.
→ **GARDER.** C'est la surface d'un référent ou d'un organisateur.
**Limite structurelle :** l'Administration lit **tous** les projets du navigateur sans aucun contrôle
— parce qu'il n'y a ni compte réel, ni serveur (§1.15).

### 1.11 Recherche universelle — `searchEverything`, `searchAcrossEvents`
Personnes (nom, e-mail, téléphone, métier, spécialité, statut, besoins), moments, lieux,
prestataires, morceaux, documents, tâches, tables.
→ **DANGER À DOCUMENTER.** Telle quelle, une recherche qui indexerait des faits sensibles les
exposerait à quiconque ouvre le navigateur. Toute donnée sensible devra être **exclue de l'index par
défaut**, et non filtrée à l'affichage.

### 1.12 Documents — `MediaAsset`
Un seul système. `ownerKind: person|place|vendor|event|song|wedding`, `provenance` traçable,
`generateAdminDocument()` écrit « À CONFIRMER » partout où le projet ignore.
→ **GARDER.** Une consigne, une procédure, une fiche de route sont des documents.
**Point de vigilance majeur :** un document généré est stocké en **data URL en clair** dans
`localStorage`. Y écrire une allergie reviendrait à recopier une donnée de santé dans un second
endroit, hors de tout contrôle d'accès. À interdire explicitement.

### 1.13 Tâches — `TaskEntity`
`title, phaseId, category, dueHour, isDone, urgent, cost, assignedPersonId, status(todo|doing|
to_confirm|done|blocked), connectedDocIds…`
→ **UNE `ActionRequest` EST DÉJÀ LÀ.** Une demande d'aide = une tâche avec un moment, un statut et
(optionnellement) une personne. Il manque un seul concept : « ouverte à qui ? ».

### 1.14 Rôles et permissions
`MembershipRole: owner|planner|partner|vendor|guest|viewer`.
`Capability` : 14 valeurs (`project.edit`, `budget.view/edit`, `guests.view/edit`, `vendors.view/edit`,
`documents.view/edit`, `tasks.edit`, `playlist.vote`, `playlist.manage`, `invitations.manage`,
`ads.manage`). Table `ROLE_CAPABILITIES` complète. `store.can()` existe.
→ **CONNECTER ET ÉTENDRE, ne jamais doubler.**
**Trois constats à ne pas perdre de vue :**
1. `can()` est **délibérément permissif** : `if (!membership) return true`. En mode local mono-
   utilisateur, tout est autorisé. Un contrôle d'accès sensible bâti là-dessus serait **du théâtre**.
2. Le vocabulaire des capacités est *fonctionnel* (`budget.view`), pas *catégoriel*. Il n'existe
   aucune capacité pour une donnée sensible.
3. **Collision de nom à éviter absolument :** l'entité `Capability` demandée dans le brief (une
   compétence d'une personne : « secouriste », « conduit un camion ») porte le même nom qu'un type
   déjà utilisé partout pour les permissions. Deux notions, un mot : source de bugs garantie.

### 1.15 Mécanismes de partage
`Invitation { code, role, status, guestId, expiresAt, scope: 'local' | 'remote' }`, avec ce
commentaire dans le code : *« 'local' means the code can only be resolved in the browser that
created it — there is no server »*.
→ **CONSTAT DÉCISIF POUR TOUT CE DOCUMENT : il n'existe aucun transport.** Pas de serveur, pas de
notification, pas de SMS, pas d'e-mail, pas de temps réel. Deux navigateurs ne se voient pas.
Toute fonctionnalité du type « prévenir les personnes proches » est donc, aujourd'hui,
**techniquement impossible** — et la simuler serait la faute la plus grave que ce produit puisse
commettre.

### 1.16 Localisation
`navigator.geolocation` : **jamais utilisé** (`src/game/probes.ts` le déclare explicitement).
`Place.gpsCoordinates` : une chaîne, sur un **lieu**, pas sur une personne. `Place.pos` : coordonnées
de la scène 3D, sans rapport avec le monde réel.
→ **Le produit ne géolocalise personne, et c'est un actif, pas un manque.**

### 1.17 Import
`analyseIntake` + `documentIntelligence` : lecture locale de texte, cinq niveaux de certitude,
`evidence` conservée pour chaque élément, aucune donnée inventée, aucun réseau, pas d'OCR.
→ **RÉUTILISABLE TEL QUEL** pour lire une contrainte alimentaire dans une liste d'invités — à la
condition stricte qu'une donnée sensible importée n'entre **jamais** au niveau `CONFIRMÉ` mais
toujours à `À CONFIRMER` (voir §9.4).

### 1.18 Multi-projets, persistance, isolation
Clés : `wedding_city_accounts_v1`, `_active_account_v1`, `_projects_v1`, `_active_project_id_v1`,
`wedding_city_state_<projectId>`. Un état **par projet** → isolation structurelle.
`savePersistedState` / `loadPersistedState` avec remontée honnête des échecs ;
`deleteStoredProject()` supprime le projet et son état.
→ **GARDER.** Mais : **JSON en clair**, aucun chiffrement, aucune expiration, **aucune suppression
d'une personne** (seulement d'un projet entier), **aucun export**, aucune journalisation des accès.

### 1.19 La « Timeline potentiellement infinie » — ce que le code autorise réellement

*(Mesuré après coup : ce point était sous-traité dans la première version de cet audit, alors qu'il
conditionne toute l'ambition « n'importe quelle journée, mission ou tournée ».)*

**Le moteur refuse aujourd'hui tout ce qui dépasse trente heures.** Une seule ligne :

```
// src/game/weddingStore.ts:1947
private canPlacePhase(startHour: number, duration: number): boolean {
  ...
  return startHour >= 0 && startHour + duration <= 30;
}
```

**Bonne nouvelle architecturale :** c'est *la seule* porte. Elle est appelée depuis **dix** endroits
— `createPhase`, `setPhaseTime`, `setPhaseDuration`, `movePhaseToIndex`, `shiftPhaseAndFollowing`,
`shiftPhasesAfter`, `applyIntakePlan`, `scenarioShiftPhase`, `applyScenario`, `previewMoveToIndex`.
Il n'existe aucun contournement : toute écriture temporelle du produit passe par là.

**Mauvaise nouvelle fonctionnelle :** une tournée, un voyage, une mission de trois jours ou une
organisation familiale hebdomadaire sont **refusés silencieusement** (la méthode renvoie `false` /
`null`). Le produit ne dit même pas pourquoi.

Ce qu'il faudrait toucher, et rien d'autre — inventaire exhaustif mesuré :

| Endroit | Ce qui suppose une seule journée |
|---|---|
| `canPlacePhase` | le plafond `<= 30` |
| `formatHour()` | `Math.floor(total / 60) % 24` — au-delà de 24 h, l'heure « retombe » sans dire quel jour |
| `formatHourWithDay()` | ne connaît qu'un seul lendemain (`h >= 24 → « (+1) »`) |
| `% 24` ailleurs | **23 occurrences** (10 dans le store, 13 dans les composants) : chacune est une horloge murale qui a perdu la date |
| `ScenariosPanel` | rails de comparaison **codés en dur** de 7 h à 27 h |
| `TimelineStudio` | bornes déjà **dynamiques** (`Math.min/max` sur les moments) — cette surface-là est prête |
| `LandingFilm` | bornes fixes 8 h → 29 h, mais c'est une démonstration éditoriale, pas le produit |
| `WeddingProject.weddingDate` | **une seule date**, pas de date de fin (12 usages) — une tournée n'a pas « une date » |
| `normalizeNightHour` | règle « une heure < 6 h devient +24 » : juste pour une nuit, fausse pour trois jours |
| `atmosphereForHour` | déjà modulo 24 : **compatible multi-jour sans changement** |

**Verdict.** L'obstacle n'est pas conceptuel : le modèle stocke une heure décimale, qui pourrait
valoir 74,5 aussi bien que 17,5. L'obstacle est une convention d'affichage répandue dans vingt-trois
endroits, plus un plafond dans une ligne. C'est faisable, ce n'est pas anodin, et cela ne doit pas
être fait en même temps que le consentement : ce sont deux passes distinctes, avec deux risques de
régression distincts. La pellicule est le cœur du produit ; on ne touche pas à son échelle en passant.

**Conséquence pour la stratégie** : « la Timeline devient potentiellement infinie » est une décision
d'ingénierie à part entière (classée **B-15** puis détaillée en **B-19/B-20** ci-dessous), pas un
effet de bord du contexte vivant.

---

---

## 2. FONCTIONNALITÉS DÉJÀ RÉUTILISABLES (rien à construire)

| Besoin du brief | Ce qui existe déjà, exactement |
|---|---|
| « Qui est autour de moi » | `phase.personIds` + `phase.primaryPlaceId` + heure : **une présence déclarée**, sans capteur |
| « Où dois-je être » | `getCallSheet(personId)` — projection pure, se recalcule à chaque changement |
| « Qui peut aider » | `getCrew()`, `getCrewForPhase()`, `whoWorksBetween(from,to)`, `findReplacements()` |
| « Une demande d'action » | `TaskEntity` + `createMission()` + `setMissionStatus()` (5 statuts) |
| « Qui est autorisé » | `ProjectMembership` + `Capability` + `store.can()` + `currentRole()` |
| « Conséquence sur la timeline » | `propagationImpact()` — nomme les personnes, liste les conflits |
| « Plan B / imprévu » | `TimelineScenario` + `scenarioDiff` + application ligne à ligne |
| « Procédure écrite » | `MediaAsset` + `generateAdminDocument()` |
| « Ce qui manque ici » | `phaseFindings()` / `missingDocumentsForPhase()` / `crewFindings()` |
| « Cinq certitudes » | `Certainty` — une définition, un habillage, appliquée partout |
| « Une personne, plusieurs rôles » | `Person` + `craft` + `Guest` + `ProjectMembership` + `personDossier()` |
| « Projections par rôle » | `isOrchestrator()` branché dans la navigation et sur les champs sensibles |

**Environ 70 % du « contexte vivant » décrit dans le brief est déjà dans le moteur.** Ce qui manque
n'est presque jamais une fonctionnalité : c'est **le consentement et la visibilité**.

---

## 3. DOUBLONS POTENTIELS — À TRANCHER AVANT D'ÉCRIRE UNE LIGNE

1. **`Guest.dietary` (string) vs `phase.meal.allergies` (string) vs un futur « fait déclaré ».**
   Deux champs libres existent déjà pour la même réalité. En créer un troisième produirait trois
   vérités contradictoires sur une donnée de santé. → **Une seule source, et migration des deux
   autres en lecture dérivée.**
2. **`EmergencyContact` vs `PersonRelationship`.** Un contact d'urgence est une relation typée.
   → **Aucune entité nouvelle.**
3. **`ActionRequest` vs `TaskEntity`.** La mission déléguée existe, avec ses statuts.
   → **Aucune entité nouvelle** ; un champ « ouverte à ».
4. **`VolunteerResponse` vs `TaskEntity.status` + `assignedPersonId`.** Une réponse est une
   transition d'état. → **Aucune entité nouvelle** tant qu'une seule personne répond ; une liste
   `candidates[]` suffirait au-delà.
5. **`Capability` (compétence) vs `Capability` (permission).** Collision de nom frontale.
   → **Interdire le mot.** Une compétence déclarée s'appellera `skills`.
6. **`Availability` vs `craft.travel` / `whoWorksBetween`.** L'occupation se déduit déjà de la
   pellicule ; l'**indisponibilité**, elle, ne se déduit d'aucun silence.
   → Pas d'entité : des créneaux optionnels sur la personne.
7. **`SafetyProcedure` vs `MediaAsset` vs `TimelineScenario`.** Une procédure est un document
   attaché à un moment ou à un événement. → **Document**, pas scénario, pas entité.
8. **`AccessPolicy` vs `Capability` + visibilité.** Une politique globale d'accès serait un second
   système de permissions. → **Un champ de visibilité sur chaque fait**, lu par les capacités
   existantes.

---

## 4. ARCHITECTURE MINIMALE RECOMMANDÉE

**Deux entités nouvelles. Pas huit.**

### 4.1 `DeclaredFact` — porté par la personne, jamais isolé
Non pas une entité de premier rang mais une **liste optionnelle sur `Person`** :

```
Person.declared?: DeclaredFact[]

DeclaredFact {
  id
  kind: 'diet' | 'allergy' | 'accessibility' | 'mobility' | 'language'
      | 'assistance' | 'skill' | 'availability' | 'other'
  label            // « sans gluten », « fauteuil », « langue des signes »
  detail?          // texte libre, écrit par la personne
  visibility: 'self' | 'organiser' | 'mission' | 'emergency'
  missionScope?    // pour 'mission' : la catégorie de prestataire concernée
  certainty: Certainty       // les cinq niveaux existants
  declaredByPersonId         // qui l'a écrit — soi-même, ou quelqu'un d'autre
  consentId                  // aucun fait sans consentement, jamais
  createdAt / updatedAt
}
```

Pourquoi sur `Person` et pas ailleurs : la personne traverse les événements ; le fait la suit.
Pourquoi une liste et pas des champs : une personne a *n* faits, chacun avec **sa propre** règle de
visibilité — c'est la demande centrale du brief.

### 4.2 `Consent` — la seule autre entité, et elle est indispensable
```
Consent {
  id
  personId
  purpose: 'diet_service' | 'accessibility' | 'emergency_contact'
         | 'help_request' | 'crew_coordination'
  scope: 'this_event' | 'these_events[]'      // jamais « tous, pour toujours »
  grantedAt
  grantedVia: 'self' | 'transcribed'          // qui a saisi, honnêtement
  revokedAt?                                  // révocation = un champ, pas une suppression
  expiresAt?                                  // par défaut : la date de l'événement + N jours
}
```
Elle ne peut pas être un champ : un consentement se **révoque**, se **date**, s'**expire**, et son
historique est précisément ce qui protège la personne. C'est la seule structure du produit dont
l'historique compte plus que l'état.

### 4.3 Extensions, sans entité nouvelle
| Notion du brief | Où elle va |
|---|---|
| `AccessPolicy` | `DeclaredFact.visibility` + 3 capacités nouvelles : `context.view.organiser`, `context.view.mission`, `context.view.emergency` |
| `EmergencyContact` | `PersonRelationship.kind = 'emergency_contact'` + `consentId` du tiers |
| `Availability` | `DeclaredFact.kind = 'availability'` (créneaux déclarés, **jamais déduits**) |
| `Capability` (compétence) | `DeclaredFact.kind = 'skill'` — **le mot « Capability » reste réservé aux permissions** |
| `ActionRequest` | `TaskEntity` + `openTo?: 'assigned' \| 'declared_volunteers'` |
| `VolunteerResponse` | `TaskEntity.status` + `candidatePersonIds?[]` |
| `SafetyProcedure` | `MediaAsset` (document) attaché au moment ou à l'événement |

### 4.4 Ce que l'architecture doit interdire par construction
- Un `DeclaredFact` **sans** `consentId` : impossible à créer.
- Un fait sensible **recopié** dans un `MediaAsset` généré, dans un titre, dans un log, dans l'index
  de recherche : jamais.
- Une **procédure de sécurité appliquée à la timeline** comme un scénario : une procédure se lit,
  elle ne se « déploie » pas.
- Un fait `estimated` ou `inferred` qui deviendrait une donnée personnelle : le brief l'interdit,
  l'architecture doit le refuser — **seuls `confirmed` et `to_confirm` sont admissibles** pour un
  fait sensible, et `to_confirm` n'est jamais servi à un prestataire comme une certitude.

---

## 5. RISQUES

| # | Risque | Gravité | Ce qui le déclenche |
|---|---|---|---|
| R1 | **Une donnée de santé déjà exposée sans contrôle.** `Guest.dietary` s'affiche aujourd'hui dans « Personnes », dans la constellation, dans le Canvas et dans l'inspecteur. Le produit a déjà le problème qu'il s'apprête à étudier. | **Critique** | Existant, aujourd'hui |
| R2 | **Faux sentiment de sécurité.** Une interface qui dit « 3 personnes autorisées sont proches » alors qu'aucun message ne partira jamais est pire que rien : quelqu'un pourrait compter dessus. | **Critique** | Toute fonctionnalité de proximité sans transport réel |
| R3 | **Fichier de personnes vulnérables.** Allergies + accessibilité + assistance + présence horaire, en clair dans un `localStorage` non chiffré : c'est un fichier de vulnérabilité. | **Critique** | Dès le premier `DeclaredFact` persisté |
| R4 | **Contrôle d'accès en trompe-l'œil.** `can()` renvoie `true` sans membership. Sans serveur, une permission côté client **n'est pas une protection**, seulement une convention d'affichage. | Élevée | Dès qu'on présente la visibilité comme une garantie |
| R5 | **Consentement d'un tiers.** Un contact d'urgence est une personne qui n'a jamais rien accepté et qui n'est peut-être pas utilisatrice. | Élevée | `EmergencyContact` |
| R6 | **Détournement en surveillance.** « Qui est présent maintenant » lu par un employeur devient du contrôle de présence. | Élevée | Projection « qui est là » sans limite |
| R7 | **Dérive médicale.** « Allergie critique » + « procédure » + « alerte » = un dispositif que la réglementation pourrait qualifier de médical. | Élevée | Tout vocabulaire de triage, de gravité, de conduite à tenir |
| R8 | **Recherche universelle qui aspire tout.** `searchEverything` indexe déjà `craft.requirements`. | Moyenne | Ajout naïf des faits déclarés à l'index |
| R9 | **Périmètre infini.** « N'importe quelle journée » peut vider le produit de son propos et diluer la DA. | Moyenne | Ouverture non maîtrisée des types |
| R10 | **Doublon de vérité alimentaire.** Trois champs pour une allergie. | Moyenne | Ne pas trancher le §3.1 d'abord |
| R11 | **Persistance non bornée.** Aucune expiration ; un événement de 2027 gardera ses allergies en 2032. | Moyenne | Existant, aggravé |
| R12 | **Rapprochement par nom.** Deux homonymes fusionnés en Administration transporteraient une allergie sur la mauvaise personne. | Élevée si sensible | Étendre le dossier personne aux faits déclarés |

---

## 6. LIMITES TECHNIQUES

1. **Aucun serveur, aucun transport.** Ni notification, ni SMS, ni e-mail, ni temps réel, ni
   synchronisation. `Invitation.scope: 'local'` le dit déjà dans le code.
2. **Aucun temps partagé.** Deux personnes ne peuvent pas voir la même timeline évoluer.
3. **Aucune géolocalisation** — et l'ajouter supposerait consentement, HTTPS, et un serveur pour que
   « proche » ait un sens entre deux appareils.
4. **`localStorage` : ~5 Mo, en clair, par navigateur, sans expiration.** Effacer le profil efface
   tout ; aucune sauvegarde.
5. **Aucune authentification réelle.** Le compte est local ; n'importe qui ouvrant le navigateur est
   « propriétaire ».
6. **Aucune journalisation** des consultations.
7. **Aucun chiffrement**, et un chiffrement purement client sans serveur ne protégerait de rien
   (la clé serait à côté de la donnée).
8. Pas d'OCR, pas de lecture PDF/DOCX, pas de réseau (`researchEngine` reste non exposé).

**Conséquence directe :** sur les huit notions listées par le brief, celles qui touchent à la
proximité et à l'alerte **ne peuvent pas être honnêtement implémentées aujourd'hui**. Les autres le
peuvent.

---

## 7. LIMITES DE CONFIDENTIALITÉ

1. **Données à ne jamais collecter par défaut** : allergie, pathologie, handicap, mobilité,
   assistance, religion, langue maternelle, contact d'urgence, position. Aucune ne doit être demandée
   à l'inscription ; chacune doit être *ajoutée* par la personne, jamais *réclamée* par un formulaire.
2. **Aucune donnée sensible ne doit être saisie par un tiers sans le dire.** Si l'organisateur écrit
   l'allergie d'un invité, le fait doit porter `grantedVia: 'transcribed'` et rester `À CONFIRMER`.
3. **Minimisation par la finalité** : le traiteur a besoin de « 4 régimes sans gluten, 1 allergie
   arachide », **pas** de savoir qui. Le nom n'est nécessaire qu'au service en salle, et seulement à
   table.
4. **Séparation stricte** entre profil public (nom, portrait), professionnel (`craft`) et contextuel
   (`declared`). Le troisième ne doit apparaître dans aucune projection éditoriale, aucun document
   généré, aucun export, aucun index de recherche.
5. **Révocation** : un fait révoqué disparaît de toutes les projections **immédiatement**, y compris
   des documents déjà produits — ce qui implique de ne jamais y avoir recopié le fait.
6. **Conservation** : par défaut, date de l'événement + 30 jours, puis suppression proposée. Rien ne
   le fait aujourd'hui.
7. **Traçabilité** : consulter un fait `emergency` devrait laisser une trace lisible par la personne
   concernée. Rien ne le fait aujourd'hui.
8. **Ce que le produit ne pourra pas promettre** : que la donnée est protégée d'un accès physique au
   navigateur. Il faut l'écrire, pas le contourner.

---

## 8. LIMITES RÉGLEMENTAIRES — à signaler, pas à maquiller

*Lecture non juridique, à faire valider par un professionnel avant toute implémentation.*

- **RGPD art. 9 — catégories particulières.** Allergies, handicap, besoin d'assistance sont des
  **données de santé**. Leur traitement est interdit par principe, sauf exception — ici, le
  **consentement explicite** (art. 9.2.a). Cela impose : finalité déterminée, consentement libre,
  spécifique, éclairé, univoque, **et aussi facile à retirer qu'à donner**.
- **RGPD art. 5 — minimisation et limitation de conservation.** Aucune durée n'existe aujourd'hui.
- **RGPD art. 17 — effacement.** Impossible aujourd'hui pour une personne : on ne peut supprimer
  qu'un projet entier.
- **RGPD art. 20 — portabilité.** Aucun export n'existe.
- **RGPD art. 32 — sécurité.** JSON en clair dans `localStorage` : difficilement défendable pour de
  la donnée de santé, même en local.
- **RGPD art. 35 — analyse d'impact (AIPD).** Un traitement croisant données de santé, personnes
  potentiellement vulnérables et localisation **déclenche très probablement l'obligation d'AIPD**.
- **Responsabilité du traitement.** Aujourd'hui la donnée ne quitte pas l'appareil : l'éditeur n'est
  sans doute pas responsable de traitement. **Au premier serveur, cela change entièrement**, et
  l'organisateur devient responsable, l'éditeur sous-traitant, avec contrat art. 28.
- **Données de tiers.** Un invité n'a jamais accepté quoi que ce soit ; un contact d'urgence non plus.
  Information des personnes (art. 14) requise.
- **Mineurs.** Un événement familial comporte des enfants : consentement parental requis.
- **Règlement MDR 2017/745.** Dès qu'un logiciel oriente une conduite à tenir de nature médicale, il
  peut être qualifié de **dispositif médical**. → Aucun vocabulaire de gravité, de triage, de
  premiers secours. « Consigne écrite par la personne », jamais « conduite à tenir ».
- **Services d'urgence (15/17/18/112).** Ne jamais simuler, ne jamais s'y substituer, ne jamais
  laisser croire qu'un appel a été passé. Afficher les numéros officiels est légitime ; prétendre
  alerter ne l'est pas.
- **Non-assistance.** Une interface qui laisse croire que « l'équipe a été prévenue » alors que rien
  n'est parti crée un risque humain, avant même le risque juridique.
- **ePrivacy / consentement au traçage.** Toute lecture de position d'un terminal exige un
  consentement propre, distinct du RGPD.

---

## 8 bis. AUDIT DE SÉCURITÉ ET DE CONFIDENTIALITÉ — LES DOUZE POINTS, UN PAR UN

*(Réponse point par point à la liste du brief. « Aujourd'hui » = état réel mesuré au commit
`0f34488`. Aucun de ces points n'est implémenté ; ce sont des exigences, pas des promesses.)*

**1. Données personnelles potentiellement sensibles.**
Déjà présentes : `Guest.dietary` (santé), `Person.phone`, `Person.email`, `Person.notes` (texte
libre, donc contenu imprévisible), `craft.status` (situation professionnelle), `craft.fee`
(rémunération), `craft.professionalNumber`, `phase.meal.allergies`, `phase.notes`, `vendor.notes`.
Envisagées : allergie critique, accessibilité, mobilité, assistance, langue, contact d'urgence.
**Sept champs de texte libre** peuvent déjà contenir n'importe quoi — c'est le vrai angle mort.

**2. Données à ne jamais collecter par défaut.**
Aucune donnée de santé, aucun handicap, aucune position, aucune religion, aucune origine, aucune
donnée bancaire, aucun document d'identité, aucun numéro de sécurité sociale. Règle de conception :
**un champ sensible n'existe pas tant que la personne ne l'a pas créé.** Pas de formulaire vide qui
réclame.

**3. Consentements.** Voir §9 : un consentement par finalité, jamais global ; `grantedVia` distingue
« écrit par la personne » de « transcrit par un tiers ». **Aucun `DeclaredFact` ne peut exister sans
`consentId`** — contrainte de construction, pas de discipline.

**4. Révocation.** Un geste, immédiat, sans justification, aussi accessible que l'ajout.
Techniquement : `revokedAt` posé, le fait disparaît de **toutes** les projections au render suivant.
Le consentement, lui, n'est pas supprimé : sa trace prouve que la personne a retiré son accord.
**Corollaire non négociable :** si le fait a été recopié dans un document généré, la révocation est
impossible à honorer. → interdiction de recopier (§4.4).

**5. Qui peut voir quoi.** Quatre visibilités (`self`, `organiser`, `mission`, `emergency`) × trois
capacités nouvelles, lues par le modèle de permissions existant. Tableau complet en §10.
**Réserve capitale :** aujourd'hui `can()` renvoie `true` sans membership — sans serveur, ceci est
une convention d'affichage, **pas une protection**. À écrire dans l'interface, pas à sous-entendre.

**6. Durée de conservation.** Rien aujourd'hui : un état de 2027 restera en 2032.
Proposition : `expiresAt` par défaut = date de l'événement + 30 jours pour un fait contextuel ;
au-delà, le produit propose la suppression et ne la fait pas dans le dos de l'utilisateur.

**7. Suppression.** Aujourd'hui, seul `deleteStoredProject()` existe — **un projet entier, jamais une
personne**. Manquent : supprimer une personne et tout ce qui la concerne, supprimer un fait,
supprimer tous les faits d'un événement. Sans cela, l'article 17 du RGPD n'est pas satisfaisable.

**8. Séparation profil public / professionnel / contextuel.**
Public = `displayName`, `portraitMediaId`. Professionnel = `craft`. Contextuel = `declared`
(à créer). **Le contextuel ne doit apparaître dans aucune** projection éditoriale (`worldModel`),
aucun document généré, aucun export, aucun index de recherche, aucun libellé de tâche, aucun titre de
média. Ce sont cinq interdictions vérifiables par test.

**9. Traçabilité des accès sensibles.**
Aujourd'hui : **aucune journalisation, nulle part**. Proposition (A-08) : toute lecture d'un fait
`emergency` laisse une ligne horodatée, lisible **par la personne concernée en premier**. C'est ce
qui rend le niveau `emergency` défendable ; sans lui, il ne l'est pas.

**10. Risques d'abus.** Sept, identifiés : (a) contrôle de présence déguisé en organisation ;
(b) tri d'invités sur un critère sensible ; (c) constitution d'un fichier de personnes vulnérables ;
(d) transmission d'une allergie à un prestataire non concerné par « facilité » ; (e) contact
d'urgence utilisé comme carnet d'adresses ; (f) rapprochement par homonymie transportant un fait
sensible sur la mauvaise personne ; (g) organisateur qui exige une déclaration comme condition de
participation — **le produit ne doit jamais rendre un champ obligatoire**.

**11. Fonctionnalités exigeant un service externe réel.**
Notification (SMS, push, e-mail), proximité entre appareils, synchronisation multi-appareils,
authentification réelle, chiffrement défendable, horodatage opposable, signature de document.
**Toutes classées C ou D.** Sans serveur, aucune n'existe — et `Invitation.scope: 'local'` le dit
déjà dans le code.

**12. Ne jamais simuler une protection ou une intervention.**
Interdits explicites, à inscrire dans les tests : « l'équipe a été prévenue », « les secours ont été
contactés », « 3 personnes ont été alertées », « données chiffrées », « accès sécurisé », toute barre
de progression d'envoi, toute confirmation d'acheminement. Le produit peut afficher **une liste de
personnes à appeler** et **les numéros officiels** ; il ne peut rien affirmer d'autre.

---

## 9. MODÈLE DE CONSENTEMENT PROPOSÉ

### 9.1 Cinq principes
1. **Rien n'est demandé.** Un fait s'ajoute ; il n'est jamais réclamé par un champ vide accusateur.
2. **Un fait, une visibilité.** La question « qui peut le voir ? » est posée à la seconde même où le
   fait est écrit, jamais après, jamais globalement.
3. **Une finalité, un consentement.** Pas de consentement global : « pour que le traiteur adapte le
   repas de cet événement » est une finalité ; « pour améliorer le service » n'en est pas une.
4. **Retirer est aussi simple qu'ajouter.** Un geste, immédiat, sans justification.
5. **Ce que le produit ne peut pas garantir, il l'écrit.**

### 9.2 Les quatre visibilités
| Niveau | Qui voit | Voit quoi | Capacité |
|---|---|---|---|
| `self` | la personne seule | tout, en clair | — |
| `organiser` | qui a `context.view.organiser` | **l'agrégat** (« 4 régimes »), le nom seulement si nécessaire | nouvelle |
| `mission` | le prestataire concerné, pour son moment | ce qui sert sa mission, **sans le nom par défaut** | nouvelle |
| `emergency` | référent désigné, **et seulement pendant l'événement** | la consigne écrite par la personne + son contact | nouvelle, tracée |

### 9.3 Cycle de vie
`ajouté → visibilité choisie → utilisé dans une projection → révoqué (immédiat) → expiré (date + 30 j)
→ supprimé`. Un fait révoqué disparaît des projections mais son *consentement* garde sa trace : c'est
la preuve que la personne a bien retiré son accord.

### 9.4 Les cinq certitudes appliquées au contexte
| Niveau | Sens pour un fait déclaré | Admis ? |
|---|---|---|
| `CONFIRMÉ` | écrit par la personne elle-même | oui |
| `À CONFIRMER` | transcrit par un tiers, ou importé d'un document | oui — **jamais servi comme une certitude** |
| `MANQUANT` | une information a été demandée et n'a pas été donnée | oui |
| `DÉDUIT` | déduit d'autre chose | **non** — on ne déduit pas une allergie |
| `ESTIMÉ` | proposé par le produit | **non, jamais** — le brief l'interdit, l'architecture doit le refuser |

---

## 10. PROJECTIONS PAR RÔLE — une donnée, plusieurs lectures

Exemple : `17:30 · Cocktail · 120 personnes · 4 régimes déclarés · 1 besoin d'accessibilité`.

| Rôle | Ce qu'il voit | Ce qu'il ne voit jamais |
|---|---|---|
| **Marié / hôte** | « Votre cocktail est prêt. » | rien de nominatif sur les régimes |
| **Invité** | « Vous êtes attendu au cocktail à 17:30, jardin. » | les autres invités |
| **Artiste** | « Balance 16:45, plateau 17:30. Vos besoins : micro HF, loge. » | budget, cachets des autres, contexte des invités |
| **Traiteur (mission)** | « 4 régimes : 2 sans gluten, 1 sans arachide, 1 végétarien. » — **agrégé** | les noms, sauf si le service en salle l'exige et que la personne l'a accepté |
| **Référent désigné** | « 1 personne a déclaré une consigne d'assistance pour ce moment » + le contact **si** visibilité `emergency` | tout le reste du contexte |
| **Organisateur** | les agrégats, les manques, les consentements donnés et retirés | le détail d'un fait `self` |
| **Administrateur** | l'état des consentements, jamais leur contenu | le contenu des faits `self` |

Cette table est déjà réalisable : `phaseFindings()` produit des agrégats, `store.can()` pose la
question, `isOrchestrator()` est branché. **Ce qui manque, c'est le fait et son consentement.**

---

## 11. VINGT INNOVATIONS, CLASSÉES ET SPÉCIFIÉES

Classement : **A** compatible avec le moteur actuel · **B** évolution locale · **C** exige un service
externe réel · **D** à ne pas implémenter.
Chaque fiche porte les dix champs demandés. *SdV* = source de vérité.

---

### CLASSE A — le moteur existant suffit

**A-01 · LA PROXIMITÉ PAR LA PELLICULE**
- *Problème résolu* : savoir qui est réellement présent à un moment, sans capteur ni géolocalisation.
- *Fonctionnement* : le moment en cours donne `personIds` et `primaryPlaceId`. La présence est
  **déclarée par l'organisation**, jamais mesurée. « Proche » signifie « attendu au même moment, au
  même endroit ».
- *Données nécessaires* : aucune nouvelle — `TimelinePhase.personIds`, `primaryPlaceId`, l'heure.
- *Consentement nécessaire* : aucun nouveau (l'organisateur sait déjà qui il a placé) ; un
  consentement devient nécessaire dès que la liste sort du cercle de l'organisation.
- *SdV* : la Timeline. — *Doublon* : nul. — *Difficulté* : faible.
- *Risque de confidentialité* : **moyen** — devient du contrôle de présence si l'historique est
  conservé (R6). Mitigation : lecture de l'instant, jamais d'historique.
- *Valeur réelle* : **élevée.** C'est la réponse honnête à la « proximité » du brief, disponible
  immédiatement, sans serveur et sans GPS.

**A-02 · L'AGRÉGAT AU LIEU DU NOM**
- *Problème résolu* : le traiteur doit adapter quatre repas, pas savoir qui est allergique.
- *Fonctionnement* : `phaseFindings()` publie « 4 informations alimentaires à prendre en compte ».
  Le nom n'apparaît que si le service en salle l'exige **et** que la personne l'a accepté.
- *Données* : `Guest.dietary` existant (puis `DeclaredFact`).
- *Consentement* : aucun pour l'agrégat anonyme ; explicite pour toute désignation nominative.
- *SdV* : la personne. — *Doublon* : nul. — *Difficulté* : faible.
- *Confidentialité* : **réduit** le risque existant R1. — *Valeur* : élevée, immédiate.

**A-03 · LA DEMANDE OUVERTE AUX VOLONTAIRES DÉCLARÉS**
- *Problème résolu* : « il faut quelqu'un pour aller chercher le matériel à 15 h ».
- *Fonctionnement* : une `TaskEntity` avec `openTo`. Le produit **liste** les personnes ayant accepté
  ce type de sollicitation ; **un humain les contacte**. Aucun déclenchement, aucun envoi.
- *Données* : tâches existantes + une déclaration de volontariat.
- *Consentement* : « j'accepte d'être sollicité pour ce type d'aide », par événement, révocable.
- *SdV* : la tâche. — *Doublon* : nul (`createMission` existe). — *Difficulté* : faible.
- *Confidentialité* : moyenne (révèle une disponibilité à l'organisation).
- *Valeur* : **élevée pour le monde associatif**, qui vit de cela.

**A-04 · L'INDISPONIBILITÉ DÉCLARÉE**
- *Problème résolu* : `findReplacements()` propose des gens dont on ignore s'ils sont libres.
- *Fonctionnement* : créneaux déclarés par la personne. **Un silence n'est jamais une
  disponibilité** : le produit affiche « inconnue », ce qui est la vérité.
- *Données* : créneaux (`DeclaredFact.kind = 'availability'`).
- *Consentement* : implicite (la personne l'écrit elle-même), visibilité `organiser`.
- *SdV* : la personne. — *Doublon* : nul. — *Difficulté* : faible.
- *Confidentialité* : faible. — *Valeur* : moyenne à élevée ; ferme la boucle du remplacement.

**A-05 · LA PROCÉDURE ÉCRITE, ATTACHÉE AU MOMENT**
- *Problème résolu* : « que fait-on s'il pleut / si le courant saute » vit dans la tête d'une seule
  personne.
- *Fonctionnement* : un `MediaAsset` document rattaché au moment, écrit **par un humain**. Le produit
  n'en rédige aucune et n'en suggère aucune.
- *Données* : documents existants. — *Consentement* : aucun (pas de donnée personnelle).
- *SdV* : le document. — *Doublon* : nul. — *Difficulté* : faible.
- *Confidentialité* : **élevée si elle contient un fait sensible** → interdiction stricte d'y recopier
  un `DeclaredFact` (§4.4).
- *Valeur* : élevée, et sans aucun risque technique.

**A-06 · LE PLAN « IMPRÉVU » NOMMÉ**
- *Problème résolu* : un scénario est aujourd'hui un décalage anonyme.
- *Fonctionnement* : le scénario existant reçoit une cause (pluie, retard, transport annulé, matériel
  manquant, artiste indisponible) ; `propagationImpact()` nomme les conséquences et les conflits.
- *Données* : scénarios + causalité, tous deux existants. — *Consentement* : aucun.
- *SdV* : la Timeline. — *Doublon* : nul **si le moteur reste unique**. — *Difficulté* : moyenne.
- *Confidentialité* : nulle. — *Valeur* : élevée.

**A-07 · LE CONTACT D'URGENCE COMME RELATION**
- *Problème résolu* : personne ne sait qui prévenir, et l'information dort dans un téléphone.
- *Fonctionnement* : `PersonRelationship.kind = 'emergency_contact'`, visible uniquement au niveau
  `emergency`, pendant l'événement.
- *Données* : relations existantes + un consentement.
- *Consentement* : **double** — celui de la personne, et l'information du tiers, qui n'a rien demandé
  (R5). Sans le second, la fonction ne devrait pas exister.
- *SdV* : la relation. — *Doublon* : nul. — *Difficulté* : faible.
- *Confidentialité* : **élevée**. — *Valeur* : réelle, à condition de ne rien promettre d'automatique.

**A-08 · LE JOURNAL DES ACCÈS SENSIBLES**
- *Problème résolu* : personne ne sait qui a consulté quoi.
- *Fonctionnement* : toute lecture d'un fait `emergency` laisse une ligne horodatée, lisible **par la
  personne concernée en premier**.
- *Données* : une liste d'événements d'accès. — *Consentement* : aucun (c'est une protection).
- *SdV* : le journal. — *Doublon* : nul. — *Difficulté* : faible.
- *Confidentialité* : **c'est ce qui rend le niveau `emergency` défendable.**
- *Valeur* : **structurelle** — sans lui, je déconseille d'ouvrir le niveau `emergency`.

**A-09 · LE MOMENT QUI DIT CE QUI LUI MANQUE, CÔTÉ PERSONNES**
- *Problème résolu* : on découvre au dernier moment qu'aucun référent n'est prévu sur un moment à
  120 personnes.
- *Fonctionnement* : `phaseFindings()` gagne des lignes « aucun référent désigné », « aucune consigne
  écrite pour ce moment » — **des constats, pas des injonctions**.
- *Données* : existantes + rôles. — *Consentement* : aucun.
- *SdV* : la Timeline. — *Doublon* : nul (troisième appelant d'un moteur existant). — *Difficulté* :
  faible. — *Confidentialité* : faible. — *Valeur* : élevée.

---

### CLASSE B — évolution locale du moteur

**B-10 · MIGRER `Guest.dietary` ET `phase.meal.allergies` — LA PRIORITÉ ABSOLUE**
- *Problème résolu* : une donnée de santé est **déjà** affichée sans contrôle d'accès, à travers
  quatre surfaces, et deux champs concurrents la décrivent.
- *Fonctionnement* : une seule source (`DeclaredFact`), les deux anciens champs devenant des lectures
  dérivées, avec migration des données existantes.
- *Données* : celles déjà stockées. — *Consentement* : rétroactif à demander, sinon le fait passe
  `À CONFIRMER` et cesse d'être servi nominativement.
- *SdV* : la personne. — *Doublon* : **supprime** un doublon existant. — *Difficulté* : moyenne.
- *Confidentialité* : **ferme R1**, le risque le plus grave du produit aujourd'hui.
- *Valeur* : **la plus haute du document.** Rien d'autre ne devrait être écrit avant.

**B-11 · `DeclaredFact` + `Consent` — LA FONDATION**
- *Problème résolu* : le produit n'a aujourd'hui aucun moyen de dire « cette information est à moi,
  et voici qui peut la voir ».
- *Fonctionnement* : les deux structures du §4, sans aucune troisième entité.
- *Données* : nouvelles, minimales. — *Consentement* : **c'est le sujet même**.
- *SdV* : la personne. — *Doublon* : nul si les huit notions du brief y sont absorbées (§3).
- *Difficulté* : **élevée** (modèle, persistance, migration, tests, interface).
- *Confidentialité* : maximale — tout en dépend. — *Valeur* : fondatrice ; rien ne tient sans elle.

**B-12 · TROIS CAPACITÉS NOUVELLES**
- *Problème résolu* : aucune capacité existante ne parle de donnée sensible.
- *Fonctionnement* : `context.view.organiser`, `context.view.mission`, `context.view.emergency`
  ajoutées à `Capability` et à `ROLE_CAPABILITIES`. **Aucun second système de permissions.**
- *Données* : existantes. — *Consentement* : aucun (c'est la mécanique d'accès).
- *SdV* : la membership. — *Doublon* : nul. — *Difficulté* : faible.
- *Confidentialité* : élevée — **et à ne jamais présenter comme une sécurité** tant que `can()` reste
  permissif sans serveur. — *Valeur* : élevée.

**B-13 · EXPIRATION, SUPPRESSION, EXPORT**
- *Problème résolu* : aucune durée de conservation, aucune suppression d'une personne, aucun export.
- *Fonctionnement* : `expiresAt` par défaut ; « supprimer cette personne et tout ce qui la
  concerne » ; export JSON de ses données.
- *Données* : existantes. — *Consentement* : sans objet.
- *SdV* : la persistance. — *Doublon* : nul. — *Difficulté* : moyenne.
- *Confidentialité* : **conditionne les articles 17 et 20 du RGPD.**
- *Valeur* : conformité, pas confort — donc non négociable si B-11 est fait.

**B-14 · EXCLUSION STRUCTURELLE DE L'INDEX**
- *Problème résolu* : `searchEverything` indexe déjà `craft.requirements` ; il indexerait naïvement
  les faits sensibles.
- *Fonctionnement* : les faits sensibles ne sont **jamais** ajoutés à l'index — exclusion à la
  source, pas filtrage à l'affichage.
- *Données* : existantes. — *Consentement* : sans objet. — *SdV* : la recherche.
- *Doublon* : nul. — *Difficulté* : faible. — *Confidentialité* : ferme R8. — *Valeur* : élevée.

**B-15 · LA FEUILLE DE ROUTE ENRICHIE DU CONTEXTE DE MISSION**
- *Problème résolu* : chaque métier doit recevoir ce qui le concerne, et seulement cela.
- *Fonctionnement* : `getCallSheet()` gagne un bloc contextuel filtré par la visibilité `mission` et
  limité **aux moments de cette personne**.
- *Données* : `DeclaredFact` + `craft`. — *Consentement* : visibilité `mission` explicite.
- *SdV* : la Timeline. — *Doublon* : nul. — *Difficulté* : moyenne.
- *Confidentialité* : élevée (c'est là que la donnée sort du cercle). — *Valeur* : élevée.

**B-16 · LE MODE « RÉFÉRENT »**
- *Problème résolu* : la personne responsable d'un moment n'a aucune vue dédiée.
- *Fonctionnement* : une projection : ce qui est déclaré pour le moment en cours, **en agrégat**, les
  procédures écrites, et les numéros officiels. **Aucune alerte, aucun envoi, aucune carte.**
- *Données* : existantes + faits. — *Consentement* : `organiser` et `emergency`.
- *SdV* : la Timeline. — *Doublon* : nul (une projection de plus, pas une page de plus).
- *Difficulté* : moyenne. — *Confidentialité* : **élevée** — à n'ouvrir qu'à un rôle nommément
  désigné, et journalisée (A-08). — *Valeur* : élevée.

**B-17 · LA TIMELINE MULTI-JOUR**
- *Problème résolu* : une tournée, un voyage, une mission ou une semaine familiale sont **refusés**
  par `canPlacePhase` (`<= 30`).
- *Fonctionnement* : plafond porté à *n* jours, heures affichées avec leur jour, rails de scénario
  dynamiques ; voir l'inventaire exhaustif du §1.19.
- *Données* : existantes (l'heure décimale suffit) + une date de fin sur le projet.
- *Consentement* : aucun. — *SdV* : la Timeline. — *Doublon* : nul.
- *Difficulté* : **élevée, avec risque de régression réel** sur 23 points d'affichage.
- *Confidentialité* : nulle. — *Valeur* : **c'est la condition unique de l'universalité promise.**

**B-18 · LE TYPE « JOURNÉE » ET LE TYPE « MISSION »**
- *Problème résolu* : organiser une journée ordinaire ou une mission professionnelle sans passer par
  le vocabulaire du mariage.
- *Fonctionnement* : deux schémas de plus dans `EVENT_TYPES` (qui en porte déjà onze, chacun avec son
  vocabulaire, ses questions et sa trame estimée). **Aucune catégorie indépendante, aucun second
  moteur** — exactement le mécanisme existant.
- *Données* : aucune nouvelle. — *Consentement* : aucun. — *SdV* : le type d'événement.
- *Doublon* : nul. — *Difficulté* : **faible**. — *Confidentialité* : nulle.
- *Valeur* : élevée au regard de l'ambition — et c'est, de loin, le chemin le moins cher vers
  « n'importe quelle succession d'actions ».

---

### CLASSE C — exige un service externe réel

**C-19 · LA PROXIMITÉ RÉELLE ENTRE APPAREILS**
- *Problème résolu* : savoir qui est physiquement près, et non qui était prévu.
- *Fonctionnement* : géolocalisation consentie + serveur + temps réel + calcul de distance
  approximative, **sans jamais afficher de position précise**.
- *Données* : position — la donnée la plus sensible du document.
- *Consentement* : explicite, révocable, distinct (ePrivacy), limité à la durée de l'événement.
- *SdV* : l'appareil de la personne. — *Doublon* : nul. — *Difficulté* : **très élevée.**
- *Confidentialité* : **maximale** ; AIPD obligatoire (§8).
- *Valeur* : potentiellement forte, **mais A-01 en offre 80 % sans aucun de ces risques.**
  → à n'étudier qu'après une décision explicite, jamais par glissement.

**C-20 · LA NOTIFICATION RÉELLE**
- *Problème résolu* : « prévenir l'équipe désignée » suppose qu'un message parte.
- *Fonctionnement* : transport réel (SMS, push, e-mail) + serveur + accusé de remise.
- *Données* : coordonnées. — *Consentement* : explicite par canal.
- *SdV* : le service d'envoi. — *Doublon* : nul. — *Difficulté* : élevée.
- *Confidentialité* : élevée. — *Valeur* : forte.
- **Tant qu'il n'existe pas, aucune formulation du produit ne doit laisser croire qu'un message est
  parti** (R2). C'est la ligne rouge la plus facile à franchir par inadvertance.

---

### CLASSE D — à ne pas implémenter

| # | Innovation refusée | Raison |
|---|---|---|
| D-a | Carte des personnes présentes ou vulnérables | Exclue par le brief ; constitue un fichier de vulnérabilité |
| D-b | Détection automatique d'un besoin d'assistance | Ce serait un diagnostic |
| D-c | Niveau de gravité, tri, conduite à tenir | Vocabulaire médical → risque de qualification MDR |
| D-d | Alerte automatique sans validation humaine | Interdit par le brief, dangereux en soi |
| D-e | Contact automatique d'un service d'urgence | Jamais. Afficher le numéro officiel, rien de plus |
| D-f | Historique de présence d'une personne | C'est de la surveillance (R6) |
| D-g | Déduction d'un fait sensible en `CONFIRMÉ` depuis un import | Une allergie ne se déduit pas |
| D-h | Score de fiabilité ou de disponibilité d'une personne | Notation des humains : non |

---

## 12. RÉPONSE À LA QUESTION POSÉE

**Le moteur peut-il porter tout cela ?** Oui, pour l'essentiel — parce qu'il a déjà le temps, les
personnes, les rôles, les conséquences et les cinq certitudes. Le « contexte vivant » n'est pas un
produit nouveau : c'est **une dimension de plus sur la même personne, avec une règle de visibilité**.

**Faut-il le faire maintenant, et dans cet ordre ?** Non, pas dans l'ordre du brief. L'ordre
défendable est celui du risque, pas celui de l'ambition :

1. **B-10** — fermer la fuite qui existe déjà (`Guest.dietary` affiché sans contrôle, et déjà
   dédoublé par `phase.meal.allergies`). Rien d'autre ne devrait être écrit avant.
2. **B-11 + B-12** — le fait déclaré, son consentement, les trois capacités.
3. **A-02, A-05, A-07, A-08, A-09** — l'agrégat, la procédure, le contact, le journal, le manque.
4. **B-13, B-14** — expiration, effacement, export, non-indexation.
5. **A-01, A-03, A-04, A-06, B-15, B-16** — la proximité par la pellicule, l'entraide, l'imprévu,
   les feuilles de route contextuelles, le mode référent.
6. **B-18** puis **B-17** — le type « journée » et le type « mission » d'abord (faible coût, forte
   portée), la timeline multi-jour ensuite, **seule, sur une passe entière**.
7. **C-19, C-20** — seulement après une décision explicite sur un serveur, et une AIPD.

**Sur l'universalité, une remarque que je dois faire** : le brief postule que la Timeline « devient
potentiellement infinie ». Elle ne l'est pas — `canPlacePhase` la borne à trente heures, et
vingt-trois affichages supposent une seule journée (§1.19). Mais l'universalité tient d'abord au
**vocabulaire**, pas à la durée : le moteur porte déjà onze natures d'événement, chacune avec ses
questions et sa trame. Deux schémas de plus (**B-18**, difficulté faible) ouvrent la journée
ordinaire et la mission professionnelle **sans toucher à l'échelle**. La tournée et le voyage, eux,
exigent réellement **B-17**. Faire B-18 avant B-17, c'est obtenir l'essentiel de la promesse pour un
dixième du risque.

**Ce que je recommande de refuser, même si le moteur pourrait l'écrire :** toute formulation qui
laisse croire qu'une alerte part, qu'une personne a été prévenue, qu'une position est connue ou
qu'une conduite à tenir est recommandée. Le produit peut dire *ce qui est déclaré*, *qui est prévu*,
*ce qui manque* et *qui appeler*. C'est déjà beaucoup, et c'est vrai.

**La phrase qui doit rester au-dessus de tout le reste :**
un système qui organise mieux le temps peut permettre aux gens de mieux prendre soin les uns des
autres — **à condition de ne jamais prétendre le faire à leur place.**
