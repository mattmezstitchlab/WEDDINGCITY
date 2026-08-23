import { useEffect, useMemo, useRef, useState } from 'react';
import { weddingStore } from '../../game/weddingStore';
import { typography } from '../../design/tokens';

// ---------------------------------------------------------------------------
// RECHERCHE — one field, everything in the project.
// ---------------------------------------------------------------------------
// People, moments, places, vendors, tracks, documents, tasks and tables, all
// from store.searchEverything(). Each result carries its CONTEXT, because the
// point is not to find a record: it is to open a door — a person leads to
// their moments and their table, a vendor to the hours they cover.
//
// There is no web search here, and the panel says so: this environment has no
// network access and no external provider is used. Searching the web would
// mean inventing sources, which this product does not do.
// ---------------------------------------------------------------------------

const KIND_LABEL: Record<string, string> = {
  person: 'Personne', moment: 'Moment', place: 'Lieu', vendor: 'Prestataire',
  track: 'Morceau', document: 'Document', task: 'Tâche', table: 'Table',
};

export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const store = weddingStore;
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  const results = useMemo(() => store.searchEverything(query), [query, store.version]);

  const goToMoment = (id: string) => {
    onClose();
    requestAnimationFrame(() => {
      const card = document.querySelector(`[data-phase-id="${id}"]`);
      card?.scrollIntoView({ inline: 'center', block: 'nearest' });
      (card?.querySelector('[data-jourj="open-moment"]') as HTMLElement | null)?.click();
    });
  };

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label="Recherche" data-search="panel">
      <div style={surface}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une personne, un moment, un prestataire, un document…"
            style={field}
            data-search="input"
          />
          <button onClick={onClose} style={ghost} data-search="close">Fermer</button>
        </div>

        {query.trim().length < 2 ? (
          <p style={muted}>
            Tapez deux lettres. La recherche porte sur votre projet : personnes,
            moments, lieux, prestataires, morceaux, documents, tâches et tables.
            Elle n’interroge pas le web — aucun service extérieur n’est utilisé.
          </p>
        ) : results.length === 0 ? (
          <p style={muted} data-search="empty">Rien ne correspond à « {query} » dans ce mariage.</p>
        ) : (
          <ul style={list} data-search="results">
            {results.map((r) => (
              <li key={`${r.kind}-${r.id}`} style={row}>
                <button
                  onClick={() => (r.kind === 'moment' ? goToMoment(r.id) : onClose())}
                  style={resultBtn}
                  data-search="result"
                  data-kind={r.kind}
                >
                  <span style={kindTag}>{KIND_LABEL[r.kind]}</span>
                  <span style={{ fontWeight: 600 }}>{r.label}</span>
                  <span style={muted}>{r.context}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {/* Said once, always: this search never leaves the project. */}
        <p style={{ ...muted, marginTop: 26, fontSize: 11 }} data-search="scope">
          Recherche dans votre projet uniquement — elle n’interroge pas le web,
          et aucun service extérieur n’est appelé.
        </p>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1600, background: 'rgba(8,9,11,0.94)',
  overflowY: 'auto', color: '#f6f5f3', fontFamily: typography.family.sans,
};

const surface: React.CSSProperties = {
  maxWidth: 760, margin: '0 auto', padding: 'clamp(28px, 8vh, 90px) clamp(18px, 5vw, 40px) 60px',
};

const field: React.CSSProperties = {
  flex: 1, background: '#101114', color: '#f6f5f3',
  border: '1px solid rgba(246,245,243,0.22)', borderRadius: 6,
  padding: '14px 16px', fontSize: 'clamp(14px, 1.4vw, 17px)',
  fontFamily: typography.family.sans, outline: 'none',
};

const ghost: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', background: 'transparent', color: '#f6f5f3',
  border: '1px solid rgba(246,245,243,0.28)', borderRadius: 999,
  padding: '10px 16px', fontSize: 12, fontFamily: typography.family.sans,
};

const muted: React.CSSProperties = {
  marginTop: 20, fontSize: typography.editorial.caption,
  color: 'rgba(246,245,243,0.66)', lineHeight: 1.65, maxWidth: 560,
};

const list: React.CSSProperties = { listStyle: 'none', margin: '24px 0 0', padding: 0, display: 'grid', gap: 2 };

const row: React.CSSProperties = { borderTop: '1px solid rgba(246,245,243,0.12)' };

const resultBtn: React.CSSProperties = {
  appearance: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
  background: 'transparent', border: 'none', color: '#f6f5f3',
  display: 'grid', gap: 4, padding: '14px 4px', fontFamily: typography.family.sans,
  fontSize: typography.editorial.caption,
};

const kindTag: React.CSSProperties = {
  fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
  color: 'rgba(246,245,243,0.5)',
};
