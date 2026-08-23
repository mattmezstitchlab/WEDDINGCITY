# PHASE A — AUDIT VISUEL & PROPOSITION « SOFT SPATIAL UI »

**Date :** 23 août 2026 · **Branche :** `arena/01a02c94-weddingcity`
**Périmètre :** audit uniquement. **Aucune ligne de code modifiée.**

---

## 1. DIAGNOSTIC — CE QUI EST TROP DUR, MESURÉ

Chiffres relevés dans le code, pas des impressions.

### 1.1 La scène 3D

| Mesure | Valeur relevée | Lecture |
|---|---|---|
| `boxGeometry` (arêtes vives) | **20** | ~⅓ des primitives sont des cubes bruts |
| `RoundedBox` (déjà adouci) | 39 | la base douce existe déjà, elle est incomplète |
| `cylinderGeometry` / `coneGeometry` | 16 / 7 | formes dures non biseautées |
| `meshStandardMaterial` | 98 | — |
| `meshBasicMaterial` (non éclairé) | **14** | surfaces plates, sans lumière → aspect « écran », pas « matière » |
| `meshPhysicalMaterial` | **0** | **aucune translucidité réelle disponible** |
| `metalness ≥ 0.7` | **17 surfaces** | spéculaire dur = sensation technique/métallique |
| `roughness ≤ 0.3` | **8 surfaces** | brillances franches, l'inverse du mat demandé |
| `emissiveIntensity` max | **1.2** (et 0.6–0.9 très fréquent) | néon, contraste fort |
| `transparent` | 8 occurrences seulement | quasi aucune surface laiteuse |
| `<Environment>` / IBL | **0** | **le point le plus important** |
| Lumières | ambient 0.6 · hemisphere 0.4 · 2 directionnelles · 1 rim accent | éclairage direct, pas d'enveloppe |
| Ombres | 1 shadow map 2048, `bias -0.0001` | ombre **dure**, aucun contact shadow, aucun flou de pénombre |
| `dpr` | **`dpr={1}`** | rendu non-Retina → **crénelage visible**, gros contributeur à la « dureté » perçue |

**Les trois causes racines de la dureté 3D, par impact décroissant :**

1. **Absence totale d'IBL.** Sans `<Environment>`, chaque matériau n'est éclairé que par des sources ponctuelles. C'est *la* raison n°1 de l'aspect « jeu vidéo » plutôt que « maquette premium ». Une HDRI douce change tout, pour ~5 lignes.
2. **`dpr={1}`.** Les arêtes sont littéralement crénelées. Perçu comme « dur » alors que c'est de la résolution.
3. **17 surfaces métalliques + 14 matériaux non éclairés.** Le métal réfléchit un environnement… qui n'existe pas → rendu noir/dur.

### 1.2 L'interface

| Mesure | Valeur | Lecture |
|---|---|---|
| Objets `React.CSSProperties` | **268** | — |
| `style={{ … }}` inline | **540** | — |
| Composants UI | 28 | — |
| **Fichier de tokens** | **aucun** (9 constantes `BRAND_*` de couleur) | **pas de langage réutilisable** : ni rayon, ni élévation, ni espacement |
| `borderRadius ≤ 8` | **114 occurrences** (58×8, 40×6, 16×4) | vocabulaire anguleux dominant |
| `border: 1px solid BRAND_BORDER` | **102 occurrences** | tout est délimité par un trait → langage « grille technique » |
| `boxShadow` | 38, dominées par `0 24px 64px rgba(0,0,0,0.8)` | ombres **noires et opaques**, pas diffuses |
| `backdropFilter` / `blur()` | **0** | ✅ bonne nouvelle : aucun glassmorphism à défaire |

**Cause racine UI :** il n'existe **aucune couche de tokens**. Les 540 styles inline encodent chacun leurs propres décisions. Toute évolution visuelle globale est aujourd'hui un chercher-remplacer à 540 endroits — c'est exactement le risque que vous demandez d'éviter.

### 1.3 Les statistiques

Il n'existe aujourd'hui **aucune visualisation de données** au sens propre :

- `BottomOrchestrator` : compteurs numériques et une barre de progression temporelle
- `ProjectSettingsModal`, `DjZoneModal`, `SystemNerveCenterModal` : listes et badges
- Le seul objet réellement spatial est `NerveGraphPanel` (couches + propagation), créé au tour précédent

Le RSVP, le plan de table et les prestataires ne sont **nulle part** visualisés — ils n'existent que dans la fiche de l'inspecteur.

---

## 2. LA TENSION QU'IL FAUT TRANCHER AVANT DE COMMENCER

Votre référence appelle **grands blancs, ivoire, surfaces laiteuses**.
Wedding City est aujourd'hui **`BRAND_BG = #08090d`** — un quasi-noir, sur 28 composants et 540 styles.

Inverser globalement en ivoire signifierait :

- réécrire les 540 styles inline (≈ 3 000 lignes touchées) ;
- refaire l'équilibre lumineux de la scène 3D, qui repose sur un fond sombre pour que l'accent champagne et les émissifs fonctionnent ;
- un risque de régression élevé sur un socle que nous venons de stabiliser à 237 tests.

**Ma recommandation : ne pas inverser. Appliquer votre propre §4.**

> **Mode Monde = surface sombre** (immersion, la 3D y respire, l'accent y brille)
> **Mode Composition = surface ivoire** (éditorial, données, respiration, grande typo)

Les deux modes partagent **les mêmes tokens** et **les mêmes données**. L'ivoire arrive là où il crée du sens — les compositions de données — au lieu d'être imposé à un monde nocturne. C'est plus fidèle à « les données remontent à la surface » qu'un repeint global, et c'est réversible surface par surface.

---

## 3. NOUVEAU LANGAGE VISUEL PROPOSÉ

### 3.1 Fondation — `src/design/tokens.ts` (nouveau, feuille sans dépendance)

Même règle que `brand.ts` : **module feuille**, aucune dépendance, protégé par le test de cycles.
`brand.ts` reste inchangé et sera ré-exporté, donc **zéro rupture** pour les 540 styles existants.

**Rayons** — remplace les 4/6/8 anguleux
```
radius.xs 8 · sm 12 · md 16 · lg 22 · xl 28 · pill 999
```

**Élévation** — l'échelle à 6 niveaux que vous décrivez
| Niveau | Nom | Usage | Ombre |
|---|---|---|---|
| 0 | Background | fond de page | aucune |
| 1 | Surface | éléments éditoriaux quasi plats | `0 1px 2px rgba(0,0,0,.10)` |
| 2 | Data Object | cartes, statistiques | `0 4px 16px rgba(0,0,0,.12)` + `0 1px 3px .08` |
| 3 | Spatial Object | maquettes, visualisations | `0 12px 32px rgba(0,0,0,.14)` + halo doux |
| 4 | Focus | élément sélectionné | `0 20px 48px rgba(0,0,0,.18)` + liseré DMC |
| 5 | World | immersion 3D | pas d'ombre CSS, profondeur réelle |

Les ombres passent d'un **noir 0.8 opaque** à des **noirs 0.10–0.18 étalés** : c'est le passage « dur → diffus ».

**Surfaces**
```
world.bg #08090d · world.surface #12151e        (existant, conservé)
comp.bg  #F7F5F0 · comp.surface #FFFDFA
comp.veil rgba(255,253,250,.72)   ← laiteux, sans blur
comp.line rgba(16,18,24,.08)      ← trait 8 % au lieu de 100 %
```

**Traits relationnels** — remplace les lignes techniques
```
hairline .75px · opacity .18 au repos → .45 actif
courbure quadratique, jamais de segment droit
fade avec la profondeur, pulsation ≤ 8 % d'amplitude
```

**La couleur DMC comme signal** (votre §8) — règle stricte et vérifiable :
> Une couleur DMC ne peut occuper **qu'un liseré, un point, un halo ou un badge**.
> **Jamais un fond de carte, jamais un remplissage > 15 % de la surface d'un composant.**

Cette règle est **testable** : une vérification statique peut échouer si une couleur DMC est utilisée comme `background` d'un conteneur.

**Matériaux 3D**
```
matte      : roughness .85  metalness .02
soft       : roughness .70  metalness .05
milk       : meshPhysical, transmission .35, thickness .5, roughness .6
accentGlow : emissiveIntensity .25 max  (contre 1.2 aujourd'hui)
```

### 3.2 Règle transversale

> Une teinte forte ne s'utilise que si elle **encode une donnée réelle** : un statut, une identité DMC, une sélection. Toute autre surface reste neutre.

---

## 4. COMPOSANTS CONCERNÉS — INVENTAIRE PRIORISÉ

### Phase C — Adoucir la 3D (6 fichiers)

| Composant | Ce qui est dur | Action | Risque |
|---|---|---|---|
| `WeddingWorld.tsx` | `dpr={1}`, pas d'IBL | `dpr=[1,2]`, `<Environment preset="dawn">`, exposure 1.05 | **faible** — 5 lignes, effet maximal |
| `AtmosphereAndEffects.tsx` | ombre dure, rim accent 0.35 | shadow-radius, `<SoftShadows>`, ambient 0.75, rim → 0.18 | faible |
| `VoxelAgents.tsx` | 4 `RoundedBox` + arêtes, émissifs 0.6–0.8 | radius 0.06→0.10, matériaux `matte`, émissif ≤ 0.3 | **moyen** — c'est l'avatar, signature DMC à préserver |
| `EstateEnvironment.tsx` | 24 RoundedBox + 17 mesh, 17 surfaces métalliques | metalness → 0.05, roughness → 0.8, biseaux | **moyen** — le plus gros fichier (833 l.) |
| `InteriorVenueView.tsx` | mobilier cubique | RoundedBox + `milk` sur la verrière | faible |
| `NeuralConnections.tsx` | segments droits, couleurs saturées (#00ffff, #ff4d88) | courbes, hairline, opacité progressive | faible |

### Phase B/E — Interface (par vague, jamais en bloc)

| Vague | Composants | Pourquoi |
|---|---|---|
| **1 — pilote** | `EntityInspector` (§10 portrait éditorial) | déjà branché aux entités, isolé, forte valeur |
| **2** | `SystemNerveCenterModal` + `NerveModuleDetail` + `NerveGraphPanel` | §12, déjà semi-spatial |
| **3** | `BottomOrchestrator`, `TopNavigation` | châssis permanent, à toucher en dernier (risque max) |
| **4** | 24 modales secondaires | volume, faible risque unitaire |

**Non touché volontairement :** `App.css` (17 lignes), `index.html`, la structure de navigation, tout `src/game/`.

---

## 5. SPATIAL DATA STORYTELLING — SPÉCIFICATIONS ADOSSÉES AUX DONNÉES RÉELLES

J'ai interrogé le store pour vérifier ce qui est **réellement disponible aujourd'hui** :

```
RSVP        : 27 acceptés · 0 en attente · 0 refusés · 0 incertains
guests      : 27  (régimes spécifiques : 3 · côtés : 1 mariée, 1 marié, 25 non précisés)
tables      : 6   (capacité 48 · 24 invités placés)
vendors     : 8   (docs 1–3 · tâches 1–4 · zones 3–5 chacun)
persons     : 35  · dmcIdentities : 1
phases      : 7 · tasks : 16 · docs : 13 · places : 12
```

### ⚠️ Constat gênant à énoncer maintenant

**Le RSVP est votre priorité n°1, et c'est la donnée la plus pauvre aujourd'hui : 27/27 acceptés, 0 partout ailleurs.** C'est un artefact de migration — les agents de démonstration étaient physiquement présents, la migration les a donc marqués « accepted », ce qui était la lecture fidèle.

Une constellation RSVP serait donc **monochrome** au premier lancement. Trois options honnêtes :

| Option | Description | Mon avis |
|---|---|---|
| A | La constellation encode **plusieurs dimensions réelles** (table, côté, régime, DMC), pas seulement le RSVP | ✅ **recommandé** — riche dès maintenant, sans inventer |
| B | Attendre que l'utilisateur saisisse des RSVP variés | l'écran reste vide de sens longtemps |
| C | Diversifier les RSVP de démonstration | ❌ **refusé** — ce serait fabriquer de la donnée |

**Je recommande A**, et le RSVP y reste la couleur — simplement, la composition ne s'effondre pas quand tout est vert.

### 5.1 Constellation d'invités (priorité 1+2)

```
Source : store.guests · store.persons · store.seatingTables
```
- 1 point = 1 `Guest` réel, positionné par regroupement de table
- couleur = statut RSVP · liseré = couleur DMC si la personne en possède une
- taille = 1 + `plusOnes`
- glyphe discret si `dietary` renseigné
- clic → `selectEntity('agent', person.agentId)` → **la fiche réelle existante**
- les invités non placés flottent en périphérie → « il reste 3 personnes à placer » devient **visible**, pas un compteur

### 5.2 Plan de table spatial (priorité 3)

```
Source : store.seatingTables · getTableOccupancy() · store.guests
```
- 1 disque doux par table, arc de remplissage = occupation réelle (24/48 aujourd'hui)
- sièges vides visibles en creux
- surcapacité = **la même détection que la sonde `PROJECTIONS`**, pas un second calcul
- glisser un invité appelle `assignGuestToTable()` — qui **refuse déjà** si la table est pleine

### 5.3 Composition prestataire (priorité 4)

```
Source : store.vendors (documentIds, taskIds, placeIds, status)
```
Exactement votre schéma §5, alimenté par des données existantes : Maison Gourmet a réellement 3 documents, 4 tâches, 4 zones. Chaque nœud est cliquable vers l'entité.

### 5.4 Ruban de Timeline (priorité 5)

```
Source : store.phases · store.tasks · store.time
```
7 phases en bandeau continu, densité de tâches par phase, curseur = heure simulée réelle.

### 5.5 Règle de fidélité — vérifiable automatiquement

Je propose un test `check-dataviz.mjs` qui échoue si un composant de visualisation contient un **littéral numérique de données** non issu du store. Votre §13 devient une contrainte machine, pas une promesse.

---

## 6. AVANT / APRÈS VISÉ

| Dimension | Avant (mesuré) | Après (cible) |
|---|---|---|
| Éclairage 3D | 3 sources directes, 0 IBL | IBL douce + ombres à pénombre |
| Résolution | `dpr=1`, crénelé | `dpr=[1,2]` |
| Métal | 17 surfaces ≥ 0.7 | ≤ 3, réservées aux objets signifiants |
| Émissif | jusqu'à 1.2 | ≤ 0.3 sauf état actif |
| Ombres UI | noir 0.8 opaque | noir 0.10–0.18 étalé |
| Rayons | 114 valeurs ≤ 8 | échelle 8/12/16/22/28 |
| Tokens | aucun | 1 module feuille |
| Dataviz réelle | 1 (graphe nerveux) | 5 compositions |
| Couleur | décorative | signal encodant une donnée |

---

## 7. RISQUES ET GARDE-FOUS

| Risque | Garde-fou |
|---|---|
| Régression fonctionnelle | Les 237 tests tournent après **chaque** vague ; aucune modification dans `src/game/` |
| Retour à la lecture par rôle | Le test statique existant échoue déjà si un composant recompare des rôles |
| Fausse donnée introduite | Nouveau test `check-dataviz.mjs` |
| Coût GPU (IBL + soft shadows + dpr 2) | Mesurer les FPS avant/après ; `dpr` plafonné à 2 ; repli si perte > 15 % |
| Poids du bundle (`<Environment>` charge une HDRI) | Mesurer ; préférer un preset léger ou un dégradé procédural |
| Ivoire imposé partout | Résolu par les deux modes (§2) |

**Je ne peux pas juger le rendu final** : pas de navigateur headless dans cet environnement. Les tests couvrent la logique et les tokens, **pas la beauté**. Chaque vague demandera votre validation visuelle sur la preview.

---

## 8. CE QUE JE PROPOSE DE FAIRE EN PREMIER

Si vous validez, je commence par le lot au **meilleur rapport impact/risque** :

1. **`src/design/tokens.ts`** — la fondation, sans toucher un seul composant
2. **`WeddingWorld` + `AtmosphereAndEffects`** — IBL, `dpr`, ombres douces : **5 fichiers de moins de 20 lignes modifiées, l'essentiel de l'adoucissement perçu**
3. **La constellation d'invités** — première composition spatiale sur données réelles
4. Vérification complète + capture de l'avant/après pour votre validation

Les vagues 3 et 4 (châssis permanent, 24 modales) n'arriveront **qu'après** votre retour sur ces trois-là.

---

## 9. QUESTION OUVERTE

Une seule décision m'appartient mal : **le Mode Composition doit-il être un mode plein écran** (bascule Monde ⇄ Composition), **ou des panneaux ivoire qui flottent au-dessus du monde sombre** ?

Le premier est plus proche de votre référence éditoriale. Le second est plus proche de « le monde projette ses données ». Mon inclinaison va au second, mais c'est un choix de direction qui vous revient.
