import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { NO_FRAME_ID, PROFILE_FRAMES, nextFrame } from '@quizbyte/shared';
import type { AvatarConfig, ProfileFrame } from '@quizbyte/shared';

import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { Avatar, Text } from '../ui';

interface FrameCollectionProps {
  /** The user's level – decides what is unlocked. */
  level: number;
  /** Chosen frame id; null means "never chosen" and follows the rank. */
  selected: string | null;
  name: string;
  avatarConfig: AvatarConfig;
  busy?: boolean;
  onSelect: (frameId: string | null) => void;
}

/** Preview size of one frame in the grid. */
const PREVIEW = 46;

/**
 * All frames at a glance: unlocked ones can be equipped, locked ones show the
 * level they need. Showing the locked ones is the point – they are the goal.
 */
export function FrameCollection({ level, selected, name, avatarConfig, busy, onSelect }: FrameCollectionProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const upcoming = nextFrame(level);
  /*
    Ohne Wahl wird kein Rahmen getragen – und markiert wird genau das.

    Vorher stand hier ein "Automatisch": ohne eigene Wahl galt der höchste
    freigeschaltete Rang als getragen. Nur gezeichnet wurde er nie – `resolveFrame`
    gibt für null nichts zurück, weil ein Rang, der sich von selbst anlegt, eine
    Änderung ist, die niemand veranlasst hat. Die Markierung zeigte damit einen
    Rahmen an, den man nirgends sah.
  */
  const effective = selected ?? NO_FRAME_ID;

  return (
    <View style={styles.container}>
      <View style={styles.hintRow}>
        <Text variant="caption" color="muted" style={styles.hintText}>
          {upcoming
            ? `Nächster Rahmen: ${upcoming.name} ab Level ${upcoming.requiredLevel}.`
            : 'Du hast jeden Rahmen freigeschaltet.'}
        </Text>
      </View>

      <View style={styles.grid}>
        {PROFILE_FRAMES.map((frame) => (
          <FrameTile
            key={frame.id}
            frame={frame}
            locked={level < frame.requiredLevel}
            active={effective === frame.id}
            name={name}
            avatarConfig={avatarConfig}
            busy={busy}
            onSelect={() => onSelect(frame.id)}
            lockColor={colors.textMuted}
          />
        ))}
      </View>
    </View>
  );
}

interface FrameTileProps {
  frame: ProfileFrame;
  locked: boolean;
  active: boolean;
  name: string;
  avatarConfig: AvatarConfig;
  busy?: boolean;
  lockColor: string;
  onSelect: () => void;
}

function FrameTile({ frame, locked, active, name, avatarConfig, busy, lockColor, onSelect }: FrameTileProps) {
  const styles = useStyles();

  return (
    <Pressable
      onPress={onSelect}
      disabled={locked || busy}
      accessibilityRole="radio"
      accessibilityState={{ selected: active, disabled: locked }}
      accessibilityLabel={locked ? `${frame.name}, gesperrt bis Level ${frame.requiredLevel}` : frame.name}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <View style={locked && styles.lockedPreview}>
        <Avatar name={name} config={avatarConfig} size={PREVIEW} frame={frame.id === NO_FRAME_ID ? null : frame} />
      </View>

      <Text variant="label" numberOfLines={1} style={[styles.tileName, active && styles.tileNameActive]}>
        {frame.name}
      </Text>

      {locked ? (
        <View style={styles.lockRow}>
          <Ionicons name="lock-closed" size={9} color={lockColor} />
          <Text variant="label" style={styles.lockText}>
            Lvl {frame.requiredLevel}
          </Text>
        </View>
      ) : (
        <Text variant="label" style={[styles.lockText, active && styles.tileNameActive]}>
          {active ? 'Aktiv' : 'Frei'}
        </Text>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { gap: spacing.xs },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  hintText: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    // Stretch to fill the row instead of leaving a gap on the right; the basis
    // puts three next to each other on a normal phone.
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 84,
    alignItems: 'center',
    // The rank emblem overlaps the picture's lower edge – the extra gap keeps
    // it off the name below.
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  /*
    Kein Kästchen um die Bilder – das war ein Rahmen um einen Rahmen. Und der
    blaue um den gewählten hat genau den versteckt, um den es ging. Markiert
    wird er jetzt dort, wo es hingehört: Name und Zeile darunter („Aktiv")
    stehen in Blau, und das Bild zeigt den Rahmen ohnehin.
  */
  tilePressed: { opacity: 0.7 },
  // Locked frames stay visible but clearly out of reach.
  lockedPreview: { opacity: 0.35 },
  tileName: { fontSize: 10, color: colors.textSecondary },
  tileNameActive: { color: colors.primary },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lockText: { fontSize: 9, color: colors.textMuted },
}));
