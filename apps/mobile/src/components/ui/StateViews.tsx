import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { makeStyles, spacing, useThemeColors } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface StateViewProps {
  icon?: IoniconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

/** Shared layout for empty states. */
export function EmptyState({ icon = 'help-circle-outline', title, message, actionLabel, onAction, compact }: StateViewProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  return (
    <View style={[styles.container, compact && styles.compact]} accessibilityRole="summary">
      <Ionicons name={icon} size={compact ? 28 : 40} color={colors.textMuted} />
      <Text variant="headline" align="center" style={styles.title}>
        {title}
      </Text>
      {message ? (
        <Text color="secondary" align="center">
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} variant="secondary" style={styles.action} /> : null}
    </View>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

/** Friendly error with retry – never shows technical details. */
export function ErrorState({ message, onRetry, compact }: ErrorStateProps) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Das hat nicht geklappt"
      message={message}
      actionLabel={onRetry ? 'Erneut versuchen' : undefined}
      onAction={onRetry}
      compact={compact}
    />
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  container: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.sm },
  compact: { paddingVertical: spacing.lg },
  title: { marginTop: spacing.sm },
  action: { marginTop: spacing.md, alignSelf: 'stretch' },}));
