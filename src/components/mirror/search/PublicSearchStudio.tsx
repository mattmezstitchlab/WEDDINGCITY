import { useEffect, useMemo, useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';

type OsmResult = {
  place_id: number; display_name: string; lat: string; lon: string;
  name?: string; type: string; category?: string; osm_type?: string; osm_id?: number;
};
type Card = OsmResult & { distanceKm: number; sourceUrl: string };

const distance = (aLat: number, aLon: number, bLat: number, bLon: number) => {
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(bLat - aLat), dLon = rad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const locate = () => new Promise<GeolocationPosition>((resolve, reject) => {
  if (!navigator.geolocation) reject(new Error('unsupported'));
  else navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
});

export function PublicSearchResults({ query, radius, request, onUse }: {
  query: string; radius: number; request: number; onUse: (value: string) => void;
}) {
  const store = weddingStore;
  const [cards, setCards] = useState<Card[]>([]);
  const [status, setStatus] = useState<'idle' | 'locating' | 'searching' | 'done' | 'error' | 'denied'>('idle');
  const [origin, setOrigin] = useState('votre position');
  const [selected, setSelected] = useState<Card | null>(null);
  const local = useMemo(() => store.projectChosen ? store.searchEverything(query) : [], [query, store.projectChosen, store.version]);

  useEffect(() => {
    // A local hit never blocks enrichment: the same search may reveal public
    // information that completes an existing mini-site. Both layers are shown
    // and labelled instead of choosing one in silence.
    if (!request || query.trim().length < 2) return;
    let cancelled = false;
    (async () => {
      try {
        setStatus('locating'); setCards([]); setSelected(null);
        const position = await locate();
        if (cancelled) return;
        const lat = position.coords.latitude, lon = position.coords.longitude;
        setStatus('searching');
        const delta = radius / 111;
        const viewbox = `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`;
        const endpoint = 'https://nominatim.openstreetmap.org/search';
        const response = await fetch(`${endpoint}?q=${encodeURIComponent(query.trim())}&format=jsonv2&addressdetails=1&limit=24&accept-language=fr&bounded=1&viewbox=${viewbox}`);
        if (!response.ok) throw new Error('network');
        const raw = await response.json() as OsmResult[];
        if (cancelled) return;
        const next = raw.map((item) => ({
          ...item,
          distanceKm: distance(lat, lon, Number(item.lat), Number(item.lon)),
          sourceUrl: item.osm_type && item.osm_id
            ? `https://www.openstreetmap.org/${item.osm_type}/${item.osm_id}`
            : `https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lon}`,
        })).filter((item) => item.distanceKm <= radius).sort((a, b) => a.distanceKm - b.distanceKm);
        setCards(next); setStatus('done');
      } catch (error) {
        if (cancelled) return;
        const geolocationError = error as { code?: number };
        setStatus(geolocationError?.code === 1 ? 'denied' : 'error');
      }
    })();
    return () => { cancelled = true; };
  }, [request, query, radius, local.length]);

  const title = (item: OsmResult) => item.name || item.display_name.split(',')[0] || 'Résultat public';

  return (
    <section id="recherche-resultats" className="wc-public-results" aria-live="polite" data-search="results">
      <div className="wc-public-results-head">
        <span className="wc-simple-kicker">Recherche universelle</span>
        <h2>Ce qui existe. Et ce qui peut le compléter.</h2>
        <p>
          Les éléments déjà publiés sur votre site et les informations issues de sources publiques restent séparés et clairement identifiés. Une source publique peut ainsi enrichir une fiche existante sans la remplacer.
        </p>
      </div>

      {local.length > 0 && (
        <div className="wc-public-local">
          {local.map((result) => (
            <article key={`${result.kind}-${result.id}`}>
              <span>Présent sur le site · {result.kind}</span>
              <h3>{result.label}</h3>
              <p>{result.context}</p>
              <button onClick={() => onUse(`${result.label} — compléter les informations déjà présentes sur le site`)}>Compléter cette fiche</button>
            </article>
          ))}
        </div>
      )}

      {(status === 'locating' || status === 'searching') && <div className="wc-public-status">{status === 'locating' ? 'Localisation avec votre accord…' : 'Recherche dans les sources publiques…'}</div>}
      {status === 'denied' && <div className="wc-public-status">La géolocalisation n’a pas été autorisée. Autorisez-la dans le navigateur pour chercher par distance.</div>}
      {status === 'error' && <div className="wc-public-status">La source publique est momentanément indisponible. Rien n’a été simulé.</div>}
      {status === 'done' && cards.length === 0 && <div className="wc-public-status">Aucun résultat public dans ce rayon. Essayez un terme plus général ou une distance plus grande.</div>}

      {(status === 'done' || cards.length > 0) && (
        <div className="wc-public-layer-title">
          <span>Informations complémentaires publiques</span>
          <b>Dans un rayon de {radius} km</b>
        </div>
      )}
      <div className="wc-public-grid">
        {cards.map((item) => (
          <article key={item.place_id} className="wc-public-card">
            <div className="wc-public-card-art"><span>{title(item).slice(0, 1).toUpperCase()}</span></div>
            <div className="wc-public-card-copy">
              <span>Source publique · OpenStreetMap</span>
              <h3>{title(item)}</h3>
              <p>{item.display_name}</p>
              <div><b>{item.distanceKm.toFixed(1)} km</b><b>{item.category || item.type}</b><b>Aucun avis vérifiable</b></div>
              <button onClick={() => setSelected(selected?.place_id === item.place_id ? null : item)}>{selected?.place_id === item.place_id ? 'Réduire' : 'En savoir plus'}</button>
              {selected?.place_id === item.place_id && (
                <div className="wc-public-more">
                  <p>Ce résultat correspond au terme « {query} » et se trouve dans le rayon choisi. Disponibilité, tarifs et avis restent à confirmer.</p>
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer">Voir la source</a>
                  <button onClick={() => onUse(`${title(item)}, ${item.display_name} — piste publique à confirmer`)}>Utiliser comme piste</button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
      <p className="wc-public-legal">Source : OpenStreetMap/Nominatim. Aucune note, photographie, disponibilité ou tarification n’est inventée.</p>
    </section>
  );
}
