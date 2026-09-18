import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { makeStyles, radius, spacing, useGradients, useThemeColors } from '@/theme';

import { statIcon } from '@/content/statIcons';
import type { StatIconKey } from '@/content/statIcons';

import { AppIcon, Card, Skeleton, Text } from '../ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface StatTileProps {
  label: string;
  value: string;
  icon?: IoniconName;
  /** Key of the custom symbol for this figure, when one is registered. */
  art?: StatIconKey;
  /** Colour for the icon and – when set – the value. */
  tone?: string;
  loading?: boolean;
  /** Makes the tile tappable – on the analysis page it opens the week's chart. */
  onPress?: () => void;
  /**
   * Ohne Feld darum – nur die Zahl mit ihrer Beschriftung.
   *
   * Für Seiten, auf denen viele davon untereinander stehen: im Profil war die
   * Wand aus Kästchen lauter als das, was darin steht. Wo eine Kachel angetippt
   * werden kann, bleibt der Rahmen – ohne ihn sähe sie nicht mehr nach etwas
   * aus, das man drücken kann.
   */
  bare?: boolean;
}

/**
 * One number with its label.
 *
 * The icon sits on a plate tinted in the tile's own colour – without it the
 * grid reads as a wall of grey boxes next to the coloured cards around it.
 */
export function StatTile({ label, value, icon, art, tone, loading, onPress, bare = false }: StatTileProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const gradients = useGradients();
  const accent = tone ?? colors.primary;

  const content = (
    <>
      {/* The same layered fill the cards elsewhere use: a flat block between
          them read as a hole in the page. Its own clipping view keeps the
          rounded corners without cutting off the drop shadow. */}
      {bare ? null : (
        <View style={styles.fillClip}>
          <LinearGradient colors={gradients.surface} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 1 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={gradients.edge} style={styles.edge} />
        </View>
      )}

      {loading ? (
        <Skeleton width={64} height={28} />
      ) : (
        <View style={styles.valueRow}>
          {/* No plate behind it: the symbols bring their own shape, and a
              tinted square around each one boxed the grid in. */}
          {icon ? (
            <AppIcon source={art ? statIcon(art) : undefined} fallback={icon} size={28} glyphSize={18} color={accent} />
          ) : null}
          <Text style={[styles.value, { color: accent }]}>{value}</Text>
        </View>
      )}
      <Text variant="caption" color="secondary">
        {label}
      </Text>
    </>
  );

  // The width belongs to whichever element sits in the grid – the card on its
  // own, or the pressable that wraps it.
  if (bare) {
    return <View style={[styles.slot, styles.bare]}>{content}</View>;
  }

  if (!onPress) {
    return (
      <Card padding="md" style={[styles.slot, styles.tile, { borderColor: `${accent}3D` }]}>
        {content}
      </Card>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${value} ${label}`}
      accessibilityHint="Zeigt die letzten sieben Tage"
      style={({ pressed }) => [styles.slot, pressed && styles.pressed]}
    >
      {/* Filling the pressable is what keeps the tiles level: the grid
          stretches its children to the height of the tallest in the row, and
          without this the card inside only took the height of its own words –
          which is why the two with the shortest labels came out short. */}
      <Card padding="md" style={[styles.fill, styles.tile, { borderColor: `${accent}3D` }]}>
        {content}
      </Card>
    </Pressable>
  );
}

/**
 * Das Raster, in dem die Kacheln stehen.
 *
 * `tight` rückt die Zeilen zusammen – für die Profile, wo vier rahmenlose
 * Kacheln untereinander stehen und der Abstand einer Kachel der Abstand zur
 * nächsten war.
 */
export function StatGrid({ children, tight = false }: { children: React.ReactNode; tight?: boolean }) {
  const styles = useStyles();
  return <View style={[styles.grid, tight && styles.gridTight]}>{children}</View>;
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  // Just under half, so two sit side by side with the gap between them.
  slot: { flexBasis: '47%', flexGrow: 1 },
  fill: { flex: 1 },
  // Dieselbe Höhe wie eine Kachel mit `padding="md"`, damit ein Raster aus
  // beiden Sorten nicht unterschiedlich dicht säße.
  bare: { gap: 2, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  tile: {
    ...shadows.tile,
    gap: spacing.xs,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'visible',
  },
  fillClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.xl - 1,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  edge: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 30,
  },
  pressed: { opacity: 0.7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  // Nur die Zeilen: nebeneinander brauchen die Zahlen ihren Abstand weiterhin.
  gridTight: { rowGap: 0 },
}));
