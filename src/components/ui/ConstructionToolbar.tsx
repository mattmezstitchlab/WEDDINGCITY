import {
  weddingStore,
  BRAND_ACCENT,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from '../../game/weddingStore';
import { IconPlus, IconCheck, IconAlert } from './Icons';

export function ConstructionToolbar() {
  const store = weddingStore;
  const selectedObj = store.placedObjects.find((o) => o.id === store.selectedObjectId);

  if (!store.constructionMode) return null;

  const handleAddObject = (category: 'table' | 'bar' | 'stage' | 'lounge' | 'arch', name: string) => {
    store.addPlacedObject({
      name,
      category,
      pos: [store.avatarPos[0], 0, store.avatarPos[2] - 2],
      rotY: 0,
      scale: 1.0,
      tableCapacity: category === 'table' ? 10 : undefined,
    });
  };

  const handleRotate = () => {
    if (!selectedObj) return;
    store.updatePlacedObject(selectedObj.id, {
      rotY: selectedObj.rotY + Math.PI / 4,
    });
  };

  const handleDelete = () => {
    if (!selectedObj) return;
    store.removePlacedObject(selectedObj.id);
  };

  return (
    <div style={toolbarWrapperStyle}>
      {/* 1. Object Catalog Items */}
      <div style={toolPillStyle}>
        <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_ACCENT, marginRight: 4, letterSpacing: '0.06em' }}>
          🛠️ CATALOGUE :
        </div>

        <button onClick={() => handleAddObject('table', 'Table Ronde (10 pax)')} style={catalogBtnStyle}>
          <span>＋</span> <span>Table Ronde</span>
        </button>

        <button onClick={() => handleAddObject('bar', 'Bar en Laiton')} style={catalogBtnStyle}>
          <span>＋</span> <span>Bar</span>
        </button>

        <button onClick={() => handleAddObject('stage', 'Scène & Micro')} style={catalogBtnStyle}>
          <span>＋</span> <span>Scène</span>
        </button>

        <button onClick={() => handleAddObject('lounge', 'Canapé Lounge')} style={catalogBtnStyle}>
          <span>＋</span> <span>Lounge</span>
        </button>

        <button onClick={() => handleAddObject('arch', 'Arche Florale')} style={catalogBtnStyle}>
          <span>＋</span> <span>Arche</span>
        </button>
      </div>

      {/* 2. Selected Object Controls */}
      {selectedObj && (
        <div style={toolPillStyle}>
          <div style={{ fontSize: 10, color: '#ffffff', fontWeight: 600 }}>
            {selectedObj.name}
          </div>

          <button onClick={handleRotate} style={actionToolBtnStyle} title="Pivoter de 45°">
            🔄 Pivoter
          </button>

          <button onClick={handleDelete} style={{ ...actionToolBtnStyle, color: '#f43f5e' }}>
            🗑️ Supprimer
          </button>
        </div>
      )}

      {/* 3. Exit / Save */}
      <div style={toolPillStyle}>
        <button
          onClick={() => store.toggleConstructionMode(false)}
          style={saveConstructionBtnStyle}
        >
          <IconCheck size={12} color="#08090d" />
          <span>Valider & Sauvegarder</span>
        </button>
      </div>
    </div>
  );
}

const toolbarWrapperStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 14,
  left: 16,
  right: 16,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  zIndex: 60,
  pointerEvents: 'none',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
};

const toolPillStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  background: 'rgba(18, 21, 30, 0.94)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 16,
  padding: '6px 10px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55)',
  pointerEvents: 'auto',
};

const catalogBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: 'rgba(255, 255, 255, 0.04)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 8,
  padding: '5px 8px',
  color: '#f8fafc',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
};

const actionToolBtnStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 6,
  padding: '4px 8px',
  color: '#cbd5e1',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
};

const saveConstructionBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  background: '#ffffff',
  color: '#08090d',
  border: 'none',
  borderRadius: 8,
  padding: '7px 14px',
  fontWeight: 700,
  fontSize: 11,
  cursor: 'pointer',
};
