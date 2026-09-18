import Link from 'next/link';

import {
  AVATAR_ACCENTS,
  AVATAR_ACCESSORIES,
  AVATAR_BREEDS,
  AVATAR_FURS,
  AVATAR_GLASSES,
  AVATAR_SPECIES,
  DAILY_TASK_DEFINITIONS,
  MEDALS,
  PROFILE_FRAMES,
  WHEEL_SEGMENTS,
  totalXpForLevel,
  xpConfig,
  xpRequiredForLevel,
} from '@quizbyte/shared';

import { Section } from '@/components/Ui';

export const dynamic = 'force-dynamic';

const nf = new Intl.NumberFormat('de-DE');

/** Die Levelgrenzen, so weit sie jemand erreichen kann. */
const LEVEL_MARKS = [2, 5, 10, 25, 50, 75, 100];

/**
 * Wie viele Auswahlmöglichkeiten der Avatar je Teil hat.
 *
 * Die Rassen hängen an der Art – Katze und Hund haben eigene Listen –, deshalb
 * werden sie zusammengezählt statt wie die übrigen einfach abgezählt.
 */
const AVATAR_PARTS = [
  { label: 'Arten', count: AVATAR_SPECIES.length },
  { label: 'Rassen', count: Object.values(AVATAR_BREEDS).reduce((sum, list) => sum + list.length, 0) },
  { label: 'Fellfarben', count: AVATAR_FURS.length },
  { label: 'Brillen', count: AVATAR_GLASSES.length },
  { label: 'Accessoires', count: AVATAR_ACCESSORIES.length },
  { label: 'Akzente', count: AVATAR_ACCENTS.length },
];

/**
 * Die Gamification-Übersicht.
 *
 * Bewusst nur zum Lesen. Jede Zahl auf dieser Seite steht an zwei Stellen: in
 * `packages/shared` für die App und in SQL für die Trigger, die XP tatsächlich
 * vergeben. Ein Eingabefeld hier würde nur eine der beiden ändern – und damit
 * genau den Fall herstellen, den CLAUDE.md verbietet: XP, die der Client
 * anders rechnet als der Server.
 *
 * Wer eine Zahl ändern will, ändert beide Stellen und spielt eine Migration
 * ein. Diese Seite sagt, welche das sind.
 */
export default function GamificationPage() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Gamification</h1>
          <p>XP, Level, Rahmen, Medaillen und Avatare – so, wie sie gerade eingestellt sind.</p>
          <p className="page-header__meta">
            Nur zum Nachsehen. Die Werte stehen im Code <em>und</em> in SQL; sie hier einzeln editierbar zu machen,
            hieße, sie auseinanderlaufen zu lassen.
          </p>
        </div>
      </div>

      <Section title="XP" hint="Was eine Antwort einbringt.">
        <div className="grid grid--3">
          <div className="card">
            <h2>Antworten</h2>
            <div className="table-wrap">
              <table>
                <tbody>
                  <tr>
                    <td>Richtig · leicht</td>
                    <td className="num cell--strong">{xpConfig.CORRECT_ANSWER_XP.easy}</td>
                  </tr>
                  <tr>
                    <td>Richtig · mittel</td>
                    <td className="num cell--strong">{xpConfig.CORRECT_ANSWER_XP.medium}</td>
                  </tr>
                  <tr>
                    <td>Richtig · schwer</td>
                    <td className="num cell--strong">{xpConfig.CORRECT_ANSWER_XP.hard}</td>
                  </tr>
                  <tr>
                    <td>Falsch</td>
                    <td className="num cell--strong">{xpConfig.WRONG_ANSWER_XP}</td>
                  </tr>
                  <tr>
                    <td>Quiz beendet</td>
                    <td className="num cell--strong">{xpConfig.SESSION_COMPLETION_XP}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="hint">
              Gespiegelt in <code>xp_for_answer()</code>. Beide Stellen müssen übereinstimmen.
            </p>
          </div>

          <div className="card">
            <h2>Multiplikatoren</h2>
            <div className="table-wrap">
              <table>
                <tbody>
                  <tr>
                    <td>Daily Quiz</td>
                    <td className="num cell--strong">×{xpConfig.DAILY_XP_MULTIPLIER}</td>
                  </tr>
                  <tr>
                    <td>Duell</td>
                    <td className="num cell--strong">×{xpConfig.DUEL_XP_MULTIPLIER}</td>
                  </tr>
                  <tr>
                    <td>Duellsieg</td>
                    <td className="num cell--strong">+{xpConfig.DUEL_WIN_XP}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="hint">
              Der Daily-Faktor zahlt nur beim ersten Durchlauf des Tages. Eine Frage, die schon einmal richtig
              war, gibt gar nichts mehr.
            </p>
          </div>

          <div className="card">
            <h2>Levelkurve</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Level</th>
                    <th className="num">braucht</th>
                    <th className="num">gesamt ab</th>
                  </tr>
                </thead>
                <tbody>
                  {LEVEL_MARKS.map((level) => (
                    <tr key={level}>
                      <td>{level}</td>
                      <td className="num">{nf.format(xpRequiredForLevel(level - 1))}</td>
                      <td className="num cell--muted">{nf.format(totalXpForLevel(level))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint">
              Basis {xpConfig.LEVEL_BASE_XP}, je Level {xpConfig.LEVEL_STEP_XP} mehr. Gespiegelt in{' '}
              <code>level_for_xp()</code>.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Profilrahmen" hint="Werden vom Level freigeschaltet und von Hand getragen.">
        <div className="card card--flush table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rahmen</th>
                <th className="num">ab Level</th>
                <th>Stil</th>
                <th>Farben</th>
                <th>Emblem</th>
              </tr>
            </thead>
            <tbody>
              {PROFILE_FRAMES.map((frame) => (
                <tr key={frame.id}>
                  <td className="cell--strong">
                    {frame.name}
                    <span className="cell--sub">{frame.id}</span>
                  </td>
                  <td className="num">{frame.requiredLevel}</td>
                  <td className="cell--muted">{frame.style}</td>
                  <td>
                    {frame.colors.map((color, index) => (
                      <span
                        key={`${frame.id}-${index}`}
                        className="dot"
                        style={{ background: color, marginRight: 4 }}
                        title={color}
                      />
                    ))}
                  </td>
                  <td className="cell--muted">{frame.badge ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ marginTop: 10 }}>
          Die Freischaltgrenzen stehen zusätzlich in <code>frame_required_level()</code> – die Datenbank prüft sie
          beim Anlegen, nicht die App.
        </p>
      </Section>

      <Section title="Medaillen" hint="Vier Stufen je Medaille, aus Zahlen, die der Fortschritt ohnehin führt.">
        <div className="card card--flush table-wrap">
          <table>
            <thead>
              <tr>
                <th>Medaille</th>
                <th>Misst</th>
                <th className="num">Bronze</th>
                <th className="num">Silber</th>
                <th className="num">Gold</th>
                <th className="num">Platin</th>
              </tr>
            </thead>
            <tbody>
              {MEDALS.map((medal) => (
                <tr key={medal.id}>
                  <td className="cell--strong">
                    {medal.name}
                    <span className="cell--sub">{medal.describe(medal.tiers[0])}</span>
                  </td>
                  <td className="cell--muted">{medal.metric}</td>
                  {medal.tiers.map((target, index) => (
                    <td key={`${medal.id}-${index}`} className="num">
                      {nf.format(target)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Tagesaufgaben & Glücksrad" hint="Was der Tag zu holen gibt.">
        <div className="grid grid--3">
          <div className="card">
            <h2>Tagesaufgaben</h2>
            <div className="table-wrap">
              <table>
                <tbody>
                  {DAILY_TASK_DEFINITIONS.map((task) => (
                    <tr key={task.key}>
                      <td>{task.describe(task.target)}</td>
                      <td className="num cell--strong">+{task.xp} XP</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2>Glücksrad</h2>
            <p className="hint">Eine Drehung nach einem fehlerfreien Daily Quiz.</p>
            <div className="table-wrap">
              <table>
                <tbody>
                  {WHEEL_SEGMENTS.map((segment, index) => (
                    <tr key={`${segment.xp}-${index}`}>
                      <td>Feld {index + 1}</td>
                      <td className="num cell--strong">{segment.xp === 0 ? 'nichts' : `+${segment.xp} XP`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2>Avatare</h2>
            <p className="hint">
              Profilbilder werden nie hochgeladen – der Avatar wird aus <code>profiles.avatar_config</code> gezeichnet.
            </p>
<div className="detail-grid" style={{ marginTop: 12 }}>
              {AVATAR_PARTS.map((part) => (
                <div key={part.label}>
                  <span className="detail__label">{part.label}</span>
                  <span className="detail__value">{part.count}</span>
                </div>
              ))}
            </div>
            <p className="hint" style={{ marginTop: 12 }}>
              Der Katalog steht in <code>packages/shared/src/domain/profile/avatar.ts</code>. Die Datenbank prüft die
              Ids nicht – gelesen wird immer über <code>normalizeAvatarConfig()</code>.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Was sich hier ändern lässt">
        <div className="card">
          <p>
            Nichts auf dieser Seite ist ein Eingabefeld, und das ist Absicht. Jede Zahl hier steht an zwei Orten:
            im Code für die App und in SQL für die Trigger, die die XP tatsächlich vergeben. Ein Formular würde nur
            einen der beiden ändern.
          </p>
          <ul className="issue-list">
            <li>
              XP-Werte: <code>packages/shared/src/config/xp.ts</code> und <code>xp_for_answer()</code>
            </li>
            <li>
              Levelkurve: derselbe Config-Eintrag und <code>level_for_xp()</code>
            </li>
            <li>
              Rahmen: <code>domain/profile/frames.ts</code> und <code>frame_required_level()</code>
            </li>
            <li>
              Medaillen und Avatare: nur <code>packages/shared</code> – sie werden rein in der App ausgewertet
            </li>
          </ul>
          <p className="hint">
            Was sich ohne Release umlegen lässt, sind die{' '}
            <Link href="/flags">Feature Flags</Link> – dafür gibt es sie.
          </p>
        </div>
      </Section>
    </>
  );
}
