import { useMemo, useRef, useState } from 'react';

type Folder = 'event' | 'moments' | 'people' | 'vendors' | 'places' | 'music' | 'media' | 'confirm';
type Capability = 'analysed' | 'partial' | 'kept';
type SourceType = 'file' | 'url' | 'text';

interface ImportItem {
  id: string;
  file?: File;
  folder: Folder;
  capability: Capability;
  reasons: string[];
  selected: boolean;
  source: SourceType;
  data?: string;
  extractedInfo?: string;
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

function classify(file: File | string, sourceType: SourceType = 'file'): Omit<ImportItem, 'id' | 'file' | 'selected' | 'source' | 'data' | 'extractedInfo'> {
  const name = sourceType === 'file' ? (file as File).name.toLowerCase() : (file as string).toLowerCase();
  const ext = sourceType === 'file' ? name.split('.').pop() ?? '' : '';
  const isReadable = sourceType !== 'file' || (file as File).type.startsWith('text/') || ['txt', 'md', 'csv', 'tsv', 'ics', 'json', 'vcf'].includes(ext);

  if (sourceType === 'url') {
    const url = name;
    try {
      const domain = new URL(url).hostname.toLowerCase();
      
      if (/traiteur|fleur|dj|band|musique|music|photog|photo|video|decoration|location|restaurant/.test(url) || 
          /catering|flowers|photographer|videographer|band|decoration|venue|restaurant|hotel/.test(domain)) {
        return {
          folder: 'vendors', capability: 'partial',
          reasons: ['L\'URL suggère une source de prestation ou fournisseur.', 'Le contenu ne sera pas consulté directement mais rangé comme référence.'],
        };
      }
      
      if (/lieu|location|venue|domaine|chateau|salle|place|address|map|maps/.test(url) || 
          /chateau|domaine|salle|restaurant|hotel|airbnb|venue|maps\./.test(domain)) {
        return {
          folder: 'places', capability: 'partial',
          reasons: ['L\'URL concerne un lieu ou une adresse.', 'Vous pouvez vérifier les informations sur ce lien.'],
        };
      }
      
      if (/booking|reserve|eventbrite|accueil|program|rsvp|guest|invite|table/.test(url) ||
          /eventbrite|booking|airbnb|rsvp/.test(domain)) {
        return {
          folder: 'event', capability: 'partial',
          reasons: ['L\'URL provient d\'une plateforme de réservation ou événement.', 'Vous pouvez consulter les détails directement sur ce lien.'],
        };
      }
      
      if (/spotify|apple|deezer|youtube|musique|playlist|track|song/.test(url) ||
          /spotify|music|deezer|youtube/.test(domain)) {
        return {
          folder: 'music', capability: 'partial',
          reasons: ['L\'URL renvoie vers une source musicale.', 'Le titre et l\'artiste pourront être extraits manuellement.'],
        };
      }
    } catch {
      // Invalid URL format
    }
    
    return {
      folder: 'confirm', capability: 'kept',
      reasons: ['L\'URL ne correspond à aucune catégorie clairement identifiée.', 'Elle sera conservée comme référence.'],
    };
  }

  if (sourceType === 'text') {
    const content = name;
    
    if (/heure|hour|time|[0-2][0-9]:[0-5][0-9]|[0-2][0-9]h[0-5][0-9]/.test(content)) {
      return {
        folder: 'moments', capability: 'partial',
        reasons: ['Le texte contient des horaires ou des moments.', 'Les heures pourront être extraites et utilisées pour structurer le programme.'],
      };
    }
    
    if (/nom|name|email|@|phone|téléphone|contact/.test(content)) {
      return {
        folder: 'people', capability: 'partial',
        reasons: ['Le texte contient probablement des informations de contact.', 'Noms, emails et téléphones pourront être organisés dans la section invités.'],
      };
    }
    
    if (/prix|price|€|budget|coût|cost|montant/.test(content)) {
      return {
        folder: 'vendors', capability: 'partial',
        reasons: ['Le texte mentionne des montants ou devis.', 'Les informations financières seront rangées avec les prestataires.'],
      };
    }
    
    if (/lieu|location|adresse|address|rue|avenue|place|route/.test(content)) {
      return {
        folder: 'places', capability: 'partial',
        reasons: ['Le texte contient une adresse ou un lieu.', 'Les détails géographiques aideront à localiser les moments.'],
      };
    }
    
    if (/date|jour|day|mois|month|année|year|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|january|february|march|april|may|june|july|august|september|october|november|december/.test(content)) {
      return {
        folder: 'event', capability: 'partial',
        reasons: ['Le texte évoque une date ou une période.', 'Les informations de date seront utilisées pour structurer l\'événement.'],
      };
    }
    
    return {
      folder: 'event', capability: 'analysed',
      reasons: ['Le texte pourra alimenter le descriptif de l\'événement.', 'Vous pouvez le vérifier et l\'ajuster dans l\'intake.'],
    };
  }

  if (/invit|guest|rsvp|table|convive/.test(name)) return {
    folder: 'people', capability: isReadable ? 'analysed' : 'partial',
    reasons: ['Le nom du fichier évoque une liste de personnes ou de réponses.', isReadable ? 'Le texte pourra être lu localement.' : 'Le contenu sera conservé, mais pas encore décodé.'],
  };
  if (/contrat|devis|facture|traiteur|photo|dj|fleur|prestataire/.test(name)) return {
    folder: 'vendors', capability: isReadable ? 'analysed' : 'partial',
    reasons: ['Le nom contient un terme de prestation, contrat ou facturation.', isReadable ? 'Dates, montants et coordonnées pourront être recherchés.' : 'Seuls le nom, le type et la taille sont disponibles ici.'],
  };
  if (/planning|programme|timeline|horaire|déroulé|deroule/.test(name)) return {
    folder: 'moments', capability: isReadable ? 'analysed' : 'partial',
    reasons: ['Le nom indique un planning ou un déroulé.', isReadable ? 'Les heures et noms de moments pourront être extraits.' : 'Le fichier nécessite un décodeur supplémentaire.'],
  };
  if (/plan|acces|accès|lieu|domaine|chateau|château|salle/.test(name)) return {
    folder: 'places', capability: isReadable ? 'analysed' : 'partial',
    reasons: ['Le nom semble concerner un lieu, un plan ou un accès.'],
  };
  
  if (sourceType === 'file') {
    const fileObj = file as File;
    if (fileObj.type.startsWith('image/') || fileObj.type.startsWith('video/')) return {
      folder: 'media', capability: 'partial',
      reasons: ['Le type du fichier est un média visuel.', 'Le fichier peut être prévisualisé et rangé ; OCR, couleurs et contenu visuel ne sont pas encore affirmés.'],
    };
    if (fileObj.type.startsWith('audio/')) return {
      folder: 'music', capability: 'partial',
      reasons: ['Le type du fichier correspond à de la musique.', 'Les métadonnées disponibles seront conservées ; aucune transcription n\'est simulée.'],
    };
  }
  
  if (/playlist|musique|music|track/.test(name)) return {
    folder: 'music', capability: 'partial',
    reasons: ['Le nom correspond à de la musique.', 'Les métadonnées disponibles seront conservées.'],
  };
  
  if (isReadable) return {
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
      id: `file-${Date.now()}-${index}-${file.name}`,
      file, source: 'file' as const, selected: true, ...classify(file, 'file'),
    }));
    setItems((current) => [...current, ...additions]);
    if (!activeId && additions[0]) setActiveId(additions[0].id);
  };

  const addUrl = () => {
    if (!url.trim()) return;
    try {
      new URL(url.trim());
      const item: ImportItem = {
        id: `url-${Date.now()}-${url}`,
        source: 'url',
        data: url.trim(),
        selected: true,
        extractedInfo: `URL: ${url.trim()}`,
        ...classify(url.trim(), 'url'),
      };
      setItems((current) => [...current, item]);
      setUrl('');
      if (!activeId) setActiveId(item.id);
    } catch {
      alert('URL invalide. Veuillez entrer une URL valide (https://…)');
    }
  };

  const addText = () => {
    if (!pasted.trim()) return;
    const item: ImportItem = {
      id: `text-${Date.now()}`,
      source: 'text',
      data: pasted.trim(),
      selected: true,
      extractedInfo: `${pasted.trim().split('\n')[0]}${pasted.trim().split('\n').length > 1 ? '…' : ''}`,
      ...classify(pasted.trim(), 'text'),
    };
    setItems((current) => [...current, item]);
    setPasted('');
    if (!activeId) setActiveId(item.id);
  };

  const confirm = () => {
    const filesToConfirm = items.filter((item) => item.selected && item.file).map((item) => item.file!);
    const context = [
      items.filter((item) => item.selected && item.source === 'text').map((item) => `Texte collé :\n${item.data}`).join('\n\n'),
      items.filter((item) => item.selected && item.source === 'url').map((item) => `URL classée comme ${LABEL[item.folder]} :\n${item.data}`).join('\n\n'),
    ].filter(Boolean).join('\n\n');
    onConfirm(filesToConfirm, context);
  };

  const visible = useMemo(() => folder === 'all' ? items : items.filter((item) => item.folder === folder), [items, folder]);
  const active = items.find((item) => item.id === activeId) ?? visible[0] ?? null;
  const counts = (id: Folder | 'all') => id === 'all' ? items.length : items.filter((item) => item.folder === id).length;

  return (
    <div className="wc-import-studio" role="dialog" aria-modal="true" aria-label="Studio d'import" data-import="studio">
      <header className="wc-import-head">
        <div>
          <span className="wc-import-eyebrow">Studio d'import</span>
          <h2>Donnez-nous votre chaos.</h2>
        </div>
        <button onClick={onClose}>Fermer</button>
      </header>

      <div className="wc-import-sourcebar">
        <button onClick={() => picker.current?.click()} className="wc-import-primary">+ Fichiers ou dossier</button>
        <input ref={picker} type="file" multiple onChange={(event) => addFiles(Array.from(event.target.files ?? []))} hidden />
        <label>
          <span>URL de référence</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(e) => e.key === 'Enter' && addUrl()} placeholder="https://…" />
            <button type="button" onClick={addUrl} disabled={!url.trim()} style={{ padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}>Ajouter</button>
          </div>
        </label>
        <label className="wc-import-paste">
          <span>Texte ou notes</span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <textarea value={pasted} onChange={(event) => setPasted(event.target.value)} placeholder="Collez un message, un brief ou le texte d'une capture…" style={{ flex: 1 }} />
            <button type="button" onClick={addText} disabled={!pasted.trim()} style={{ padding: '0.5rem 1rem', whiteSpace: 'nowrap', alignSelf: 'flex-end' }}>Ajouter</button>
          </div>
        </label>
      </div>

      <p className="wc-import-truth">
        TXT, CSV, JSON, ICS et formats texte sont lus localement. PDF, Office, images, audio et vidéo sont rangés honnêtement mais leur contenu profond n'est pas encore interprété. Les URLs sont analysées par leur domaine et classées : lieux, prestataires, événements, etc. Texte collé est aussi rangé intelligemment.
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
            <div className="wc-import-empty">Ajoutez vos premiers fichiers, URLs ou notes. Leur classement sera proposé ici avant toute création.</div>
          ) : visible.map((item) => (
            <button key={item.id} onClick={() => setActiveId(item.id)} className={active?.id === item.id ? 'is-active' : ''}>
              <input type="checkbox" checked={item.selected} onClick={(event) => event.stopPropagation()} onChange={() => setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, selected: !candidate.selected } : candidate))} />
              <span>
                <strong>{item.file?.name || item.extractedInfo || `${item.source === 'url' ? 'URL' : 'Texte'}`}</strong>
                <small>{LABEL[item.folder]} · {item.source === 'file' ? `${(item.file!.size / 1024).toFixed(0)} ko` : item.source === 'url' ? 'URL' : 'Texte'}</small>
              </span>
              <i style={{ color: CAPABILITY[item.capability].color }}>{CAPABILITY[item.capability].label}</i>
            </button>
          ))}
        </div>

        <aside className="wc-import-inspector">
          {active ? (
            <>
              <span className="wc-import-eyebrow">Classement proposé</span>
              <h3>{active.file?.name || (active.source === 'url' ? 'URL importée' : 'Texte collé')}</h3>
              {active.data && (
                <div style={{ 
                  padding: '0.75rem', 
                  borderRadius: '0.375rem', 
                  backgroundColor: 'rgba(0,0,0,0.03)', 
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                  wordBreak: 'break-all',
                  maxHeight: '120px',
                  overflow: 'auto'
                }}>
                  {active.data.substring(0, 200)}{active.data.length > 200 ? '…' : ''}
                </div>
              )}
              <label>Ranger dans
                <select value={active.folder} onChange={(event) => setItems((current) => current.map((candidate) => candidate.id === active.id ? { ...candidate, folder: event.target.value as Folder } : candidate))}>
                  {FOLDERS.filter((entry) => entry.id !== 'all').map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
                </select>
              </label>
              <span className="wc-import-eyebrow">Pourquoi ?</span>
              <ul>{active.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              <div className="wc-import-capability" style={{ borderColor: CAPABILITY[active.capability].color }}>
                <strong style={{ color: CAPABILITY[active.capability].color }}>{CAPABILITY[active.capability].label}</strong>
                <p>{active.capability === 'analysed' ? 'Le contenu pourra alimenter la lecture suivante.' : active.capability === 'partial' ? 'Classification et métadonnées disponibles.' : 'Conservé sans interprétation.'}</p>
              </div>
            </>
          ) : <p>Sélectionnez un fichier, une URL ou du texte pour comprendre son classement.</p>}
        </aside>
      </div>

      <footer className="wc-import-actions">
        <span>{items.filter((item) => item.selected).length} élément(s) retenu(s)</span>
        <button onClick={onClose}>Annuler</button>
        <button onClick={confirm} className="wc-import-primary" disabled={items.length === 0 || items.every((item) => !item.selected)}>
          Valider le rangement <span aria-hidden>→</span>
        </button>
      </footer>
    </div>
  );
}
