import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Subtle pulsing placeholder that keeps the layout stable while loading. */
export function Skeleton({ width = '100%', height = 16, borderRadius = radius.sm, style }: SkeletonProps) {
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[styles.base, { width, height, borderRadius, opacity }, style]} />;
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.surfaceElevated },
});
