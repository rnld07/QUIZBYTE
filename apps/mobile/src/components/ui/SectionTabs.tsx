import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { makeStyles, spacing } from '@/theme';

import { Text } from './Text';

export interface SectionTab<T extends string> {
  key: T;
  label: string;
}

interface SectionTabsProps<T extends string> {
  tabs: readonly SectionTab<T>[];
  active: T;
  onSelect: (key: T) => void;
  /** Sitzt am Ende der Zeile – meist eine Zählung. */
  trailing?: ReactNode;
}

/**
 * Zwei Überschriften nebeneinander, von denen eine gilt.
 *
 * Dieselbe Zeile wie `SectionHeading` – blauer Strich, gleiche Schrift –, nur
 * dass sie mehr als einen Titel trägt. Die nicht gewählte steht abgedunkelt
 * daneben: sie ist keine Schaltfläche, die man erst suchen muss, sondern der
 * zweite Name desselben Regals.
 */
export function SectionTabs<T extends string>({ tabs, active, onSelect, trailing }: SectionTabsProps<T>) {
  const styles = useStyles();

  return (
    <View style={styles.head}>
      <View style={styles.bar} />

      {tabs.map((tab) => {
        const current = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            hitSlop={6}
            accessibilityRole="tab"
            accessibilityState={{ selected: current }}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Text style={[styles.title, !current && styles.titleIdle]} accessibilityRole="header">
              {tab.label}
            </Text>
          </Pressable>
        );
      })}

      {trailing ? (
        <>
          <View style={styles.spacer} />
          {trailing}
        </>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bar: { width: 3, height: 18, borderRadius: 999, backgroundColor: colors.primary },
  title: {
    flexShrink: 1,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: colors.textPrimary,
  },
  // Abgedunkelt statt kleiner: gleiche Größe, damit die beiden Namen als ein
  // Paar zu lesen sind und nicht als Titel mit Unterzeile.
  titleIdle: { color: colors.textMuted, opacity: 0.55 },
  pressed: { opacity: 0.6 },
  spacer: { flex: 1 },
}));
