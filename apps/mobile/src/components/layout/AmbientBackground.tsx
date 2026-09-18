import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { makeStyles, useGradients } from '@/theme';

/**
 * Ambient backdrop for the start screen: a navy gradient plus a soft accent
 * halo behind the header. Purely decorative – never receives touches.
 */
export function AmbientBackground() {
  const styles = useStyles();
  const gradients = useGradients();
  return (
    <View style={[StyleSheet.absoluteFill, styles.noTouch]}>
      <LinearGradient colors={gradients.screen} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={gradients.halo} locations={[0, 0.5, 1]} style={styles.halo} />
    </View>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  noTouch: { pointerEvents: 'none' },
  halo: {
    position: 'absolute',
    top: -140,
    left: -80,
    right: -80,
    height: 420,
    borderRadius: 999,
    opacity: 0.9,
  },
}));
