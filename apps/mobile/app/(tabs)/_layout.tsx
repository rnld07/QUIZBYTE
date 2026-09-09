import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { features } from '@quizbyte/shared';

import { colors } from '@/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface TabIconProps {
  name: IoniconName;
  focusedName: IoniconName;
  color: ColorValue;
  focused: boolean;
  size: number;
}

function TabIcon({ name, focusedName, color, focused, size }: TabIconProps) {
  return <Ionicons name={focused ? focusedName : name} size={size} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Quiz',
          tabBarIcon: (props) => <TabIcon {...props} name="grid-outline" focusedName="grid" />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Fortschritt',
          tabBarIcon: (props) => <TabIcon {...props} name="stats-chart-outline" focusedName="stats-chart" />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Freunde',
          tabBarIcon: (props) => <TabIcon {...props} name="people-outline" focusedName="people" />,
          // Hidden until the friends feature ships (features.friends = true).
          href: features.friends ? '/(tabs)/friends' : null,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Mehr',
          tabBarIcon: (props) => <TabIcon {...props} name="ellipsis-horizontal-circle-outline" focusedName="ellipsis-horizontal-circle" />,
        }}
      />
    </Tabs>
  );
}
