import { useState } from 'react';
import {
  weddingStore,
  BRAND_ACCENT,
  BRAND_SURFACE,
  BRAND_BORDER,
  BRAND_TEXT_MUTED,
  BRAND_TEXT_PRIMARY,
  BRAND_TEXT_SECONDARY,
} from '../../game/weddingStore';
import { TrackEntity, WeddingMoment } from '../../types/wedding';
import {
  IconMusic,
  IconHeart,
  IconSparkles,
  IconShare,
  IconPlus,
  IconSliders,
  IconCheck,
  IconDancefloor,
} from './Icons';

interface DjZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_QUICK_PICKS = [
  { title: 'Marry You', artist: 'Bruno Mars', moment: 'cocktail' as WeddingMoment, bpm: 145, energy: 4 },
  { title: 'I Wanna Dance with Somebody', artist: 'Whitney Houston', moment: 'soiree' as WeddingMoment, bpm: 119, energy: 5 },
  { title: 'Gimme! Gimme! Gimme!', artist: 'ABBA', moment: 'soiree' as WeddingMoment, bpm: 120, energy: 5 },
  { title: 'Viva La Vida', artist: 'Coldplay', moment: 'ceremonie' as WeddingMoment, bpm: 138, energy: 3 },
  { title: 'Fly Me to the Moon', artist: 'Frank Sinatra', moment: 'cocktail' as WeddingMoment, bpm: 88, energy: 2 },
  { title: 'You Are the Best Thing', artist: 'Ray LaMontagne', moment: 'repas' as WeddingMoment, bpm: 85, energy: 3 },
];

export function DjZoneModal({ isOpen, onClose }: DjZoneModalProps) {
  const store = weddingStore;
  const tracks = store.tracks;
  const activeTrack = store.getActiveTrack();

  const [activeTab, setActiveTab] = useState<'all' | 'bride_groom' | 'guests' | 'pending'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [moment, setMoment] = useState<WeddingMoment>('soiree');
  const [suggestedBy, setSuggestedBy] = useState('Thomas (Témoin)');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleCreateTrack = () => {
    if (!title.trim() || !artist.trim()) return;
    store.addTrack({
      title,
      artist,
      moment,
      suggestedBy: suggestedBy || 'Invité',
      note: note || undefined,
    });
    setTitle('');
    setArtist('');
    setNote('');
    setShowAddForm(false);
  };

  const handleQuickAdd = (pick: typeof PRESET_QUICK_PICKS[0]) => {
    store.addTrack({
      title: pick.title,
      artist: pick.artist,
      moment: pick.moment,
      suggestedBy: 'Invité du mariage',
      note: 'Ajouté en 1 clic depuis les suggestions',
      bpm: pick.bpm,
      energy: pick.energy,
    });
  };

  const handleShareLink = () => {
    setCopiedLink(true);
    store.simulateGuestSuggestion();
    setTimeout(() => setCopiedLink(false), 2400);
  };

  const filteredTracks = tracks.filter((t) => {
    if (activeTab === 'bride_groom') return t.status === 'bride_groom';
    if (activeTab === 'guests') return t.status === 'verified';
    if (activeTab === 'pending') return t.status === 'pending';
    return true;
  });

  const getMomentLabel = (m: WeddingMoment) => {
    switch (m) {
      case 'ceremonie': return '15:30 CÉRÉMONIE';
      case 'cocktail': return '17:00 COCKTAIL';
      case 'repas': return '19:30 BANQUET';
      case 'premiere_danse': return '22:30 1ÈRE DANSE';
      case 'soiree': return '23:30 SOIRÉE CLUB';
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalCardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={djIconBadgeStyle}>
              <IconDancefloor size={18} color={BRAND_ACCENT} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: BRAND_ACCENT, letterSpacing: '0.08em' }}>
                CENTRE MUSICAL & DJ BOOTH
              </div>
              <h2 style={{ margin: '3px 0 0', fontSize: 18, fontWeight: 700, color: BRAND_TEXT_PRIMARY, letterSpacing: '-0.015em' }}>
                PLAYLIST COLLABORATIVE DU MARIAGE
              </h2>
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Live "Now Playing" Banner */}
        <div style={nowPlayingCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Animated Equalizer Bars */}
              <div style={equalizerBarsStyle}>
                <div style={{ ...eqBarStyle, height: 14, animation: 'eqBar 0.6s infinite ease-in-out' }} />
                <div style={{ ...eqBarStyle, height: 22, animation: 'eqBar 0.8s infinite ease-in-out 0.2s' }} />
                <div style={{ ...eqBarStyle, height: 10, animation: 'eqBar 0.5s infinite ease-in-out 0.1s' }} />
                <div style={{ ...eqBarStyle, height: 18, animation: 'eqBar 0.7s infinite ease-in-out 0.3s' }} />
              </div>
              <div>
                <div style={{ fontSize: 9, color: BRAND_ACCENT, fontWeight: 700, letterSpacing: '0.06em' }}>
                  EN DIRECT SUR LA SCÈNE • {getMomentLabel(activeTrack.moment)}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', marginTop: 1 }}>
                  {activeTrack.title} <span style={{ color: BRAND_TEXT_MUTED, fontWeight: 500 }}>— {activeTrack.artist}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={pillTagStyle}>{activeTrack.bpm} BPM</div>
              <div style={{ ...pillTagStyle, borderColor: BRAND_ACCENT, color: BRAND_ACCENT }}>
                {activeTrack.suggestedBy}
              </div>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 10px', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={primaryToolbarBtnStyle}
            >
              <IconPlus size={13} color="#08090d" />
              <span>AJOUTER UN MORCEAU</span>
            </button>

            <button
              onClick={() => store.smartHarmonizePlaylist()}
              style={secondaryToolbarBtnStyle}
              title="Réorganise la playlist selon l'énergie et les moments du mariage"
            >
              <IconSparkles size={13} color={BRAND_ACCENT} />
              <span>HARMONISER PAR L'IA</span>
            </button>
          </div>

          <button
            onClick={handleShareLink}
            style={secondaryToolbarBtnStyle}
          >
            <IconShare size={13} color="#ffffff" />
            <span>{copiedLink ? '✓ LIEN COPIÉ & SUGGESTION REÇUE !' : 'INVITER LES INVITÉS'}</span>
          </button>
        </div>

        {/* Quick Add Form Drawer */}
        {showAddForm && (
          <div style={formContainerStyle}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span>PROPOSER UN NOUVEAU MORCEAU AU MARIAGE</span>
              <span style={{ fontSize: 10, color: BRAND_TEXT_MUTED }}>Appartient à la playlist collective</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={fieldLabelStyle}>TITRE DU MORCEAU :</label>
                <input
                  type="text"
                  placeholder="Ex: Can't Stop the Feeling"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={spatialInputStyle}
                />
              </div>

              <div>
                <label style={fieldLabelStyle}>ARTISTE :</label>
                <input
                  type="text"
                  placeholder="Ex: Justin Timberlake"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  style={spatialInputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div>
                <label style={fieldLabelStyle}>MOMENT IDÉAL DU MARIAGE :</label>
                <select
                  value={moment}
                  onChange={(e) => setMoment(e.target.value as WeddingMoment)}
                  style={spatialSelectStyle}
                >
                  <option value="ceremonie">15:30 — Cérémonie Laïque</option>
                  <option value="cocktail">17:00 — Cocktail & Belvédère</option>
                  <option value="repas">19:30 — Grand Banquet</option>
                  <option value="premiere_danse">22:30 — Première Danse</option>
                  <option value="soiree">23:30 — Soirée Clubbing</option>
                </select>
              </div>

              <div>
                <label style={fieldLabelStyle}>AJOUTÉ PAR :</label>
                <input
                  type="text"
                  placeholder="Votre nom (Ex: Thomas, Clara, Emma...)"
                  value={suggestedBy}
                  onChange={(e) => setSuggestedBy(e.target.value)}
                  style={spatialInputStyle}
                />
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <label style={fieldLabelStyle}>NOTE OU DÉDICACE SPÉCIALE (OPTIONNEL) :</label>
              <input
                type="text"
                placeholder="Ex: Clin d'œil pour nos années fac !"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={spatialInputStyle}
              />
            </div>

            {/* Quick Suggestions Chips */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 9, color: BRAND_TEXT_MUTED, fontWeight: 700, letterSpacing: '0.06em' }}>
                OU CHOISIR UNE SUGGESTION RAPIDE DU DJ :
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {PRESET_QUICK_PICKS.map((pick) => (
                  <button
                    key={pick.title}
                    onClick={() => handleQuickAdd(pick)}
                    style={quickPickChipStyle}
                  >
                    <span>＋</span>
                    <span>{pick.title} ({pick.artist})</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button onClick={() => setShowAddForm(false)} style={cancelBtnStyle}>
                Annuler
              </button>
              <button onClick={handleCreateTrack} style={submitTrackBtnStyle}>
                Injecter dans le DJ Booth →
              </button>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 6, margin: '10px 0', borderBottom: `1px solid ${BRAND_BORDER}`, paddingBottom: 8 }}>
          {[
            { id: 'all', label: `Tous (${tracks.length})` },
            { id: 'bride_groom', label: `Incontournables Mariés (${tracks.filter(t => t.status === 'bride_groom').length})` },
            { id: 'guests', label: `Validés Invités (${tracks.filter(t => t.status === 'verified').length})` },
            { id: 'pending', label: `En Attente (${tracks.filter(t => t.status === 'pending').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={filterTabBtnStyle(activeTab === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tracks List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
          {filteredTracks.map((track) => {
            const isPlayingThis = track.id === activeTrack.id;
            return (
              <div
                key={track.id}
                style={{
                  ...trackRowStyle,
                  borderColor: isPlayingThis ? BRAND_ACCENT : BRAND_BORDER,
                  background: isPlayingThis ? 'rgba(226, 180, 72, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconMusic size={13} color={isPlayingThis ? BRAND_ACCENT : '#ffffff'} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: isPlayingThis ? BRAND_ACCENT : '#ffffff' }}>
                        {track.title}
                      </span>
                      <span style={{ fontSize: 11, color: BRAND_TEXT_MUTED }}>
                        {track.artist}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, fontSize: 10 }}>
                      <span style={{ color: BRAND_ACCENT, fontWeight: 600 }}>{getMomentLabel(track.moment)}</span>
                      <span style={{ color: BRAND_TEXT_MUTED }}>•</span>
                      <span style={{ color: BRAND_TEXT_SECONDARY }}>
                        {track.status === 'bride_groom' ? '👑 Choix des Mariés' : `Demandé par ${track.suggestedBy}`}
                      </span>
                      {track.note && (
                        <>
                          <span style={{ color: BRAND_TEXT_MUTED }}>•</span>
                          <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>"{track.note}"</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: BRAND_TEXT_MUTED }}>
                    {track.bpm} BPM
                  </div>

                  {/* Validate button if pending */}
                  {track.status === 'pending' && (
                    <button
                      onClick={() => store.validateTrack(track.id)}
                      style={validateTrackBtnStyle}
                      title="Valider ce morceau pour la soirée"
                    >
                      <IconCheck size={11} color="#10b981" />
                      <span>Valider</span>
                    </button>
                  )}

                  {/* Upvote Button */}
                  <button
                    onClick={() => store.voteTrack(track.id)}
                    // Per-person vote state: `track.hasVoted` was global, so
                    // one person voting marked the song as voted for everyone.
                    style={upvoteBtnStyle(store.hasPersonVoted(track.id))}
                  >
                    <IconHeart
                      size={12}
                      color={store.hasPersonVoted(track.id) ? BRAND_ACCENT : '#ffffff'}
                      filled={store.hasPersonVoted(track.id)}
                    />
                    <span>{track.votes}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(8, 9, 13, 0.88)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  padding: 20,
};

const modalCardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 780,
  maxHeight: '92vh',
  overflowY: 'auto',
  background: BRAND_SURFACE,
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 22,
  padding: '24px 26px',
  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75)',
  color: BRAND_TEXT_PRIMARY,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
};

const djIconBadgeStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  background: 'rgba(255, 255, 255, 0.04)',
  border: `1px solid ${BRAND_BORDER}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: BRAND_TEXT_MUTED,
  fontSize: 14,
  cursor: 'pointer',
};

const nowPlayingCardStyle: React.CSSProperties = {
  marginTop: 16,
  background: 'rgba(255, 255, 255, 0.03)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 14,
  padding: '12px 16px',
};

const equalizerBarsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 2,
  height: 24,
};

const eqBarStyle: React.CSSProperties = {
  width: 3,
  background: BRAND_ACCENT,
  borderRadius: 2,
};

const pillTagStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 6,
  padding: '3px 7px',
  fontSize: 10,
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
  color: BRAND_TEXT_SECONDARY,
};

const primaryToolbarBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  background: '#ffffff',
  color: '#08090d',
  border: 'none',
  borderRadius: 8,
  padding: '7px 12px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryToolbarBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  background: 'rgba(255, 255, 255, 0.04)',
  color: BRAND_TEXT_PRIMARY,
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 8,
  padding: '7px 12px',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
};

const formContainerStyle: React.CSSProperties = {
  background: 'rgba(0, 0, 0, 0.35)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 14,
  padding: '14px 16px',
  margin: '10px 0 14px',
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  color: BRAND_TEXT_MUTED,
  letterSpacing: '0.06em',
};

const spatialInputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 4,
  background: 'rgba(0, 0, 0, 0.4)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 6,
  padding: '7px 10px',
  color: '#ffffff',
  fontSize: 12,
  outline: 'none',
};

const spatialSelectStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 4,
  background: '#12151e',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 6,
  padding: '7px 10px',
  color: '#ffffff',
  fontSize: 12,
  outline: 'none',
};

const quickPickChipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  background: 'rgba(255, 255, 255, 0.03)',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 5,
  padding: '2px 6px',
  color: BRAND_TEXT_SECONDARY,
  fontSize: 10,
  fontWeight: 500,
  cursor: 'pointer',
};

const cancelBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: BRAND_TEXT_MUTED,
  fontSize: 11,
  cursor: 'pointer',
  padding: '6px 10px',
};

const submitTrackBtnStyle: React.CSSProperties = {
  background: BRAND_ACCENT,
  color: '#08090d',
  border: 'none',
  borderRadius: 6,
  padding: '6px 14px',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
};

const filterTabBtnStyle = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
  border: `1px solid ${active ? BRAND_ACCENT : 'transparent'}`,
  borderRadius: 6,
  padding: '4px 10px',
  color: active ? '#ffffff' : BRAND_TEXT_MUTED,
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
});

const trackRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  border: `1px solid ${BRAND_BORDER}`,
  borderRadius: 10,
  padding: '8px 12px',
  transition: 'all 0.15s ease',
};

const validateTrackBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: 'rgba(16, 185, 129, 0.15)',
  border: '1px solid #10b981',
  borderRadius: 6,
  padding: '3px 7px',
  color: '#10b981',
  fontSize: 10,
  fontWeight: 700,
  cursor: 'pointer',
};

const upvoteBtnStyle = (hasVoted?: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: hasVoted ? 'rgba(226, 180, 72, 0.15)' : 'rgba(255, 255, 255, 0.04)',
  border: `1px solid ${hasVoted ? BRAND_ACCENT : BRAND_BORDER}`,
  borderRadius: 6,
  padding: '4px 8px',
  color: hasVoted ? BRAND_ACCENT : '#ffffff',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
});
