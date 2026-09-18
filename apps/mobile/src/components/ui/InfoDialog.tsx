import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

import { FixedTheme, makeStyles, radius, spacing, useGradients, useThemeColors } from '@/theme';

import { Text } from './Text';

type IoniconName = keyof typeof Ionicons.glyphMap;

export interface InfoContent {
  title: string;
  message?: string;
  /** Small line above the title, e.g. a category name. */
  eyebrow?: string;
  icon?: IoniconName;
  /** Artwork shown instead of the icon – a picture says more than a glyph. */
  image?: ImageSourcePropType;
  /**
   * A transparent symbol shown instead of the icon.
   *
   * Separate from `image`: artwork fills a framed box in the tile's proportion,
   * a symbol stands free and keeps its own shape.
   */
  symbol?: ImageSourcePropType;
  /**
   * Colour of the icon. `accent` is the app's blue; `neutral` suits anything
   * that is not an invitation to tap, like "coming soon".
   */
  tone?: 'accent' | 'neutral';
  /** Label of the single dismiss button. */
  actionLabel?: string;
}

/**
 * The card itself, without a Modal around it.
 *
 * Exported separately because React Native cannot stack Modals reliably: a
 * dialog opened from inside another one renders this as a plain overlay.
 */
function InfoCardBody({
  title,
  message,
  eyebrow,
  icon = 'sparkles-outline',
  image,
  symbol,
  tone = 'accent',
  actionLabel = 'Verstanden',
  onClose,
}: InfoContent & { onClose: () => void }) {
  const styles = useStyles();
  const colors = useThemeColors();
  const gradients = useGradients();
  return (
    <View style={styles.card} accessibilityViewIsModal>
      <View style={styles.fillClip}>
        <LinearGradient colors={gradients.dialog} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={gradients.edge} style={styles.edge} />
      </View>

      {image ? (
        // Wider than the icon box and in the tile's own proportion, so the
        // artwork is recognisable as the same picture.
        <View style={styles.imageWrap}>
          <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={150} />
        </View>
      ) : symbol ? (
        // No plate behind it: a symbol with a transparent background brings its
        // own silhouette, and a box would only crowd it.
        <Image source={symbol} style={styles.symbol} contentFit="contain" cachePolicy="memory-disk" />
      ) : (
        <View style={[styles.iconWrap, tone === 'neutral' && styles.iconWrapNeutral]}>
          <Ionicons name={icon} size={20} color={tone === 'neutral' ? colors.textSecondary : colors.primary} />
        </View>
      )}

      {eyebrow ? (
        <Text variant="label" align="center" style={styles.eyebrow} numberOfLines={1}>
          {eyebrow}
        </Text>
      ) : null}

      <Text align="center" style={styles.title}>
        {title}
      </Text>

      {message ? (
        <Text color="secondary" align="center" style={styles.message}>
          {message}
        </Text>
      ) : null}

      <Pressable onPress={onClose} accessibilityRole="button" style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
        <Text variant="bodyStrong" style={styles.actionText}>
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

/** Full-screen overlay version – for a dialog opened from inside another one. */
export function InfoOverlay({ visible, onClose, ...content }: InfoContent & { visible: boolean; onClose: () => void }) {
  const styles = useStyles();
  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Schließen" />
      <InfoCard {...content} onClose={onClose} />
    </View>
  );
}

/** Small centred dialog for short hints – closes on the button or the backdrop. */
export function InfoDialog({ visible, onClose, ...content }: InfoContent & { visible: boolean; onClose: () => void }) {
  const styles = useStyles();
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Schließen" />
        <InfoCard {...content} onClose={onClose} />
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 13, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    ...shadows.tile,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
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
  edge: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginBottom: spacing.lg,
  },
  iconWrapNeutral: { backgroundColor: colors.surfacePressed, borderColor: colors.border },
  symbol: { width: 76, height: 76, marginBottom: spacing.lg },
  imageWrap: {
    width: 132,
    aspectRatio: 1.22,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginBottom: spacing.lg,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  message: {
    marginTop: spacing.sm,
    fontSize: 14,
    lineHeight: 20,
  },
  action: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  actionPressed: { opacity: 0.65 },
  actionText: { color: colors.primary, letterSpacing: 0.2 },
}));

/**
 * Dialogs are dark whatever the theme the user picked: they sit on a black
 * scrim over the whole screen, and a white sheet there is a flashbang. The
 * body is a separate component so its styles resolve inside this scheme.
 */
export function InfoCard(props: Parameters<typeof InfoCardBody>[0]) {
  return (
    <FixedTheme scheme="dark">
      <InfoCardBody {...props} />
    </FixedTheme>
  );
}
