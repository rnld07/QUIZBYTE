import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';

import { WHEEL_SEGMENTS, wheelSegmentAngle, wheelSegmentIndex } from '@quizbyte/shared';

import { wheelFaceImage } from '@/content/wheelImage';
import { makeStyles, useThemeColors } from '@/theme';

import { Text } from '../ui';

interface PrizeWheelProps {
  /** Outer diameter, rim included. */
  size?: number;
  /** What the spin paid, or null while it has not been spun. */
  xpWon: number | null;
  /**
   * Fires once the wheel has come to a stop.
   *
   * Not called when there was nothing to watch – a wheel opened on a prize that
   * was already won stands still, and the caller knows that from `xpWon`.
   */
  onSettled: () => void;
  /**
   * Asked for by a flick of the wheel itself.
   *
   * The spin is drawn on the server, so the gesture cannot decide anything – it
   * only asks, exactly like the button does. What the hand does before the
   * answer arrives is the free turn below.
   */
  onFlick?: () => void;
  /** No gesture while the prize is already known or on its way. */
  flickDisabled?: boolean;
}

/** How long it turns before it settles. */
const SPIN_MS = 4200;
/** Full turns before it lands, so it reads as a spin and not as a jump. */
const FULL_TURNS = 6;
/** How wide the rim is, as a share of the diameter. */
const RIM = 0.055;

/** One slice per prize, so a slice is 40 degrees wide. */
const SLICE = 360 / WHEEL_SEGMENTS.length;

/**
 * Slice colours, deep enough for white numbers to sit on.
 *
 * Nine of them and an odd count, so the first and the last meet: the last entry
 * is picked to be unlike the first on purpose.
 */
const SLICE_COLORS = ['#1E5FD8', '#12B886', '#E8A317', '#7C4DE0', '#E0457B', '#0FA3B1', '#F2710A', '#5566E3', '#C9345E'];

/**
 * The prize wheel: a rim, nine wedges, a hub, and a flapper at the top.
 *
 * The wheel decides nothing. The server draws the prize and this turns to where
 * that prize already sits – doing it the other way round would put the payout
 * in the client's hands, which is exactly what the XP rules exist to prevent.
 *
 * The face can also come from a picture (see `assets/wheel/README.md`); rim,
 * hub and flapper are always drawn here so they stay still while it turns.
 */
export function PrizeWheel({ size = 260, xpWon, onSettled, onFlick, flickDisabled = false }: PrizeWheelProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const [turn] = useState(() => new Animated.Value(0));
  const face = wheelFaceImage();
  /*
    Only a spin that happens while you are watching is worth animating.

    Today's result stays reachable all day, and a wheel that re-spins on every
    visit to a prize that was settled hours ago is a re-enactment, not a draw.
    Opened on an already-spun wheel, it simply stands where it landed.
  */
  const [animates] = useState(() => xpWon === null);

  // Read in the animation callback, which outlives the render that started
  // it – and kept in a ref so a fresh callback does not restart the spin.
  const settled = useRef(onSettled);
  useEffect(() => {
    settled.current = onSettled;
  }, [onSettled]);

  /*
    Turning it by hand.

    The wheel follows the finger around its own centre – the angle from the
    middle to the touch, not the distance dragged, which is what makes it feel
    like a wheel rather than a slider. Letting go with any speed asks for the
    spin; the free turn afterwards is only for the eye, and the real one takes
    over the moment the server answers.

    The view's own responder props rather than a PanResponder: these are plain
    event handlers, and a PanResponder has to be built during render, where
    neither the clock nor a ref belongs.
  */
  const [drag] = useState(() => new Animated.Value(0));
  const gesture = useRef({ last: 0, total: 0, at: 0, speed: 0 });

  const angleAt = (x: number, y: number) => (Math.atan2(y - size / 2, x - size / 2) * 180) / Math.PI;

  const onGrant = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    gesture.current = { last: angleAt(locationX, locationY), total: 0, at: Date.now(), speed: 0 };
  };

  const onMove = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const now = angleAt(locationX, locationY);

    // Across the -180/180 seam the raw difference jumps a full turn.
    let step = now - gesture.current.last;
    if (step > 180) step -= 360;
    if (step < -180) step += 360;

    const moment = Date.now();
    const elapsed = Math.max(1, moment - gesture.current.at);
    gesture.current = {
      last: now,
      total: gesture.current.total + step,
      at: moment,
      speed: step / elapsed,
    };
    drag.setValue(gesture.current.total);
  };

  const onRelease = () => {
    const { speed, total } = gesture.current;
    // A quarter turn or a flick of the wrist – a tap that wandered a few
    // degrees is not a spin.
    const meant = Math.abs(total) > 25 || Math.abs(speed) > 0.35;

    // Coast on for a moment, so the hand is answered before the server is.
    Animated.decay(drag, { velocity: speed, deceleration: 0.996, useNativeDriver: true }).start();
    if (meant) onFlick?.();
  };

  useEffect(() => {
    if (xpWon === null) return;
    // The real spin takes over: whatever the hand left behind is dropped, and
    // the wheel turns to where the prize already is.
    drag.stopAnimation(() => drag.setValue(0));

    // Land with the winning slice under the flapper at twelve o'clock.
    const target = FULL_TURNS * 360 + (360 - wheelSegmentAngle(wheelSegmentIndex(xpWon)));
    if (!animates) {
      turn.setValue(target);
      return;
    }

    const animation = Animated.timing(turn, {
      toValue: target,
      duration: SPIN_MS,
      // Away fast, then a long slow-down: the last half turn is the part worth
      // watching, and a plain ease-out gives the answer away too early.
      easing: Easing.bezier(0.15, 0.85, 0.15, 1),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) settled.current();
    });
    return () => animation.stop();
  }, [animates, drag, turn, xpWon]);

  const rim = Math.round(size * RIM);
  const inner = size - rim * 2;
  const stud = Math.max(4, Math.round(size * 0.022));
  const ring = (size - rim) / 2;
  const rotate = Animated.add(turn, drag).interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

  return (
    <View
      style={{ width: size, height: size }}
      /*
        Claimed on the way down, and not given back: without the capture the
        ScrollView underneath takes a vertical drag for a scroll, and the wheel
        turns while the page moves under it. `onResponderTerminationRequest`
        is what refuses to hand the touch over once it has started.
      */
      onStartShouldSetResponderCapture={() => !flickDisabled}
      onMoveShouldSetResponderCapture={() => !flickDisabled}
      onResponderTerminationRequest={() => false}
      onResponderGrant={onGrant}
      onResponderMove={onMove}
      onResponderRelease={onRelease}
      onResponderTerminate={onRelease}
    >
      {/* The rim: a metal band the wedges are set into. */}
      <LinearGradient
        colors={['#FFE9A8', '#C8901A', '#FFF3CC', '#A9740E']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[styles.rim, { width: size, height: size, borderRadius: size / 2 }]}
      />

      <Animated.View
        style={[
          styles.face,
          { width: inner, height: inner, borderRadius: inner / 2, top: rim, left: rim, transform: [{ rotate }] },
        ]}
      >
        {face ? (
          <Image source={face} style={{ width: inner, height: inner }} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <>
            {WHEEL_SEGMENTS.map((segment, index) => (
              <Wedge
                key={index}
                index={index}
                size={inner}
                color={SLICE_COLORS[index % SLICE_COLORS.length] ?? colors.primary}
              />
            ))}

            {/* The numbers sit on top of the wedges, each upright in its own
                slice, read from the middle outwards. */}
            {WHEEL_SEGMENTS.map((segment, index) => (
              <View
                key={`label-${index}`}
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${wheelSegmentAngle(index)}deg` }] }]}
              >
                <Text style={[styles.sliceText, { fontSize: Math.round(inner * 0.088), marginTop: inner * 0.07 }]}>
                  {segment.xp}
                </Text>
              </View>
            ))}
          </>
        )}
      </Animated.View>

      {/* Studs on the rim, one per seam. They turn with the wheel, which is
          what makes the rotation readable on a round thing at all. */}
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]} pointerEvents="none">
        {WHEEL_SEGMENTS.map((_, index) => {
          const angle = ((index * SLICE - 90) * Math.PI) / 180;
          return (
            <View
              key={`stud-${index}`}
              style={[
                styles.stud,
                {
                  width: stud,
                  height: stud,
                  borderRadius: stud / 2,
                  left: size / 2 + Math.cos(angle) * ring - stud / 2,
                  top: size / 2 + Math.sin(angle) * ring - stud / 2,
                },
              ]}
            />
          );
        })}
      </Animated.View>

      {/* The hub caps the middle, where all nine wedges meet. */}
      <View style={[styles.hubBox, { width: size, height: size }]} pointerEvents="none">
        <LinearGradient
          colors={['#FFF3CC', '#C8901A']}
          style={[styles.hub, { width: size * 0.22, height: size * 0.22, borderRadius: size * 0.11 }]}
        >
          <Ionicons name="star" size={Math.round(size * 0.1)} color="#7A4A18" />
        </LinearGradient>
      </View>

      {/* The flapper stays put and the wheel turns under it. */}
      <View style={[styles.flapper, { left: size / 2 - size * 0.05 }]} pointerEvents="none">
        <View
          style={[
            styles.flapperTip,
            { borderLeftWidth: size * 0.05, borderRightWidth: size * 0.05, borderTopWidth: size * 0.11 },
          ]}
        />
      </View>
    </View>
  );
}

/**
 * One wedge, without SVG.
 *
 * A half-disk turned back by `180° − slice` and then clipped to the right half
 * of the circle leaves exactly the slice between twelve o'clock and the slice
 * angle; the wrapper turns that into its place on the ring. Sound for any slice
 * up to 180°, which nine of them comfortably are.
 */
function Wedge({ index, size, color }: { index: number; size: number; color: string }) {
  const styles = useStyles();

  return (
    <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${index * SLICE}deg` }] }]} pointerEvents="none">
      <View style={[styles.halfClip, { left: size / 2, width: size / 2, height: size }]}>
        {/* Full-size, so it turns about the centre of the wheel and not its own. */}
        <View style={[styles.halfTurner, { left: -size / 2, width: size, height: size, transform: [{ rotate: `${SLICE - 180}deg` }] }]}>
          <View
            style={[
              styles.halfDisk,
              {
                left: size / 2,
                width: size / 2,
                height: size,
                borderTopRightRadius: size / 2,
                borderBottomRightRadius: size / 2,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  rim: { position: 'absolute', top: 0, left: 0 },
  face: { position: 'absolute', overflow: 'hidden', backgroundColor: '#0B1220' },

  halfClip: { position: 'absolute', top: 0, overflow: 'hidden' },
  halfTurner: { position: 'absolute', top: 0 },
  halfDisk: { position: 'absolute', top: 0 },

  sliceText: {
    alignSelf: 'center',
    fontWeight: '900',
    color: '#FFFFFF',
    // A dark edge under the number, so it holds up on the lighter wedges.
    textShadowColor: 'rgba(3, 7, 13, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  stud: { position: 'absolute', backgroundColor: '#FFF6D8', borderWidth: 1, borderColor: '#A9740E' },
  hubBox: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  hub: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#7A4A18' },

  flapper: { position: 'absolute', top: -2, alignItems: 'center', zIndex: 3 },
  flapperTip: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },
}));
