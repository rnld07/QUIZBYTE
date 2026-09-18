import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { equippedFrame } from '@quizbyte/shared';
import type { AvatarConfig } from '@quizbyte/shared';

import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { Avatar, Text } from '../ui';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface RowAction {
  icon: IoniconName;
  label: string;
  busy?: boolean;
  /** Drops the round plate – for an icon that only repeats what the row does. */
  bare?: boolean;
  /** Unread count on the icon; 0 hides it. */
  badge?: number;
  onPress: () => void;
}

interface FriendRowProps {
  username: string;
  displayName: string | null;
  avatarConfig: AvatarConfig;
  /** Equipped frame id - already validated by the server. */
  frameId?: string | null;
  subtitle: string;
  /** Optional button on the right – add, open the chat, … */
  action?: RowAction;
  /** Makes the row itself tappable. */
  onPress?: () => void;
  /** What tapping the row does, for screen readers. */
  hint?: string;
  /**
   * Makes the avatar its own target inside the row.
   *
   * Two destinations from one row: the row leads where you usually want to go,
   * the face leads to the person. Without this the profile would need a second
   * button that says the same thing the avatar already says.
   */
  onAvatarPress?: () => void;
}

/** One person in a list: avatar, name, a line of context and one action. */
export function FriendRow({
  username,
  displayName,
  avatarConfig,
  frameId,
  subtitle,
  action,
  onPress,
  hint,
  onAvatarPress,
}: FriendRowProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const name = displayName ?? username;

  const avatar = <Avatar config={avatarConfig} name={name} size={40} frame={equippedFrame(frameId)} />;

  const content = (
    <>
      {onAvatarPress ? (
        <Pressable
          onPress={onAvatarPress}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Profil von ${name}`}
          style={({ pressed }) => pressed && styles.pressed}
        >
          {avatar}
        </Pressable>
      ) : (
        avatar
      )}
      <View style={styles.texts}>
        <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
          {name}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </>
  );

  return (
    <View style={styles.row}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={name}
          accessibilityHint={hint}
          style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        >
          {content}
        </Pressable>
      ) : (
        <View style={styles.main}>{content}</View>
      )}

      {action ? (
        <Pressable
          onPress={action.onPress}
          disabled={action.busy}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={({ pressed }) => [styles.action, action.bare && styles.actionBare, pressed && styles.pressed]}
        >
          {action.busy ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons
                name={action.icon}
                size={action.bare ? 22 : 18}
                // An unread chat colours its own icon: the badge alone is easy
                // to miss in a long list. Green, so "there is something here"
                // reads differently from the blue of "you can tap this".
                color={action.badge ? colors.success : action.bare ? colors.textMuted : colors.primary}
              />
              {action.badge ? (
                <View style={[styles.badge, { backgroundColor: colors.success }]}>
                  <Text variant="label" style={[styles.badgeText, { color: colors.white }]}>
                    {action.badge > 99 ? '99+' : action.badge}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pressed: { opacity: 0.65 },
  texts: { flex: 1, gap: 2 },
  name: { fontSize: 15, color: colors.textPrimary },
  action: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexShrink: 0,
  },
  // Just the glyph: when the whole row already opens the chat, a filled circle
  // around the same symbol promises a second, different action.
  actionBare: { backgroundColor: 'transparent', borderWidth: 0 },
  // Bottom left of the chat glyph: the bubble's own tail points that way, so
  // the count sits in the gap instead of over the speech bubble itself.
  badge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 9, lineHeight: 11 },
}));
