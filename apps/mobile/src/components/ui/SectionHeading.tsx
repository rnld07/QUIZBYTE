import type { ReactNode } from 'react';
import { View } from 'react-native';

import { makeStyles, spacing } from '@/theme';

import { Text } from './Text';

interface SectionHeadingProps {
  title: string;
  /** Hugs the title – a count, a pill, anything that belongs to the words. */
  badge?: ReactNode;
  /** Sits at the far end of the line – usually an "Alle anzeigen" link. */
  trailing?: ReactNode;
}

/**
 * The heading that divides a screen into sections: a short accent bar, the
 * title, and whatever belongs at the end of the line.
 *
 * One component rather than a style per screen – the home screen and the
 * progress tab are read one after the other, and a heading that changes shape
 * in between makes them look like two different apps.
 */
export function SectionHeading({ title, badge, trailing }: SectionHeadingProps) {
  const styles = useStyles();

  return (
    <View style={styles.head}>
      <View style={styles.bar} />
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {badge ?? null}
      {/* Only with something at the end: an empty spacer would still claim the
          whole line, and a heading in a row beside a button would push that
          button off the edge. */}
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
  spacer: { flex: 1 },
}));
