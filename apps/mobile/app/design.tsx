import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { Card, IconButton, Screen, Text } from '@/components/ui';
import { themeImage } from '@/content/themeImages';
import { useSettingsStore } from '@/state/settingsStore';
import { makeStyles, radius, spacing, useTheme, useThemeColors } from '@/theme';
import type { ThemeMode } from '@/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

const OPTIONS: { value: ThemeMode; label: string; description: string; icon: IoniconName }[] = [
  { value: 'light', label: 'Hell', description: 'Weiße Flächen, dunkle Schrift', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dunkel', description: 'Das gewohnte QuizByte-Design', icon: 'moon-outline' },
  { value: 'system', label: 'System', description: 'Folgt der Einstellung deines Geräts', icon: 'phone-portrait-outline' },
];

export default function DesignScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const mode = useSettingsStore((state) => state.themeMode);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);
  const { scheme } = useTheme();

  return (
    <Screen backdrop={<AmbientBackground />}>
      <View style={styles.topBar}>
        <Text variant="headline">Design</Text>
        <IconButton icon="close" accessibilityLabel="Schließen" onPress={() => router.back()} />
      </View>

      <Text variant="caption" color="muted" style={styles.intro}>
        Die Umstellung greift sofort. Farbige Elemente – Kategoriebilder, Akzente und die Auswertungsfarben – bleiben in beiden
        Designs gleich.
      </Text>

      <Card padding="xs">
        {OPTIONS.map((option, index) => {
          const active = mode === option.value;
          const image = themeImage(option.value);
          return (
            <Pressable
              key={option.value}
              onPress={() => setThemeMode(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option.label}
              accessibilityHint={option.description}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              {index > 0 ? <View style={styles.divider} /> : null}
              <View style={[styles.icon, active && styles.iconActive]}>
                {/* Your own symbol where one is registered – see
                    `assets/theme/README.md`; otherwise the built-in glyph.
                    It fills the whole circle and is cropped to it, so a square
                    picture comes out round instead of sitting in a corner. */}
                {image ? (
                  <Image source={image} style={styles.iconImage} contentFit="cover" cachePolicy="memory-disk" />
                ) : (
                  <Ionicons name={option.icon} size={19} color={active ? colors.primary : colors.textSecondary} />
                )}
              </View>

              <View style={styles.texts}>
                <Text variant="bodyStrong" style={styles.label}>
                  {option.label}
                </Text>
                <Text variant="caption" color="muted">
                  {option.value === 'system' ? `${option.description} – gerade ${scheme === 'light' ? 'hell' : 'dunkel'}` : option.description}
                </Text>
              </View>

              <Ionicons
                name={active ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={active ? colors.primary : colors.textMuted}
              />
            </Pressable>
          );
        })}
      </Card>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  intro: { marginBottom: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowPressed: { opacity: 0.65 },
  // Sits on the row's top edge instead of between the rows, so the divider does
  // not break the press feedback into two pieces.
  divider: { position: 'absolute', top: 0, left: spacing.lg, right: spacing.lg, height: 1, backgroundColor: colors.border },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    // Crops a full-bleed picture to the circle; the ring stays visible around it.
    overflow: 'hidden',
  },
  iconActive: { backgroundColor: colors.primarySoft, borderColor: colors.borderStrong },
  // Rounded itself as well: Android does not always clip a child to its
  // parent's radius, and then a square corner pokes out of the ring.
  iconImage: { width: '100%', height: '100%', borderRadius: radius.full },
  texts: { flex: 1, gap: 2 },
  label: { fontSize: 15, color: colors.textPrimary },
}));
