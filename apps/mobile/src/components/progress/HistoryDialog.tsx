import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';

import type { DayHistory } from '@/services/api/historyApi';
import { FixedTheme, makeStyles, radius, spacing, useGradients, useThemeColors } from '@/theme';

import { IconButton, Skeleton, Text } from '../ui';

/** Which figure of a day the chart is drawing. */
export type HistoryMetric =
  | 'answered'
  | 'correct'
  | 'wrong'
  | 'sessions'
  | 'perfect'
  | 'duels'
  | 'duelsWon'
  | 'duelsDrawn'
  | 'duelsLost';

/**
 * One part of a stacked bar.
 *
 * For a figure whose parts are worth more than its total: three duels on a day
 * says less than two won and one lost.
 */
export interface HistoryPart {
  metric: HistoryMetric;
  color: string;
  label: string;
}

/**
 * How a figure is drawn.
 *
 * `bars` ist der Normalfall. `calendar` gehört zur Streak: dort ist die einzige
 * Frage, ob ein Tag stattgefunden hat – eine Säule der Höhe eins neben einer der
 * Höhe zwölf würde etwas über Menge sagen, was eine Streak nicht interessiert.
 */
export type HistoryShape = 'bars' | 'calendar';

interface HistoryDialogProps {
  visible: boolean;
  title: string;
  /** The figure as it stands today, shown above the chart. */
  value: string;
  metric: HistoryMetric;
  shape?: HistoryShape;
  /**
   * The day's whole, drawn in grey behind the bar.
   *
   * "Sieben richtig" means something different on a day with eight questions
   * than on one with thirty, and the grey column is what says which.
   */
  against?: HistoryMetric;
  /**
   * Splits each bar into parts instead of drawing it in one colour.
   *
   * The parts have to add up to `metric` – they are drawn as shares of the
   * day's own bar, and a part that belongs to no total would make the chart
   * lie about the scale.
   */
  parts?: readonly HistoryPart[];
  days: readonly DayHistory[];
  /**
   * Der Zeitraum, den die Punkte abdecken – `null` für "Gesamt".
   *
   * Steuert nur die Beschriftung: wie fein gebündelt wird, entscheidet die
   * Datenbank, und woran man ablesen kann, ob eine Säule ein Tag, eine Woche
   * oder ein Monat ist, steht darunter.
   */
  period?: number | null;
  /**
   * Die einzelnen gespielten Tage – nur für die Kalenderform.
   *
   * Über einem Monat bündelt die Datenbank nach Wochen und Monaten, und aus
   * "in dieser Woche gespielt" lässt sich kein Kalender bauen. Diese Menge
   * kommt deshalb aus einer eigenen Abfrage.
   */
  playedDays?: ReadonlySet<string>;
  loading: boolean;
  /** Colours the bars – the same tone the tile carries. */
  tone: string;
  onClose: () => void;
}

/** Height of the tallest bar. Everything else is a share of it. */
const CHART_HEIGHT = 120;

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/**
 * Wie ein Abschnitt heißt – für Vorlesehilfen und die Eckbeschriftungen.
 *
 * Unter den Säulen steht das nicht mehr: bei dreißig Spalten ist jede Spalte
 * zehn Punkte breit, und ein Datum wie "01.02." wurde darin zu "1. 0 2"
 * zerlegt. Jetzt stehen nur noch Anfang und Ende unter dem Diagramm.
 */
function bucketLabel(day: string, period: number | null): string {
  const date = new Date(`${day}T00:00:00`);
  if (period !== null && period <= 7) return WEEKDAYS[date.getDay()] ?? '';
  if (period !== null && period <= 190)
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  return date.toLocaleDateString('de-DE', { month: 'long', year: '2-digit' });
}

/**
 * Was oben im Fenster steht.
 *
 * Die Körnung steht nur bei den Säulen dabei: der Kalender zeigt immer einzelne
 * Tage, und 'JE WOCHE' wäre dort schlicht falsch.
 */
function periodTitle(period: number | null, shape: HistoryShape): string {
  if (period === null) return 'LETZTES JAHR';
  if (period === 7) return 'LETZTE 7 TAGE';
  if (period <= 31) return `LETZTE ${period} TAGE`;
  if (period <= 190) return shape === 'calendar' ? 'LETZTE 6 MONATE' : 'LETZTE 6 MONATE · JE WOCHE';
  return shape === 'calendar' ? 'LETZTES JAHR' : 'LETZTES JAHR · JE MONAT';
}

/**
 * One figure over the last seven days.
 *
 * The same window for every tile: what changes is the column it reads and the
 * colour it draws in. Six dialogs that differed only in their numbers would be
 * six places to fix the next time a chart needs a label.
 *
 * Bars rather than a line – the values are counts of things that happened on a
 * day, and a line between them would draw a Tuesday that never existed.
 */
function HistoryDialogBody({
  visible,
  title,
  value,
  metric,
  shape = 'bars',
  against,
  parts,
  days,
  period = 7,
  playedDays,
  loading,
  tone,
  onClose,
}: HistoryDialogProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const gradients = useGradients();
  /*
    Welche Säule gerade unter dem Finger liegt, und wie breit das Diagramm ist.

    Die Breite muss gemessen werden: die Säulen teilen sich den Platz über
    `flex`, und aus welchem Anteil ein Fingerabdruck stammt, lässt sich ohne
    die Gesamtbreite nicht sagen.
  */
  const [touched, setTouched] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  /*
    Wo das Diagramm auf dem Bildschirm beginnt.

    `locationX` wäre einfacher, taugt hier aber nicht: der Wert ist relativ zu
    dem Element, das die Berührung tatsächlich getroffen hat – und das ist eine
    der Säulen, nicht die Fläche darum. Innerhalb einer zehn Punkte breiten
    Säule kommt dabei immer eine kleine Zahl heraus, und die zeigte auf die
    Säule ganz links. `pageX` ist dagegen unabhängig davon, wer getroffen wurde.
  */
  const chartRef = useRef<View>(null);
  const chartPageX = useRef(0);

  if (!visible) return null;

  const values = days.map((day) => day[metric]);
  const total = values.reduce((sum, entry) => sum + entry, 0);
  // The tallest thing on the chart sets the scale – with a backdrop column that
  // is the whole, not the part of it that is coloured in.
  const peak = Math.max(1, ...days.map((day) => (against ? day[against] : day[metric])));
  // Unter jeder Säule steht nur etwas, solange es sieben sind.
  const perColumnLabels = days.length <= 8;
  const firstLabel = days[0] ? bucketLabel(days[0].day, period) : '';
  /*
    Der Kalender zählt Tage, nicht Abschnitte.

    Bis zu einem Monat ist beides dasselbe; darüber sind die Abschnitte Wochen
    oder Monate, und die gespielten Tage kommen ohnehin aus einer eigenen
    Abfrage – die ist hier auch die richtige Quelle für die Zählung.
  */
  const dayCount = period === null ? 365 : period;
  const playedCount =
    period !== null && period <= 31
      ? values.filter((entry) => entry > 0).length
      : (playedDays?.size ?? 0);

  /** Die Säule, die einer Fingerposition am nächsten liegt. */
  const columnAt = (event: GestureResponderEvent) => {
    if (chartWidth <= 0 || days.length === 0) return;
    const local = event.nativeEvent.pageX - chartPageX.current;
    const index = Math.floor((local / chartWidth) * days.length);
    setTouched(Math.min(days.length - 1, Math.max(0, index)));
  };

  const active = touched === null ? null : (days[touched] ?? null);
  const lastLabel = days.length > 1 ? bucketLabel(days[days.length - 1]?.day ?? '', period) : '';

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Schließen"
        />

        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.fillClip}>
            <LinearGradient
              colors={gradients.dialog}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.6, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient colors={gradients.edge} style={styles.edge} />
          </View>

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text variant="label" style={styles.eyebrow}>
                {periodTitle(period, shape)}
              </Text>
              <Text variant="headline" style={styles.title}>
                {title}
              </Text>
            </View>
            <IconButton icon="close" accessibilityLabel="Schließen" size={20} onPress={onClose} />
          </View>

          <View style={styles.body}>
            {/*
              Unter dem Finger steht die Säule, sonst der Gesamtwert – dieselbe
              Stelle, die etwas anderes sagt, solange man sie befragt. In
              derselben Farbe: die gehört zur Kennzahl und nicht zum Zustand,
              und jede Zahl grün zu färben hätte "richtig" bedeutet, wo "falsch"
              stand.

              Mit Bezugswert steht er direkt dahinter – "4/8" ist eine Zahl, die
              man liest, "4" mit einem "von 8" in der Zeile darunter sind zwei.
            */}
            <Text style={[styles.value, { color: tone }]}>
              {active ? String(active[metric]) : value}
              {/* Der Bezugswert hängt an der Zahl, steht aber zurück: er ist
                  der Rahmen, nicht die Auskunft. */}
              {active && against ? (
                <Text style={styles.valueOf}> von {active[against]}</Text>
              ) : null}
            </Text>
            <Text variant="caption" color="muted">
              {active ? bucketLabel(active.day, period) : 'insgesamt'}
            </Text>

            {loading ? (
              <Skeleton
                height={shape === 'calendar' ? 140 : CHART_HEIGHT}
                borderRadius={radius.lg}
                style={styles.chartSkeleton}
              />
            ) : shape === 'calendar' ? (
              <Calendar
                days={days}
                metric={metric}
                tone={tone}
                period={period}
                playedDays={playedDays}
              />
            ) : (
              <View
                ref={chartRef}
                style={styles.chart}
                onLayout={(event: LayoutChangeEvent) => {
                  setChartWidth(event.nativeEvent.layout.width);
                  // Im Fenster gemessen, nicht im Elternteil: das Fenster fährt
                  // über dem Bildschirm auf, und ein Wert relativ zu seinem
                  // Kasten läge um dessen Rand daneben.
                  chartRef.current?.measureInWindow((x) => {
                    chartPageX.current = x;
                  });
                }}
                onStartShouldSetResponder={() => days.length > 0}
                onMoveShouldSetResponder={() => days.length > 0}
                onResponderTerminationRequest={() => false}
                onResponderGrant={columnAt}
                onResponderMove={columnAt}
                onResponderRelease={() => setTouched(null)}
                onResponderTerminate={() => setTouched(null)}
              >
                {days.map((day, index) => {
                  const amount = day[metric];
                  // Without a backdrop the column is the bar itself. Reading
                  // the whole as zero collapsed the chart to a couple of
                  // pixels – which is why the duels and the finished quizzes
                  // opened a window with nothing in it.
                  const whole = against ? day[against] : amount;
                  const weekday = bucketLabel(day.day, period);

                  return (
                    <View
                      key={day.day}
                      style={[
                        styles.column,
                        touched !== null && touched !== index && styles.columnDimmed,
                      ]}
                      accessibilityLabel={
                        against ? `${weekday}: ${amount} von ${whole}` : `${weekday}: ${amount}`
                      }
                    >
                      {/* The day's whole in grey, the part of it in colour,
                          sharing one baseline. A hairline stands in for an
                          empty day, so the row of days stays a row. */}
                      <View
                        style={[
                          styles.track,
                          against && styles.trackFilled,
                          { height: Math.max(2, (whole / peak) * CHART_HEIGHT) },
                        ]}
                      >
                        {parts && amount > 0 ? (
                          /* Stacked: each part is its share of the day, the
                             whole column its share of the week's best day.
                             Rounded at the top only, so the pieces read as one
                             bar rather than as three. */
                          <View
                            style={[
                              styles.bar,
                              { height: Math.max(4, (amount / peak) * CHART_HEIGHT) },
                            ]}
                          >
                            {parts.map((part, index) => {
                              const share = day[part.metric];
                              if (share <= 0) return null;
                              return (
                                <View
                                  key={part.metric}
                                  style={[
                                    styles.slice,
                                    {
                                      flex: share,
                                      backgroundColor: part.color,
                                      borderTopLeftRadius: index === 0 ? radius.sm : 0,
                                      borderTopRightRadius: index === 0 ? radius.sm : 0,
                                    },
                                  ]}
                                />
                              );
                            })}
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.bar,
                              {
                                height:
                                  amount > 0 ? Math.max(4, (amount / peak) * CHART_HEIGHT) : 2,
                                backgroundColor: amount > 0 ? tone : colors.border,
                              },
                            ]}
                          />
                        )}
                      </View>

                      {/* Nur bei einer Woche steht der Tag unter der Säule –
                          darüber hinaus wird es zu eng, und Anfang und Ende
                          stehen in der Fußzeile. */}
                      {perColumnLabels ? (
                        <Text variant="label" color="muted" numberOfLines={1} style={styles.tick}>
                          {weekday}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Without this the three colours would be a guess. */}
            {parts && !loading ? (
              <View style={styles.legend}>
                {parts.map((part) => (
                  <View key={part.metric} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: part.color }]} />
                    <Text variant="label" color="secondary">
                      {part.label} {days.reduce((sum, day) => sum + day[part.metric], 0)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Anfang und Ende des Zeitraums, einmal statt dreißigmal. */}
            {shape !== 'calendar' && !perColumnLabels && firstLabel ? (
              <View style={styles.axis}>
                <Text variant="label" color="muted">
                  {firstLabel}
                </Text>
                <Text variant="label" color="muted">
                  {lastLabel}
                </Text>
              </View>
            ) : null}

            <Text variant="caption" color="secondary" align="center">
              {shape === 'calendar'
                ? `${playedCount} von ${dayCount} Tagen gespielt`
                : total > 0
                  ? `${total} im Zeitraum`
                  : 'In diesem Zeitraum noch nichts.'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Die gespielten Tage als Kalender.
 *
 * Ein Kreis je Abschnitt, sieben in einer Reihe und am Wochentag ausgerichtet –
 * so steht Montag immer unter Montag, und eine Lücke in der Serie ist als Lücke
 * zu sehen statt als kürzerer Balken.
 *
 * Über einem Monat sind die Abschnitte Wochen oder Monate und keine Tage mehr;
 * dann steht das Gitter ohne Wochentagsreihe da, weil es sonst etwas behaupten
 * würde, was die Zahlen nicht hergeben.
 */
/** YYYY-MM-DD in Ortszeit – `toISOString` würde je nach Zeitzone einen Tag verschieben. */
function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const WEEKDAY_ROWS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/**
 * Die gespielten Tage als Kalender.
 *
 * Zwei Darstellungen, weil ein Monat und ein Jahr nicht dasselbe Bild vertragen:
 *
 * Bis zu einem Monat ein Kalenderblatt – sieben Kreise je Reihe, am Wochentag
 * ausgerichtet, mit der Tageszahl darin. So steht Montag unter Montag.
 *
 * Darüber ein Gitter aus Spalten: eine Spalte je Woche, sieben Zeilen für die
 * Wochentage, dazu die Monatsnamen darüber. Ein Jahr sind dreiundfünfzig
 * schmale Spalten statt dreihundertfünfundsechzig Kreise, und man sieht Serien
 * und Lücken als Muster. Dasselbe Blatt mit zwölf Monatskästchen wäre kein
 * Kalender mehr gewesen – das war der Zustand, der nicht gut aussah.
 */
function Calendar({
  days,
  metric,
  tone,
  period,
  playedDays,
}: {
  days: readonly DayHistory[];
  metric: HistoryMetric;
  tone: string;
  period: number | null;
  playedDays?: ReadonlySet<string>;
}) {
  const styles = useStyles();
  const colors = useThemeColors();

  // Bis zu einem Monat sind die Abschnitte Tage, und die Daten reichen aus.
  const sheet = period !== null && period <= 31;

  if (sheet) {
    const first = days[0] ? new Date(`${days[0].day}T00:00:00`) : null;
    // Montag zuerst, wie im Kalender – `getDay()` zählt ab Sonntag.
    const offset = first ? (first.getDay() + 6) % 7 : 0;

    return (
      <View style={styles.calendar}>
        <View style={styles.calendarRow}>
          {WEEKDAY_ROWS.map((label) => (
            <Text key={label} variant="label" color="muted" style={styles.calendarHead}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {/* Leerstellen bis zum ersten Wochentag, damit die Spalten stimmen. */}
          {Array.from({ length: offset }, (_, index) => (
            <View key={`pad-${index}`} style={styles.calendarCell} />
          ))}

          {days.map((day) => {
            const active = day[metric] > 0;
            const date = new Date(`${day.day}T00:00:00`);
            return (
              <View
                key={day.day}
                style={styles.calendarCell}
                accessibilityLabel={`${date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}: ${
                  active ? 'gespielt' : 'nicht gespielt'
                }`}
              >
                <View
                  style={[
                    styles.calendarDot,
                    active
                      ? { backgroundColor: tone }
                      : { borderColor: colors.borderStrong, borderWidth: 1 },
                  ]}
                >
                  <Text
                    variant="label"
                    style={[styles.calendarDay, active && styles.calendarDayOn]}
                  >
                    {date.getDate()}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  /*
    Das lange Gitter: ein Kreis je Tag, auch über ein halbes Jahr oder ein
    ganzes – gelesen wie ein Text, von links oben nach rechts unten. Der letzte
    Kreis unten rechts ist heute, und je weiter man nach links geht, desto
    weiter liegt der Tag zurück.

    Vorher war jede Spalte eine Woche und jede Zeile ein Wochentag. Das ist das
    Muster, das man von Beitragsgittern kennt, aber es endet dort, wo heute im
    Wochenraster steht – an einem Mittwoch also mitten in der letzten Spalte,
    und das las sich, als liefe die Zeit nach oben.

    "Gesamt" bedeutet hier das letzte Jahr. Ein Kalender braucht einen Anfang,
    und "seit deinem ersten Quiz" wäre für jeden ein anderer – bei einem Konto
    von gestern ein Bild aus zwei Punkten, bei einem alten eines, das nicht auf
    den Bildschirm passt.
  */
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const span = period ?? 365;

  const cells: { day: string; active: boolean }[] = [];
  const cursor = new Date(today);
  cursor.setDate(cursor.getDate() - (span - 1));
  while (cursor <= today) {
    const key = isoDay(cursor);
    cells.push({ day: key, active: playedDays?.has(key) ?? false });
    cursor.setDate(cursor.getDate() + 1);
  }

  /*
    Wie viele in eine Zeile passen: so gewählt, dass es rund dreizehn Zeilen
    werden. Sieben wie im Kalenderblatt wären bei einem Jahr zweiundfünfzig
    Zeilen und damit höher als der Bildschirm.
  */
  const perRow = Math.max(7, Math.ceil(cells.length / 13));

  /*
    Ohne Beschriftung.

    Wochentage und Monatskürzel standen hier als Orientierung, aber neben Kreisen
    von fünf Punkten waren sie mehr Schrift als Gitter – und sie beantworten
    nichts: die Frage an dieses Bild ist "wie durchgehend", nicht "welcher Tag".
    Anfang und Ende des Zeitraums stehen in der Überschrift.
  */
  return (
    <View style={styles.calendar}>
      <View style={styles.yearGrid}>
        {cells.map((cell) => (
          <View key={cell.day} style={[styles.yearSlot, { width: `${100 / perRow}%` }]}>
            <View
              style={[
                styles.yearCell,
                cell.active ? { backgroundColor: tone } : styles.yearCellOff,
              ]}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors, shadows) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 13, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    ...shadows.tile,
    width: '100%',
    maxWidth: 380,
    paddingBottom: spacing.xl,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  fillClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.xxl - 1,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  edge: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerText: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.textMuted },
  title: { letterSpacing: -0.2, color: colors.textPrimary },

  body: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xl },
  value: { fontSize: 34, fontWeight: '900', lineHeight: 38 },
  valueOf: { fontSize: 15, fontWeight: '600', color: colors.textMuted },

  chartSkeleton: { alignSelf: 'stretch', marginTop: spacing.lg },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    alignSelf: 'stretch',
    gap: spacing.xs,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    // The same window whatever the numbers: a week of small figures used to
    // open a chart a few pixels tall, and the six tiles are meant to lead to
    // one place, not to six differently sized ones.
    minHeight: CHART_HEIGHT + 34,
  },
  /* Kalender: sieben Kreise je Reihe, am Wochentag ausgerichtet. */
  calendar: {
    alignSelf: 'stretch',
    gap: spacing.xs,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  calendarRow: { flexDirection: 'row' },
  calendarHead: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 9 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.xs },
  calendarCell: { width: `${100 / 7}%`, alignItems: 'center' },
  calendarDot: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfacePressed,
  },
  calendarDay: { fontSize: 10, color: colors.textMuted },
  calendarDayOn: { color: colors.white, fontWeight: '700' },

  /* Jahresgitter: eine Spalte je Woche, sieben Zeilen für die Wochentage. */
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 3 },
  // Der Kreis sitzt in einem Feld fester Breite, damit die Spalten stehen und
  // sich der Abstand nicht aus der Kreisgröße ergibt.
  yearSlot: { alignItems: 'center' },
  /*
    Ein Kreis je Tag – auch bei dreiundfünfzig Spalten.

    Rund und nicht eckig, weil die Monatsansicht daneben auch Kreise zeigt: es
    ist dieselbe Sache in einem anderen Maßstab, und ein Wechsel der Form würde
    behaupten, es sei eine andere.

    `maxHeight` deckelt sie bei sechs Monaten, wo die Spalten doppelt so breit
    sind – ohne das wären es dort Kreise von zwölf Punkten und das Gitter wäre
    höher als das Fenster.
  */
  yearCell: { width: '72%', aspectRatio: 1, borderRadius: radius.full, maxHeight: 10 },
  yearCellOff: { backgroundColor: colors.surfacePressed },
  column: { flex: 1, alignItems: 'center', gap: 4, minWidth: 0 },
  // Die übrigen treten zurück, statt dass die eine bunter wird – bei einer
  // gestapelten Säule gäbe es keine Farbe, die dafür noch frei wäre.
  columnDimmed: { opacity: 0.35 },
  tick: { fontSize: 9 },
  axis: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },

  // The grey column is the day's whole; the coloured one sits inside it, both
  // standing on the same baseline.
  track: { alignSelf: 'stretch', justifyContent: 'flex-end', borderRadius: radius.sm },
  // Grey only where there is a whole to show behind the part.
  trackFilled: { backgroundColor: colors.surfacePressed },
  bar: { alignSelf: 'stretch', borderRadius: radius.sm, overflow: 'hidden' },
  // A part of a stacked bar – the rounding is set per part, see above.
  slice: { alignSelf: 'stretch' },

  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 999 },

  dot: { width: 14, height: 14, borderRadius: 999, marginBottom: 4 },
}));

/** Dark whatever the theme, like every dialog in the app. */
export function HistoryDialog(props: HistoryDialogProps) {
  return (
    <FixedTheme scheme="dark">
      <HistoryDialogBody {...props} />
    </FixedTheme>
  );
}
