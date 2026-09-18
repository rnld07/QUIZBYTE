import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { Button, Card, IconButton, Screen, Text } from '@/components/ui';
import { useSubmitIdea } from '@/features/ideas/useIdeas';
import type { IdeaArea } from '@/services/api/ideasApi';
import { getUserMessage } from '@/services/errors';
import { makeStyles, radius, spacing, typography, useThemeColors } from '@/theme';

const AREA_OPTIONS: { value: IdeaArea; label: string }[] = [
  { value: 'questions', label: 'Fragen' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'progress', label: 'Fortschritt' },
  { value: 'design', label: 'Design' },
  { value: 'other', label: 'Sonstiges' },
];

const MAX_TITLE = 120;
const MAX_DETAILS = 2000;
const MIN_TITLE = 3;

export default function IdeasScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const submit = useSubmitIdea();
  const [area, setArea] = useState<IdeaArea>('questions');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');

  const canSubmit = title.trim().length >= MIN_TITLE;

  const send = () => {
    if (!canSubmit) return;
    submit.mutate(
      { area, title, details },
      {
        onSuccess: () => {
          setTitle('');
          setDetails('');
        },
      },
    );
  };

  return (
    <Screen backdrop={<AmbientBackground />}>
      <View style={styles.topBar}>
        <Text variant="headline">Deine Idee</Text>
        <IconButton icon="close" accessibilityLabel="Schließen" onPress={() => router.back()} />
      </View>

      <Text variant="caption" color="muted" style={styles.intro}>
        Was fehlt dir in QuizByte? Schreib es auf – jede Idee landet direkt bei uns.
      </Text>

      <Card style={styles.form}>
        <Text variant="label" style={styles.blockTitle}>
          WORUM GEHT ES?
        </Text>
        {/* Chips rather than a segmented control: five labels of unequal length
            would be truncated in equal-width segments. */}
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Bereich">
          {AREA_OPTIONS.map((option) => {
            const active = option.value === area;
            return (
              <Pressable
                key={option.value}
                onPress={() => setArea(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={option.label}
                style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.chipPressed]}
              >
                <Text variant="label" style={[styles.chipText, active && styles.chipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text variant="label" style={styles.blockTitle}>
          IDEE
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={MAX_TITLE}
          placeholder="In einem Satz"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          accessibilityLabel="Idee"
        />

        <Text variant="label" style={styles.blockTitle}>
          BESCHREIBUNG (OPTIONAL)
        </Text>
        <TextInput
          value={details}
          onChangeText={setDetails}
          multiline
          maxLength={MAX_DETAILS}
          placeholder="Wie stellst du dir das vor?"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.textarea]}
          accessibilityLabel="Beschreibung"
        />
        <Text variant="caption" color="muted" style={styles.counter}>
          {details.length} / {MAX_DETAILS}
        </Text>

        {submit.isError ? (
          <Text color="danger" style={styles.error}>
            {getUserMessage(submit.error)}
          </Text>
        ) : null}
        {submit.isSuccess && !canSubmit ? (
          <View style={styles.sentRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text variant="caption" color="success">
              Danke! Deine Idee ist angekommen.
            </Text>
          </View>
        ) : null}

        <Button title="Idee senden" onPress={send} disabled={!canSubmit} loading={submit.isPending} style={styles.submit} />
      </Card>
    </Screen>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  intro: { marginBottom: spacing.lg },
  form: { gap: spacing.sm, marginBottom: spacing.xl },
  blockTitle: { fontSize: 10, letterSpacing: 1.2, color: colors.textMuted, marginTop: spacing.sm },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfacePressed,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipPressed: { opacity: 0.7 },
  chipText: { fontSize: 12, color: colors.textSecondary },
  chipTextActive: { color: colors.white, fontWeight: '700' },
  counter: { textAlign: 'right' },
  error: { marginTop: spacing.xs },
  sentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  submit: { marginTop: spacing.md },

  sectionTitle: { marginBottom: spacing.sm },
  list: { marginBottom: spacing.lg },
  skeletons: { gap: spacing.sm },
  empty: { paddingVertical: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, color: colors.textPrimary },
  status: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusText: { fontSize: 9, letterSpacing: 0.4 },
}));
