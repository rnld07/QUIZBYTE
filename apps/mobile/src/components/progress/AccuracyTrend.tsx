import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import type { TrendPoint } from '@/services/api/historyApi';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { BottomSheet, Skeleton, Text } from '../ui';

/** Die Zeiträume, zwischen denen gewählt wird. */
export const TREND_RANGES = [
  { days: 7, label: '7 Tage', grain: 'je Tag' },
  { days: 30, label: '30 Tage', grain: 'je Tag' },
  { days: 182, label: '6 Monate', grain: 'je Woche' },
  { days: 365, label: '1 Jahr', grain: 'je Monat' },
] as const;

export type TrendRange = (typeof TREND_RANGES)[number]['days'];

interface AccuracyTrendProps {
  points: readonly TrendPoint[];
  days: TrendRange;
  loading: boolean;
  onChangeDays: (days: TrendRange) => void;
}

const HEIGHT = 150;
/** Platz links für die Prozentbeschriftung. */
const PAD_LEFT = 30;
const PAD_RIGHT = 8;
const PAD_TOP = 10;

/**
 * Wie sich die Trefferquote entwickelt.
 *
 * Eine Linie, keine Säulen: eine Quote ist ein Zustand, der sich fortsetzt,
 * und zwischen zwei Messpunkten ist der Verlauf eine Vermutung, die eine Linie
 * ehrlicher ausdrückt als zwei getrennte Balken.
 *
 * Abschnitte ohne Antwort bleiben Lücken. Sie auf null zu setzen wäre bequemer
 * zu zeichnen und gleichzeitig eine Falschaussage – "an dem Tag alles falsch"
 * statt "an dem Tag nicht gespielt".
 */
export function AccuracyTrend({ points, days, loading, onChangeDays }: AccuracyTrendProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [width, setWidth] = useState(0);
  /*
    Welcher Punkt gerade unter dem Finger liegt, oder null.

    Als Zustand und nicht als Animated.Value: was sich ändert, ist eine Zahl in
    einem Text, keine Bewegung – und ein Wert, der nur im nativen Treiber
    existiert, kommt in keinem Text an.
  */
  const [touched, setTouched] = useState<number | null>(null);

  const range = TREND_RANGES.find((entry) => entry.days === days) ?? TREND_RANGES[0];
  const withValue = points.filter((point) => point.accuracy !== null);
  const answered = points.reduce((sum, point) => sum + point.answered, 0);
  const correct = points.reduce((sum, point) => sum + point.correct, 0);
  const average = answered > 0 ? Math.round((correct / answered) * 100) : null;

  // Erster und letzter gemessener Punkt – daraus wird die Richtung.
  const first = withValue[0]?.accuracy ?? null;
  const last = withValue.at(-1)?.accuracy ?? null;
  const delta = first !== null && last !== null && withValue.length > 1 ? last - first : null;

  const plotWidth = Math.max(0, width - PAD_LEFT - PAD_RIGHT);
  const plotHeight = HEIGHT - PAD_TOP * 2;
  const x = (index: number) =>
    PAD_LEFT + (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  const y = (value: number) => PAD_TOP + (1 - value / 100) * plotHeight;

  /*
    Eine durchgehende Linie über alle gemessenen Punkte – Abschnitte ohne
    Antwort werden übersprungen, nicht unterbrochen.

    Vorher riss die Linie an jeder Lücke. Das war streng genommen ehrlicher,
    las sich aber als kaputtes Diagramm: bei jemandem, der an drei von sieben
    Tagen spielt, blieben drei einzelne Punkte übrig und keine Linie. Dass
    dazwischen nicht gemessen wurde, sagt jetzt der fehlende Kreis.
  */
  const line = points
    .map((point, index) => ({ point, index }))
    .filter((entry) => entry.point.accuracy !== null)
    .map(
      (entry, position) =>
        `${position === 0 ? 'M' : 'L'}${x(entry.index).toFixed(1)},${y(entry.point.accuracy as number).toFixed(1)}`,
    )
    .join(' ');

  /** Der Punkt unter dem Finger, oder null solange keiner darauf liegt. */
  const active = touched === null ? null : (points[touched] ?? null);

  /** Der Punkt, der einer Fingerposition am nächsten liegt. */
  const pointAt = (event: GestureResponderEvent) => {
    if (plotWidth <= 0 || points.length === 0) return;
    const local = event.nativeEvent.locationX - PAD_LEFT;
    const step = points.length <= 1 ? plotWidth : plotWidth / (points.length - 1);
    const index = Math.round(local / step);
    setTouched(Math.min(points.length - 1, Math.max(0, index)));
  };

  const label = (point: TrendPoint): string => {
    const date = new Date(`${point.bucketStart}T00:00:00`);
    if (days <= 31) return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    if (days <= 190) return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    return date.toLocaleDateString('de-DE', { month: 'short' });
  };

  return (
    <View style={styles.card}>
      {/*
        Unter dem Finger steht der Punkt, sonst der Durchschnitt. Ein zweites
        Feld daneben hätte dieselbe Zahl zweimal an zwei Orten gezeigt; so ist
        es dieselbe Stelle, die etwas anderes sagt, solange man sie befragt.
      */}
      <View style={styles.head}>
        <View style={styles.headText}>
          <Text style={[styles.value, active && active.accuracy !== null ? { color: colors.success } : null]}>
            {active ? (active.accuracy === null ? '–' : `${active.accuracy} %`) : average === null ? '–' : `${average} %`}
          </Text>
          {active ? (
            <Text variant="caption" color="muted">
              {label(active)}
              {active.answered > 0 ? ` · ${active.correct}/${active.answered} richtig` : ' · nicht gespielt'}
            </Text>
          ) : (
            <Text variant="caption" color="muted">
              Ø im Zeitraum
              {delta !== null && delta !== 0 ? (
                <Text variant="caption" style={{ color: delta > 0 ? colors.success : colors.danger }}>
                  {`  ${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)}`}
                </Text>
              ) : null}
            </Text>
          )}
        </View>

        <Pressable
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Zeitraum: ${range.label}. Ändern`}
          style={({ pressed }) => [styles.rangeButton, pressed && styles.pressed]}
        >
          <Text variant="label" style={styles.rangeText}>
            {range.label}
          </Text>
          <Ionicons name="chevron-down" size={13} color={colors.textMuted} />
        </Pressable>
      </View>

      {/*
        Abgetastet wird mit den Responder-Eigenschaften der View: ein Tipp
        genügt, Ziehen verschiebt die Marke, Loslassen gibt sie wieder frei.
        `onResponderTerminationRequest` false, damit die Seite darunter die
        Geste nicht zum Scrollen an sich zieht, sobald der Finger wandert.
      */}
      <View
        style={styles.plot}
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => points.length > 0}
        onMoveShouldSetResponder={() => points.length > 0}
        onResponderTerminationRequest={() => false}
        onResponderGrant={pointAt}
        onResponderMove={pointAt}
        onResponderRelease={() => setTouched(null)}
        onResponderTerminate={() => setTouched(null)}
      >
        {loading && points.length === 0 ? (
          <Skeleton height={HEIGHT} borderRadius={radius.lg} />
        ) : width === 0 ? null : withValue.length === 0 ? (
          <View style={[styles.empty, { height: HEIGHT }]}>
            <Text variant="caption" color="muted" align="center">
              In diesem Zeitraum hast du noch keine Frage beantwortet.
            </Text>
          </View>
        ) : (
          <Svg width={width} height={HEIGHT}>
            {/* Drei Hilfslinien: 0, 50 und 100 Prozent. Mehr Gitter würde das
                Bild zustellen, weniger ließe die Höhe frei schweben. */}
            {[0, 50, 100].map((mark) => (
              <Line
                key={mark}
                x1={PAD_LEFT}
                y1={y(mark)}
                x2={width - PAD_RIGHT}
                y2={y(mark)}
                stroke={colors.border}
                strokeWidth={1}
                strokeDasharray={mark === 50 ? '3 4' : undefined}
              />
            ))}

            {withValue.length > 1 ? (
              <Path d={line} stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            ) : null}


            {/* Punkte nur bei wenigen Messstellen: bei zwölf Monaten ist jeder
                Punkt eine Marke, bei dreißig Tagen eine Perlenkette. */}
            {points.length <= 14
              ? points.map((point, index) =>
                  point.accuracy === null ? null : (
                    <Circle
                      key={point.bucketStart}
                      cx={x(index)}
                      cy={y(point.accuracy)}
                      r={3.5}
                      fill={colors.background}
                      stroke={colors.primary}
                      strokeWidth={2}
                    />
                  ),
                )
              : null}

            {/* Die Marke unter dem Finger, ganz zuletzt gezeichnet: die
                Umrisskreise darüber kommen im SVG nach der Linie, und ein
                Punkt, der vorher gezeichnet wird, verschwindet unter ihnen.
                Genau daran blieb die Marke blau. */}
            {active ? (
              <Line
                x1={x(touched as number)}
                y1={PAD_TOP}
                x2={x(touched as number)}
                y2={PAD_TOP + plotHeight}
                stroke={colors.success}
                strokeWidth={1}
                strokeDasharray="2 3"
                opacity={0.7}
              />
            ) : null}
            {/* Grün, nicht blau: die Linie ist blau, und eine Marke in
                derselben Farbe wäre eine Verdickung statt einer Marke. */}
            {active && active.accuracy !== null ? (
              <Circle
                cx={x(touched as number)}
                cy={y(active.accuracy)}
                r={5.5}
                fill={colors.success}
                stroke={colors.background}
                strokeWidth={2}
              />
            ) : null}
          </Svg>
        )}

        {/* Die Prozentskala liegt über dem Diagramm statt darin: als Text im
            SVG müsste sie die Schriftgröße des Systems ignorieren. */}
        {width > 0 && withValue.length > 0 ? (
          <>
            {[100, 50, 0].map((mark) => (
              <Text key={mark} variant="label" style={[styles.axis, { top: y(mark) - 7 }]}>
                {mark}
              </Text>
            ))}
          </>
        ) : null}
      </View>

      {withValue.length > 0 ? (
        <View style={styles.footer}>
          <Text variant="label" color="muted">
            {points[0] ? label(points[0]) : ''}
          </Text>
          <Text variant="label" color="muted">
            {range.grain}
          </Text>
          <Text variant="label" color="muted">
            {points.at(-1) ? label(points.at(-1) as TrendPoint) : ''}
          </Text>
        </View>
      ) : null}

      <BottomSheet
        visible={pickerOpen}
        title="Zeitraum"
        eyebrow={range.label.toUpperCase()}
        height={0.45}
        onClose={() => setPickerOpen(false)}
      >
        {TREND_RANGES.map((entry) => (
          <Pressable
            key={entry.days}
            onPress={() => {
              onChangeDays(entry.days);
              setPickerOpen(false);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: entry.days === days }}
            accessibilityLabel={entry.label}
            style={({ pressed }) => [styles.option, entry.days === days && styles.optionActive, pressed && styles.pressed]}
          >
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, entry.days === days && styles.optionLabelActive]}>{entry.label}</Text>
              <Text variant="label" color="muted">
                {entry.grain}
              </Text>
            </View>
            {entry.days === days ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
          </Pressable>
        ))}
      </BottomSheet>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  headText: { flex: 1, gap: 1 },
  value: { fontSize: 30, fontWeight: '900', lineHeight: 34, color: colors.textPrimary },
  rangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfacePressed,
  },
  rangeText: { fontSize: 12, color: colors.textSecondary },
  pressed: { opacity: 0.7 },

  plot: { alignSelf: 'stretch' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  axis: { position: 'absolute', left: 0, width: 24, fontSize: 9, textAlign: 'right', color: colors.textMuted },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  optionActive: { backgroundColor: colors.primarySoft },
  optionText: { flex: 1, gap: 1 },
  optionLabel: { fontSize: 15, color: colors.textSecondary },
  optionLabelActive: { color: colors.textPrimary, fontWeight: '700' },
}));
