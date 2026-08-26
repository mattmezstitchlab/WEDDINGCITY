import { ProgrammeMoment } from '../../projections/worldModel';
import { momentImage } from '../../design/momentImagery';
import { Portrait } from './MirrorPrimitives';

// ---------------------------------------------------------------------------
// THE PUBLIC PROGRAMME — a story, never a second editor.
// ---------------------------------------------------------------------------
// The horizontal film and its right panel are the workspace. This vertical
// programme is the mini-site preview: it reads the very same moments, but owns
// no edit action and writes nothing. A real image attached to the moment wins;
// otherwise the product illustration is resolved at render time and is never
// persisted as wedding media.
// ---------------------------------------------------------------------------

export function MirrorTimeline({ moments }: { moments: ProgrammeMoment[] }) {
  return (
    <ol className="wc-story-programme" aria-label="Programme immersif">
      {moments.map((moment, index) => {
        const ownImage = moment.media.find((media) => media.kind === 'image');
        const image = momentImage(moment.title, ownImage?.source);

        return (
          <li className="wc-story-scene" key={moment.phaseId} data-story-moment={moment.phaseId}>
            <div className="wc-story-scene-media" aria-hidden="true">
              <img
                src={image.src}
                alt={`Illustration de ${moment.title}`}
                width={image.width}
                height={image.height}
                loading={index < 1 ? 'eager' : 'lazy'}
                decoding="async"
              />
              <span className="wc-story-scene-scrim" />
            </div>

            <article className="wc-story-scene-content">
              <div className="wc-story-scene-index">
                {String(index + 1).padStart(2, '0')} / {String(moments.length).padStart(2, '0')}
              </div>
              <div className="wc-story-scene-time">{moment.time}</div>
              <h3 className="wc-story-scene-title">{moment.title}</h3>
              {moment.subtitle && <p className="wc-story-scene-subtitle">{moment.subtitle}</p>}

              <dl className="wc-story-scene-facts">
                {moment.placeName && (
                  <div><dt>Lieu</dt><dd>{moment.placeName}</dd></div>
                )}
                {moment.vendors.length > 0 && (
                  <div><dt>Avec</dt><dd>{moment.vendors.map((vendor) => vendor.companyName).join(' · ')}</dd></div>
                )}
                {moment.songs.length > 0 && (
                  <div><dt>Bande-son</dt><dd>{moment.songs.map((song) => `${song.title} — ${song.artist}`).join(' · ')}</dd></div>
                )}
              </dl>

              {moment.persons.length > 0 && (
                <div className="wc-story-scene-people" aria-label="Personnes présentes">
                  {moment.persons.slice(0, 6).map((person) => (
                    <span key={person.personId} className="wc-story-person">
                      <Portrait name={person.name} source={person.portraitSource} dmcColor={person.dmcColor} size={30} />
                      <span>{person.name}</span>
                    </span>
                  ))}
                </div>
              )}

              {moment.notes && <p className="wc-story-scene-note">{moment.notes}</p>}
              {image.isProductAsset && (
                <p className="wc-story-scene-credit">Illustration temporaire — ajoutez un média au moment pour la remplacer.</p>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
