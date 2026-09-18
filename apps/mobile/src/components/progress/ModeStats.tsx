import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { QUIZ_MODE_DEFINITIONS } from '@quizbyte/shared';
import type { QuizModeDefinition } from '@quizbyte/shared';

import { modeImage } from '@/content/modeImages';
import { statIcon } from '@/content/statIcons';
import type { ModeRecord } from '@/services/api/progressApi';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { AppIcon, Text } from '../ui';

interface ModeStatsProps {
  recordFor: (mode: string) => ModeRecord;
  loading?: boolean;
  /** The classic round has no score to beat, so it can be left out. */
  includeClassic?: boolean;
}

/**
 * One square per mode: the best round, on the mode's own artwork.
 *
 * A row of names with a number after them said nothing about which mode was
 * which – the modes are picked from their pictures everywhere else in the app,
 * and this is the screen where you compare them. Three to a row, which is all
 * of the modes that keep a score: the classic round has no rule to beat.
 */
export function ModeStats({ recordFor, loading = false, includeClassic = true }: ModeStatsProps) {
  const styles = useStyles();
  const modes = QUIZ_MODE_DEFINITIONS.filter((mode) => includeClassic || mode.id !== 'classic');

  return (
    <View style={styles.list}>
      {modes.map((mode) => (
        <ModeTile key={mode.id} mode={mode} record={recordFor(mode.id)} loading={loading} />
      ))}
    </View>
  );
}

function ModeTile({ mode, record, loading }: { mode: QuizModeDefinition; record: ModeRecord; loading: boolean }) {
  const styles = useStyles();
  const colors = useThemeColors();
  const image = modeImage(mode.id);
  const played = record.rounds > 0;

  return (
    <View
      style={styles.tile}
      accessibilityLabel={
        played
          ? `${mode.name}: ${record.rounds} Runden, Bestwert ${record.bestCorrect} richtig`
          : `${mode.name}: noch nicht gespielt`
      }
    >
      <View style={styles.fillClip}>
        {image ? (
          <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={120} />
        ) : null}
        {/* Dark from the bottom, where the wording sits. */}
        <LinearGradient
          colors={['rgba(3, 7, 13, 0.35)', 'rgba(3, 7, 13, 0.72)', 'rgba(3, 7, 13, 0.92)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {!played ? <View style={styles.dim} /> : null}
      </View>

      {/* The figure first and biggest – it is the reason to be on this page –
          then what it belongs to. */}
      {played ? (
        <View style={styles.best}>
          {/* Der Bestwert hat einen eigenen Platz. Solange dort nichts liegt,
              steht wie bisher das Haken-Bild daneben. */}
          <AppIcon source={statIcon('highscore') ?? statIcon('correct')} fallback="trophy" size={20} glyphSize={14} color={colors.warning} />
          <Text style={[styles.bestValue, { color: colors.warning }]}>{record.bestCorrect}</Text>
        </View>
      ) : (
        <Text style={styles.bestEmpty}>–</Text>
      )}

      <View style={styles.texts}>
        <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
          {mode.name}
        </Text>
        <Text variant="label" style={styles.meta} numberOfLines={1}>
          {loading ? '…' : played ? `${record.rounds} ${record.rounds === 1 ? 'Runde' : 'Runden'}` : 'Noch nicht gespielt'}
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors, shadows) => ({
  /*
    Aligning to the start matters here: a wrapping row stretches its items
    to the height of the tallest one by default, and a tile whose height comes
    from its aspect ratio then leaves the line taller than the tile – which is
    the empty band that kept showing up under the last row.
  */
  list: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.sm },
  tile: {
    ...shadows.tile,
    // Just under a third, so the three modes with a score fit on one line.
    flexBasis: '31%',
    flexGrow: 1,
    // A shade taller than wide, which is what the figure and two lines of
    // wording need at this width.
    aspectRatio: 0.88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    overflow: 'hidden',
  },
  fillClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surfacePressed,
    pointerEvents: 'none',
  },
  dim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3, 7, 13, 0.5)' },

  texts: { alignItems: 'center', gap: 1 },
  name: { fontSize: 13, letterSpacing: -0.2, textAlign: 'center', color: '#FFFFFF' },
  meta: { textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)' },

  best: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bestValue: { fontSize: 24, fontWeight: '900', lineHeight: 28 },
  bestEmpty: { fontSize: 20, fontWeight: '800', color: 'rgba(255, 255, 255, 0.45)' },
}));
