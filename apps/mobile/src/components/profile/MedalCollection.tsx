import { View } from 'react-native';

import { MEDAL_TIERS, allMedalProgress } from '@quizbyte/shared';
import type { MedalProgress, MedalStats, MedalTier } from '@quizbyte/shared';

import { medalIcon } from '@/content/medalIcons';
import { makeStyles, radius, spacing } from '@/theme';

import { AppIcon, ProgressBar, Text } from '../ui';

interface MedalCollectionProps {
  stats: MedalStats;
  loading?: boolean;
}

/** Durchmesser der Scheibe. */
const DISC = 68;

/**
 * Wie eine Stufe aussieht.
 *
 * Feste Farben statt Theme-Werten: ein Metall ist ein Metall, in hell wie in
 * dunkel. Platin ist absichtlich nicht das naechste Grau – neben Silber waere
 * ein neutrales Platin kaum eine andere Stufe. Der Blaustich und der Schein
 * dahinter trennen die beiden auf einen Blick, so wie beim Profilrahmen.
 */
const TIER_LOOK: Record<MedalTier, { ring: string; inner: string; label: string; text: string; glow?: string }> = {
  bronze: { ring: '#C77C3C', inner: 'rgba(199, 124, 60, 0.16)', label: 'Bronze', text: '#E0A068' },
  silver: { ring: '#C3CBD6', inner: 'rgba(195, 203, 214, 0.16)', label: 'Silber', text: '#DDE3EC' },
  gold: { ring: '#E8B43C', inner: 'rgba(232, 180, 60, 0.18)', label: 'Gold', text: '#F5CE6B' },
  platinum: {
    ring: '#9FE6FF',
    inner: 'rgba(159, 230, 255, 0.16)',
    label: 'Platin',
    text: '#CFEFFF',
    glow: 'rgba(159, 230, 255, 0.45)',
  },
};

const LOCKED = { ring: 'rgba(138, 148, 166, 0.45)', inner: 'rgba(138, 148, 166, 0.10)' };

/**
 * Das Medaillenregal.
 *
 * Auch die ungelösten stehen da, ausgegraut und mit ihrer Aufgabe darunter –
 * das ist der Punkt an der Seite. Eine Liste, die nur zeigt, was man schon hat,
 * gibt niemandem etwas zu tun.
 */
export function MedalCollection({ stats, loading = false }: MedalCollectionProps) {
  const styles = useStyles();
  const medals = allMedalProgress(stats);

  return (
    <View style={styles.grid}>
      {medals.map((entry) => (
        <MedalTile key={entry.medal.id} entry={entry} loading={loading} />
      ))}
    </View>
  );
}

function MedalTile({ entry, loading }: { entry: MedalProgress; loading: boolean }) {
  const styles = useStyles();
  const { medal, tier, value, nextTarget, percent, requirement } = entry;
  const look = tier ? TIER_LOOK[tier] : null;
  // Ein Bild je Stufe, für alle acht Medaillen dasselbe – siehe medalIcons.
  const image = medalIcon(tier);

  return (
    <View
      style={styles.tile}
      accessibilityLabel={
        tier
          ? `${medal.name}, ${TIER_LOOK[tier].label}. ${requirement}`
          : `${medal.name}, noch nicht verdient. ${requirement}`
      }
    >
      {/* Mit hinterlegtem Bild ist das Bild die Medaille – ein gezeichneter
          Ring darum wäre ein zweiter Rand um einen, den das Bild schon hat.
          Ohne Bild bleibt die gezeichnete Scheibe: Ring in der Farbe der
          Stufe, Zeichen darin, und ohne verdiente Stufe beides stumpf. */}
      {image ? (
        <View style={[styles.plain, look?.glow ? { shadowColor: look.glow, ...styles.discGlow } : null]}>
          <AppIcon source={image} fallback="medal" size={DISC} />
        </View>
      ) : (
        <View
          style={[
            styles.disc,
            { borderColor: look?.ring ?? LOCKED.ring, backgroundColor: look?.inner ?? LOCKED.inner },
            look?.glow ? { shadowColor: look.glow, ...styles.discGlow } : null,
          ]}
        >
          <View style={!tier && styles.dulled}>
            <AppIcon source={undefined} fallback="medal" size={DISC - 24} glyphSize={30} color={look?.ring ?? LOCKED.ring} />
          </View>
        </View>
      )}

      <Text variant="label" numberOfLines={1} style={[styles.name, look ? { color: look.text } : null]}>
        {medal.name}
      </Text>

      {/* Auf der letzten Stufe ist nichts mehr zu tun, deshalb steht da die
          Stufe statt einer Aufgabe, die längst erledigt ist. */}
      <Text variant="label" numberOfLines={2} style={styles.requirement}>
        {nextTarget === null ? TIER_LOOK.platinum.label : requirement}
      </Text>

      {nextTarget === null ? null : (
        <View style={styles.progress}>
          <ProgressBar value={loading ? 0 : percent} height={4} color={look?.ring ?? LOCKED.ring} style={styles.bar} />
          <Text variant="label" style={styles.count}>
            {loading ? '…' : `${Math.min(value, nextTarget)}/${nextTarget}`}
          </Text>
        </View>
      )}

      {/* Drei Punkte: welche Stufen stehen, welche noch nicht. Kürzer als drei
          Wörter und auf einen Blick zu lesen. */}
      <View style={styles.pips}>
        {MEDAL_TIERS.map((step, index) => {
          const reached = tier !== null && index <= MEDAL_TIERS.indexOf(tier);
          return (
            <View
              key={step}
              style={[styles.pip, { backgroundColor: reached ? TIER_LOOK[step].ring : LOCKED.ring }, !reached && styles.pipEmpty]}
            />
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.sm },
  tile: {
    // Knapp die Hälfte, damit zwei nebeneinander stehen.
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 130,
    alignItems: 'center',
    gap: 5,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
  },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: radius.full,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Nur Platin traegt einen Schein – die Stufe, die kaum jemand erreicht,
  // darf sich von den drei Metallen darunter auch abheben.
  discGlow: { shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  // Das eigene Bild bringt seine eigene Form mit und steht ohne Feld darum.
  plain: { width: DISC, height: DISC, alignItems: 'center', justifyContent: 'center' },
  // Nur für das gezeichnete Zeichen: die ungelöste Stufe wird stumpf gestellt.
  // Ein eigenes Bild braucht das nicht – dafür gibt es `locked.png`.
  dulled: { opacity: 0.3 },

  name: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
  requirement: { fontSize: 10, textAlign: 'center', color: colors.textMuted },

  progress: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  bar: { flex: 1 },
  count: { fontSize: 9, color: colors.textMuted },

  pips: { flexDirection: 'row', gap: 4, marginTop: 2 },
  pip: { width: 6, height: 6, borderRadius: radius.full },
  pipEmpty: { opacity: 0.35 },

}));
