import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { accuracyTone, computeAccuracy, computeLevelProgress, equippedFrame } from '@quizbyte/shared';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { ActionSheet } from '@/components/moderation/ActionSheet';
import { ReportUserDialog } from '@/components/moderation/ReportUserDialog';
import { ModeStats } from '@/components/progress/ModeStats';
import { StatGrid, StatTile } from '@/components/progress/StatTile';
import { statIcon } from '@/content/statIcons';
import {
  AppIcon,
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  ProgressRing,
  RaisedCard,
  Screen,
  SectionHeading,
  Skeleton,
  Text,
} from '@/components/ui';
import { useDuelRecord, useFriendModeRecords, useFriendProfile, useRemoveFriend } from '@/features/friends/useFriends';
import { useBlockUser } from '@/features/friends/useModeration';
import { getUserMessage } from '@/services/errors';
import { makeStyles, spacing, useAccuracyColors, useThemeColors } from '@/theme';

/** Same figures as on your own profile – so it is laid out the same way. */
const AVATAR_SIZE = 96;
const RING_SIZE = 92;

/**
 * A friend's profile.
 *
 * Deliberately the same page as your own, minus what is yours alone to change:
 * the same hero, the same level ring with streak and accuracy beside it, the
 * same grid of tiles in the same colours. Comparing yourself with someone is
 * the point of the screen, and that only works when both read alike.
 */
export default function FriendProfileScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const accuracyColors = useAccuracyColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, isLoading, isError, error, refetch } = useFriendProfile(id ?? null);
  const records = useFriendModeRecords(id ?? null);
  const duels = useDuelRecord(id ?? null);
  const remove = useRemoveFriend();
  const { block } = useBlockUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const confirmRemove = () => {
    if (!id || !profile) return;
    Alert.alert('Freundschaft beenden?', `${profile.username} wird aus deiner Liste entfernt. Euer Chat verschwindet damit ebenfalls.`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Entfernen',
        style: 'destructive',
        onPress: () => remove.mutate(id, { onSuccess: () => router.back() }),
      },
    ]);
  };

  /*
    Blocking is the heavier of the two and cannot be taken back by accident, so
    it asks first and says what it does: the friendship goes with it, and the
    server is where that actually happens.
  */
  const confirmBlock = () => {
    if (!id || !profile) return;
    setMenuOpen(false);
    Alert.alert(
      `@${profile.username} blockieren?`,
      'Ihr seht euch nicht mehr in der Suche und könnt euch keine Anfragen mehr schicken. Eine bestehende Freundschaft wird beendet. Du kannst das in den Einstellungen rückgängig machen.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Blockieren',
          style: 'destructive',
          onPress: () => block.mutate(id, { onSuccess: () => router.back() }),
        },
      ],
    );
  };

  const level = profile ? computeLevelProgress(profile.totalXp) : null;
  const accuracy = profile ? computeAccuracy(profile.correctAnswers, profile.questionsAnswered) : 0;
  const accuracyColor = profile && profile.questionsAnswered > 0 ? accuracyColors[accuracyTone(accuracy)] : colors.textMuted;

  return (
    <Screen backdrop={<AmbientBackground />}>
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" accessibilityLabel="Zurück" onPress={() => router.back()} />
        <Text variant="headline">Profil</Text>

        {/* Everything that is about the person rather than about the page sits
            behind the three dots: reporting and blocking are rare, and a screen
            that offers them as buttons invites them. */}
        {profile ? (
          <IconButton icon="ellipsis-horizontal" accessibilityLabel="Mehr Optionen" onPress={() => setMenuOpen(true)} />
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      {isError ? (
        <ErrorState message={getUserMessage(error)} onRetry={() => void refetch()} />
      ) : !isLoading && !profile ? (
        <EmptyState icon="person-outline" title="Profil nicht verfügbar" message="Ihr seid nicht (mehr) befreundet." />
      ) : (
        <>
          {/* Identity */}
          <View style={styles.hero}>
            {isLoading ? (
              <Skeleton width={AVATAR_SIZE} height={AVATAR_SIZE} borderRadius={AVATAR_SIZE / 2} />
            ) : (
              <Avatar
                config={profile?.avatarConfig}
                name={profile?.displayName ?? profile?.username ?? '?'}
                size={AVATAR_SIZE}
                frame={equippedFrame(profile?.selectedFrame)}
              />
            )}
            <Text variant="title">{profile?.displayName ?? profile?.username ?? ''}</Text>
            {profile?.displayName ? <Text color="secondary">@{profile.username}</Text> : null}
          </View>

          {/* Level ring + the two headline stats */}
          {/* Wie im eigenen Profil – derselbe Kopf, dieselbe Tiefe. */}
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
              <View style={styles.levelStat} accessibilityLabel={`${profile?.currentStreak ?? 0} Tage Streak`}>
                <AppIcon
                  source={statIcon('streak')}
                  fallback="flame"
                  size={24}
                  glyphSize={20}
                  color={(profile?.currentStreak ?? 0) > 0 ? colors.danger : colors.textMuted}
                />
                <View style={styles.levelStatText}>
                  <Text style={styles.levelStatValue}>{profile?.currentStreak ?? 0}</Text>
                  <Text variant="caption" color="secondary">
                    {profile?.currentStreak === 1 ? 'Tag Streak' : 'Tage Streak'}
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

          {/* The same tiles, icons and tones as on your own profile. */}
          <StatGrid tight>
            <StatTile
              bare
              icon="flame"
              art="streak"
              tone={colors.danger}
              label="Längste Streak"
              value={`${profile?.longestStreak ?? 0} Tage`}
              loading={isLoading}
            />
            <StatTile
              bare
              icon="help"
              art="answered"
              tone={colors.textPrimary}
              label="Beantwortet"
              value={String(profile?.questionsAnswered ?? 0)}
              loading={isLoading}
            />
            <StatTile
              bare
              icon="checkmark-done"
              art="sessions"
              tone={colors.textPrimary}
              label="Quiz beendet"
              value={String(profile?.sessionsCompleted ?? 0)}
              loading={isLoading}
            />
            <StatTile
              bare
              icon="ribbon"
              art="perfect"
              tone={colors.warning}
              label="Perfekte Quiz"
              value={String(profile?.perfectSessions ?? 0)}
              loading={isLoading}
            />
          </StatGrid>

          {/* What they are actually good at. A profile of counters says how
              much somebody has played; the bests say how well. */}
          <View style={styles.records}>
            <SectionHeading title="Bestwerte" />
            {/* Ohne Karte darum, wie im eigenen Profil: die Modus-Kacheln
                bringen ihre eigenen Kanten mit. */}
            <ModeStats recordFor={records.recordFor} loading={records.isLoading} includeClassic={false} />
          </View>

          {/* How it stands between the two of you. Hidden until there is a
              duel to report: "0 von 0" says nothing. */}
          {duels.record && duels.record.played > 0 ? (
            <View style={styles.records}>
              <SectionHeading title="Eure Duelle" />
              <View style={styles.duelCard}>
                {/* The total first: it is what the three figures below are a
                    breakdown of, and a caption underneath read like a footnote
                    to something that was already over. */}
                <Text variant="caption" color="muted" align="center">
                  {duels.record.played} {duels.record.played === 1 ? 'Duell' : 'Duelle'} gespielt
                </Text>
                <View style={styles.duelRow}>
                  <DuelStat value={duels.record.won} label="gewonnen" tone={colors.success} />
                  <View style={styles.duelLine} />
                  <DuelStat value={duels.record.drawn} label="unentschieden" tone={colors.textSecondary} />
                  <View style={styles.duelLine} />
                  <DuelStat value={duels.record.lost} label="verloren" tone={colors.danger} />
                </View>
              </View>
            </View>
          ) : null}

          <Button
            title="Chat öffnen"
            onPress={() => id && router.push({ pathname: '/friends/chat/[id]', params: { id } })}
            style={styles.action}
          />
          <Button title="Freundschaft beenden" variant="danger" onPress={confirmRemove} loading={remove.isPending} />
        </>
      )}

      {profile ? (
        <>
          <ActionSheet
            visible={menuOpen}
            title={`@${profile.username}`}
            onClose={() => setMenuOpen(false)}
            actions={[
              {
                icon: 'flag-outline',
                label: 'Nutzer melden',
                hint: 'Geht nur an uns – der andere erfährt nichts davon.',
                onPress: () => {
                  setMenuOpen(false);
                  setReportOpen(true);
                },
              },
              {
                icon: 'ban-outline',
                label: 'Blockieren',
                hint: 'Beendet die Freundschaft und versteckt euch voreinander.',
                tone: 'danger',
                onPress: confirmBlock,
              },
            ]}
          />

          <ReportUserDialog
            visible={reportOpen}
            userId={profile.id}
            username={profile.username}
            onClose={() => setReportOpen(false)}
          />
        </>
      ) : null}
    </Screen>
  );
}

/** One of the three figures in the head-to-head card. */
function DuelStat({ value, label, tone }: { value: number; label: string; tone: string }) {
  const styles = useStyles();
  return (
    <View style={styles.duelStat} accessibilityLabel={`${value} ${label}`}>
      <Text style={[styles.duelValue, { color: tone }]}>{value}</Text>
      <Text variant="label" color="muted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  spacer: { width: 44 },
  hero: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  records: { gap: spacing.sm, marginTop: spacing.lg },
  duelCard: { gap: spacing.sm, paddingVertical: spacing.sm },
  duelRow: { flexDirection: 'row', alignItems: 'stretch' },
  duelLine: { width: 1, backgroundColor: colors.border },
  duelStat: { flex: 1, alignItems: 'center', gap: 1 },
  duelValue: { fontSize: 22, fontWeight: '800', lineHeight: 26 },

  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
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

  // The tiles carry a drop shadow and no bottom margin of their own.
  action: { marginTop: spacing.xl, marginBottom: spacing.md },
}));
