import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { scrollToTop } from '@/services/navigation/scrollToTop';
import { makeStyles, radius, spacing, useTheme, useThemeColors } from '@/theme';

import { Text } from '../ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

/** Outline icon per route – the active state only changes colour, not the glyph. */
const ICONS: Record<string, IoniconName> = {
  index: 'document-text-outline',
  progress: 'stats-chart-outline',
  friends: 'people-outline',
  more: 'menu-outline',
};

const FALLBACK_ICON: IoniconName = 'ellipse-outline';
/** Breathing room below the pill on devices without a home indicator. */
const MIN_BOTTOM_GAP = 14;
/** Inner padding of the bar and the gap between items – the indicator maths needs both. */
const BAR_PADDING = 6;
const ITEM_GAP = spacing.xs;
/**
 * Wie viel vom Rückstand die Pille pro Bild aufholt.
 *
 * Das ist das Nachziehen: bei ~60 Bildern in der Sekunde ist sie rund hundert
 * Millisekunden nach dem Finger dort, wo der schon war. Höher wird zäh, tiefer
 * klebt sie wieder am Finger.
 */
const TRAIL = 0.16;
/** How much the bar sits back while nothing touches it. */
const IDLE_SCALE = 0.93;
/** Border of the bar – part of the height the pill grows into. */
const BAR_BORDER = 1;
/** Gap left above and below the pill while touched – it stays inside the bar. */
const PILL_INSET = 2;

/**
 * Floating pill navigation. Purely presentational – routing, the route list and
 * the labels come from the navigator exactly as before.
 *
 * The bar itself handles the touch, not the individual items: a press can start
 * on one tab and end on another, so the highlight follows the finger and the tab
 * under the finger on release is the one that gets selected.
 */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const { scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const wrapperRef = useRef<View>(null);
  const barLayoutX = useRef(0);
  /** Screen x of the bar – touches report page coordinates. */
  const barPageX = useRef(0);
  const [barWidth, setBarWidth] = useState(0);
  const [barHeight, setBarHeight] = useState(0);
  /** Slot the finger currently hovers over; null while nothing is touched. */
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  /** Horizontal position – pinned to the finger while dragging. */
  const [indicatorX] = useState(() => new Animated.Value(0));
  /** Signed wobble, roughly -1…1: stretches the pill while it moves. */
  const [wobble] = useState(() => new Animated.Value(0));
  /** 0 = released, 1 = finger down. Squashes the pill a little. */
  const [press] = useState(() => new Animated.Value(0));

  /** Smoothed wobble and the animation frame it runs in. */
  const wobbleValue = useRef(0);
  const frame = useRef<number | null>(null);
  /** Wo die Pille steht, und wo der Finger sie haben will. */
  const currentX = useRef(0);
  const targetX = useRef(0);

  // Routes hidden via `href: null` get no button and no slot: expo-router gives
  // them a `tabBarButton` that renders nothing. Careful – it does that for any
  // `href`, so a visible tab must not set one at all.
  const visible = state.routes.filter((route) => !descriptors[route.key]?.options.tabBarButton);
  const activeKey = state.routes[state.index]?.key;
  const activeIndex = Math.max(
    0,
    visible.findIndex((route) => route.key === activeKey),
  );

  const itemWidth = visible.length > 0 && barWidth > 0 ? (barWidth - BAR_PADDING * 2 - ITEM_GAP * (visible.length - 1)) / visible.length : 0;
  const slotX = (index: number) => BAR_PADDING + index * (itemWidth + ITEM_GAP);

  /**
   * Zieht die Pille dem Finger hinterher, solange einer unten ist.
   *
   * Pro Bild holt sie nur einen Bruchteil des Rückstands auf. Daraus ergibt
   * sich beides von selbst: ein Tippen auf die andere Seite gleitet hinüber
   * statt zu springen, und beim Wischen hängt sie hinterher und kommt erst zur
   * Ruhe, wenn der Finger es tut. Vorher klebte sie beim Wischen exakt am
   * Finger – das war eine Anzeige, die mitgeschoben wird, keine, die mitkommt.
   *
   * Die Verformung folgt derselben Rechnung: gedehnt wird in die Richtung, in
   * die die Pille tatsächlich läuft, also auch noch, während sie aufholt.
   */
  const startFollowLoop = () => {
    if (frame.current !== null) return;
    const tick = () => {
      const step = (targetX.current - currentX.current) * TRAIL;
      currentX.current += step;
      indicatorX.setValue(currentX.current);

      const push = Math.max(-1, Math.min(step / 14, 1));
      wobbleValue.current = Math.max(-1, Math.min(wobbleValue.current * 0.8 + push * 0.65, 1));
      wobble.setValue(wobbleValue.current);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  const stopFollowLoop = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    wobbleValue.current = 0;
    // A last swing back to neutral instead of a hard snap.
    Animated.spring(wobble, { toValue: 0, useNativeDriver: true, friction: 4, tension: 140 }).start();
    Animated.spring(press, { toValue: 0, useNativeDriver: true, friction: 6, tension: 160 }).start();
  };

  useEffect(() => () => stopFollowLoop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  /*
    Settle on the selected tab – on mount, after navigating and after a release.

    Deliberately soft and a little slow: the screen behind it changes at once,
    and a pill that arrived just as quickly would be one more thing snapping
    into place. Trailing half a beat behind makes the bar feel like an object
    being carried along rather than a state being redrawn.
  */
  useEffect(() => {
    if (itemWidth === 0 || hoverIndex !== null) return;
    Animated.spring(indicatorX, {
      toValue: slotX(activeIndex),
      useNativeDriver: true,
      // Low tension is the lag; the friction keeps it from wobbling once there.
      friction: 11,
      tension: 42,
    }).start();
    // slotX is derived from itemWidth, which is in the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, itemWidth, hoverIndex, indicatorX]);

  /**
   * Width of the pill: a touch pulls it in only slightly, and a drag stretches
   * it on top of that. Multiplying keeps both effects intact instead of one
   * overriding the other.
   */
  const pillScaleX = Animated.multiply(
    press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }),
    wobble.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.12, 1, 1.12] }),
  );

  /**
   * Height of the pill under the finger: it grows a little but stops just short
   * of the bar's edge. Derived from the measured bar, so that last gap stays the
   * same however tall the bar turns out at the user's font scale.
   */
  const indicatorHeight = Math.max(1, barHeight - BAR_BORDER * 2 - BAR_PADDING * 2);
  const pressedHeight = Math.max(indicatorHeight, barHeight - BAR_BORDER * 2 - PILL_INSET * 2);
  const pressedScaleY = barHeight > 0 ? pressedHeight / indicatorHeight : 1;

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height, x } = event.nativeEvent.layout;
    setBarWidth(width);
    setBarHeight(height);
    barLayoutX.current = x;
    // Measured on the wrapper, which carries no transform – the bar's own scale
    // must not shift the coordinates the pill maths is built on.
    wrapperRef.current?.measureInWindow((wrapperX) => {
      barPageX.current = wrapperX + barLayoutX.current;
    });
  };

  /**
   * Where the pill sits for a given touch: centred on the finger, clamped to the
   * first and last slot. Releasing outside the bar therefore lands on the
   * nearest edge tab instead of doing nothing.
   */
  const pillXAt = (event: GestureResponderEvent) => {
    const local = event.nativeEvent.pageX - barPageX.current;
    return Math.min(Math.max(local - itemWidth / 2, slotX(0)), slotX(visible.length - 1));
  };

  /**
   * Das Feld, auf dem die Pille zur Ruhe käme.
   *
   * Gerechnet wird mit der Stelle, die der Finger vorgibt, nicht mit der, an
   * der das graue Feld gerade hängt: beim Loslassen zieht es ohnehin dorthin
   * nach, und anvisiert wird das Feld unter dem Finger.
   */
  const indexAtPill = (pillX: number) => {
    const raw = Math.round((pillX - slotX(0)) / (itemWidth + ITEM_GAP));
    return Math.min(Math.max(raw, 0), visible.length - 1);
  };

  const grant = (event: GestureResponderEvent) => {
    Animated.spring(press, { toValue: 1, useNativeDriver: true, friction: 6, tension: 200 }).start();
    if (itemWidth === 0) return;

    // Die Pille steht in Ruhe auf dem aktiven Feld – von dort läuft sie los.
    currentX.current = slotX(activeIndex);
    targetX.current = pillXAt(event);
    setHoverIndex(indexAtPill(targetX.current));
    startFollowLoop();
  };

  const follow = (event: GestureResponderEvent) => {
    if (itemWidth === 0) return;
    // Nur das Ziel wird gesetzt; das Hinterherziehen macht die Schleife.
    targetX.current = pillXAt(event);
    // Die Beschriftung darf sofort umspringen: sie sagt, wo man landet, und
    // muss nicht warten, bis das graue Feld dort angekommen ist.
    setHoverIndex(indexAtPill(targetX.current));
  };

  /** The tab the pill rests on when the finger lifts wins – wherever that is. */
  const commit = (event: GestureResponderEvent) => {
    stopFollowLoop();
    if (itemWidth === 0) {
      setHoverIndex(null);
      return;
    }
    const route = visible[indexAtPill(pillXAt(event))];
    setHoverIndex(null);
    if (!route) return;

    const pressEvent = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (pressEvent.defaultPrevented) return;

    if (route.key === activeKey) {
      // Already here – jump back to the top instead of re-navigating.
      scrollToTop(route.name);
      return;
    }
    navigation.navigate(route.name, route.params);
  };

  return (
    <View ref={wrapperRef} style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, MIN_BOTTOM_GAP) }]} pointerEvents="box-none">
      <Animated.View
        onLayout={onLayout}
        // The bar claims the gesture so it keeps receiving moves across items.
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        // Nothing may steal the gesture mid-drag, so the finger can leave the
        // bar and still end the drag here.
        onResponderTerminationRequest={() => false}
        onResponderGrant={grant}
        onResponderMove={follow}
        onResponderRelease={commit}
        onResponderTerminate={() => {
          stopFollowLoop();
          setHoverIndex(null);
        }}
        // Sits back a little when untouched and comes up to full size under the
        // finger. Only the visuals scale – the layout box stays put, so the
        // pill maths above is unaffected.
        style={[styles.bar, { transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [IDLE_SCALE, 1] }) }] }]}
      >
        {/*
          Frosted glass: the blur samples what scrolls underneath, the tint on
          top keeps it readable. Clipped separately because the blur cannot be
          rounded by the bar's own border radius on Android.
        */}
        <View style={styles.fillClip}>
          <BlurView
            intensity={40}
            tint={scheme === 'light' ? 'light' : 'dark'}
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, styles.tint]} />
        </View>

        {/* Sliding highlight */}
        {itemWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              {
                width: itemWidth,
                transform: [
                  { translateX: indicatorX },
                  // Stays upright - it only stretches with the movement ...
                  { scaleX: pillScaleX },
                  // … and gains a little height, stopping just inside the bar.
                  { scaleY: press.interpolate({ inputRange: [0, 1], outputRange: [1, pressedScaleY] }) },
                ],
              },
            ]}
          />
        ) : null}

        {visible.map((route, index) => {
          const options = descriptors[route.key]?.options;
          if (!options) return null;

          const focused = route.key === activeKey;
          const highlighted = hoverIndex === null ? focused : hoverIndex === index;
          const label = typeof options.title === 'string' ? options.title : route.name;
          const tint = highlighted ? colors.primary : colors.textSecondary;

          return (
            <View
              key={route.key}
              // Touches are handled by the bar; this only carries the semantics.
              accessible
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onAccessibilityTap={() => {
                const pressEvent = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !pressEvent.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
              style={styles.item}
            >
              {/* The glyphs stay in the plain text colour throughout - white on
                  dark, black on light; the pill and the label mark the active tab. */}
              <Ionicons name={ICONS[route.name] ?? FALLBACK_ICON} size={23} color={colors.textPrimary} />
              <Text variant="label" numberOfLines={1} style={[styles.label, { color: tint }]}>
                {label}
              </Text>
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
  },
  bar: {
    ...shadows.tile,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ITEM_GAP,
    padding: BAR_PADDING,
    borderRadius: radius.full,
    // The fill is the blur plus its tint, not a flat colour.
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  fillClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.full,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  tint: { backgroundColor: colors.barFill },
  indicator: {
    position: 'absolute',
    top: BAR_PADDING,
    bottom: BAR_PADDING,
    left: 0,
    borderRadius: radius.full,
    backgroundColor: colors.barHighlight,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  label: { fontSize: 10, letterSpacing: 0.2, fontWeight: '600' },
}));

/**
 * Space the floating bar covers, excluding the safe-area inset.
 * Tab screens add this to their bottom padding so nothing hides behind the pill.
 */
export const FLOATING_TAB_BAR_HEIGHT = 78;
