import { ActivityIndicator, Pressable, View } from 'react-native';

import { dailyTaskByKey, isDailyTaskClaimable, isDailyTaskDone } from '@quizbyte/shared';
import type { DailyTaskKey, DailyTaskProgress } from '@quizbyte/shared';

import { statIcon } from '@/content/statIcons';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { AppIcon, ProgressBar, Skeleton, Text } from '../ui';

interface DailyTasksCardProps {
  tasks: readonly DailyTaskProgress[];
  loading?: boolean;
  /** Which one is being collected right now, so only that row spins. */
  claiming: DailyTaskKey | null;
  onClaim: (key: DailyTaskKey) => void;
}

/**
 * The three things today asks of you.
 *
 * Progress is read back from the day's rounds rather than tracked as you play,
 * so a task moves when you next look at it – and the XP has to be collected by
 * hand. That last bit is deliberate: a reward that lands silently is one nobody
 * notices they earned.
 */
export function DailyTasksCard({ tasks, loading, claiming, onClaim }: DailyTasksCardProps) {
  const styles = useStyles();

  if (loading) {
    return (
      <View style={styles.card}>
        <Skeleton height={46} borderRadius={12} />
        <Skeleton height={46} borderRadius={12} />
        <Skeleton height={46} borderRadius={12} />
      </View>
    );
  }

  if (tasks.length === 0) return null;

  return (
    /*
      No card around them and no lines between them: each task already sits on
      its own coloured block, and a frame around three frames was one too many.
    */
    <View style={styles.card}>
      {tasks.map((task) => (
        <TaskRow key={task.key} task={task} busy={claiming === task.key} onClaim={() => onClaim(task.key)} />
      ))}
    </View>
  );
}

function TaskRow({ task, busy, onClaim }: { task: DailyTaskProgress; busy: boolean; onClaim: () => void }) {
  const styles = useStyles();
  const colors = useThemeColors();
  const definition = dailyTaskByKey(task.key);
  if (!definition) return null;

  const done = isDailyTaskDone(task);
  const claimable = isDailyTaskClaimable(task);
  const tone = task.claimed ? colors.textMuted : done ? colors.success : colors.primary;

  return (
    <View
      style={[
        styles.row,
        // Blue while it is still asking something of you, green once it is
        // done, and nothing once the XP are collected – a task that is over
        // should stop drawing the eye.
        !task.claimed && { backgroundColor: `${tone}4D` },
      ]}
    >
      {/* A dot, not a symbol: three little pictures in a row said less about
          the tasks than their own wording already does, and the colour is the
          part that was carrying the meaning anyway. */}
      <View style={[styles.dot, { backgroundColor: tone }]} />

      {/*
        The three states – open, ready, collected – swap different things into
        the same two slots, and each slot is held at one height. Without that
        the row grew the moment the XP were collected and pushed everything
        under it down the page.
      */}
      <View style={styles.texts}>
        <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
          {definition.describe(task.target)}
        </Text>

        {/* Once it is collected the bar has nothing left to say. */}
        {task.claimed ? (
          <View style={styles.progress}>
            <Text variant="caption" color="muted">
              Abgeholt · +{definition.xp} XP
            </Text>
          </View>
        ) : (
          <View style={styles.progress}>
            <ProgressBar
              value={(task.progress / task.target) * 100}
              height={5}
              color={done ? colors.success : colors.primary}
              style={styles.bar}
            />
            <Text variant="label" color="muted">
              {task.progress}/{task.target}
            </Text>
          </View>
        )}
      </View>

      {/* The payout is a button while it is there to be taken, and a tick once
          it has been – never a silent change. */}
      {claimable ? (
        <Pressable
          onPress={onClaim}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`${definition.xp} XP abholen`}
          style={({ pressed }) => [styles.claim, { backgroundColor: colors.success }, pressed && styles.pressed]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text variant="label" style={{ color: colors.white }}>
              +{definition.xp} XP
            </Text>
          )}
        </Pressable>
      ) : task.claimed ? (
        /* Nur das Zeichen, kein Rahmen: die Aufgabe ist vorbei, und ein
           leerer Rahmen drumherum haette sie weiter wie einen Knopf aussehen
           lassen. Die Breite bleibt die der anderen beiden Zustaende, damit
           die Zeile beim Abholen nicht springt. */
        <View style={styles.done}>
          <AppIcon source={statIcon('correct')} fallback="checkmark-circle" size={24} glyphSize={22} color={colors.success} />
        </View>
      ) : (
        // The same shape as the button it will become, so the row does not
        // change width the moment the task is finished.
        <View style={[styles.reward, { borderColor: `${tone}55`, backgroundColor: `${tone}1A` }]}>
          <Text variant="label" style={{ color: tone }}>
            +{definition.xp} XP
          </Text>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: { gap: 3 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    // Knapp: drei Aufgaben sind der Vorspann der Startseite, nicht ihr Inhalt.
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.lg,
  },
  dot: { width: 10, height: 10, borderRadius: radius.full, flexShrink: 0 },
  texts: { flex: 1, gap: 2 },
  name: { fontSize: 14, color: colors.textPrimary },
  // One height for the bar, the count and the "collected" line alike.
  progress: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 16 },
  bar: { flex: 1 },
  // All three right-hand states are the same box: the button, the outlined
  // figure and the tick that replaces them.
  claim: {
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    minWidth: 62,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Wie `reward`, nur ohne Rahmen und Hintergrund.
  done: { minWidth: 62, height: 28, alignItems: 'center', justifyContent: 'center' },
  reward: {
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    minWidth: 62,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },
}));
