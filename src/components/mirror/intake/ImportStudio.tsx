import { useMemo, useRef, useState } from 'react';

type Folder = 'event' | 'moments' | 'people' | 'vendors' | 'places' | 'music' | 'media' | 'confirm';
type Capability = 'analysed' | 'partial' | 'kept';

interface ImportItem {
  id: string;
  file: File;
  folder: Folder;
  capability: Capability;
  reasons: string[];
  selected: boolean;
}

const FOLDERS: { id: Folder | 'all'; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'event', label: 'Événement' },
  { id: 'moments', label: 'Moments' },
  { id: 'people', label: 'Personnes' },
  { id: 'vendors', label: 'Prestataires' },
  { id: 'places', label: 'Lieux' },
  { id: 'music', label: 'Musique' },
  { id: 'media', label: 'Médias' },
  { id: 'confirm', label: 'À confirmer' },
];

const LABEL: Record<Folder, string> = {
  event: 'Événement', moments: 'Moments', people: 'Personnes', vendors: 'Prestataires',
  places: 'Lieux', music: 'Musique', media: 'Médias', confirm: 'À confirmer',
};

const CAPABILITY: Record<Capability, { label: string; color: string }> = {
  analysed: { label: 'Analysable', color: '#8db79a' },
  partial: { label: 'Analyse partielle', color: '#d9b877' },
  kept: { label: 'Conservé', color: '#9ca3af' },
};

function classify(file: File): Omit<ImportItem, 'id' | 'file' | 'selected'> {
  const name = file.name.toLowerCase();
  const ext = name.split('.').pop() ?? '';
  const readable = file.type.startsWith('text/') || ['txt', 'md', 'csv', 'tsv', 'ics', 'json', 'vcf'].includes(ext);

  if (/invit|guest|rsvp|table|convive/.test(name)) return {
    folder: 'people', capability: readable ? 'analysed' : 'partial',
    reasons: ['Le nom du fichier évoque une liste de personnes ou de réponses.', readable ? 'Le texte pourra être lu localement.' : 'Le contenu sera conservé, mais pas encore décodé.'],
  };
  if (/contrat|devis|facture|traiteur|photo|dj|fleur|prestataire/.test(name)) return {
    folder: 'vendors', capability: readable ? 'analysed' : 'partial',
    reasons: ['Le nom contient un terme de prestation, contrat ou facturation.', readable ? 'Dates, montants et coordonnées pourront être recherchés.' : 'Seuls le nom, le type et la taille sont disponibles ici.'],
  };
  if (/planning|programme|timeline|horaire|déroulé|deroule/.test(name)) return {
    folder: 'moments', capability: readable ? 'analysed' : 'partial',
    reasons: ['Le nom indique un planning ou un déroulé.', readable ? 'Les heures et noms de moments pourront être extraits.' : 'Le fichier nécessite un décodeur supplémentaire.'],
  };
  if (/plan|acces|accès|lieu|domaine|chateau|château|salle/.test(name)) return {
    folder: 'places', capability: readable ? 'analysed' : 'partial',
    reasons: ['Le nom semble concerner un lieu, un plan ou un accès.'],
  };
  if (file.type.startsWith('image/') || file.type.startsWith('video/')) return {
    folder: 'media', capability: 'partial',
    reasons: ['Le type du fichier est un média visuel.', 'Le fichier peut être prévisualisé et rangé ; OCR, couleurs et contenu visuel ne sont pas encore affirmés.'],
  };
  if (file.type.startsWith('audio/') || /playlist|musique|music|track/.test(name)) return {
    folder: 'music', capability: 'partial',
    reasons: ['Le type ou le nom correspond à de la musique.', 'Les métadonnées disponibles seront conservées ; aucune transcription n’est simulée.'],
  };
  if (readable) return {
    folder: 'event', capability: 'analysed',
    reasons: ['Ce format texte est lisible localement.', 'Dates, heures, montants, contacts et mots du programme pourront être recherchés.'],
  };
  return {
    folder: 'confirm', capability: 'kept',
    reasons: ['Aucun classement suffisamment fiable à partir du nom et du format.', 'Le fichier sera conservé sans prétendre en comprendre le contenu.'],
  };
}

export function ImportStudio({ onClose, onConfirm }: {
  onClose: () => void;
  onConfirm: (files: File[], context: string) => void;
}) {
  const picker = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [folder, setFolder] = useState<Folder | 'all'>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pasted, setPasted] = useState('');
  const [url, setUrl] = useState('');

  const addFiles = (files: File[]) => {
    const additions = files.map((file, index) => ({
      id: `${Date.now()}-${index}-${file.name}`,
      file, selected: true, ...classify(file),
    }));
    setItems((current) => [...current, ...additions]);
    if (!activeId && additions[0]) setActiveId(additions[0].id);
  };

  const visible = useMemo(() => folder === 'all' ? items : items.filter((item) => item.folder === folder), [items, folder]);
  const active = items.find((item) => item.id === activeId) ?? visible[0] ?? null;
  const counts = (id: Folder | 'all') => id === 'all' ? items.length : items.filter((item) => item.folder === id).length;

  const confirm = () => {
    const context = [
      pasted.trim() ? `Texte collé :\n${pasted.trim()}` : '',
      url.trim() ? `URL fournie comme référence, non consultée automatiquement : ${url.trim()}` : '',
    ].filter(Boolean).join('\n\n');
    onConfirm(items.filter((item) => item.selected).map((item) => item.file), context);
  };

  return (
    <div className="wc-import-studio" role="dialog" aria-modal="true" aria-label="Studio d’import" data-import="studio">
      <header className="wc-import-head">
        <div>
          <span className="wc-import-eyebrow">Studio d’import</span>
          <h2>Donnez-nous votre chaos.</h2>
        </div>
        <button onClick={onClose}>Fermer</button>
      </header>

      <div className="wc-import-sourcebar">
        <button onClick={() => picker.current?.click()} className="wc-import-primary">+ Fichiers ou dossier</button>
        <input ref={picker} type="file" multiple onChange={(event) => addFiles(Array.from(event.target.files ?? []))} hidden />
        <label><span>URL de référence</span><input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" /></label>
        <label className="wc-import-paste"><span>Texte ou notes</span><textarea value={pasted} onChange={(event) => setPasted(event.target.value)} placeholder="Collez un message, un brief ou le texte d’une capture…" /></label>
      </div>

      <p className="wc-import-truth">
        TXT, CSV, JSON, ICS et formats texte sont lus localement. PDF, Office, images, audio et vidéo sont rangés honnêtement mais leur contenu profond n’est pas encore interprété. Une URL est conservée comme référence sans être visitée.
      </p>

      <div className="wc-import-workspace">
        <nav className="wc-import-tree" aria-label="Classement proposé">
          {FOLDERS.map((entry) => (
            <button key={entry.id} onClick={() => setFolder(entry.id)} className={folder === entry.id ? 'is-active' : ''}>
              <span>{entry.label}</span><b>{counts(entry.id)}</b>
            </button>
          ))}
        </nav>

        <div className="wc-import-files">
          {visible.length === 0 ? (
            <div className="wc-import-empty">Ajoutez vos premiers fichiers. Leur classement sera proposé ici avant toute création.</div>
          ) : visible.map((item) => (
            <button key={item.id} onClick={() => setActiveId(item.id)} className={active?.id === item.id ? 'is-active' : ''}>
              <input type="checkbox" checked={item.selected} onClick={(event) => event.stopPropagation()} onChange={() => setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, selected: !candidate.selected } : candidate))} />
              <span><strong>{item.file.name}</strong><small>{LABEL[item.folder]} · {(item.file.size / 1024).toFixed(0)} ko</small></span>
              <i style={{ color: CAPABILITY[item.capability].color }}>{CAPABILITY[item.capability].label}</i>
            </button>
          ))}
        </div>

        <aside className="wc-import-inspector">
          {active ? (
            <>
              <span className="wc-import-eyebrow">Classement proposé</span>
              <h3>{active.file.name}</h3>
              <label>Ranger dans
                <select value={active.folder} onChange={(event) => setItems((current) => current.map((candidate) => candidate.id === active.id ? { ...candidate, folder: event.target.value as Folder } : candidate))}>
                  {FOLDERS.filter((entry) => entry.id !== 'all').map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
                </select>
              </label>
              <span className="wc-import-eyebrow">Pourquoi ?</span>
              <ul>{active.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              <div className="wc-import-capability" style={{ borderColor: CAPABILITY[active.capability].color }}>
                <strong style={{ color: CAPABILITY[active.capability].color }}>{CAPABILITY[active.capability].label}</strong>
                <p>{active.capability === 'analysed' ? 'Le contenu pourra alimenter la lecture suivante.' : active.capability === 'partial' ? 'Métadonnées et rangement seulement pour le moment.' : 'Conservé sans interprétation.'}</p>
              </div>
            </>
          ) : <p>Sélectionnez un fichier pour comprendre son classement.</p>}
        </aside>
      </div>

      <footer className="wc-import-actions">
        <span>{items.filter((item) => item.selected).length} fichier(s) retenu(s)</span>
        <button onClick={onClose}>Annuler</button>
        <button onClick={confirm} className="wc-import-primary" disabled={items.length === 0 && !pasted.trim() && !url.trim()}>
          Valider le rangement <span aria-hidden>→</span>
        </button>
      </footer>
    </div>
  );
}
