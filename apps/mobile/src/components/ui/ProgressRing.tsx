import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { makeStyles, useThemeColors } from '@/theme';

interface ProgressRingProps extends PropsWithChildren {
  /** 0–100. 0 leaves the ring completely empty, 100 closes it fully. */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  /**
   * Leaves the bottom open, like the dial of a gauge.
   *
   * A closed ring reads as "full circle, done" – the wrong thing to say about a
   * level, where there is always a next one. An arc with two ends says "from
   * here to there" instead, and the gap underneath is exactly where the XP
   * figure wants to sit.
   */
  gauge?: boolean;
  accessibilityLabel?: string;
}

/** What is still to be earned. Grey, because it is not yet anything. */
const EMPTY = 'rgba(255, 255, 255, 0.13)';

/** How much of the circle a gauge draws: three quarters, gap at the bottom. */
const SWEEP = 0.75;

/**
 * Circular progress, as a full ring or as an open gauge.
 *
 * Drawn with SVG, which is what lets the band have round ends – a border can
 * only ever be one flat colour cut off square.
 *
 * `strokeDasharray` paints the filled part and leaves the rest; the rotation
 * decides where the arc begins. A ring starts at twelve o'clock, a gauge at the
 * lower left, so that its two ends sit level with each other. Round ends in
 * both cases – a square cut at the tip is the one thing that gives a drawn ring
 * away as a chart.
 */
export function ProgressRing({
  value,
  size = 140,
  stroke = 10,
  color,
  trackColor = EMPTY,
  gauge = false,
  accessibilityLabel,
  children,
}: ProgressRingProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const ringColor = color ?? colors.primary;
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // A gauge only has three quarters of the circle to spend.
  const span = gauge ? circumference * SWEEP : circumference;
  const filled = span * (clamped / 100);
  // -90° puts the start at twelve o'clock; 135° further round moves it to the
  // lower left, which is where an open dial begins.
  const turn = gauge ? 45 : -90;

  return (
    <View
      style={[styles.root, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
    >
      <Svg width={size} height={size} style={styles.canvas}>
        {/* The whole way, in grey. */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          strokeDasharray={`${span} ${circumference}`}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(${turn} ${size / 2} ${size / 2})`}
        />

        {/* How far along it you are. */}
        {filled > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={stroke}
            strokeDasharray={`${filled} ${circumference}`}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(${turn} ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  root: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  canvas: { position: 'absolute', top: 0, left: 0 },
  content: { alignItems: 'center', gap: 1 },
}));
