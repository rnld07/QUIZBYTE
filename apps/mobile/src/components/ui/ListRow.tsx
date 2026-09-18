import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import type { ReactNode } from 'react';

import type { AppIconKey } from '@/content/appIcons';
import { makeStyles, radius, spacing, touchTarget, useThemeColors } from '@/theme';

import { AppIcon } from './AppIcon';
import { Text } from './Text';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface ListRowProps {
  icon?: IoniconName;
  /**
   * Puts the icon on a framed plate in this colour, in white.
   *
   * One colour or several for a gradient. Without it the icon is drawn plain,
   * the way the settings list still does it.
   */
  iconFill?: string | readonly [string, string, ...string[]];
  /** Your own symbol inside the plate, in place of the Ionicon. */
  iconImage?: AppIconKey;
  /** Replaces the icon entirely – an avatar, say. */
  leading?: ReactNode;
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  right?: ReactNode;
}

/** Row for settings / "Mehr" lists. */
export function ListRow({ icon, iconFill, iconImage, leading, label, description, value, onPress, destructive, right }: ListRowProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const content = (
    <>
      {leading ? (
        <View style={styles.leading}>{leading}</View>
      ) : icon && iconFill ? (
        <IconPlate icon={icon} image={iconImage} fill={iconFill} />
      ) : icon ? (
        <Ionicons name={icon} size={22} color={destructive ? colors.danger : colors.textSecondary} style={styles.icon} />
      ) : null}
      <View style={styles.texts}>
        <Text variant="body" color={destructive ? 'danger' : 'primary'}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" color="secondary">
            {description}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="body" color="secondary" style={styles.value}>
          {value}
        </Text>
      ) : null}
      {right}
      {onPress && !right ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

interface IconPlateProps {
  icon: IoniconName;
  /** A registered symbol shown instead of the glyph. */
  image?: AppIconKey;
  fill: string | readonly [string, string, ...string[]];
}

/**
 * The coloured, framed square an icon sits in.
 *
 * A white glyph unless there is artwork: the plate carries the colour, and a
 * tinted icon on a tinted ground would only muddy both.
 */
function IconPlate({ icon, image, fill }: IconPlateProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const gradient = typeof fill === 'string' ? ([fill, fill] as const) : fill;

  return (
    <View style={styles.plate}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {image ? (
        <AppIcon name={image} fallback={icon} size={26} glyphSize={19} color={colors.white} />
      ) : (
        <Ionicons name={icon} size={19} color={colors.white} />
      )}
    </View>
  );
}

interface SwitchRowProps {
  icon?: IoniconName;
  /** Same as on ListRow: a framed plate in this colour with a white glyph. */
  iconFill?: string | readonly [string, string, ...string[]];
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function SwitchRow({ icon, iconFill, label, description, value, onValueChange }: SwitchRowProps) {
  const colors = useThemeColors();
  return (
    <ListRow
      icon={icon}
      iconFill={iconFill}
      label={label}
      description={description}
      right={
        <Switch
          value={value}
          onValueChange={onValueChange}
          accessibilityLabel={label}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
        />
      }
    />
  );
}

export function RowDivider() {
  const styles = useStyles();
  return <View style={styles.divider} />;
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  row: {
    minHeight: touchTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  pressed: { backgroundColor: colors.surfacePressed },
  icon: { width: 24 },
  // 32 wide like the plate, so a row with an avatar and one with an icon line up.
  leading: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  plate: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  texts: { flex: 1, gap: spacing.xxs },
  value: { marginRight: spacing.xs },
  // Starts where the text does, past the widest leading element.
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg + 32 + spacing.md },}));
