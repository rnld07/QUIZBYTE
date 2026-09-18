import { useState } from 'react';
import { View } from 'react-native';

import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { Button, Text } from '../ui';
import { PrizeWheel } from './PrizeWheel';

interface DailyWheelCardProps {
  /** What today's spin paid, or null while it has not been spun. */
  xpWon: number | null;
  spinning: boolean;
  error?: string | null;
  onSpin: () => void;
  /**
   * Schliesst das Fenster, sobald gedreht wurde.
   *
   * An der Stelle, wo bis eben der Knopf zum Drehen stand – das Fenster geht
   * nicht mehr von selbst zu, und ohne diesen Knopf bliebe dafuer nur das
   * kleine Kreuz in der Ecke.
   */
  onDone?: () => void;
  /** Without its own frame – for when a window already draws one around it. */
  bare?: boolean;
}

/**
 * The reward for a flawless daily round, right where it is earned.
 *
 * On the result page rather than behind a bar on the home screen: the spin
 * belongs to the round that just ended, and a prize you have to go looking for
 * afterwards is one most people never collect. Today's result stays reachable
 * from the daily card all day, so a spin left untaken is not a spin lost.
 */
export function DailyWheelCard({ xpWon, spinning, error, onSpin, onDone, bare = false }: DailyWheelCardProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  // Held back until the wheel has stopped: the number is the punchline. A
  // prize that was already won has no punchline left – it is shown straight away.
  const [revealed, setRevealed] = useState(() => xpWon !== null);

  return (
    <View style={[styles.card, bare && styles.cardBare]}>
      <Text variant="label" style={styles.eyebrow}>
        FEHLERFREI · EINE DREHUNG
      </Text>
      <Text variant="headline" style={styles.title}>
        Glücksrad
      </Text>

      {/* The wheel is the button: tap it, or give it a flick the way you would
          a real one. The button below stays for anyone who does neither. */}
      <View style={styles.wheelBox} accessibilityRole="button" accessibilityLabel="Glücksrad drehen">
        <PrizeWheel
          size={250}
          xpWon={xpWon}
          onSettled={() => setRevealed(true)}
          onFlick={onSpin}
          flickDisabled={xpWon !== null || spinning}
        />
      </View>

      {revealed && xpWon !== null ? (
        <>
          <Text variant="title" style={{ color: xpWon > 0 ? colors.success : colors.textMuted }}>
            {xpWon > 0 ? `+${xpWon} XP` : 'Leider nichts'}
          </Text>
          {/* The wheel says the rest: it has just stopped on the number. */}
        </>
      ) : null}

      {error ? (
        <Text color="danger" align="center">
          {error}
        </Text>
      ) : null}

      {xpWon === null ? (
        <Button title={spinning ? 'Dreht …' : 'Drehen'} onPress={onSpin} loading={spinning} style={styles.action} />
      ) : onDone && revealed ? (
        <Button title="Fertig" variant="secondary" onPress={onDone} style={styles.action} />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors, shadows) => ({
  card: {
    ...shadows.tile,
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: `${colors.warning}55`,
    backgroundColor: colors.warningSoft,
  },
  cardBare: { marginBottom: 0, borderWidth: 0, backgroundColor: 'transparent' },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.warning },
  title: { letterSpacing: -0.2, color: colors.textPrimary },
  wheelBox: { paddingVertical: spacing.sm },
  action: { alignSelf: 'stretch', marginTop: spacing.xs },
}));
