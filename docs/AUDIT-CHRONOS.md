# AUDIT — CHRONOS : LE CALENDRIER VIVANT

Dépôt `mattmezstitchlab/WEDDINGCITY` · branche `arena/01a02c94-weddingcity` · HEAD audité **`f0e605b`**.
Audit conduit **avant** toute écriture de code. Les dix points demandés, dans l'ordre.

---

## 1. Limites actuelles de la Timeline

| Limite | Mesure | Conséquence |
|---|---|---|
| Plafond temporel | `canPlacePhase` : `startHour >= 0 && startHour + duration <= 30` | tout ce qui dépasse 30 h est **refusé silencieusement** (`false` / `null`) |
| Origine | l'heure est un **nombre décimal sans date** | un moment ne sait pas *quel jour* il est |
| Bornes d'affichage | `TimelineStudio` : `Math.min(7, …)` / `Math.max(27, …)` — **dynamiques** | cette surface suivrait un jour plus large sans modification |
| Bornes figées | `LandingFilm` 8→29 (démonstration), `ScenariosPanel` **7→27 codés en dur** | un scénario multi-jour sortirait des rails |
| Horloge | `formatHour()` fait `% 24` | 50 h s'affiche « 02:00 », sans dire quel jour |
| Lendemain | `formatHourWithDay()` ne connaît que `h >= 24 → « (+1) »` | un seul lendemain, jamais deux |
| Nuit | `normalizeNightHour` : « heure < 6 → +24 » | juste pour une nuit, faux pour trois jours |
| Lumière | `atmosphereForHour` : `((h % 24) + 24) % 24` | **déjà compatible multi-jour** |

## 2. Confirmation de la limite des 30 heures

**Confirmée, et c'est une bonne nouvelle architecturale.** `canPlacePhase` (weddingStore.ts:1945) est
la **seule** porte d'écriture temporelle, appelée depuis **dix** sites : `setPhaseTime`,
`movePhaseToIndex`, `createPhase`, `shiftPhaseAndFollowing`, `shiftPhasesAfter`, `setPhaseDuration`,
`applyIntakePlan`, `scenarioShiftPhase`, `applyScenario`, `previewMoveToIndex`. Aucun contournement.
Changer l'échelle du produit, c'est changer une ligne — **et vingt-trois affichages** (§3).

## 3. Usages de `% 24` — inventaire exhaustif (23)

| Fichier | Occurrences |
|---|---|
| `game/weddingStore.ts` | **10** (fonctions `clock()` locales à `searchEverything`, `phaseFindings`, `propagationImpact`, `generateAdminDocument`, `crewFindings`, `crossEventConflicts`, `whoWorksBetween`, `adminAlerts`, `searchAcrossEvents`, `atmosphereForHour`) |
| `components/mirror/MirrorLanding.tsx` | 3 |
| `timeline/TimelineStudio.tsx` · `timeline/LandingFilm.tsx` | 1 + 1 |
| `organisation/{ScenariosPanel,OrganisationSection,CrewPanel}.tsx` | 3 |
| `mirror/{intake/IntakeStudio,admin/AdminConsole}.tsx` | 2 |
| `canvas/CanvasCore.tsx` · `projections/worldModel.ts` · `game/documentIntelligence.ts` | 3 |
| `ui/TopNavigation.tsx` · `ui/BottomOrchestrator.tsx` (World, non exposé) | 2 |

Chacune est une **horloge murale qui a perdu sa date**. Aucune n'est fausse aujourd'hui : elles sont
justes tant qu'une timeline est une journée.

## 4. Composants supposant une journée unique

`TimelineStudio` (une échelle, un ruban), `MomentHub` (`formatHourWithDay`), `LandingFilm`,
`ScenariosPanel` (rails 7→27), `NowState` (« maintenant » dans la journée), `getCallSheet`
(feuille de route d'un jour), `worldModel` (programme d'un jour), `CanvasCore`, `OrganisationSection`.
**Aucun composant ne connaît la notion de date** : la date vit uniquement sur le projet.

## 5. `WeddingProject`

`id, title, worldType, coupleNames, weddingDate, locationName, budgetTarget, guestCountTarget,
ownerId, isDemo?, createdAt, updatedAt, inviteCode, themeColor?, eventTypeId?`.
**Une seule date, pas de date de fin.** C'est le point de bascule de tout cet audit : *le projet porte
le jour, la timeline porte les heures.* Le couple (date + heures) est déjà complet — il n'est
simplement jamais lu ensemble.

## 6. Stockage des dates

- `WeddingProject.weddingDate` : chaîne **`YYYY-MM-DD`**, comparable et triable lexicographiquement
  (déjà exploité par `adminEvents()` et `personDossier()`).
- Aucune heure, aucun fuseau, aucun `Date` sérialisé : **aucune ambiguïté de fuseau horaire**, ce qui
  est un actif rare.
- `TimelinePhase.startHour/endHour` : heures décimales locales au jour du projet.
- Liste des projets : `wedding_city_projects_v1` ; état d'un projet : `wedding_city_state_<id>`.

## 7. Relations événements ↔ moments ↔ personnes

`WeddingProject (1) ──< TimelinePhase (n) ──< personIds / vendorIds / trackIds / taskIds`,
`MediaAsset(ownerKind:'event') → phaseId`, `Person` traverse les projets (rapprochement **par nom**,
déclaré « à confirmer »). Lecture inter-projets déjà en place et **en lecture seule** :
`projectSnapshot()`, `adminEvents()`, `adminAlerts()`, `searchAcrossEvents()`, `personDossier()`,
`crossEventConflicts()`.
**Conclusion : la matière d'un calendrier multi-événements existe déjà en totalité.**

## 8. Stockage temporel des scénarios

`TimelineScenario { id, name, createdAt, phases[] }` — une **copie complète des moments avec les
mêmes ids**, persistée dans l'état du projet (`PERSISTED_FIELDS: { key: 'scenarios', kind: 'list' }`).
Le diff se lit moment par moment ; la journée réelle ne bouge qu'à l'application.
Un scénario est donc **borné à un projet** : un « vol annulé » traversant trois jours = trois
projets, donc trois scénarios. **Limite réelle, à documenter, pas à contourner par un second moteur.**

## 9. Risques de régression

| # | Risque | Probabilité | Parade retenue |
|---|---|---|---|
| G1 | Toucher `canPlacePhase` casse 10 chemins d'écriture + 21 suites de tests | élevée | **Ne pas y toucher** (phase F, hors de cette passe) |
| G2 | Un second agenda deviendrait une seconde vérité | élevée | Le Calendrier ne **stocke rien** : projection pure, vérifiée par test |
| G3 | Écrire une date sur un moment dupliquerait la date du projet | moyenne | Interdit : la date reste sur le projet |
| G4 | Le Calendrier chargerait un projet pour l'afficher (effet de bord) | moyenne | Lecture par `projectSnapshot()`, `loadProject()` **seulement sur clic** |
| G5 | La démonstration polluerait le calendrier | certaine | Étiquetée, comme dans l'Administration |
| G6 | Exposition de faits sensibles dans une nouvelle surface | élevée si négligée | Le Calendrier n'affiche **aucun** champ personnel |
| G7 | Une grille de type SaaS trahirait la direction artistique | élevée | Typographie monumentale, pas de grille de cases pour l'année/le mois |

## 10. Architecture minimale recommandée

**Zéro entité nouvelle. Zéro clé de persistance. Zéro moteur temporel.**

```
        LA RÉALITÉ (déjà là)
        projets (date)  +  moments (heures)  +  personnes  +  scénarios
                 │
   ┌─────────────┼───────────────┬────────────────┐
CALENDRIER    TIMELINE      FEUILLE DE ROUTE   SCÉNARIOS
(projection)  (existante)   (getCallSheet)     (existants)
```

Trois projections **pures** à ajouter au store, du même genre que `adminEvents()` :

- `calendarDays(fromISO, toISO)` — un jour, ce qu'il porte, d'où ça vient ;
- `calendarRange(scale, anchorISO)` — les bornes d'un jour / d'une semaine / d'un mois / d'une année ;
- `personCalendar(personId, fromISO, toISO)` — l'agenda dérivé d'une personne, tous événements.

Une surface : `components/mirror/calendar/CalendarStudio.tsx`, ouverte depuis la navigation, qui
**ouvre la Timeline** au lieu de la réimplémenter.

**Réponse à l'exigence du §1 du brief — « démontrer qu'une projection Calendrier résout le besoin
avec moins de risque que les 30 heures » :** oui, pour l'usage décrit. Un voyage Lille→Barcelone est
*trois journées*, pas *une timeline de 72 heures* ; chaque journée garde sa timeline détaillée, sa
propre échelle lisible et ses propres moments. La refonte multi-jour (phase F) reste un chantier
séparé, avec un risque de régression sur le cœur du produit, et cet audit recommande de **ne pas
l'engager tant que le Calendrier n'a pas montré ses limites à l'usage**.

---

## 11. ÉTAT APRÈS IMPLÉMENTATION — PHASES A, B, C (partielle), D

Vérifié dans Chromium réel (149.0.7827.0) à **1440 / 768 / 390 px** :
`scripts/acceptance-chronos.mjs` — **0 échec aux trois largeurs**.
`pnpm run verify` — **0 échec**. Build : `✓ built in ~8s`.
Régressions vérifiées : `jourj`, `grandjour`, `convergence`, `convergence-finale`, `v2`,
`spectacle` — **0 échec**.

### Livré

| Phase | Ce qui a été fait |
|---|---|
| **A** — projection multi-échelle | `CalendarStudio` : Année (12 lignes typographiques), Mois (une **règle** de 31 ticks + les jours occupés listés), Semaine (7 jours, les vides le disent), Jour. Zoom année → mois → semaine → jour. **La limite des 30 heures n'a pas été touchée** (vérifié par test). |
| **B** — Calendrier → Timeline | « Ouvrir la journée » charge l'événement s'il n'est pas ouvert, referme le calendrier et amène sur la pellicule. Une modification faite sur la pellicule réapparaît dans le calendrier **sans qu'aucune heure ait été copiée** — prouvé par le test : cocktail déplacé à 10:00, le mois affiche 10:00 et plus 15:00. |
| **C** — Journée / Mission / Voyage | Trois natures de plus dans `EVENT_TYPES` (qui en porte maintenant **quatorze**), chacune avec son vocabulaire, ses questions et sa trame estimée. **« Tournée » n'a délibérément pas été créée** : une tournée est plusieurs événements lus ensemble dans le calendrier — en faire un type dupliquerait Mission et Voyage. |
| **D** — agenda personnel | `personCalendar()` : les jours d'une personne à travers tous les événements, dérivés de la pellicule. Entre deux événements, le rapprochement se fait **par le nom** et chaque ligne le dit. |
| **§10** — Administration | Filtres temporels *Tout · Aujourd'hui · Cette semaine · Ce mois · Prochain événement*, tous calculés par **`calendarRange()`** — une seule arithmétique de dates dans le produit. |

### Trois projections pures ajoutées au store — aucune entité, aucune clé

`calendarRange()`, `calendarDays()`, `personCalendar()`, plus trois utilitaires de dates
(`shiftDay`, `weekdayOf`, `today`) qui travaillent sur des **chaînes `YYYY-MM-DD`** : aucun fuseau
horaire ne peut décaler une chaîne. Vérifié par test : passage d'année, année bissextile, date
malformée renvoyée intacte.

**Un cas dérivé, jamais stocké** : une journée qui finit après minuit (`endHour > 24`) apparaît aussi
le lendemain, étiquetée « suite de la veille ». La donnée n'existe qu'une fois.

### Deux défauts préexistants corrigés au passage

Tous deux **constatés d'abord sur le code d'avant** (`git stash`), donc antérieurs à cette passe :

1. **Entre 05:00 et 08:00, le repère « maintenant » de la pellicule de démonstration disparaissait
   sans un mot** — l'heure réelle tombait hors de la journée montrée (08:00 → 05:00). Le film le dit
   maintenant explicitement : « 05:13 · hors de la journée montrée ».
2. **Le panneau Jour J annonçait « Cocktail, maintenant » puis se taisait** quand aucun moment ne
   suivait : impossible de savoir si la journée était finie. Il dit désormais « Aucun moment n'est
   prévu après celui-ci. »

### Tests existants adaptés — aucun supprimé

Quatre assertions, chacune commentée sur place (**PRODUCT DECISION** / **LOCATOR ADAPTED**) :
onze → quatorze natures d'événement (dans `check-landing`, `acceptance-grandjour`,
`acceptance-convergence`, `acceptance-convergence-finale`), et « annonce ce qui vient ensuite » →
« annonce ce qui vient ensuite, **ou dit qu'il n'y a rien** » — garantie élargie, pas affaiblie.
Une section **[14/14]** a été ajoutée à `check-timeline.mjs` : 24 vérifications neuves, dont
« le calendrier n'écrit rien », « il n'écrit jamais une heure », « il ne dessine pas de seconde
pellicule » et « la règle des 30 heures est intacte ».

### Non fait, et pourquoi

- **Phase E — scénarios multi-jours** : un scénario est borné à un projet (§8). Un « vol annulé »
  traversant trois jours demanderait soit un scénario inter-projets, soit un regroupement — donc une
  décision de modèle. Non engagée sans accord.
- **Phase F — moteur non borné au-delà de 30 heures** : délibérément **non engagée**, conformément au
  §1 du brief. Le Calendrier répond au besoin décrit (un voyage est trois journées lisibles) et le
  §1.19 de `AUDIT-CONTEXTE-VIVANT.md` chiffre le risque de l'autre chemin.
- **§5 — hero multi-dates** : une phrase comme « je pars vendredi et je joue samedi » produit
  aujourd'hui **un** événement, à **une** date. Lire plusieurs dates dans une phrase et créer
  plusieurs événements liés est un vrai travail d'analyse, à faire seul.
- **§9 — génération de documents depuis le Calendrier** : le générateur existant travaille à partir
  d'une personne ou d'un moment. Y ajouter « le planning d'une journée » est faisable sans second
  système, mais n'a pas été fait dans cette passe.
