import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { FixedTheme, makeStyles, radius, spacing, useGradients, useThemeColors } from '@/theme';

import { Text } from '../ui';

export interface SheetAction {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  /** One line under the label saying what it does. */
  hint?: string;
  /** `danger` paints it red – for the ones that cannot be undone by tapping again. */
  tone?: 'default' | 'danger';
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  /** Who or what the actions are about. */
  title: string;
  actions: readonly SheetAction[];
  onClose: () => void;
}

/**
 * The list behind a three-dot button.
 *
 * Rises from the bottom, where a thumb already is, and closes on a tap beside
 * it. Every action says what it does under its own label: these are the rare,
 * heavy ones, and a row of bare verbs is how people press the wrong one.
 */
function ActionSheetBody({ visible, title, actions, onClose }: ActionSheetProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const gradients = useGradients();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Schließen" />

        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.fillClip}>
            <LinearGradient colors={gradients.dialog} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={gradients.edge} style={styles.edge} />
          </View>

          <View style={styles.grip} />
          <Text variant="label" color="muted" style={styles.title} numberOfLines={1}>
            {title}
          </Text>

          {actions.map((action, index) => {
            const tone = action.tone === 'danger' ? colors.danger : colors.textPrimary;
            return (
              <View key={action.label}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  onPress={action.onPress}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  accessibilityHint={action.hint}
                  style={({ pressed }) => [styles.action, pressed && styles.pressed]}
                >
                  <Ionicons name={action.icon} size={20} color={tone} />
                  <View style={styles.actionText}>
                    <Text variant="bodyStrong" style={{ color: tone }}>
                      {action.label}
                    </Text>
                    {action.hint ? (
                      <Text variant="caption" color="muted">
                        {action.hint}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              </View>
            );
          })}

          <View style={styles.divider} />
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Abbrechen"
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={20} color={colors.textSecondary} />
            <Text variant="bodyStrong" color="secondary">
              Abbrechen
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors, shadows) => ({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(3, 7, 13, 0.7)' },
  sheet: {
    ...shadows.tile,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    borderTopWidth: 1,
    borderColor: colors.borderStrong,
  },
  fillClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xxl - 1,
    borderTopRightRadius: radius.xxl - 1,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  edge: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },

  grip: { alignSelf: 'center', width: 38, height: 4, borderRadius: 999, backgroundColor: colors.borderStrong },
  title: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xs },
  divider: { height: 1, marginHorizontal: spacing.xl, backgroundColor: colors.border },

  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  actionText: { flex: 1, gap: 1 },
  pressed: { opacity: 0.6 },
}));

/** Dark whatever the theme, like every sheet that sits on the black scrim. */
export function ActionSheet(props: ActionSheetProps) {
  return (
    <FixedTheme scheme="dark">
      <ActionSheetBody {...props} />
    </FixedTheme>
  );
}
