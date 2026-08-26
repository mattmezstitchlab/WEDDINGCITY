import { useMemo, useRef, useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { typography } from '../../../design/tokens';

// ---------------------------------------------------------------------------
// PLAN DE TABLE — spatial, not a spreadsheet.
// ---------------------------------------------------------------------------
// Tables are round objects on a floor; guests are chips you actually carry
// from one to another. The rule for THIS drag (see the audit): the guest
// follows the pointer, because you are physically moving a person to a seat —
// unlike the programme list, where the block stays and the move is validated.
//
// Every refusal is spoken: a table that is full says so, and the constraint
// panel counts what is really there. Nothing is auto-seated.
// ---------------------------------------------------------------------------

export function SeatingPlan() {
  const store = weddingStore;
  const [carrying, setCarrying] = useState<{ guestId: string; name: string; x: number; y: number } | null>(null);
  const [overTable, setOverTable] = useState<string | null>(null);
  // MEASURED: a quick drop landed nowhere. `overTable` is React state, so the
  // pointerup handler could still read the value from before the last move.
  // The ref is the truth; the state only drives the highlight.
  const overRef = useRef<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const floorRef = useRef<HTMLDivElement>(null);

  const tables = store.seatingTables;
  const guests = store.guests;
  const nameOf = (personId: string) => store.persons.find((p) => p.id === personId)?.displayName ?? 'Invité';

  const unseated = useMemo(
    () => guests.filter((g) => !g.seating.tableId),
    [store.version],
  );

  const drop = (guestId: string, tableId: string | null) => {
    const guest = guests.find((g) => g.id === guestId);
    if (!guest) return;
    const ok = store.assignGuestToTable(guestId, tableId);
    if (!ok && tableId) {
      const t = tables.find((x) => x.id === tableId);
      const occ = t ? store.getTableOccupancy(t.id) : null;
      setNote(t && occ
        ? `${t.label} est complète : ${occ.seated} places occupées sur ${occ.capacity}.`
        : 'Ce déplacement est impossible.');
      return;
    }
    setNote(tableId
      ? `${nameOf(guest.personId)} est placé·e à ${tables.find((t) => t.id === tableId)?.label}.`
      : `${nameOf(guest.personId)} n’est plus placé·e.`);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!carrying) return;
    setCarrying({ ...carrying, x: e.clientX, y: e.clientY });
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-table-id]');
    const id = el?.getAttribute('data-table-id') ?? null;
    overRef.current = id;
    setOverTable(id);
  };

  const onPointerUp = () => {
    if (!carrying) return;
    const target = overRef.current;
    const guestId = carrying.guestId;
    setCarrying(null);
    setOverTable(null);
    overRef.current = null;
    const onFloor = target === 'unseated' ? null : target;
    if (target) drop(guestId, onFloor);
  };

  const startCarry = (e: React.PointerEvent, guestId: string, name: string) => {
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* keep carrying */ }
    setCarrying({ guestId, name, x: e.clientX, y: e.clientY });
  };

  return (
    <div onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { setCarrying(null); overRef.current = null; }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          onClick={() => { store.addSeatingTable(8); setNote('Table ajoutée — 8 places.'); }}
          style={btn}
          data-org="add-table"
        >
          + Ajouter une table
        </button>
        <span style={muted}>
          {tables.length === 0
            ? 'Aucune table pour l’instant.'
            : `${tables.length} table${tables.length > 1 ? 's' : ''} · ${guests.length - unseated.length}/${guests.length} invités placés`}
        </span>
        {note && <span style={{ ...muted, color: '#315d43' }} data-org="seating-note">{note}</span>}
      </div>

      {/* ---- the floor ---- */}
      <div ref={floorRef} style={floor} data-org="floor">
        {tables.length === 0 && (
          <div style={{ ...muted, padding: 26 }}>
            Le plan de salle est vide. Ajoutez une table, puis portez-y un invité.
          </div>
        )}
        {tables.map((t) => {
          const { seated, capacity } = store.getTableOccupancy(t.id);
          const at = guests.filter((g) => g.seating.tableId === t.id);
          const full = seated >= capacity;
          const over = seated > capacity;
          return (
            <div
              key={t.id}
              data-table-id={t.id}
              data-org="table"
              style={{
                ...tableStyle,
                borderColor: overTable === t.id ? '#141414' : over ? '#a54840' : 'rgba(20,20,20,0.18)',
                background: overTable === t.id ? 'rgba(20,20,20,0.05)' : 'transparent',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: typography.editorial.caption }}>{t.label}</div>
              <div style={{ ...muted, marginBottom: 8 }}>
                {seated}/{capacity} places{over ? ' · dépassée' : full ? ' · complète' : ''}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {at.map((g) => (
                  <span
                    key={g.id}
                    onPointerDown={(e) => startCarry(e, g.id, nameOf(g.personId))}
                    style={{ ...guestChip, opacity: carrying?.guestId === g.id ? 0.35 : 1 }}
                    data-org="seated-guest"
                  >
                    {nameOf(g.personId)}
                  </span>
                ))}
                {at.length === 0 && <span style={muted}>vide</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- who is not seated yet ---- */}
      <div
        data-table-id="unseated"
        data-org="unseated"
        style={{
          ...unseatedZone,
          borderColor: overTable === 'unseated' ? '#141414' : 'rgba(20,20,20,0.18)',
        }}
      >
        <div style={{ ...muted, marginBottom: 8 }}>
          {unseated.length === 0 ? 'Tout le monde est placé.' : `${unseated.length} invité(s) à placer`}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {unseated.map((g) => (
            <span
              key={g.id}
              onPointerDown={(e) => startCarry(e, g.id, nameOf(g.personId))}
              style={{ ...guestChip, opacity: carrying?.guestId === g.id ? 0.35 : 1 }}
              data-org="unseated-guest"
            >
              {nameOf(g.personId)}
            </span>
          ))}
        </div>
      </div>

      {/* The person really travels with the finger. */}
      {carrying && (
        <div
          aria-hidden
          data-org="carrying"
          style={{
            position: 'fixed', left: carrying.x + 12, top: carrying.y - 14, zIndex: 2000,
            pointerEvents: 'none', background: '#f6f5f3', color: '#08090b',
            borderRadius: 999, padding: '6px 12px', fontSize: 12, fontWeight: 600,
            boxShadow: '0 18px 40px rgba(0,0,0,0.5)',
          }}
        >
          {carrying.name}
        </div>
      )}
    </div>
  );
}

const btn: React.CSSProperties = {
  appearance: 'none', border: 'none', cursor: 'pointer', background: '#141414', color: '#f6f5f3',
  borderRadius: 999, padding: '10px 18px', fontSize: typography.editorial.caption,
  fontWeight: typography.weight.semibold, fontFamily: typography.family.sans,
};

const muted: React.CSSProperties = { fontSize: typography.editorial.caption, color: 'rgba(20,20,20,0.58)' };

const floor: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start',
  border: '1px solid rgba(20,20,20,0.12)', borderRadius: 6, padding: 14, minHeight: 160,
};

/** A table reads as an object on a floor, not as a row in a grid. */
const tableStyle: React.CSSProperties = {
  minWidth: 190, maxWidth: 260, padding: '18px 16px',
  border: '1px solid rgba(20,20,20,0.18)', borderRadius: 18,
};

const unseatedZone: React.CSSProperties = {
  marginTop: 14, padding: 14, border: '1px dashed rgba(20,20,20,0.18)', borderRadius: 6,
};

const guestChip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', cursor: 'grab', touchAction: 'none',
  border: '1px solid rgba(20,20,20,0.18)', borderRadius: 999,
  padding: '6px 12px', fontSize: 12, color: '#141414', background: '#fff', userSelect: 'none',
};
