import { useEffect, useMemo, useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';

type OsmResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  type: string;
  category?: string;
  osm_type?: string;
  osm_id?: number;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    [k: string]: unknown;
  };
};

type Card = OsmResult & {
  distanceKm: number | null;
  sourceUrl: string;
  city: string | null;
  cityQuery: string;
  thumbnail: string;
};

type PublicSearchStatus =
  | 'idle'
  | 'locating'
  | 'searching'
  | 'no-position'
  | 'no-results'
  | 'done'
  | 'error';

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const HAVRE_DEFAULT_VIEWBOX = '-5.5,49.8,8.5,43.2';

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (v: number) => v * Math.PI / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function firstLetter(label: string): string {
  const match = label.trim().match(/^[^a-zA-Z]*([a-zA-Z])/);
  return match ? match[1].toUpperCase() : '?';
}

function buildThumbnail(label: string, kind: string): string {
  const first = firstLetter(label);
  const iconByKind: Record<string, string> = {
    amenity: '⌂',
    place: '◌',
    tourism: '✦',
    shop: '◈',
    office: '▣',
    leisure: '❖',
    historic: '◉',
  };
  return `${iconByKind[kind] || '◆'} ${first}`;
}

function resolvePosition(): Promise<{ lat: number; lon: number } | null> {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, 8000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        settled = true;
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        settled = true;
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  });
}

function extractCity(item: OsmResult): string | null {
  // Priorité: champs address Nominatim, puis parsing de display_name.
  if (item.address) {
    return (
      item.address.city ||
      item.address.town ||
      item.address.village ||
      item.address.municipality ||
      null
    );
  }
  // Fallback: le display_name de Nominatim est généralement
  // "Ville, Département, Région, Pays" ou "Nom, type, ...".
  const parts = item.display_name.split(',').map((p) => p.trim());
  // On cherche la première partie qui a l'air d'une localité avec plusieurs mots.
  for (const part of parts) {
    if (part.length > 2 && /[a-zA-Z]{3,}/.test(part)) {
      // Exclure les mentions génériques.
      if (
        !/^( Rue | Avenue | Boulevard | Allée | Chemin | Place | Impasse )/i.test(part)
      ) {
        return part;
      }
    }
  }
  // Si rien de plus précis, prendre le premier segment non-trivial.
  if (parts.length > 0) {
    const first = parts[0].trim();
    if (first) return first;
  }
  return null;
}

export function PublicSearchResults({
  query,
  city,
  radius,
  request,
  onUse,
}: {
  query: string;
  city: string;
  radius: number;
  request: number;
  onUse: (value: string) => void;
}) {
  const store = weddingStore;

  // Résultats locaux : on recherche dans tous les événements stockés, même
  // sans projet choisi.
  const localResults = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    return store.searchAcrossEvents(q);
  }, [query, store.version]);

  const [cards, setCards] = useState<Card[]>([]);
  const [status, setStatus] = useState<PublicSearchStatus>('idle');
  const [publicScrolled, setPublicScrolled] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');

  useEffect(() => {
    const q = query.trim();
    if (!request || q.length < 2) {
      setCards([]);
      setStatus('idle');
      return;
    }

    let cancelled = false;

    (async () => {
      setStatus('locating');
      setCards([]);

      const position = await resolvePosition();
      if (cancelled) return;

      let lat: number | null = position?.lat ?? null;
      let lon: number | null = position?.lon ?? null;

      if (position == null) {
        setStatus('no-position');
      } else {
        setStatus('searching');
      }

      const viewbox = position != null && lat != null && lon != null
        ? `${lon - radius / 111},${lat + radius / 111},${lon + radius / 111},${lat - radius / 111}`
        : HAVRE_DEFAULT_VIEWBOX;

      const cityQuery = city.trim();
      const url = `${NOMINATIM_ENDPOINT}?q=${encodeURIComponent(`${q} ${cityQuery}`.trim())}&format=jsonv2&addressdetails=1&limit=24&accept-language=fr&bounded=1&viewbox=${viewbox}`;

      let raw: OsmResult[];
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('network');
        raw = (await response.json()) as OsmResult[];
      } catch (error) {
        if (cancelled) return;
        setStatus('error');
        return;
      }

      if (cancelled) return;

      if (position != null) {
        setCards(
          raw
            .map((item) => ({
              ...item,
              distanceKm: haversineKm(lat!, lon!, Number(item.lat), Number(item.lon)),
              sourceUrl:
                item.osm_type && item.osm_id
                  ? `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`
                  : `https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lon}`,
              city: extractCity(item),
              cityQuery,
              thumbnail: buildThumbnail(title(item), item.category || item.type),
            }))
            .filter((item) => item.distanceKm <= radius)
            .sort((a, b) => a.distanceKm - b.distanceKm),
        );
      } else {
        setCards(
          raw.map((item) => ({
            ...item,
            distanceKm: null,
            sourceUrl:
              item.osm_type && item.osm_id
                ? `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`
                : `https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lon}`,
            city: extractCity(item),
            cityQuery: city.trim(),
            thumbnail: buildThumbnail(title(item), item.category || item.type),
          })),
        );
      }

      if (cancelled) return;
      setStatus(raw.length > 0 ? 'done' : 'no-results');
    })();

    return () => {
      cancelled = true;
    };
  }, [request, query, radius, city]);

  useEffect(() => {
    if (status !== 'done' && status !== 'no-position' && status !== 'no-results')
      return;
    if (publicScrolled) return;
    setPublicScrolled(true);
    requestAnimationFrame(() => {
      document.getElementById('recherche-resultats')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, [status, publicScrolled]);

  const openDetail = (card: Card) => {
    setSelectedCard(card);
    setDetailOpen(true);
    setCardSide('front');
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedCard(null);
  };

  const title = (item: OsmResult) =>
    item.name || item.display_name.split(',')[0] || 'Résultat public';

  return (
    <div id="recherche-resultats" data-search="results">
      <section className="wc-public-results" aria-live="polite">
        <div className="wc-public-results-head">
          <span className="wc-simple-kicker">Recherche universelle</span>
          <h2>Ce qui existe. Et ce qui peut le compléter.</h2>
          <p>
            Les éléments déjà connus de vos événements et les informations issues
            de sources publiques restent séparés et clairement identifiés. Aucune
            note, photographie, disponibilité ou tarif n'est inventé.
          </p>
          <p>
            Recherche demandée pour <strong>{query}</strong>
            {city.trim() ? <> à <strong>{city.trim()}</strong></> : null}.
          </p>
        </div>

        {localResults.length > 0 && (
          <div className="wc-public-local" data-layer="events">
            <div className="wc-public-layer-title">
              <span>Présent sur le site</span>
              <b>
                {localResults.length} élément{localResults.length > 1 ? 's' : ''}
              </b>
            </div>
            {localResults.map((result) => (
              <article
                key={`${result.kind}-${result.id}-${result.projectId}`}
                className="wc-public-card"
                data-search-kind={result.kind}
              >
                <div className="wc-public-card-art">
                  <span>{firstLetter(result.label)}</span>
                </div>
                <div className="wc-public-card-copy">
                  <span>
                    Présent sur le site ·{' '}
                    {result.kind === 'event' ? 'événement' : result.kind}
                  </span>
                  <h3>{result.label}</h3>
                  <p>{result.context}</p>
                  {('cityQuery' in result && result.cityQuery) ? (
                    <small>Zone: {(result as any).cityQuery}</small>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      store.loadProject(result.projectId);
                      onUse(
                        `${result.label} — ${result.context} — ${result.projectName}`,
                      );
                    }}
                  >
                    Ouvrir dans le bureau
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {(status === 'locating' || status === 'searching') && (
          <div className="wc-public-status">
            {status === 'locating'
              ? 'Localisation avec votre accord…'
              : 'Recherche dans les sources publiques…'}
          </div>
        )}

        {status === 'no-position' && (
          <div className="wc-public-status">
            Sans position — la recherche publique utilise une zone large.
          </div>
        )}

        {status === 'error' && (
          <div className="wc-public-status">
            La source publique est momentanément indisponible. Rien n'a été
            simulé.
          </div>
        )}

        {(status === 'done' || status === 'no-results') && (
          <div className="wc-public-public-results" data-layer="public">
            <div className="wc-public-layer-title">
              <span>Information publique complémentaire</span>
              <b>
                {status === 'done' ? `Dans un rayon de ${radius} km` : 'Aucun résultat public'}
              </b>
            </div>

            {cards.length > 0 && cards[0]?.distanceKm === null && (
              <p className="wc-public-status-note">
                Sans position détectée, les résultats sont listés sans filtre de
                distance. Autorisez la géolocalisation pour affiner par rayon.
              </p>
            )}

            {cards.length > 0 && (
              <div className="wc-public-grid">
                {cards.map((item) => (
                  <article
                    key={item.place_id}
                    className="wc-public-card"
                    data-search-kind="public"
                  >
                    <div className="wc-public-card-art">
                      <span>{item.thumbnail}</span>
                    </div>
                    <div className="wc-public-card-copy">
                      <span>Source publique · OpenStreetMap</span>
                      <h3>{title(item)}</h3>
                      {item.city && (
                        <p className="wc-public-city">{item.city}</p>
                      )}
                      <p>{item.display_name}</p>
                      <div className="wc-public-badges">
                        <b>
                          {item.distanceKm != null
                            ? `${item.distanceKm.toFixed(1)} km`
                            : 'Sans position'}
                        </b>
                        <b>{item.category || item.type}</b>
                        <b>Aucun avis vérifiable</b>
                      </div>
                      <button
                        type="button"
                        onClick={() => openDetail(item)}
                      >
                        {selectedCard?.place_id === item.place_id
                          ? 'Réduire'
                          : 'En savoir plus'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {status === 'no-results' && cards.length === 0 && (
              <div className="wc-public-status">
                Aucun résultat public dans la zone interrogée. Essayez un terme plus
                général.
              </div>
            )}

            <p className="wc-public-legal">
              Source : OpenStreetMap / Nominatim. Aucune note, photographie,
              disponibilité ou tarification n'est inventée.
            </p>
          </div>
        )}

        {localResults.length === 0 &&
          cards.length === 0 &&
          status !== 'locating' &&
          status !== 'searching' &&
          status !== 'no-position' &&
          status !== 'no-results' && (
            <div className="wc-public-status">
              Aucun résultat pour le moment. Décrivez votre recherche ou importez
              des documents pour enrichir votre événement.
            </div>
          )}
      </section>

      {detailOpen && selectedCard && (
        <div
          className="wc-public-detail"
          role="dialog"
          aria-modal="true"
          aria-label={`Fiche ${title(selectedCard)}`}
          data-search-detail="true"
        >
          <div className="wc-public-detail-card">
            <div className={`wc-public-flip ${cardSide === 'back' ? 'is-back' : ''}`}>
              <div className="wc-public-flip-face wc-public-flip-front">
              <div className="wc-public-detail-hero">
                <button
                  type="button"
                  className="wc-public-detail-close"
                  onClick={closeDetail}
                  aria-label="Fermer la fiche"
                >
                  Fermer
                </button>
                <span className="wc-public-detail-hero-letter">
                  {selectedCard.thumbnail}
                </span>
              </div>

              <div className="wc-public-detail-body">
                <span className="wc-public-detail-tag">
                  Source publique · OpenStreetMap
                </span>
                <h3 className="wc-public-detail-title">{title(selectedCard)}</h3>
                {selectedCard.city && (
                  <p className="wc-public-detail-sub">{selectedCard.city}</p>
                )}
                <p className="wc-public-detail-sub">{selectedCard.display_name}</p>
                <button
                  type="button"
                  className="wc-public-detail-use"
                  onClick={() => setCardSide('back')}
                >
                  En savoir plus
                </button>
              </div>
              </div>

              <div className="wc-public-flip-face wc-public-flip-back">
              <div className="wc-public-detail-body">
                <span className="wc-public-detail-tag">
                  Source publique · OpenStreetMap
                </span>
                <h3 className="wc-public-detail-title">{title(selectedCard)}</h3>
                {selectedCard.city && (
                  <p className="wc-public-detail-sub">{selectedCard.city}</p>
                )}
                <p className="wc-public-detail-sub">{selectedCard.display_name}</p>

                <dl className="wc-public-detail-facts">
                  <div>
                    <dt>Catégorie</dt>
                    <dd>
                      {selectedCard.category || selectedCard.type || 'À préciser'}
                    </dd>
                  </div>
                  <div>
                    <dt>Localisation</dt>
                    <dd>
                      {selectedCard.city ? selectedCard.city : <>Sans position détectée</>}
                    </dd>
                  </div>
                  <div>
                    <dt>Distance</dt>
                    <dd>
                      {selectedCard.distanceKm != null ? (
                        <>{selectedCard.distanceKm.toFixed(1)} km</>
                      ) : (
                        <>Sans position</>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Provenance</dt>
                    <dd>OpenStreetMap · Nominatim</dd>
                  </div>
                  <div>
                    <dt>Lien réel</dt>
                    <dd>
                      <a
                        href={selectedCard.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Voir la fiche OpenStreetMap
                      </a>
                    </dd>
                  </div>
                </dl>

                <div className="wc-public-detail-section">
                  <span className="wc-public-detail-section-label">
                    Information publique complémentaire
                  </span>
                  <p>
                    Ce résultat correspond au terme «{query}» et a été trouvé dans
                    les sources publiques. Disponibilité, tarifs, avis et identité
                    vérifiée ne sont pas inventés — ils restent à confirmer.
                  </p>
                </div>

                <div className="wc-public-detail-foot">
                  <button
                    type="button"
                    className="wc-public-detail-use"
                    onClick={() => {
                      onUse(
                        `${title(selectedCard)}, ${selectedCard.display_name} — piste publique à confirmer`,
                      );
                      closeDetail();
                    }}
                  >
                    Utiliser comme piste
                  </button>
                  <a
                    href={selectedCard.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="wc-public-detail-source"
                  >
                    Voir la source externe
                  </a>
                  <button
                    type="button"
                    className="wc-public-detail-close-flat"
                    onClick={() => setCardSide('front')}
                  >
                    Retour
                  </button>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
