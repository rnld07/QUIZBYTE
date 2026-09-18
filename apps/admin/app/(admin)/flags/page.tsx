import { features } from '@quizbyte/shared';

import { FlagToggle } from '@/components/FlagToggle';
import { formatDateTime } from '@/components/Ui';
import { listFeatureFlagOverrides } from '@/lib/queries/insights';

export const dynamic = 'force-dynamic';

/**
 * Was jeder Schalter bedeutet.
 *
 * Bewusst hier und nicht in `features.ts`: dort steht der technische Kommentar
 * für die, die den Code lesen, hier der Satz für die, die auf den Knopf
 * drücken.
 */
const DESCRIPTIONS: Record<string, string> = {
  pro: 'Pro-Abo: kostenpflichtige Kategorien, Bezahlschranke, „Pro verwalten".',
  friends: 'Freundetab, Suche nach Benutzernamen, Freundesprofile.',
  duels: 'Duelle gegen Freunde. Hängt an „friends" – ohne Freunde kein Gegner.',
  community: 'Öffentliche Gruppen, Feeds, Kommentare. Nicht gebaut.',
  dailyQuiz: 'Das Tagesquiz mit Glücksrad und Tagesaufgaben.',
  examMode: 'Prüfungssimulation mit Zeitlimit. Nicht gebaut.',
  weaknessTraining: '„Schwächen trainieren" – falsch beantwortete Fragen wiederholen.',
  questionSharing: 'Eine Frage im Chat an einen Freund schicken.',
};

/**
 * Die Feature-Schalter.
 *
 * Es gab schon welche – in `packages/shared/src/config/features.ts`. Das ist
 * der richtige Ort für die Voreinstellung: die App muss auch ohne Netz wissen,
 * was es gibt. Was fehlte, war die Möglichkeit, einen davon umzulegen, ohne ein
 * neues Release zu bauen.
 *
 * Deshalb kein zweites System, sondern eine Ausnahme vom ersten: liegt in der
 * Datenbank ein Eintrag, gilt er; liegt keiner, gilt der Code.
 */
export default async function FlagsPage() {
  const overrides = await listFeatureFlagOverrides();
  const keys = Object.keys(features) as (keyof typeof features)[];

  const changed = keys.filter((key) => {
    const override = overrides.get(key);
    return override !== undefined && override.enabled !== features[key];
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Feature Flags</h1>
          <p>Was in der App an ist – und was davon hier abweicht.</p>
          <p className="page-header__meta">
            Voreinstellung aus <code>packages/shared/src/config/features.ts</code>. Ein Eintrag hier überschreibt sie
            serverseitig; „Standard“ nimmt die Überschreibung wieder zurück.
          </p>
        </div>
      </div>

      {changed.length > 0 ? (
        <div className="success">
          {changed.length === 1
            ? `Ein Schalter weicht vom Code ab: ${changed[0]}.`
            : `${changed.length} Schalter weichen vom Code ab: ${changed.join(', ')}.`}
        </div>
      ) : null}

      <div className="card">
        {keys.map((key) => {
          const override = overrides.get(key);
          return (
            <div key={key} className="flag-row">
              <div className="flag-row__text">
                <div className="flag-row__name">{key}</div>
                <div className="flag-row__desc">{DESCRIPTIONS[key] ?? 'Ohne Beschreibung.'}</div>
                <div className="flag-row__desc">
                  Im Code: {features[key] ? 'an' : 'aus'}
                  {override ? (
                    <>
                      {' · '}überschrieben {formatDateTime(override.updatedAt)}
                      {override.updatedByUsername ? ` von @${override.updatedByUsername}` : ''}
                      {override.note ? ` – „${override.note}"` : ''}
                    </>
                  ) : null}
                </div>
              </div>
              <FlagToggle flagKey={key} fallback={features[key]} override={override ? override.enabled : null} />
            </div>
          );
        })}
      </div>

      <p className="hint" style={{ marginTop: 14 }}>
        Die App liest die Überschreibungen über <code>get_feature_flags()</code>. Ein Schalter, der ein bereits
        gestartetes Quiz betrifft, wirkt erst beim nächsten Start – laufende Runden werden nicht abgebrochen.
      </p>
    </>
  );
}
