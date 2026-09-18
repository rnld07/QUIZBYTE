import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { makeStyles, radius, spacing } from '@/theme';

/** Where the thumbnail sits on screen – measured before the overlay opens. */
export interface ZoomOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageZoomOverlayProps {
  uri: string;
  origin: ZoomOrigin;
  accessibilityLabel?: string;
  /** Called once the shrink-back animation has finished, to unmount this. */
  onClose: () => void;
}

/** Margin left around the enlarged image. */
const SCREEN_MARGIN = spacing.xl;
/** How much of the screen height the enlarged image may take. */
const MAX_HEIGHT_RATIO = 0.7;

/**
 * Grows the question image out of its thumbnail into the middle of the screen
 * and shrinks it back into the very same spot on dismiss.
 *
 * The enlarged view is laid out at its final rect; the opening transform maps
 * it back onto the thumbnail, so both directions are one interpolation of the
 * same value and the image never jumps.
 */
export function ImageZoomOverlay({ uri, origin, accessibilityLabel, onClose }: ImageZoomOverlayProps) {
  const styles = useStyles();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [progress] = useState(() => new Animated.Value(0));

  const size = Math.min(screenWidth - SCREEN_MARGIN * 2, screenHeight * MAX_HEIGHT_RATIO);
  const targetX = (screenWidth - size) / 2;
  const targetY = (screenHeight - size) / 2;

  const closing = useRef(false);

  /**
   * Grows once the modal window is actually on screen.
   *
   * Not in an effect: a `Modal` opens a native window of its own, and starting
   * the animation before that window exists spends its first frames behind
   * nothing at all – which is the hitch at the beginning.
   */
  const open = () => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
      // Nothing here should wait behind an interaction handle.
      isInteraction: false,
    }).start();
  };

  /**
   * Shrinks back onto the thumbnail and only then unmounts.
   *
   * A timing curve rather than a spring in both directions: a spring swings
   * past its target, so the picture grew a touch too far on the way out and
   * dipped below thumbnail size on the way back. The guard keeps a second tap
   * from restarting the animation halfway through.
   */
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(progress, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
      isInteraction: false,
    }).start(({ finished }) => {
      // One more frame before the window goes: unmounting in the same frame as
      // the last step of the animation drops it a hair short of the thumbnail.
      if (finished) requestAnimationFrame(onClose);
      else onClose();
    });
  };

  // Scale is uniform so the picture never distorts; the smaller axis decides.
  const scale = Math.min(origin.width / size, origin.height / size);
  /**
   * Counter-scaled so the corners look equally round throughout: a fixed radius
   * shrinks with the view and read as square at thumbnail size. Set once rather
   * than animated – an animated radius cannot run on the native driver, and
   * driving the whole motion from JavaScript made it stutter.
   */
  const frameRadius = Math.min(size / 2, radius.lg / scale);
  // Translation between the two centres, in the target view's own coordinates.
  const offsetX = origin.x + origin.width / 2 - (targetX + size / 2);
  const offsetY = origin.y + origin.height / 2 - (targetY + size / 2);

  const interpolate = (from: number, to: number) => progress.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onShow={open} onRequestClose={close}>
      <View style={styles.root}>
        {/* Anywhere beside the image closes it again. */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]} pointerEvents="none" />
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Bild schließen" />

        <Animated.View
          pointerEvents="none"
          // Drawn to a texture once and then scaled, instead of being redrawn
          // every frame. The frame is laid out at its final, largest size and
          // only ever scaled *down*, so nothing is blown up and blurred.
          renderToHardwareTextureAndroid
          shouldRasterizeIOS
          style={[
            styles.frame,
            {
              borderRadius: frameRadius,
              left: targetX,
              top: targetY,
              width: size,
              height: size,
              transform: [
                { translateX: interpolate(offsetX, 0) },
                { translateY: interpolate(offsetY, 0) },
                { scale: interpolate(scale, 1) },
              ],
            },
          ]}
        >
          {/*
            Two copies that cross-fade. The thumbnail crops its picture while
            the enlarged view shows all of it – with a single copy the framing
            would flip at the moment the overlay takes over and hands back,
            which is the jolt on closing.
          */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: interpolate(1, 0) }]}>
            <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={0} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
            <Image
              source={{ uri }}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              cachePolicy="memory-disk"
              // No fade of its own – it would fight the cross-fade around it.
              transition={0}
              accessibilityLabel={accessibilityLabel}
            />
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  root: { flex: 1 },
  backdrop: { backgroundColor: 'rgba(3, 7, 13, 0.9)' },
  frame: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
  },
}));
