import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { Card, Skeleton, Text } from '../ui';

interface StatTileProps {
  label: string;
  value: string;
  loading?: boolean;
}

export function StatTile({ label, value, loading }: StatTileProps) {
  return (
    <Card padding="md" style={styles.tile}>
      {loading ? <Skeleton width={56} height={24} /> : <Text variant="title">{value}</Text>}
      <Text variant="caption" color="secondary">
        {label}
      </Text>
    </Card>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  tile: { flexBasis: '47%', flexGrow: 1, gap: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});
