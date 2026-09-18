import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { QuizModeDefinition } from '@quizbyte/shared';

import { modeImage } from '@/content/modeImages';
import { makeStyles, radius, spacing, tint, useGradients, useShadows, useThemeColors } from '@/theme';

import { Text } from '../ui';

interface ModeCardProps {
  mode: QuizModeDefinition;
  /** Colour of the category the round will be played in. */
  accent: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  onExplain: () => void;
}

/**
 * One mode in the 2-column grid, built like a category tile but flatter – a
 * mode carries a name and one line, so a square would leave the middle empty.
 *
 * The background is the registered artwork (darkened by a scrim so the label
 * stays readable) or, while none is registered, a gradient in the colour of the
 * category the round will be played in.
 */
export function ModeCard({ mode, accent, loading, disabled, onPress, onExplain }: ModeCardProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const shadows = useShadows();
  const gradients = useGradients();
  const image = modeImage(mode.id);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${mode.name} spielen`}
      accessibilityHint={mode.tagline}
      accessibilityState={{ disabled: Boolean(disabled), busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.card,
        shadows.tile,
        { borderColor: `${accent}${tint.line}` },
        pressed && styles.pressed,
        disabled && !loading && styles.disabled,
      ]}
    >
      {/* Fill layers live in their own clipping view so the drop shadow on the
          pressable itself is not clipped away. */}
      <View style={styles.fillClip}>
        <LinearGradient
          colors={[`${accent}${tint.faint}`, gradients.surface[0], gradients.surface[1]]}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {image ? (
          <>
            <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={150} />
            {/* Scrim – keeps the label readable on any artwork */}
            <LinearGradient colors={gradients.scrim} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
          </>
        ) : null}

        <LinearGradient colors={gradients.edge} style={styles.edge} />
      </View>

      <View style={styles.topRow}>
        {loading ? <ActivityIndicator size="small" color={image ? colors.white : accent} /> : <View />}

        {/*
          Its own hit area: the ⓘ asks what the mode does, it does not start a
          round. `hitSlop` keeps it comfortable without a big visible button.
        */}
        <Pressable
          onPress={onExplain}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`Was ist ${mode.name}?`}
          style={({ pressed }) => [styles.info, pressed && styles.infoPressed]}
        >
          <Ionicons name="information-circle-outline" size={19} color={image ? colors.white : colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.texts}>
        <Text numberOfLines={1} style={[styles.name, image ? styles.nameOnImage : null]}>
          {mode.name}
        </Text>
        <Text variant="label" numberOfLines={2} style={[styles.tagline, image ? styles.taglineOnImage : null]}>
          {mode.tagline}
        </Text>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    // Two per row like the categories, but wider than tall.
    flexBasis: '47%',
    flexGrow: 1,
    maxWidth: '48%',
    aspectRatio: 1.22,
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.xxl,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.5 },
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
  // The empty view on the left keeps the ⓘ on the right whether or not the
  // spinner is showing.
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  info: { width: 26, height: 26, alignItems: 'flex-end', justifyContent: 'flex-start' },
  infoPressed: { opacity: 0.5 },
  texts: { gap: 2 },
  name: { fontSize: 17, lineHeight: 21, fontWeight: '800', letterSpacing: -0.3, color: colors.textPrimary },
  nameOnImage: { color: colors.white },
  tagline: { fontSize: 11, lineHeight: 15, color: colors.textSecondary },
  taglineOnImage: { color: 'rgba(255, 255, 255, 0.82)' },
}));
