import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import type { ReactNode } from 'react';

import { colors, spacing, touchTarget } from '@/theme';

import { Text } from './Text';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface ListRowProps {
  icon?: IoniconName;
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  right?: ReactNode;
}

/** Row for settings / "Mehr" lists. */
export function ListRow({ icon, label, description, value, onPress, destructive, right }: ListRowProps) {
  const content = (
    <>
      {icon ? <Ionicons name={icon} size={22} color={destructive ? colors.danger : colors.textSecondary} style={styles.icon} /> : null}
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

interface SwitchRowProps {
  icon?: IoniconName;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function SwitchRow({ icon, label, description, value, onValueChange }: SwitchRowProps) {
  return (
    <ListRow
      icon={icon}
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
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
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
  texts: { flex: 1, gap: spacing.xxs },
  value: { marginRight: spacing.xs },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg + 24 + spacing.md },
});
