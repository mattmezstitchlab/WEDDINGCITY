import { useMemo, useState } from 'react';
import {
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from '../../game/brand';
import { weddingStore } from '../../game/weddingStore';
import {
  buildNerveGraph,
  propagateFault,
  describePropagation,
  GRAPH_LAYERS,
  GraphNode,
} from '../../game/nerveGraph';

// ---------------------------------------------------------------------------
// Nervous-system graph panel.
//
// Renders the canonical chain
//   DOCUMENT → PRESTATAIRE → TÂCHE → TIMELINE → LIEU → PERSONNES
// from the REAL store data, and lets any node be marked as faulty to show the
// blast radius: which providers, tasks, phases, places and people it reaches.
//
// Deliberately DOM/flex based rather than a canvas: it must stay readable
// inside the existing modal and reuse the current design tokens.
// ---------------------------------------------------------------------------

const LAYER_COLOR: Record<string, string> = {
  document: '#38bdf8',
  vendor: '#e2b448',
  task: '#a78bfa',
  phase: '#f472b6',
  place: '#34d399',
  person: '#f8fafc',
};

export function NerveGraphPanel() {
  const [faultId, setFaultId] = useState<string | null>(null);
  const [depth, setDepth] = useState(3);

  // Rebuilt from live store data on every render of the panel.
  const graph = useMemo(
    () =>
      buildNerveGraph({
        places: weddingStore.places,
        agents: weddingStore.agents,
        docs: weddingStore.docs,
        tasks: weddingStore.tasks,
        phases: weddingStore.phases,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weddingStore.version],
  );

  const propagation = useMemo(
    () => (faultId ? propagateFault(graph, faultId, { direction: 'downstream', maxDepth: depth }) : null),
    [graph, faultId, depth],
  );

  const byLayer = GRAPH_LAYERS.map((l) => ({
    ...l,
    nodes: graph.nodes.filter((n) => n.kind === l.kind),
  }));

  const affected = propagation?.affected ?? new Map<string, number>();

  return (
    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
      {/* Legend + controls */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 10, flexWrap: 'wrap', marginBottom: 10,
      }}>
        <div style={{ fontSize: 10.5, color: BRAND_TEXT_SECONDARY, lineHeight: 1.5 }}>
          <strong style={{ color: BRAND_TEXT_PRIMARY }}>{graph.nodes.length} nœuds · {graph.edges.length} liaisons</strong>
          {' '}— cliquez un élément pour simuler une défaillance et voir sa propagation.
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: BRAND_TEXT_MUTED, letterSpacing: '0.08em', fontWeight: 700 }}>PROFONDEUR</span>
          {[1, 2, 3, 4].map((d) => (
            <button key={d} onClick={() => setDepth(d)} style={depthBtnStyle(depth === d)}>{d}</button>
          ))}
          {faultId && (
            <button onClick={() => setFaultId(null)} style={depthBtnStyle(false)}>✕ effacer</button>
          )}
        </div>
      </div>

      {/* Propagation summary */}
      {propagation && (
        <div style={{
          border: '1px solid rgba(244,63,94,0.35)', background: 'rgba(244,63,94,0.08)',
          borderRadius: 10, padding: '9px 12px', marginBottom: 10,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#f43f5e', letterSpacing: '0.08em' }}>
            🔴 PROPAGATION DE DÉFAILLANCE
          </div>
          <div style={{ fontSize: 11, color: BRAND_TEXT_PRIMARY, marginTop: 4 }}>
            Origine : <strong>{graph.byId.get(faultId!)?.label}</strong>
          </div>
          <div style={{ fontSize: 10.5, color: BRAND_TEXT_SECONDARY, marginTop: 3 }}>
            {describePropagation(graph, propagation)}
          </div>
          {propagation.byLayer.length > 1 && (
            <div style={{ fontSize: 10, color: BRAND_TEXT_MUTED, marginTop: 5, fontFamily: "'JetBrains Mono', monospace" }}>
              {propagation.byLayer.map((l) => `${l.label}(${l.nodes.length})`).join('  →  ')}
            </div>
          )}
        </div>
      )}

      {/* Layered graph */}
      <div style={{ display: 'grid', gap: 8 }}>
        {byLayer.map((layer, li) => (
          <div key={layer.kind}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                color: LAYER_COLOR[layer.kind], minWidth: 96,
              }}>
                {layer.label}
              </span>
              <span style={{ fontSize: 9, color: BRAND_TEXT_MUTED, fontFamily: "'JetBrains Mono', monospace" }}>
                {layer.nodes.length}
              </span>
              <div style={{ flex: 1, height: 1, background: BRAND_BORDER }} />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 4 }}>
              {layer.nodes.map((n) => (
                <NodeChip
                  key={n.id}
                  node={n}
                  color={LAYER_COLOR[n.kind]}
                  isOrigin={faultId === n.id}
                  hops={affected.get(n.id)}
                  dimmed={!!propagation && !affected.has(n.id)}
                  onClick={() => setFaultId(faultId === n.id ? null : n.id)}
                />
              ))}
            </div>

            {li < byLayer.length - 1 && (
              <div style={{ textAlign: 'center', color: BRAND_TEXT_MUTED, fontSize: 11, lineHeight: 1, marginTop: 5 }}>↓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function NodeChip({
  node, color, isOrigin, hops, dimmed, onClick,
}: {
  node: GraphNode; color: string; isOrigin: boolean; hops?: number; dimmed: boolean; onClick: () => void;
}) {
  const affected = hops !== undefined && hops > 0;
  return (
    <button
      onClick={onClick}
      title={`${node.label}${node.sublabel ? ` — ${node.sublabel}` : ''}${
        hops !== undefined ? ` · impacté à ${hops} niveau(x)` : ''}`}
      style={{
        padding: '3px 8px',
        borderRadius: 6,
        fontSize: 9.5,
        maxWidth: 168,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        textAlign: 'left',
        opacity: dimmed ? 0.25 : 1,
        border: isOrigin
          ? '1px solid #f43f5e'
          : affected
            ? '1px solid rgba(244,63,94,0.45)'
            : `1px solid ${BRAND_BORDER}`,
        background: isOrigin
          ? 'rgba(244,63,94,0.25)'
          : affected
            ? 'rgba(244,63,94,0.10)'
            : 'rgba(255,255,255,0.03)',
        color: isOrigin ? '#fecdd3' : affected ? '#fda4af' : color,
      }}
    >
      {isOrigin ? '🔴 ' : affected ? `${hops}· ` : ''}{node.label}
    </button>
  );
}

const depthBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '3px 8px',
  borderRadius: 6,
  fontSize: 9.5,
  fontWeight: 700,
  cursor: 'pointer',
  border: `1px solid ${active ? BRAND_ACCENT : BRAND_BORDER}`,
  background: active ? 'rgba(226,180,72,0.15)' : 'transparent',
  color: active ? BRAND_ACCENT : BRAND_TEXT_MUTED,
});
