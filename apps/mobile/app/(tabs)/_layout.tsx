import { Tabs } from 'expo-router/js-tabs';

import { FloatingTabBar } from '@/components/layout/FloatingTabBar';
import { useFeature } from '@/state/featureStore';
import { useThemeColors } from '@/theme';

export default function TabLayout() {
  const colors = useThemeColors();
  /*
    Aus dem Store, nicht direkt aus `features.ts`: der Wert kann serverseitig
    überschrieben sein. Der Store startet mit dem Code-Standard, deshalb steht
    er beim ersten Rendern schon fest und der Tab flackert nicht.
  */
  const friendsEnabled = useFeature('friends');
  return (
    <Tabs
      // The bar floats above the content – its look lives in FloatingTabBar,
      // the routes and titles below are unchanged.
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Quiz' }} />
      <Tabs.Screen name="progress" options={{ title: 'Fortschritt' }} />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Freunde',
          // `href: null` hides the tab. Only ever pass `href` to hide something:
          // expo-router installs its own `tabBarButton` for ANY href, and the
          // custom bar skips every route that has one – so an explicit href
          // would hide the tab just as effectively as `null`.
          ...(friendsEnabled ? {} : { href: null }),
        }}
      />
      <Tabs.Screen name="more" options={{ title: 'Mehr' }} />
    </Tabs>
  );
}
