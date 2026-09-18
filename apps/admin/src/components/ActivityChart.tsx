import type { ActivityDay } from '@/lib/queries/dashboard';

interface ActivityChartProps {
  days: readonly ActivityDay[];
  /** Was die farbige Säule zeigt; der Rest wird grau dahintergelegt. */
  metric: 'sessions' | 'answers' | 'activeUsers' | 'newUsers';
}

const LABELS: Record<ActivityChartProps['metric'], string> = {
  sessions: 'Gestartete Quizze',
  answers: 'Beantwortete Fragen',
  activeUsers: 'Aktive Nutzer',
  newUsers: 'Neue Nutzer',
};

const nf = new Intl.NumberFormat('de-DE');

/**
 * Die Aktivität der letzten Tage als Säulen.
 *
 * Selbst gezeichnet, ohne Diagrammbibliothek: es sind Rechtecke auf einer
 * Grundlinie, und eine Abhängigkeit dafür wäre mehr Code im Bundle als die
 * dreißig Zeilen hier.
 *
 * Eine Beschriftung je Säule wäre bei dreißig Tagen ein grauer Streifen, also
 * steht nur jeder dritte Tag darunter – und jede Säule trägt ihren Wert als
 * Titel, für den Fall, dass es doch genau interessiert.
 */
export function ActivityChart({ days, metric }: ActivityChartProps) {
  const peak = Math.max(1, ...days.map((day) => day[metric]));
  const step = days.length > 14 ? 3 : 1;

  return (
    <>
      <div className="chart" role="img" aria-label={`${LABELS[metric]} der letzten ${days.length} Tage`}>
        {days.map((day, index) => {
          const value = day[metric];
          const date = new Date(`${day.day}T00:00:00`);
          return (
            <div
              key={day.day}
              className="chart__col"
              title={`${date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}: ${nf.format(value)}`}
            >
              <div className="chart__stack">
                <div className="chart__bar" style={{ height: `${Math.max(2, (value / peak) * 100)}%` }} />
              </div>
              <span className="chart__label">
                {index % step === 0 ? date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) : ' '}
              </span>
            </div>
          );
        })}
      </div>

      <div className="chart__legend">
        <span className="chart__key">
          <span className="chart__swatch" />
          {LABELS[metric]}
        </span>
        <span>Spitze: {nf.format(peak)}</span>
        <span>Summe: {nf.format(days.reduce((sum, day) => sum + day[metric], 0))}</span>
      </div>
    </>
  );
}
