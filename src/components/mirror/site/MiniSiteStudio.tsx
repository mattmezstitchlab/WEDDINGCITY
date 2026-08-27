import { useEffect, useMemo, useRef, useState } from 'react';
import { weddingStore } from '../../../game/weddingStore';
import { projectWorldModel } from '../../../projections/worldModel';
import { miniSiteNavigation, type MiniSiteNavAction } from '../../../design/momentImagery';
import { eventType } from '../../../design/eventTypes';
import { MirrorHero } from '../MirrorHero';
import { MirrorTimeline } from '../MirrorTimeline';
import './mini-site-studio.css';

// ---------------------------------------------------------------------------
// MINI-SITE STUDIO — preview the public site inside a real device frame.
// ---------------------------------------------------------------------------
// The working desk is the horizontal timeline. The mini-site is a separate
// studio opened from the brand menu: same data (projectWorldModel), three
// device formats, public navigation ONLY inside the device. Nothing here is
// a second editor or a second store.
// ---------------------------------------------------------------------------

type DeviceId = 'desktop' | 'tablet' | 'phone';

const DEVICES: { id: DeviceId; label: string; width: number; height: number }[] = [
  { id: 'desktop', label: 'Ordinateur', width: 1280, height: 800 },
  { id: 'tablet', label: 'iPad', width: 834, height: 1112 },
  { id: 'phone', label: 'iPhone', width: 390, height: 844 },
];

export function MiniSiteStudio({ onClose }: { onClose: () => void }) {
  const store = weddingStore;
  const model = useMemo(() => projectWorldModel(), [store.version]);
  const { hero, programme } = model;
  const [device, setDevice] = useState<DeviceId>('desktop');
  const [section, setSection] = useState<MiniSiteNavAction>('programme');
  const frameRef = useRef<HTMLDivElement>(null);
  const eventKind = store.currentProject.eventTypeId;
  const schema = eventType(eventKind);
  const nav = miniSiteNavigation(eventKind);
  const deviceSpec = DEVICES.find((item) => item.id === device) ?? DEVICES[0];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  useEffect(() => {
    // Changing device or section resets the scroll inside the frame so the
    // visitor always lands at the top of the chosen public surface.
    if (frameRef.current) frameRef.current.scrollTop = 0;
  }, [device, section]);

  const goSection = (action: MiniSiteNavAction) => {
    setSection(action);
    requestAnimationFrame(() => {
      const target = frameRef.current?.querySelector(`[data-minisite-section="${action}"]`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="wc-minisite-studio" role="dialog" aria-modal="true" aria-label="Studio mini-site" data-minisite="studio">
      <header className="wc-minisite-bar">
        <div className="wc-minisite-bar-copy">
          <span>Studio mini-site</span>
          <strong>{hero.coupleNames || hero.title || schema.label}</strong>
        </div>
        <div className="wc-minisite-devices" role="group" aria-label="Format d’aperçu">
          {DEVICES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={device === item.id ? 'is-active' : ''}
              onClick={() => setDevice(item.id)}
              data-minisite-device={item.id}
              aria-pressed={device === item.id}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button type="button" className="wc-minisite-close" onClick={onClose} data-minisite="close">
          Fermer
        </button>
      </header>

      <div className="wc-minisite-stage" data-device={device}>
        <div
          className={`wc-minisite-device is-${device}`}
          style={{ width: Math.min(deviceSpec.width, typeof window !== 'undefined' ? window.innerWidth - 48 : deviceSpec.width) }}
          data-minisite-frame={device}
        >
          <div className="wc-minisite-bezel" aria-hidden>
            {device !== 'desktop' && <span className="wc-minisite-notch" />}
            {device === 'desktop' && <span className="wc-minisite-cam" />}
          </div>
          <div
            ref={frameRef}
            className="wc-minisite-screen"
            style={{ height: Math.min(deviceSpec.height, typeof window !== 'undefined' ? window.innerHeight - 160 : deviceSpec.height) }}
            data-minisite="screen"
          >
            <nav className="wc-minisite-public-nav" aria-label="Navigation publique" data-minisite="public-nav">
              <span className="wc-minisite-public-name">{hero.coupleNames || hero.title}</span>
              <div>
                {nav.map((entry) => (
                  <button
                    key={`${entry.label}-${entry.action}`}
                    type="button"
                    className={section === entry.action ? 'is-active' : ''}
                    onClick={() => goSection(entry.action)}
                    data-minisite-nav={entry.action}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
            </nav>

            <div data-minisite-section="programme">
              <MirrorHero hero={hero} />
              {programme.hasData ? (
                <section id="mirror-programme" aria-label="Programme immersif">
                  <MirrorTimeline moments={programme.moments} />
                </section>
              ) : (
                <section className="wc-minisite-empty" aria-label="Programme">
                  <h2>Le programme n’est pas encore composé</h2>
                  <p>Les moments apparaîtront ici depuis la timeline du Jour J. Rien n’est inventé pour remplir cette page.</p>
                </section>
              )}
            </div>

            <PublicActionSection action="rsvp" active={nav.some((entry) => entry.action === 'rsvp')} title="RSVP" body="La collecte publique des réponses n’est pas encore activée. Les réponses resteront saisies dans le bureau tant qu’aucune publication n’existe." />
            <PublicActionSection action="ticketing" active={nav.some((entry) => entry.action === 'ticketing')} title="Billetterie" body="La billetterie publique n’est pas encore activée. Aucune place n’est vendue ni réservée depuis cet aperçu." />
            <PublicActionSection action="artists" active={nav.some((entry) => entry.action === 'artists')} title="Artistes" body={artistsCopy(model)} />
            <PublicActionSection action="participants" active={nav.some((entry) => entry.action === 'participants')} title="Participants" body={peopleCopy(model, 'participants')} />
            <PublicActionSection action="speakers" active={nav.some((entry) => entry.action === 'speakers')} title="Intervenants" body={peopleCopy(model, 'intervenants')} />
            <PublicActionSection action="travelers" active={nav.some((entry) => entry.action === 'travelers')} title="Voyageurs" body={peopleCopy(model, 'voyageurs')} />
            <PublicActionSection
              action="infos"
              active
              title="Infos pratiques"
              body={[
                hero.formattedDate ? `Date : ${hero.formattedDate}` : 'Date à confirmer',
                hero.locationName ? `Lieu : ${hero.locationName}` : 'Lieu à confirmer',
                'Les informations pratiques affichées ici sont celles du projet. Aucune donnée publique n’est simulée.',
              ].join('\n')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PublicActionSection({
  action, active, title, body,
}: {
  action: MiniSiteNavAction; active: boolean; title: string; body: string;
}) {
  if (!active) return null;
  return (
    <section className="wc-minisite-panel" data-minisite-section={action} aria-label={title}>
      <span>Public</span>
      <h2>{title}</h2>
      {body.split('\n').map((line) => <p key={line}>{line}</p>)}
    </section>
  );
}

function peopleCopy(model: ReturnType<typeof projectWorldModel>, word: string): string {
  const count = model.guests.counts.total;
  if (count === 0) {
    return `Aucun ${word} n’est encore rattaché à cet événement. Cette liste se remplit depuis le bureau, jamais par invention.`;
  }
  return `${count} ${word} connus dans le projet. L’aperçu public ne duplique pas les fiches : il lit les mêmes données que le bureau.`;
}

function artistsCopy(model: ReturnType<typeof projectWorldModel>): string {
  const artists = model.vendors.vendors.filter((vendor) => /artiste|music|dj|groupe|compagnie|danse|spectacle/i.test(`${vendor.category} ${vendor.companyName}`));
  if (artists.length === 0) {
    return 'Aucun artiste n’est encore déclaré sur cet événement. Les fiches artistes se créent dans le bureau, moment par moment.';
  }
  return artists.map((artist) => artist.companyName).join(' · ');
}
