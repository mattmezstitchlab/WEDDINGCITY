# Modules dormants — inventaire et statut

**Statut : CONSERVÉS INTENTIONNELLEMENT. Ne pas supprimer. Ne pas réintégrer artificiellement.**

Ces cinq fichiers existent dans `src/` mais ne sont atteignables depuis aucun
chemin d'import partant de `src/main.tsx`. Ils ne sont donc ni exécutés, ni
inclus dans le bundle de production (Rollup les élimine au tree-shaking).

Le test `scripts/check-startup.mjs` (section 4) maintient cet inventaire :
il échoue si un **nouveau** module devient orphelin, et signale si l'un de
ceux-ci redevient atteignable.

> **Précédent utile :** `src/game/input.ts` figurait dans cette liste. Il
> contenait une gestion clavier correcte et complète, alors que
> `InteriorVenueView` lisait un `keys.current` que rien n'écrivait — le WASD
> était donc inerte. La correction a consisté à **monter le module dormant**
> plutôt qu'à réécrire du code. C'est exactement pourquoi ces fichiers ne
> doivent pas être supprimés sans examen.

---

## `src/SceneShell.tsx` — 229 lignes

**Rôle potentiel :** enveloppe de scène R3F générique (Canvas, éclairage,
contrôles, boucle) indépendante du domaine mariage.

**Pourquoi dormant :** `WeddingWorld.tsx` monte son propre `<Canvas>` avec
l'éclairage et le rig caméra spécifiques à Wedding City.

**Valeur future :** base d'un second contexte de rendu (Children Lab, éditeur
de lieu isolé, prévisualisation d'un monde généré) sans dupliquer la scène
principale.

**Risque de réintégration :** deux `<Canvas>` concurrents. À n'utiliser que
dans une vue séparée, jamais en parallèle du monde principal.

---

## `src/game/GameFlow.tsx` — 87 lignes

**Rôle potentiel :** machine à états de phases de jeu (intro → play → pause →
fin), pilotant `loop.ts`.

**Pourquoi dormant :** l'orchestration temporelle vit dans
`weddingStore.tick()` et `BottomOrchestrator`, avec un modèle différent
(horloge 10h→27h plutôt que des états de partie).

**Valeur future :** utile si Wedding City ajoute un mode « répétition » ou un
déroulé scénarisé du jour J avec états explicites.

**Risque de réintégration :** duplication de l'autorité temporelle. Le store
doit rester la source unique de l'heure simulée.

---

## `src/game/ChaseCamera.tsx` — 39 lignes

**Rôle potentiel :** caméra de poursuite suivant une cible mobile avec
amortissement.

**Pourquoi dormant :** `WeddingWorld` utilise `OrbitControls` + `damp3` vers
`cameraTargetPos`.

**Valeur future :** directement pertinent pour le mode intérieur — suivre
l'avatar en vue troisième personne plutôt que de recentrer l'orbite. Le WASD
étant désormais fonctionnel, c'est le candidat le plus proche d'un usage réel.

**Risque de réintégration :** conflit avec `OrbitControls`. Il faudrait
désactiver l'un quand l'autre est actif.

---

## `src/game/loop.ts` — 83 lignes

**Rôle potentiel :** boucle `requestAnimationFrame` à pas fixe, avec
accumulateur — indépendante de `useFrame`.

**Pourquoi dormant :** la simulation est cadencée par `useFrame` dans
`PreviewAndSimRig`, donc par le rendu R3F.

**Valeur future :** réel intérêt de performance. La simulation est aujourd'hui
couplée au framerate ; un pas fixe rendrait le déplacement des agents
déterministe et permettrait de découpler `tick()` de `notify()` (roadmap P2.3).

**Risque de réintégration :** deux boucles simultanées feraient avancer le
temps deux fois plus vite. Migration exclusive obligatoire.

---

## `src/game/mouseLook.ts` — 44 lignes

**Rôle potentiel :** rotation caméra à la souris avec Pointer Lock.

**Pourquoi dormant :** aucune vue première personne n'existe.

**Valeur future :** complète `ChaseCamera` pour une visite immersive d'un lieu
reconstruit.

**Risque de réintégration :** le Pointer Lock capture le curseur et rendrait
toute l'interface 2D inutilisable tant qu'il est actif.

---

## Décision

Aucun de ces modules n'est supprimé. Aucun n'est monté artificiellement pour
« améliorer » une statistique. Ils sont documentés, surveillés par un test, et
disponibles le jour où le besoin correspondant apparaît réellement.

Les deux candidats les plus crédibles à une intégration **motivée par un
besoin** sont `ChaseCamera.tsx` (suivi de l'avatar intérieur) et `loop.ts`
(découplage simulation/rendu, roadmap P2.3).
