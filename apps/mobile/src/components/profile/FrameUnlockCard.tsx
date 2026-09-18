import { useEffect } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { unlockedFrames } from '@quizbyte/shared';
import type { AvatarConfig } from '@quizbyte/shared';

import { useSettingsStore } from '@/state/settingsStore';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { Avatar, IconButton, RaisedCard, Text } from '../ui';

interface FrameUnlockCardProps {
  level: number;
  name: string;
  avatarConfig?: AvatarConfig | null;
  /** Puts the frame on. The card closes once it is stored. */
  onEquip: (frameId: string) => void;
  equipping: boolean;
}

/**
 * Announces a profile frame that has just been earned.
 *
 * Frames are never worn by themselves – reaching a rank offers it, and this is
 * the offer. One card at a time, newest first: two unlocked at once is rare and
 * the second one waits its turn rather than stacking.
 */
export function FrameUnlockCard({ level, name, avatarConfig, onEquip, equipping }: FrameUnlockCardProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const seenFrames = useSettingsStore((state) => state.seenFrames);
  const markFrameSeen = useSettingsStore((state) => state.markFrameSeen);
  const markFramesSeen = useSettingsStore((state) => state.markFramesSeen);

  const earned = unlockedFrames(level).filter((frame) => frame.width > 0);

  /*
    First run: everything already earned counts as read. It was earned before
    there was anything to announce, and a player at level 40 should not be met
    by three cards for ranks they have had for weeks.
  */
  useEffect(() => {
    if (seenFrames === null) markFramesSeen(earned.map((frame) => frame.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, on the baseline
  }, [seenFrames === null]);

  if (seenFrames === null) return null;

  const fresh = earned.filter((frame) => !seenFrames.includes(frame.id)).at(-1);
  if (!fresh) return null;

  return (
    <RaisedCard style={styles.card} glow={`${fresh.colors[1] ?? fresh.colors[0]}55`}>
      <Avatar name={name} config={avatarConfig} size={56} frame={fresh} />

      <View style={styles.texts}>
        <Text variant="label" style={{ color: fresh.colors[1] ?? fresh.colors[0] }}>
          NEUER RAHMEN
        </Text>
        <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
          {fresh.name}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1}>
          Freigeschaltet mit Level {fresh.requiredLevel}
        </Text>
      </View>

      <Pressable
        onPress={() => {
          markFrameSeen(fresh.id);
          onEquip(fresh.id);
        }}
        disabled={equipping}
        accessibilityRole="button"
        accessibilityLabel={`${fresh.name} anlegen`}
        style={({ pressed }) => [styles.equip, { backgroundColor: colors.primary }, pressed && styles.pressed]}
      >
        {equipping ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text variant="label" style={{ color: colors.white }}>
            Anlegen
          </Text>
        )}
      </Pressable>

      {/* Dismissing keeps the frame – it only stops the announcement. It is
          still in the picker on the profile. */}
      <IconButton icon="close" accessibilityLabel="Hinweis schließen" size={18} onPress={() => markFrameSeen(fresh.id)} />
    </RaisedCard>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  texts: { flex: 1, gap: 1 },
  name: { color: colors.textPrimary },
  equip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    minWidth: 74,
    alignItems: 'center',
  },
  pressed: { opacity: 0.75 },
}));
