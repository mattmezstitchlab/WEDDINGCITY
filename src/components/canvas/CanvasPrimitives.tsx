import { CSSProperties, useState } from 'react';
import { radius, surfaces, typography, shadowFor } from '../../design/tokens';

// ---------------------------------------------------------------------------
// CANVAS — composition primitives.
// ---------------------------------------------------------------------------
// The rule of this phase: the user never leaves the context to edit a value.
// So there are no modals here. Every primitive edits in place, commits on
// blur/Enter, and reverts on Escape.
//
// Canvas shares the ivory Composition surface with Mirror, but is denser and
// more instrumental: it is a tool, not a showcase.
// ---------------------------------------------------------------------------

export const K = surfaces.composition;

/** Click-to-edit text. Commits only a real change, so history stays clean. */
export function InlineText({
  value, onCommit, placeholder, multiline, mono, size = typography.size.body, bold,
}: {
  value: string | null;
  onCommit: (next: string) => void;
  placeholder?: string;
  multiline?: boolean;
  mono?: boolean;
  size?: number;
  bold?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  const start = () => { setDraft(value ?? ''); setEditing(true); };
  const commit = () => {
    setEditing(false);
    if (draft !== (value ?? '')) onCommit(draft);
  };

  const shared: CSSProperties = {
    font: 'inherit',
    fontSize: size,
    fontWeight: bold ? typography.weight.semibold : typography.weight.regular,
    fontFamily: mono ? typography.family.mono : typography.family.sans,
    color: K.textPrimary,
    width: '100%',
    background: K.bg,
    border: `1px solid ${K.lineStrong}`,
    borderRadius: radius.xs,
    padding: '5px 8px',
    outline: 'none',
  };

  if (editing) {
    const commonProps = {
      autoFocus: true,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false); }
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit(); }
      },
      style: shared,
      placeholder,
    };
    return multiline
      ? <textarea {...commonProps} rows={3} style={{ ...shared, resize: 'vertical' }} />
      : <input {...commonProps} />;
  }

  const empty = !value || !value.trim();
  return (
    <button
      onClick={start}
      style={{
        font: 'inherit', fontSize: size,
        fontWeight: bold ? typography.weight.semibold : typography.weight.regular,
        fontFamily: mono ? typography.family.mono : typography.family.sans,
        color: empty ? K.textMuted : K.textPrimary,
        background: 'transparent', border: '1px solid transparent',
        borderRadius: radius.xs, padding: '5px 8px', margin: '-5px -8px',
        cursor: 'text', textAlign: 'left', width: '100%',
        whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis',
      }}
      title="Cliquer pour modifier"
    >
      {empty ? (placeholder ?? 'Ajouter…') : value}
    </button>
  );
}

/** Inline select. Same commit discipline as InlineText. */
export function InlineSelect<T extends string>({
  value, options, onCommit, placeholder,
}: {
  value: T | null;
  options: { value: T; label: string }[];
  onCommit: (next: T | null) => void;
  placeholder?: string;
}) {
  return (
    // SEEN IN THE BROWSER: the native control (system chevron, boxed field) was
    // the one element that made the Canvas read as a form rather than as a
    // composition surface. Same control, same behaviour, editorial clothing:
    // no native appearance, hairline underline, one discreet chevron.
    <select
      value={value ?? ''}
      onChange={(e) => onCommit((e.target.value || null) as T | null)}
      style={{
        font: 'inherit', fontSize: typography.size.body, color: value ? K.textPrimary : K.textMuted,
        appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
        // Long-hand only: mixing the `background` shorthand with backgroundImage
        // makes React warn about conflicting style properties on rerender.
        backgroundColor: 'transparent',
        backgroundImage:
          `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='9' height='6'>`
          + `<path d='M1 1l3.5 3.5L8 1' fill='none' stroke='%23636874' stroke-width='1.2'/></svg>")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 2px center',
        border: 'none', borderBottom: `1px solid ${K.lineStrong}`, borderRadius: 0,
        padding: '5px 20px 5px 0', outline: 'none', maxWidth: '100%', cursor: 'pointer',
      }}
    >
      <option value="">{placeholder ?? '—'}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/** A removable chip representing a linked entity. */
export function Chip({
  label, sub, onRemove, onClick, tone = 'default',
}: {
  label: string;
  sub?: string;
  onRemove?: () => void;
  onClick?: () => void;
  tone?: 'default' | 'derived';
}) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        border: `1px ${tone === 'derived' ? 'dashed' : 'solid'} ${K.line}`,
        borderRadius: radius.pill, padding: '5px 10px',
        fontSize: typography.size.caption, color: K.textSecondary,
        background: tone === 'derived' ? 'transparent' : K.bg,
      }}
    >
      <button
        onClick={onClick}
        disabled={!onClick}
        style={{
          font: 'inherit', color: K.textPrimary, background: 'transparent',
          border: 'none', padding: 0, cursor: onClick ? 'pointer' : 'default',
        }}
      >
        {label}
      </button>
      {sub && <span style={{ color: K.textMuted, fontSize: typography.size.caption }}>{sub}</span>}
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Retirer ${label}`}
          style={{
            border: 'none', background: 'transparent', color: K.textMuted,
            cursor: 'pointer', padding: 0, fontSize: 12, lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}

/**
 * Contextual picker: search existing entities, or create a new one.
 * Renders INSIDE the card it belongs to — never as a full-screen modal.
 */
export function InlinePicker<T extends { id: string; label: string; sub?: string }>({
  items, onPick, onCreate, createLabel, placeholder, children,
}: {
  items: T[];
  onPick: (id: string) => void;
  onCreate?: () => void;
  createLabel?: string;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={addBtnStyle}>+ {placeholder ?? 'Ajouter'}</button>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;

  return (
    <div style={pickerStyle}>
      <input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher…"
        onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); setQuery(''); } }}
        style={{
          font: 'inherit', fontSize: typography.size.body, width: '100%',
          background: K.bg, border: `1px solid ${K.lineStrong}`, borderRadius: radius.xs,
          padding: '6px 9px', outline: 'none', color: K.textPrimary,
        }}
      />
      <div style={{ maxHeight: 168, overflowY: 'auto', margin: '8px 0 0' }}>
        {filtered.length === 0 && (
          <div style={{ fontSize: typography.size.caption, color: K.textMuted, padding: '6px 2px' }}>
            Aucun résultat.
          </div>
        )}
        {filtered.map((i) => (
          <button
            key={i.id}
            onClick={() => { onPick(i.id); setOpen(false); setQuery(''); }}
            style={pickerRowStyle}
          >
            <span>{i.label}</span>
            {i.sub && <span style={{ color: K.textMuted, fontSize: typography.size.caption }}>{i.sub}</span>}
          </button>
        ))}
      </div>

      {children}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {onCreate && (
          <button onClick={() => { onCreate(); setOpen(false); }} style={{ ...addBtnStyle, borderStyle: 'solid' }}>
            {createLabel ?? '+ Créer'}
          </button>
        )}
        <button onClick={() => { setOpen(false); setQuery(''); }} style={{ ...addBtnStyle, border: 'none' }}>
          Annuler
        </button>
      </div>
    </div>
  );
}

export function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(84px, 108px) 1fr', gap: 12, alignItems: 'start', padding: '7px 0' }}>
      <div style={fieldLabelStyle}>{label}</div>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

export const fieldLabelStyle: CSSProperties = {
  fontSize: typography.size.caption, letterSpacing: '0.13em', textTransform: 'uppercase',
  color: K.textMuted, fontWeight: 700, paddingTop: 7,
};

export const addBtnStyle: CSSProperties = {
  font: 'inherit', fontSize: typography.size.caption, color: K.textSecondary,
  background: 'transparent', border: `1px dashed ${K.lineStrong}`,
  borderRadius: radius.pill, padding: '5px 11px', cursor: 'pointer',
};

export const pickerStyle: CSSProperties = {
  border: `1px solid ${K.lineStrong}`, borderRadius: radius.sm,
  padding: 10, background: K.surface, boxShadow: shadowFor(2, 'composition'),
};

export const pickerRowStyle: CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
  width: '100%', font: 'inherit', fontSize: typography.size.body, color: K.textPrimary,
  background: 'transparent', border: 'none', borderRadius: radius.xs,
  padding: '6px 8px', cursor: 'pointer', textAlign: 'left',
};

/**
 * Empty state for a composition surface.
 *
 * Same rule as the Mirror: say what is missing and what would fill it. Never
 * "No data", never an invented row to make the layout look inhabited.
 */
export function CanvasEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div style={{
      border: `1px dashed ${K.lineStrong}`, borderRadius: radius.md,
      padding: '26px 20px', textAlign: 'center',
    }}>
      <div style={{ fontSize: typography.size.bodyLg, color: K.textPrimary }}>{title}</div>
      <p style={{
        margin: '8px auto 0', maxWidth: 400,
        fontSize: typography.size.caption, color: K.textSecondary, lineHeight: 1.6,
      }}>
        {body}
      </p>
    </div>
  );
}

export const canvasCard: CSSProperties = {
  background: K.surface, border: `1px solid ${K.line}`,
  borderRadius: radius.lg, boxShadow: shadowFor(2, 'composition'),
};
