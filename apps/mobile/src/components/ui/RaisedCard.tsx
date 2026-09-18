import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { makeStyles, radius, useGradients } from '@/theme';

interface RaisedCardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  /** Soft accent bloom in the top-left corner. */
  glow?: string;
  /**
   * Dunkler als die übrigen Karten.
   *
   * Für den Kopf einer Seite: was ganz oben steht und alles Weitere einleitet,
   * darf tiefer liegen als das, was darunter folgt.
   */
  deep?: boolean;
}

/**
 * Card surface with real depth: gradient fill, a hairline highlight along the
 * top edge, an optional accent bloom and a drop shadow. Used wherever a flat
 * fill looked lifeless against the ambient background.
 */
export function RaisedCard({ children, style, glow, deep = false }: RaisedCardProps) {
  const styles = useStyles();
  const gradients = useGradients();
  return (
    <View style={[styles.card, style]}>
      <View style={styles.fillClip}>
        <LinearGradient
          colors={deep ? gradients.surfaceDeep : gradients.surface}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {glow ? <View style={[styles.glow, { backgroundColor: glow }]} /> : null}
        <LinearGradient colors={gradients.edge} style={styles.edge} />
      </View>
      {children}
    </View>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  card: {
    ...shadows.tile,
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
  glow: {
    position: 'absolute',
    top: -70,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 999,
  },
  edge: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
}));
