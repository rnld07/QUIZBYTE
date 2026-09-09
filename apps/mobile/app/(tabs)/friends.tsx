import { EmptyState, Screen } from '@/components/ui';

/** Placeholder – the tab is hidden while features.friends is false. */
export default function FriendsScreen() {
  return (
    <Screen>
      <EmptyState icon="people-outline" title="Freunde" message="Dieser Bereich ist noch nicht verfügbar." />
    </Screen>
  );
}
