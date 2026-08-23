# Politique réseau — Wedding City / AIME

Dernière révision : **Phase F.3** (activation de l'enrichissement musical).
Ce document est **exécutable** : chacune de ses règles est vérifiée par
`scripts/check-health.mjs` (§ « Self-declared capabilities match the actual
source »). Le garde n'est jamais désactivé pour laisser passer une décision ;
il est modifié explicitement, avec la justification ci-dessous.

---

## 1. Règle générale

L'application fonctionne **entièrement hors ligne**. Toutes les données vivent
dans `weddingStore` et sont persistées dans `localStorage`. Aucune projection
(World, Mirror, Canvas) ne dépend du réseau pour fonctionner.

Un seul chemin de code est autorisé à sortir : `src/game/enrichment/`.
Aucun moteur à la racine de `src/game/` ne contient d'appel `fetch` — assertion
mesurée à chaque `pnpm run test`.

## 2. Le seul hôte contactable

| Hôte | Usage | Quand |
|---|---|---|
| `itunes.apple.com/search` | rechercher titre + artiste, obtenir pochette, album, durée, extrait 30 s | uniquement après un clic « Enrichir le morceau », et uniquement si le drapeau est actif |

Aucune clé d'API, aucun compte, aucune authentification, aucun cookie.
Aucun autre hôte n'est contacté par le code applicatif.

## 3. Le drapeau

Le commutateur vit dans `src/game/enrichment/activation.ts`, une **feuille sans
code réseau**. Sa valeur est résolue dans cet ordre :

1. **Choix utilisateur** persisté (`localStorage`, clé `aime.enrichment.itunes`,
   valeurs `on` / `off`) — écrit par le bouton du Canvas ;
2. **Variable de build** `VITE_ENRICHMENT_ITUNES` (`on` / `true` / `1`) ;
3. **Défaut : `off`.**

Conséquence : un build par défaut, sans configuration et sans action humaine,
n'émet **aucune requête**.

### Endroits où l'activation est possible

- **Canvas → 05 Musique → « Activer iTunes Search »** (choix persisté).
- **Build** : `VITE_ENRICHMENT_ITUNES=on pnpm run build` (ou dans un `.env`).
- **Programmatique** : `setItunesEnabled(true)` depuis
  `src/game/enrichment` (utilisé par les tests avec `{ persist: false }`).

## 4. Chargement paresseux

`itunesProvider.ts` n'est **jamais importé statiquement**. `index.ts` le charge
via `import('./itunesProvider')` à l'intérieur de `ensureProvidersReady()`,
elle-même appelée uniquement par `searchEnrichment()`.

Deux garanties :

- le code qui contient `fetch` ne se trouve pas dans le chunk initial ;
- dans un build par défaut, ce module n'est même pas **évalué**.

## 5. Aucune requête implicite

- Jamais au chargement du Mirror.
- Jamais pendant un rendu : le résultat est mis en cache par `songId`.
- Jamais au chargement d'une page pour « précharger » les extraits : l'audio
  est chargé au premier clic sur Play (`preload='none'`, élément créé à la
  demande dans `musicPlayer.ts`).
- Jamais automatiquement pour les 10 morceaux : une recherche = un clic.

## 6. Honnêteté des états

| Situation réelle | Ce que dit l'interface |
|---|---|
| aucun provider activé | « Enrichissement automatique indisponible — import manuel disponible » |
| provider activé mais injoignable (DNS, refus, CORS, hors ligne) | même message ; état `unavailable`, motif `provider_unreachable` |
| provider joignable, zéro résultat | « Aucune correspondance fiable » (état `not_found`) |
| plusieurs candidats proches | les candidats sont listés, **rien n'est appliqué** |
| correspondance nette | proposition affichée, confirmation humaine requise |

Une panne réseau ne produit jamais « aucune correspondance » : ce serait
affirmer un résultat qu'on n'a pas obtenu. Aucune trace technique n'est
exposée à l'utilisateur.

## 7. Ce qui est persisté, et ce qui ne l'est pas

Après confirmation humaine, les informations retenues deviennent des
`MediaAsset` ordinaires rattachés au `songId` :

- `origin: 'research'` (contre `'manual'` pour un import) ;
- `provenance: { providerId, providerName, externalId, externalUrl, attribution, fetchedAt }`.

**Nous stockons des URL, jamais des copies.** L'extrait de 30 secondes reste
servi par le CDN d'Apple, l'URL publique de la fiche (`trackViewUrl`) est
conservée, l'attribution du fournisseur voyage avec l'asset. Rien n'est
ré-hébergé, rien n'est réécrit.

Un `MediaAsset` manuel n'est **jamais** remplacé : l'enrichissement ne comble
que le côté manquant (pochette ou audio).

## 8. Le Mirror ne dépend jamais du réseau

Le Mirror lit `MediaAsset` par projection ; il ne connaît pas les providers.
Une pochette enrichie est hébergée à distance : si elle ne se charge pas,
`TrackArt` revient à la vignette typographique (`onError`) au lieu d'afficher
une image cassée. Le bouton Play n'apparaît que lorsqu'une source audio réelle
existe, qu'elle soit manuelle ou confirmée.

## 9. Statut de vérification

Depuis l'environnement de build, aucun hôte musical n'est joignable :

| Hôte | Résultat mesuré |
|---|---|
| `itunes.apple.com` | connexion refusée |
| `api.spotify.com`, `musicbrainz.org`, `coverartarchive.org`, `api.deezer.com` | connexion refusée |
| `registry.npmjs.org`, `github.com` | 200 |

Restent donc **assumés depuis la documentation d'Apple, non mesurés** : la
forme exacte de la réponse, les en-têtes CORS, la disponibilité des extraits
par morceau, les limites de débit (~20 appels/minute). C'est la raison pour
laquelle le drapeau reste à `off` par défaut : du code non vérifié ne doit pas
s'exécuter tout seul.
