import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, View } from 'react-native';

import type { Difficulty } from '@quizbyte/shared';

import { useRetuneRound } from '@/features/quiz/useRetuneRound';
import { analytics } from '@/services/analytics/analytics';
import { useQuizSessionStore } from '@/state/quizSessionStore';
import { useSettingsStore } from '@/state/settingsStore';
import { FixedTheme, makeStyles, radius, spacing, useGradients, useThemeColors } from '@/theme';

import { IconButton, Text } from '../ui';
import { DifficultyPicker } from './DifficultyPicker';
import { DifficultyXpOverlay } from './XpInfoDialog';

interface QuizSettingsDialogProps {
  visible: boolean;
  onClose: () => void;
}

/** Quick settings while a quiz is running: difficulty and question audio. */
function QuizSettingsDialogBody({ visible, onClose }: QuizSettingsDialogProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const gradients = useGradients();
  const autoPlayAudio = useSettingsStore((state) => state.autoPlayAudio);
  const setAutoPlayAudio = useSettingsStore((state) => state.setAutoPlayAudio);
  const difficulties = useSettingsStore((state) => state.difficulties);
  const setDifficulties = useSettingsStore((state) => state.setDifficulties);
  const onlyNewQuestions = useSettingsStore((state) => state.onlyNewQuestions);
  const setOnlyNewQuestions = useSettingsStore((state) => state.setOnlyNewQuestions);
  const { retune } = useRetuneRound();
  // Nur Kategorie- und Zufallsrunden lassen sich neu ziehen; Daily, Duell und
  // Wiederholungen haben einen festen Fragensatz.
  const retunes = useQuizSessionStore((state) => state.active?.retunable ?? false);
  const [xpInfo, setXpInfo] = useState(false);

  /**
   * Applies a new selection straight away. The dialog deliberately stays open:
   * the point is to try levels out and see the question behind it change.
   */
  const changeDifficulties = (value: Difficulty[]) => {
    setDifficulties(value);
    void retune(value);
    analytics.track('settings_changed', { setting: 'difficulty', value: value.length === 0 ? 'all' : value.join('+') });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Schließen" />
        <View style={styles.card} accessibilityViewIsModal>
          <View style={styles.fillClip}>
            <LinearGradient colors={gradients.dialog} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={gradients.edge} style={styles.edge} />
          </View>

          <View style={styles.header}>
            <Text variant="headline" style={styles.headerTitle}>
              Einstellungen
            </Text>
            <IconButton icon="close" accessibilityLabel="Schließen" size={20} onPress={onClose} />
          </View>

          {/* Difficulty */}
          <View style={styles.block}>
            <View style={styles.blockHead}>
              <Text variant="label" style={styles.blockTitle}>
                SCHWIERIGKEIT
              </Text>
              <Pressable
                onPress={() => setXpInfo(true)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="XP-Verteilung anzeigen"
                style={({ pressed }) => pressed && styles.infoPressed}
              >
                <Ionicons name="information-circle-outline" size={17} color={colors.textSecondary} />
              </Pressable>
            </View>
            <DifficultyPicker value={difficulties} onChange={changeDifficulties} />
            <Text variant="caption" color="muted">
              {retunes
                ? 'Wirkt sofort: schon beantwortete Fragen bleiben, der Rest wird neu gezogen.'
                : 'Gilt ab dem nächsten Quiz – diese Runde hat einen festen Fragensatz.'}
            </Text>
          </View>

          {/* Only unanswered questions */}
          <View style={styles.soundRow}>
            <Ionicons
              name={onlyNewQuestions ? 'sparkles' : 'albums-outline'}
              size={20}
              color={onlyNewQuestions ? colors.primary : colors.textMuted}
            />
            <View style={styles.soundText}>
              <Text variant="bodyStrong" style={styles.soundLabel}>
                Neue Fragen zuerst
              </Text>
              <Text variant="caption" color="muted">
                {onlyNewQuestions ? 'Beantwortete kommen erst, wenn neue fehlen' : 'Alle Fragen der Kategorie'}
              </Text>
            </View>
            <Switch
              value={onlyNewQuestions}
              onValueChange={(value) => {
                setOnlyNewQuestions(value);
                analytics.track('settings_changed', { setting: 'only_new_questions', value });
              }}
              accessibilityLabel="Neue Fragen zuerst"
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>

          {/* Read the question out by itself */}
          <View style={[styles.soundRow, styles.tightRow]}>
            <Ionicons name={autoPlayAudio ? 'volume-high' : 'volume-medium-outline'} size={20} color={autoPlayAudio ? colors.primary : colors.textMuted} />
            <View style={styles.soundText}>
              <Text variant="bodyStrong" style={styles.soundLabel}>
                Sound automatisch abspielen
              </Text>
              <Text variant="caption" color="muted">
                {autoPlayAudio ? 'Jede neue Frage wird vorgelesen' : 'Zum Vorlesen auf die Frage tippen'}
              </Text>
            </View>
            <Switch
              value={autoPlayAudio}
              onValueChange={(value) => {
                setAutoPlayAudio(value);
                analytics.track('settings_changed', { setting: 'auto_play_audio', value });
              }}
              accessibilityLabel="Sound automatisch abspielen"
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Sits inside this modal, on top of the card. */}
        <DifficultyXpOverlay visible={xpInfo} onClose={() => setXpInfo(false)} />
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
    padding: spacing.lg,
  },
  card: {
    ...shadows.tile,
    width: '100%',
    maxWidth: 360,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
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
    marginHorizontal: -spacing.sm,
    paddingLeft: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: { color: colors.textPrimary },

  block: { gap: spacing.sm, marginTop: spacing.sm },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  blockTitle: { fontSize: 10, letterSpacing: 1.2, color: colors.textMuted },
  infoPressed: { opacity: 0.6 },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tightRow: { marginTop: spacing.lg },
  soundText: { flex: 1, gap: 2 },
  soundLabel: { fontSize: 15, color: colors.textPrimary },
}));

/**
 * Dialogs are dark whatever the theme the user picked: they sit on a black
 * scrim over the whole screen, and a white sheet there is a flashbang. The
 * body is a separate component so its styles resolve inside this scheme.
 */
export function QuizSettingsDialog(props: Parameters<typeof QuizSettingsDialogBody>[0]) {
  return (
    <FixedTheme scheme="dark">
      <QuizSettingsDialogBody {...props} />
    </FixedTheme>
  );
}
