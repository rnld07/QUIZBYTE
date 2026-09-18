import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { makeStyles, useThemeColors } from '@/theme';

interface Spec {
  /** Position as a percentage of the screen. */
  top: `${number}%`;
  left: `${number}%`;
  size: number;
  /** Alpha suffix appended to the accent colour (hex). */
  alpha: string;
  /** Ring instead of a filled disc. */
  ring?: boolean;
  /** Where the circle drifts in from. */
  fromX: number;
  fromY: number;
  delay: number;
  /** Idle drift: duration per half swing and its amplitudes. */
  swayMs: number;
  swayX: number;
  swayY: number;
}

/**
 * Loose scatter of blooms and rings. Sizes vary a lot so the field reads as
 * depth; the two biggest ones sit half outside the screen.
 */
const SPECS: Spec[] = [
  { top: '-14%', left: '-22%', size: 300, alpha: '1F', fromX: -50, fromY: -40, delay: 0, swayMs: 5200, swayX: 14, swayY: 10 },
  { top: '58%', left: '62%', size: 340, alpha: '14', fromX: 60, fromY: 50, delay: 80, swayMs: 6000, swayX: -16, swayY: 12 },
  { top: '12%', left: '68%', size: 150, alpha: '1A', ring: true, fromX: 70, fromY: -30, delay: 140, swayMs: 4200, swayX: -10, swayY: 8 },
  { top: '34%', left: '-8%', size: 110, alpha: '17', ring: true, fromX: -60, fromY: 30, delay: 210, swayMs: 4800, swayX: 9, swayY: -7 },
  { top: '46%', left: '46%', size: 74, alpha: '12', fromX: 0, fromY: -50, delay: 170, swayMs: 3800, swayX: 8, swayY: 9 },
  { top: '74%', left: '10%', size: 130, alpha: '15', ring: true, fromX: -40, fromY: 60, delay: 250, swayMs: 5400, swayX: 11, swayY: -9 },
  { top: '24%', left: '30%', size: 46, alpha: '1C', fromX: 30, fromY: -40, delay: 300, swayMs: 3400, swayX: -7, swayY: 7 },
  { top: '88%', left: '72%', size: 60, alpha: '18', fromX: 50, fromY: 60, delay: 190, swayMs: 4000, swayX: -8, swayY: -6 },
];

interface QuizAmbientBackgroundProps {
  /** Accent colour driving the whole backdrop. */
  accentColor: string;
  /** Changing this replays the drift-in – pass the current question id. */
  questionId: string;
  /**
   * Lays the circles out without moving them.
   *
   * For the chat, where a dozen of these previews can be on screen at once:
   * a dozen looping animations behind a scrolling list is a lot of work for
   * decoration nobody is looking at.
   */
  still?: boolean;
}

/**
 * Decorative backdrop for the quiz screen: a wash in the category colour plus a
 * field of soft circles. Every new question makes them drift in; while the
 * question is open they keep floating gently.
 */
export function QuizAmbientBackground({ accentColor, questionId, still = false }: QuizAmbientBackgroundProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  return (
    <View style={[StyleSheet.absoluteFill, styles.noTouch]}>
      <LinearGradient
        colors={[`${accentColor}26`, `${accentColor}0A`, colors.background]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />

      {SPECS.map((spec, index) => (
        <FloatingCircle key={index} spec={spec} color={accentColor} questionId={questionId} still={still} />
      ))}
    </View>
  );
}

function FloatingCircle({ spec, color, questionId, still }: { spec: Spec; color: string; questionId: string; still: boolean }) {
  const styles = useStyles();
  // useState, not useRef: the values are read during render to build the styles.
  const [enter] = useState(() => new Animated.Value(0));
  const [sway] = useState(() => new Animated.Value(0));

  // Drift in whenever a new question is shown.
  useEffect(() => {
    if (still) {
      enter.setValue(1);
      return;
    }
    enter.setValue(0);
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: 760,
      delay: spec.delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [enter, questionId, spec.delay, still]);

  /**
   * Idle float – runs for as long as the screen is mounted.
   *
   * `resetBeforeIteration: false` is the whole point: by default the loop puts
   * the value back to where the sequence started (0) before repeating, so after
   * every full swing the circle snapped from -1 to 0 in a single frame. That
   * was the jump – and because every circle has its own duration, it happened
   * at a different moment for each one.
   */
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: spec.swayMs, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: spec.swayMs, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
      { resetBeforeIteration: false },
    );
    loop.start();
    return () => loop.stop();
  }, [sway, spec.swayMs, still]);

  const translateX = Animated.add(
    enter.interpolate({ inputRange: [0, 1], outputRange: [spec.fromX, 0] }),
    sway.interpolate({ inputRange: [-1, 1], outputRange: [-spec.swayX, spec.swayX] }),
  );
  const translateY = Animated.add(
    enter.interpolate({ inputRange: [0, 1], outputRange: [spec.fromY, 0] }),
    sway.interpolate({ inputRange: [-1, 1], outputRange: [-spec.swayY, spec.swayY] }),
  );

  return (
    <Animated.View
      style={[
        styles.circle,
        {
          top: spec.top,
          left: spec.left,
          width: spec.size,
          height: spec.size,
          borderRadius: spec.size / 2,
        },
        spec.ring
          ? { borderWidth: Math.max(1, Math.round(spec.size / 60)), borderColor: `${color}${spec.alpha}` }
          : { backgroundColor: `${color}${spec.alpha}` },
        {
          opacity: enter.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
          transform: [
            { translateX },
            { translateY },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) },
          ],
        },
      ]}
    />
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  noTouch: { pointerEvents: 'none' },
  circle: { position: 'absolute' },
}));
