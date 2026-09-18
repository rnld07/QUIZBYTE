import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { FixedTheme, makeStyles, radius, spacing, typography, useGradients, useThemeColors } from '@/theme';

import { Button, IconButton, Text } from '../ui';

/** One thing that can be wrong, as offered in the form. */
export interface ReportOption<Reason extends string> {
  value: Reason;
  label: string;
  hint: string;
}

export const MAX_REPORT_DETAILS = 1000;

interface ReportSheetProps<Reason extends string> {
  visible: boolean;
  /** Small line above the title – a category, a username. */
  eyebrow: string;
  title: string;
  /** One line about what is being reported, shown above the reasons. */
  subject?: string;
  /** Heading over the list of reasons, in capitals. */
  question: string;
  options: readonly ReportOption<Reason>[];
  placeholder: string;
  /** Shown once it has been filed. */
  doneTitle: string;
  doneText: string;
  pending: boolean;
  error?: string | null;
  onSubmit: (reason: Reason, details: string) => void;
  /** True once the report is on file, which swaps the form for the thank-you. */
  sent: boolean;
  onClose: () => void;
}

/**
 * The form behind every "report" in the app: pick a reason, add a sentence.
 *
 * One component for questions and for people. What is reported differs only in
 * its wording and its list of reasons, and two copies of a form is two places
 * to fix the next time something about reporting changes.
 */
function ReportSheetBody<Reason extends string>({
  visible,
  eyebrow,
  title,
  subject,
  question,
  options,
  placeholder,
  doneTitle,
  doneText,
  pending,
  error,
  onSubmit,
  sent,
  onClose,
}: ReportSheetProps<Reason>) {
  const styles = useStyles();
  const colors = useThemeColors();
  const gradients = useGradients();
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState('');

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Schließen" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.fillClip}>
            <LinearGradient colors={gradients.dialog} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={gradients.edge} style={styles.edge} />
          </View>

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text variant="label" style={styles.eyebrow}>
                {eyebrow}
              </Text>
              <Text variant="headline" style={styles.headerTitle}>
                {title}
              </Text>
            </View>
            <IconButton icon="close" accessibilityLabel="Schließen" size={20} onPress={onClose} />
          </View>

          {sent ? (
            <View style={styles.done}>
              <View style={styles.doneIcon}>
                <Ionicons name="checkmark" size={26} color={colors.success} />
              </View>
              <Text variant="bodyStrong" style={styles.doneTitle}>
                {doneTitle}
              </Text>
              <Text variant="caption" color="muted" style={styles.doneText}>
                {doneText}
              </Text>
              <Button title="Schließen" onPress={onClose} style={styles.doneButton} />
            </View>
          ) : (
            <>
              <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
                {subject ? (
                  <Text variant="caption" color="muted" numberOfLines={3} style={styles.subject}>
                    {subject}
                  </Text>
                ) : null}

                <Text variant="label" style={styles.blockTitle}>
                  {question}
                </Text>
                <View style={styles.reasons}>
                  {options.map((entry) => {
                    const active = reason === entry.value;
                    return (
                      <Pressable
                        key={entry.value}
                        onPress={() => setReason(entry.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={entry.label}
                        accessibilityHint={entry.hint}
                        style={({ pressed }) => [styles.reason, active && styles.reasonActive, pressed && styles.reasonPressed]}
                      >
                        <Ionicons
                          name={active ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={active ? colors.primary : colors.textMuted}
                        />
                        <View style={styles.reasonText}>
                          <Text variant="bodyStrong" style={[styles.reasonLabel, active && styles.reasonLabelActive]}>
                            {entry.label}
                          </Text>
                          <Text variant="caption" color="muted">
                            {entry.hint}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <Text variant="label" style={styles.blockTitle}>
                  BEGRÜNDUNG (OPTIONAL)
                </Text>
                <TextInput
                  value={details}
                  onChangeText={setDetails}
                  multiline
                  maxLength={MAX_REPORT_DETAILS}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  accessibilityLabel="Begründung"
                />
                <Text variant="caption" color="muted" style={styles.counter}>
                  {details.length} / {MAX_REPORT_DETAILS}
                </Text>

                {error ? (
                  <Text color="danger" style={styles.error}>
                    {error}
                  </Text>
                ) : null}
              </ScrollView>

              <View style={styles.actions}>
                <Button
                  title="Melden"
                  onPress={() => reason && onSubmit(reason, details)}
                  disabled={!reason}
                  loading={pending}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors, shadows) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 13, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    ...shadows.tile,
    width: '100%',
    maxWidth: 380,
    maxHeight: '86%',
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
  /** Lets the sheet's maxHeight clip the form instead of overflowing. */
  scroll: { flexShrink: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerText: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.textMuted },
  headerTitle: { letterSpacing: -0.2, color: colors.textPrimary },
  body: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, gap: spacing.sm },
  subject: { marginBottom: spacing.xs },
  blockTitle: { fontSize: 10, letterSpacing: 1.2, color: colors.textMuted, marginTop: spacing.sm },

  reasons: { gap: spacing.xs },
  reason: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfacePressed,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  reasonPressed: { opacity: 0.7 },
  reasonText: { flex: 1, gap: 2 },
  reasonLabel: { fontSize: 14, color: colors.textPrimary },
  reasonLabelActive: { color: colors.primary },

  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  counter: { textAlign: 'right' },
  error: { marginTop: spacing.xs },
  actions: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },

  done: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  doneIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
  doneTitle: { color: colors.textPrimary },
  doneText: { textAlign: 'center' },
  doneButton: { alignSelf: 'stretch', marginTop: spacing.sm },
}));

/**
 * Dialogs are dark whatever theme the user picked: they sit on a black scrim
 * over the whole screen, and a white sheet there is a flashbang. The body is a
 * separate component so its styles resolve inside this scheme.
 */
export function ReportSheet<Reason extends string>(props: ReportSheetProps<Reason>) {
  return (
    <FixedTheme scheme="dark">
      <ReportSheetBody {...props} />
    </FixedTheme>
  );
}
