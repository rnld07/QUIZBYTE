import Link from 'next/link';
import type { Route } from 'next';

import { features } from '@quizbyte/shared';

import { Section, formatDateTime } from '@/components/Ui';
import { getHealthReport, listFeatureFlagOverrides } from '@/lib/queries/insights';
import { listAdminActions } from '@/lib/queries/moderation';

export const dynamic = 'force-dynamic';

const nf = new Intl.NumberFormat('de-DE');

interface Check {
  title: string;
  count: number;
  /** Ab hier ist es eine Warnung; darunter ist alles in Ordnung. */
  warnAt: number;
  hint: string;
  href?: Route;
}

/**
 * Ein Prüfpunkt.
 *
 * Grün heißt nicht "geprüft", sondern "null Treffer". Das ist ein Unterschied,
 * den die Zeile deshalb auch ausspricht: es steht immer eine Zahl da.
 */
function CheckRow({ check }: { check: Check }) {
  const level = check.count === 0 ? 'ok' : check.count >= check.warnAt * 5 ? 'bad' : 'warn';
  return (
    <div className="check">
      <span className={`check__dot ${level === 'ok' ? '' : level === 'warn' ? 'check__dot--warn' : 'check__dot--bad'}`} />
      <div className="check__body">
        <div className="check__title">
          {check.title}: <strong>{nf.format(check.count)}</strong>
        </div>
        <div className="check__hint">{check.hint}</div>
      </div>
      {check.href && check.count > 0 ? (
        <Link className="btn btn--sm btn--ghost" href={check.href}>
          Ansehen
        </Link>
      ) : null}
    </div>
  );
}

/**
 * Systemzustand.
 *
 * Keine Vollprüfung der Datenbank, sondern die Handvoll Fälle, die im Betrieb
 * tatsächlich auftreten und die man sonst erst bemerkt, wenn sich jemand
 * beschwert: eine aktive Kategorie ohne Frage, ein Bild, das nie hochgeladen
 * wurde, ein Duell, dessen Frist abgelaufen ist.
 *
 * Ein Fehler-Logging für abgebrochene Requests gibt es in QuizByte nicht –
 * dieser Punkt der Anforderung steht deshalb unten als das, was er ist: offen.
 */
export default async function SystemPage() {
  const [health, actions, flags] = await Promise.all([getHealthReport(), listAdminActions(10), listFeatureFlagOverrides()]);

  const content: Check[] = [
    {
      title: 'Veröffentlichte Fragen ohne Bild',
      count: health.questionsMissingImage,
      warnAt: 1,
      hint: 'Die App zeigt dann nur den Fragetext. Kein Fehler, aber eine Lücke.',
      href: '/questions?image=missing&status=published',
    },
    {
      title: 'Veröffentlichte Fragen ohne Audio',
      count: health.questionsMissingAudio,
      warnAt: 1,
      hint: 'Vorlesen ist für diese Fragen nicht möglich.',
      href: '/questions?audio=missing&status=published',
    },
    {
      title: 'Veröffentlichte Fragen ohne Erklärung',
      count: health.publishedWithoutExplanation,
      warnAt: 1,
      hint: 'Nach der Antwort steht dann nichts da – das ist der Teil, aus dem man lernt.',
      href: '/questions?status=published',
    },
    {
      title: 'Aktive Kategorien ohne veröffentlichte Frage',
      count: health.emptyActiveCategories,
      warnAt: 1,
      hint: 'In der App ein Feld, das sich öffnen lässt und leer ist.',
      href: '/categories',
    },
  ];

  const data: Check[] = [
    {
      title: 'Abgebrochene Quizrunden (älter als ein Tag)',
      count: health.staleSessions,
      warnAt: 5,
      hint: 'Gestartet, nie beendet. Normal in kleiner Zahl – jeder App-Wechsel mitten im Quiz erzeugt eine.',
    },
    {
      title: 'Abgelaufene, noch offene Duelle',
      count: health.expiredOpenDuels,
      warnAt: 3,
      hint: 'Werden beim nächsten Öffnen des Chats abgerechnet. Bleiben sie liegen, hat niemand mehr hineingesehen.',
    },
    {
      title: 'Konten ohne Fortschrittszeile',
      count: health.profilesWithoutProgress,
      warnAt: 1,
      hint: 'Sollte nicht vorkommen – die Zeile legt ein Trigger bei der Registrierung an.',
    },
    {
      title: 'Offene Meldungen',
      count: health.openUserReports + health.openQuestionReports,
      warnAt: 1,
      hint: `${nf.format(health.openUserReports)} Nutzer, ${nf.format(health.openQuestionReports)} Fragen.`,
      href: '/moderation',
    },
  ];

  const changedFlags = (Object.keys(features) as (keyof typeof features)[]).filter((key) => {
    const override = flags.get(key);
    return override !== undefined && override.enabled !== features[key];
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1>System</h1>
          <p>Stand der Datenbank und was in den Daten auffällt.</p>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi kpi--muted">
          <span className="kpi__label">Admin-Version</span>
          <span className="kpi__value" style={{ fontSize: 20 }}>
            {process.env.npm_package_version ?? '0.1.0'}
          </span>
          <span className="kpi__foot">Next.js · Node {process.version}</span>
        </div>
        <div className="kpi kpi--info">
          <span className="kpi__label">Letzte Migration</span>
          <span className="kpi__value" style={{ fontSize: 20 }}>
            {health.lastMigration?.version ?? 'unbekannt'}
          </span>
          <span className="kpi__foot">{health.lastMigration?.name ?? 'Migrationstabelle nicht lesbar'}</span>
        </div>
        <div className="kpi kpi--muted">
          <span className="kpi__label">Migrationen gesamt</span>
          <span className="kpi__value">{health.migrationCount}</span>
          <span className="kpi__foot">eingespielt</span>
        </div>
        <div className={`kpi ${changedFlags.length > 0 ? 'kpi--warning' : 'kpi--muted'}`}>
          <span className="kpi__label">Abweichende Schalter</span>
          <span className="kpi__value">{changedFlags.length}</span>
          <span className="kpi__foot">{changedFlags.length > 0 ? changedFlags.join(', ') : 'alles wie im Code'}</span>
        </div>
      </div>

      <Section title="Inhalte" hint="Lücken, die man in der App sieht.">
        <div className="card">
          {content.map((check) => (
            <CheckRow key={check.title} check={check} />
          ))}
        </div>
      </Section>

      <Section title="Daten" hint="Zustände, die auf etwas hindeuten.">
        <div className="card">
          {data.map((check) => (
            <CheckRow key={check.title} check={check} />
          ))}
        </div>
      </Section>

      <Section title="Letzte Eingriffe" hint="Kurzfassung – vollständig in der Moderation.">
        <div className="card card--flush table-wrap">
          <table>
            <thead>
              <tr>
                <th>Zeitpunkt</th>
                <th>Admin</th>
                <th>Aktion</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {actions.length === 0 ? (
                <tr>
                  <td className="cell--muted" colSpan={4}>
                    Noch nichts.
                  </td>
                </tr>
              ) : (
                actions.map((action) => (
                  <tr key={action.id}>
                    <td className="cell--muted">{formatDateTime(action.createdAt)}</td>
                    <td>{action.adminUsername ? `@${action.adminUsername}` : '–'}</td>
                    <td className="cell--muted">{action.kind}</td>
                    <td className="cell--muted">{action.details || '–'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Was hier fehlt">
        <div className="card">
          <p>
            Ein Log fehlgeschlagener Requests gibt es nicht – QuizByte schreibt keines. Die App meldet Fehler dem
            Benutzer und verwirft sie danach, und die Datenbank protokolliert nur Admin-Eingriffe.
          </p>
          <p className="hint">
            Wer das braucht, führt es am ehesten in Supabase selbst ein (Log-Drains) statt in einer eigenen Tabelle –
            eine Fehlertabelle, in die der Client schreibt, ist ein Schreibrecht, das kein Client haben sollte.
          </p>
        </div>
      </Section>
    </>
  );
}
