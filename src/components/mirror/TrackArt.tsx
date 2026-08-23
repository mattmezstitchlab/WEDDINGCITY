import { useEffect, useState } from 'react';
import { typography, radius } from '../../design/tokens';
import { M } from './MirrorPrimitives';
import { subscribePlayer, togglePlay, getPlayerState, PlayerState } from '../../game/musicPlayer';

// ---------------------------------------------------------------------------
// TRACK ARTWORK + PLAY — one editorial component, used by 01 and 05.
// ---------------------------------------------------------------------------
// Both the Timeline and the Music section render this, so there is exactly one
// player and one visual language for a track. The Play control is drawn ON the
// artwork and stays small: a mark on a photograph, not a streaming widget.
//
// HONESTY RULES
//   · artwork appears only when a real image MediaAsset is attached;
//     otherwise the tile is typographic (initial of the title).
//   · the Play control is rendered ONLY when a real audio MediaAsset exists.
//     No source ⇒ no button, and a discreet note instead. We never show a
//     control that cannot actually play.
// ---------------------------------------------------------------------------

export interface TrackArtProps {
  songId: string;
  title: string;
  artist: string;
  coverSource: string | null;
  audioSource: string | null;
  size?: number;
}

function usePlayer(): PlayerState {
  const [state, setState] = useState<PlayerState>(getPlayerState());
  useEffect(() => subscribePlayer(setState), []);
  return state;
}

export function TrackArt({
  songId, title, artist, coverSource, audioSource, size = 64,
}: TrackArtProps) {
  const player = usePlayer();
  const active = player.songId === songId;
  const playing = active && player.status === 'playing';
  const loading = active && player.status === 'loading';
  const failed = active && player.status === 'error';

  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
  }, []);

  // An enriched cover is hosted by the provider. If it cannot be fetched
  // (offline, dead URL), we fall back to the typographic tile rather than
  // leaving a broken image: the Mirror keeps working without the network.
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [coverSource]);
  const cover = broken ? null : coverSource;

  return (
    <div
      style={{
        position: 'relative', width: size, height: size, flex: '0 0 auto',
        borderRadius: size >= 80 ? radius.md : radius.sm, overflow: 'hidden',
        background: cover ? 'transparent' : 'rgba(16,18,24,0.045)',
        boxShadow: `inset 0 0 0 1px ${M.line}`,
      }}
    >
      {cover ? (
        <img
          src={cover}
          alt={`Pochette de ${title}${artist ? `, ${artist}` : ''}`}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          style={{
            width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            transition: reduced ? 'none' : 'opacity 420ms ease',
          }}
        />
      ) : (
        // Typographic fallback — never a fabricated cover image.
        <span
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: Math.round(size * 0.34),
            fontWeight: typography.weight.semibold,
            letterSpacing: '-0.03em',
            color: M.textMuted,
          }}
        >
          {title.trim().charAt(0).toUpperCase()}
        </span>
      )}

      {/* The control exists only if the track can genuinely be heard. */}
      {audioSource && (
        <button
          onClick={(e) => { e.stopPropagation(); void togglePlay(songId, audioSource); }}
          aria-label={playing ? `Mettre en pause ${title}` : `Écouter ${title} de ${artist}`}
          title={failed ? (player.error ?? 'Lecture impossible') : playing ? 'Pause' : 'Écouter'}
          style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer', padding: 0,
            background: cover
              ? (playing ? 'rgba(12,10,8,0.30)' : 'rgba(12,10,8,0.16)')
              : 'transparent',
            transition: reduced ? 'none' : 'background 240ms ease',
          }}
        >
          <span
            style={{
              width: Math.round(size * 0.42), height: Math.round(size * 0.42),
              borderRadius: 999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: cover ? 'rgba(255,253,250,0.92)' : M.surface,
              boxShadow: cover ? 'none' : `inset 0 0 0 1px ${M.lineStrong}`,
              color: M.textPrimary,
              fontSize: Math.round(size * 0.2), lineHeight: 1,
            }}
          >
            {loading ? '…' : playing ? '❚❚' : '▶'}
          </span>
        </button>
      )}
    </div>
  );
}

/** Discreet note when a track simply cannot be listened to. Honest, not loud. */
export function NoAudioNote() {
  return (
    <span style={{ fontSize: typography.editorial.micro, color: M.textMuted, letterSpacing: '0.08em' }}>
      écoute indisponible
    </span>
  );
}
