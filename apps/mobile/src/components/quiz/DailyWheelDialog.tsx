import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { FixedTheme, makeStyles, radius, spacing, useGradients } from '@/theme';

import { IconButton, Text } from '../ui';
import { DailyWheelCard } from './DailyWheelCard';

interface DailyWheelDialogProps {
  visible: boolean;
  /** What today's spin paid, or null while it has not been spun. */
  xpWon: number | null;
  spinning: boolean;
  error?: string | null;
  onSpin: () => void;
  onClose: () => void;
}

/**
 * The prize wheel, in front of everything else.
 *
 * A flawless daily round is rare enough to interrupt for, and the sheet solves
 * a second thing on its own: inside a modal there is no page underneath to
 * scroll, so a finger turning the wheel turns only the wheel.
 *
 * The card inside is the same one the result page uses – this only puts a
 * window around it.
 */
function DailyWheelDialogBody({ visible, xpWon, spinning, error, onSpin, onClose }: DailyWheelDialogProps) {
  const styles = useStyles();
  const gradients = useGradients();

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Nicht waehrend der Drehung: ein Fingertipp daneben, waehrend das Rad
            laeuft, haette das Ergebnis weggenommen, bevor es zu sehen war. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          disabled={spinning}
          accessibilityLabel="Schließen"
        />

        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.fillClip}>
            <LinearGradient colors={gradients.dialog} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={gradients.edge} style={styles.edge} />
          </View>

          <View style={styles.header}>
            <Text variant="label" style={styles.eyebrow}>
              FEHLERFREI
            </Text>
            <IconButton icon="close" accessibilityLabel="Schließen" size={20} disabled={spinning} onPress={onClose} />
          </View>

          <View style={styles.body}>
            <DailyWheelCard xpWon={xpWon} spinning={spinning} error={error} onSpin={onSpin} onDone={onClose} bare />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors, shadows) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 13, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    ...shadows.tile,
    width: '100%',
    maxWidth: 380,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
    paddingTop: spacing.md,
  },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.warning },
  body: { paddingHorizontal: spacing.lg },
}));

/** Dark whatever the theme, like every dialog in the app. */
export function DailyWheelDialog(props: DailyWheelDialogProps) {
  return (
    <FixedTheme scheme="dark">
      <DailyWheelDialogBody {...props} />
    </FixedTheme>
  );
}
