import { useRouter } from 'expo-router';

import { EmptyState, Screen } from '@/components/ui';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <Screen>
      <EmptyState title="Seite nicht gefunden" actionLabel="Zur Startseite" onAction={() => router.replace('/(tabs)')} />
    </Screen>
  );
}
