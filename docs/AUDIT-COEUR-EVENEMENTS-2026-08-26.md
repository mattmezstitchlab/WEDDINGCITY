# Audit cœur événements — 14 types

**Date :** 26 août 2026  
**Périmètre :** vocabulaire d’intake, squelettes horaires, navigation publique du mini-site, visuels produit par défaut.  
**Règle :** un type d’événement change le langage et les conventions ; le moteur (moments, personnes, prestataires, médias) reste unique.

## Synthèse

Les 14 types offerts dans le sélecteur d’intake ont été relus un par un. Chacun possède :

- un vocabulaire de moments propre ;
- un squelette horaire conventionnel (marqué ESTIMÉ à l’injection) ou aucun squelette quand la nature est inconnue (`autre`) ;
- une navigation publique du mini-site adaptée ;
- un jeu de visuels produit utilisés uniquement tant qu’aucun média utilisateur n’est attaché.

Aucun type n’invente de données publiques. RSVP, billetterie et collectes restent déclarées comme non activées tant qu’aucune infrastructure n’existe.

## Tableau des 14 types

| Id | Label | Principaux | Headcount | Navigation mini-site | Visuel par défaut |
| --- | --- | --- | --- | --- | --- |
| `mariage` | Mariage | Les mariés | invités | Programme · RSVP · Infos pratiques | moments mariage + hero |
| `corporate` | Événement corporate | L’entreprise | participants | Programme · Participants · Intervenants · Infos pratiques | pro / salle |
| `seminaire` | Séminaire | L’organisation | participants | Programme · Participants · Intervenants · Infos pratiques | pro / atelier |
| `festival` | Festival | L’organisateur | public | Programme · Billetterie · Artistes · Infos pratiques | spectacle / scène |
| `concert` | Concert | L’artiste | jauge | Programme · Billetterie · Artistes · Infos pratiques | spectacle / musicien |
| `spectacle` | Spectacle | La compagnie | jauge | Programme · Billetterie · Artistes · Infos pratiques | spectacle / plateau |
| `gala` | Gala | L’organisation | convives | Programme · Participants · Intervenants · Infos pratiques | soirée / diner |
| `associatif` | Événement associatif | L’association | participants | Programme · Participants · Intervenants · Infos pratiques | civic / assemblée |
| `culturel` | Événement culturel | La structure | public | Programme · Participants · Intervenants · Infos pratiques | culturel / exposition |
| `anniversaire` | Anniversaire / célébration | La personne fêtée | invités | Programme · RSVP · Infos pratiques | fête / soirée |
| `journee` | Journée | Cette journée | personnes | Programme · Participants · Infos pratiques | journée / travail |
| `mission` | Mission | L’objet | personnes | Programme · Participants · Infos pratiques | mission / terrain |
| `voyage` | Voyage | Le voyage | voyageurs | Itinéraire · Voyageurs · Infos pratiques | voyage / route |
| `autre` | Autre | Nom libre | personnes | Programme · Infos pratiques | générique |

## Visuels produit

1. Chaque scène verticale du mini-site affiche un visuel.
2. Le média utilisateur attaché au moment (`kind === 'image'`) remplace toujours le visuel produit.
3. Le visuel produit est résolu à l’affichage : il n’est jamais écrit dans le store du projet.
4. Le type d’événement oriente le pool d’images quand le nom du moment ne matche aucun archétype précis.

## Navigation publique

La navigation Programme / RSVP / Billetterie / etc. **n’appartient plus au bureau timeline**. Elle vit uniquement dans le Studio mini-site, à l’intérieur de l’appareil de prévisualisation. Le bureau conserve :

- la pellicule horizontale (sans images de fond) ;
- l’édition inline sous la pellicule ;
- Organisation pour les décisions transversales.

## Points restants (hors de ce lot)

- Publication réelle (URL publique, brouillon/publié).
- Collecte RSVP et billetterie côté serveur.
- Page Mode d’emploi (après validation visuelle des 14 types).
