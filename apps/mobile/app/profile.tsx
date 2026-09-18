import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  DEFAULT_AVATAR_CONFIG,
  MEDALS,
  PROFILE_FRAMES,
  accuracyTone,
  computeAccuracy,
  earnedMedalCount,
  resolveFrame,
  unlockedFrames,
} from '@quizbyte/shared';
import type { MedalStats } from '@quizbyte/shared';

import {
  AppIcon,
  Avatar,
  ErrorState,
  IconButton,
  ProgressRing,
  RaisedCard,
  Screen,
  SectionHeading,
  SectionTabs,
  Skeleton,
  Text,
} from '@/components/ui';
import { FrameCollection } from '@/components/profile/FrameCollection';
import { MedalCollection } from '@/components/profile/MedalCollection';
import { ShelfSwitch } from '@/components/profile/ShelfSwitch';
import { profileIcon } from '@/content/profileIcons';
import { statIcon } from '@/content/statIcons';
import { ModeStats } from '@/components/progress/ModeStats';
import { StatGrid, StatTile } from '@/components/progress/StatTile';
import { useMyDuelCount } from '@/features/friends/useFriends';
import { useProfile, useSetProfileFrame } from '@/features/profile/useProfile';
import { useAnswerStats } from '@/features/progress/useAnswerStats';
import { usePerfectSessions } from '@/features/progress/usePerfectSessions';
import { useProgress } from '@/features/progress/useProgress';
import { useModeRecords } from '@/features/quiz/useModeRecords';
import { getUserMessage } from '@/services/errors';
import { makeStyles, radius, spacing, typography, useAccuracyColors, useThemeColors } from '@/theme';

/** Lets the save jump back to the top; the same registry the tabs use. */
const PROFILE_SCROLL_KEY = 'profile';

const AVATAR_SIZE = 96;
const RING_SIZE = 92;

export default function ProfileScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const accuracyColors = useAccuracyColors();
  const router = useRouter();
  const profile = useProfile();
  const progress = useProgress();
  const perfect = usePerfectSessions();
  // Per question, not per answer – the same basis the progress tab uses.
  const answers = useAnswerStats();
  const records = useModeRecords();
  const duels = useMyDuelCount();
  const frame = useSetProfileFrame();
  /*
    Welches der beiden Regale offen ist. Zwei Überschriften nebeneinander statt
    zweier Blöcke untereinander: beides sind Sammlungen, beides ist lang, und
    untereinander wäre die zweite nur noch der Boden der Seite.
  */
  const [shelf, setShelf] = useState<'frames' | 'medals'>('frames');

  const shownAvatar = profile.data?.avatarConfig ?? DEFAULT_AVATAR_CONFIG;
  const data = progress.progress;
  const level = progress.level;
  const accuracy = computeAccuracy(answers.correct, answers.answered);
  const accuracyColor = accuracyColors[accuracyTone(accuracy)];

  // Alles, woran eine Medaille hängt – aus denselben Abfragen, die die Kacheln
  // darüber schon füllen.
  const medalStats: MedalStats = {
    answered: answers.answered,
    correct: answers.correct,
    longestStreak: data?.longestStreak ?? 0,
    totalXp: data?.totalXp ?? 0,
    sessions: data?.totalSessionsCompleted ?? 0,
    perfect: perfect.count,
    duels: duels.count,
    level: level?.level ?? 1,
  };
  const medalsLoading = progress.isLoading || answers.isLoading || perfect.isLoading || duels.isLoading;

  return (
    <Screen scrollToTopKey={PROFILE_SCROLL_KEY}>
      <View style={styles.topBar}>
        <Text variant="headline">Profil</Text>
        <IconButton icon="close" accessibilityLabel="Schließen" onPress={() => router.back()} />
      </View>

      {profile.isError ? (
        <ErrorState message={getUserMessage(profile.error)} onRetry={() => void profile.refetch()} />
      ) : (
        <>
          {/* Identity */}
          <View style={styles.hero}>
            {profile.isLoading ? (
              <Skeleton width={AVATAR_SIZE} height={AVATAR_SIZE} borderRadius={AVATAR_SIZE / 2} />
            ) : (
              <Avatar
                name={profile.data?.displayName ?? profile.data?.username ?? '?'}
                config={shownAvatar}
                size={AVATAR_SIZE}
                frame={resolveFrame(profile.data?.selectedFrame, level?.level ?? 1)}
              />
            )}
            {/* The pencil sits with the name, not at the bottom of the page:
                editing is about who you are, and that is what is written here. */}
            <View style={styles.nameRow}>
              <Text variant="title" numberOfLines={1} style={styles.name}>
                {profile.data?.displayName ?? profile.data?.username ?? ''}
              </Text>
              <Pressable
                onPress={() => router.push('/profile/edit')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Profil bearbeiten"
                style={({ pressed }) => [styles.editButton, pressed && styles.editPressed]}
              >
                <AppIcon source={profileIcon('edit')} fallback="create-outline" size={28} glyphSize={18} color={colors.primary} />
              </Pressable>
            </View>
            {profile.data?.displayName ? <Text color="secondary">@{profile.data.username}</Text> : null}
          </View>

          {/* Level ring + the two headline stats */}
          {/* Der Kopf der Seite: tiefer als die Karten darunter und ohne den
              grünen Schein, der hinter dem Ring lag. */}
          <RaisedCard style={styles.levelCard} deep>
            <ProgressRing
              value={level?.progressPercent ?? 0}
              size={RING_SIZE}
              stroke={8}
              color={colors.success}
              trackColor="rgba(34, 197, 94, 0.15)"
              accessibilityLabel={`Level ${level?.level ?? 1}, ${level?.progressPercent ?? 0} Prozent`}
            >
              <Text variant="label" color="secondary" style={styles.ringLabel}>
                LEVEL
              </Text>
              <Text style={styles.ringNumber}>{level?.level ?? 1}</Text>
            </ProgressRing>

            <View style={styles.levelStats}>
              <View style={styles.levelStat} accessibilityLabel={`${progress.streak} Tage Streak`}>
                <AppIcon
                  source={statIcon('streak')}
                  fallback="flame"
                  size={24}
                  glyphSize={20}
                  color={progress.streak > 0 ? colors.danger : colors.textMuted}
                />
                <View style={styles.levelStatText}>
                  <Text style={styles.levelStatValue}>{progress.streak}</Text>
                  <Text variant="caption" color="secondary">
                    {progress.streak === 1 ? 'Tag Streak' : 'Tage Streak'}
                  </Text>
                </View>
              </View>

              <View style={styles.levelStat} accessibilityLabel={`${accuracy} Prozent richtig`}>
                {/* Dasselbe Zeichen wie überall sonst für „richtig" – die
                    Quote ist nichts anderes als dessen Anteil. */}
                <AppIcon source={statIcon('correct')} fallback="trophy" size={24} glyphSize={20} color={accuracyColor} />
                <View style={styles.levelStatText}>
                  <Text style={[styles.levelStatValue, { color: accuracyColor }]}>{accuracy} %</Text>
                  <Text variant="caption" color="secondary">
                    Quote
                  </Text>
                </View>
              </View>
            </View>
          </RaisedCard>

          {/* Coloured where the colour means something – the streak is red, a
              perfect round gold. Plain counts stay in the text colour, or the
              grid turns into a paint box. */}
          {/* Vier Zahlen, die längste Streak zuerst – das XP-Gesamt stand hier
              doppelt: der Levelring darüber ist nichts anderes. Farbe nur dort,
              wo sie etwas bedeutet, sonst wird das Raster ein Farbkasten. */}
          <StatGrid tight>
            <StatTile
              bare
              icon="flame"
              art="streak"
              tone={colors.danger}
              label="Längste Streak"
              value={`${data?.longestStreak ?? 0} Tage`}
              loading={progress.isLoading}
            />
            <StatTile
              bare
              icon="help"
              art="answered"
              tone={colors.textPrimary}
              label="Beantwortet"
              value={String(answers.answered)}
              loading={answers.isLoading}
            />
            <StatTile
              bare
              icon="checkmark-done"
              art="sessions"
              tone={colors.textPrimary}
              label="Quiz beendet"
              value={String(data?.totalSessionsCompleted ?? 0)}
              loading={progress.isLoading}
            />
            <StatTile
              bare
              icon="ribbon"
              art="perfect"
              tone={colors.warning}
              label="Perfekte Quiz"
              value={String(perfect.count)}
              loading={perfect.isLoading}
            />
          </StatGrid>

          {/* Highscores – the classic round has no score to beat, so it is out.
              Ohne Karte darum: die Modus-Kacheln bringen ihre eigenen Kanten
              mit, und ein Rahmen um Rahmen war eine Ebene zu viel. */}
          <View style={styles.highscores}>
            <SectionHeading title="Highscores" />
            <ModeStats recordFor={records.recordFor} loading={records.isLoading} includeClassic={false} />
          </View>

          {/* Zwei Sammlungen unter einer Überschriftenzeile: Rahmen werden vom
              Level freigeschaltet und einer davon getragen, Medaillen werden
              verdient und nur gezeigt. */}
          <View style={styles.shelfHead}>
            <SectionTabs
              tabs={[
                { key: 'frames', label: 'Profilrahmen' },
                { key: 'medals', label: 'Medaillen' },
              ]}
              active={shelf}
              onSelect={setShelf}
              trailing={
                <Text variant="caption" color="muted">
                  {shelf === 'frames'
                    ? `${unlockedFrames(level?.level ?? 1).length} / ${PROFILE_FRAMES.length} frei`
                    : `${earnedMedalCount(medalStats)} / ${MEDALS.length}`}
                </Text>
              }
            />
          </View>

          {/* Ohne Karte darum: die Rahmen- und Medaillenkacheln bringen ihre
              eigenen Kanten mit, und ein Rahmen um lauter Rahmen war eine Ebene
              zu viel – genau wie bei den Highscores darüber. */}
          <View style={styles.shelf}>
            <ShelfSwitch shelfKey={shelf}>
              {shelf === 'frames' ? (
                <>
                  <FrameCollection
                    level={level?.level ?? 1}
                    selected={profile.data?.selectedFrame ?? null}
                    name={profile.data?.displayName ?? profile.data?.username ?? '?'}
                    avatarConfig={shownAvatar}
                    busy={frame.isPending}
                    onSelect={(frameId) => frame.mutate(frameId)}
                  />
                  {frame.isError ? <Text color="danger">{getUserMessage(frame.error)}</Text> : null}
                </>
              ) : (
                <MedalCollection stats={medalStats} loading={medalsLoading} />
              )}
            </ShelfSwitch>
          </View>

        </>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },

  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    // Mehr Luft oben und unten als seitlich – flach gedrückt las sich die Karte
    // wie eine Zeile mit einem Ring darin.
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  ringLabel: { fontSize: 9, letterSpacing: 1.4 },
  ringNumber: { fontSize: 28, fontWeight: '800', lineHeight: 32, color: colors.textPrimary },
  levelStats: { flex: 1, gap: spacing.lg },
  levelStat: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  levelStatText: { flex: 1 },
  levelStatValue: { fontSize: 20, fontWeight: '700', lineHeight: 24, color: colors.textPrimary },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  // Shrinks before the pencil does – the button is a fixed 30 pt, the name is
  // what has to give when it is long.
  name: { flexShrink: 1 },
  editButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.primarySoft,
    flexShrink: 0,
  },
  editPressed: { opacity: 0.7 },
  formHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: -spacing.sm },
  // Room above so the frame previews do not run into the stat tiles; below,
  // the edit button brings its own margin.
  highscores: { marginTop: spacing.xl, gap: spacing.md },
  shelfHead: { marginTop: spacing.xl },
  shelf: { marginTop: spacing.md },
  form: {
    marginTop: spacing.xl,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  field: { gap: spacing.xs },
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
}));
