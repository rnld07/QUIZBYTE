import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import {
  AVATAR_ACCENTS,
  AVATAR_ACCESSORIES,
  AVATAR_BREEDS,
  AVATAR_FURS,
  AVATAR_GLASSES,
  AVATAR_SPECIES,
  AVATAR_SPECIES_NAMES,
  avatarAccentColor,
  switchAvatarSpecies,
} from '@quizbyte/shared';
import type { AvatarConfig, AvatarSpecies } from '@quizbyte/shared';

import { profileIcon } from '@/content/profileIcons';
import type { ProfileIconKey } from '@/content/profileIcons';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { AppIcon, Text } from '../ui';

interface AvatarStudioProps {
  config: AvatarConfig;
  onChange: (config: AvatarConfig) => void;
}

/** One choice, as it appears in a stepper row. */
interface Option {
  id: string;
  name: string;
  /** Drawn as a dot beside the name, where the choice is a colour. */
  swatch?: string;
}

/**
 * Puts the pet together, one row per part.
 *
 * Arrows rather than a scrolling shelf of chips: every part is a short list you
 * page through, the avatar above changes on each tap, and you can work down the
 * rows without hunting for the option you have not tried yet. A row of chips
 * hides its own end off the side of the screen, which is exactly where the
 * unfamiliar breeds sat.
 */
export function AvatarStudio({ config, onChange }: AvatarStudioProps) {
  const styles = useStyles();
  const colors = useThemeColors();

  const breeds = AVATAR_BREEDS[config.species];
  const furs: Option[] = AVATAR_FURS.map((fur) => ({ id: fur.id, name: fur.name, swatch: fur.base }));
  const accents: Option[] = AVATAR_ACCENTS.map((accent) => ({
    id: accent.id,
    name: accent.name,
    swatch: avatarAccentColor(accent.id),
  }));
  // Pointless while nothing is worn – the colour would change nothing.
  const wearsSomething = config.accessory !== 'none' || config.glasses !== 'none';

  return (
    <View style={styles.container}>
      {/* Species first: it is the one choice that redraws everything below it. */}
      <View style={styles.speciesRow} accessibilityRole="radiogroup">
        {AVATAR_SPECIES.map((species) => (
          <SpeciesTab
            key={species}
            species={species}
            active={config.species === species}
            onPress={() => onChange(switchAvatarSpecies(config, species))}
          />
        ))}
      </View>

      {/* Draws the line between what the pet is and how it looks. */}
      <View style={styles.divider} />

      <StepperRow
        label="Rasse"
        icon="paw"
        art="breed"
        tint={colors.primary}
        options={breeds}
        value={config.breed}
        onChange={(breed) => onChange({ ...config, breed })}
      />
      <StepperRow
        label="Fellfarbe"
        icon="color-palette"
        art="fur"
        tint={colors.primary}
        options={furs}
        value={config.fur}
        onChange={(fur) => onChange({ ...config, fur })}
      />
      <StepperRow
        label="Brille"
        icon="glasses"
        art="glasses"
        tint={colors.primary}
        options={AVATAR_GLASSES}
        value={config.glasses}
        onChange={(glasses) => onChange({ ...config, glasses })}
      />
      <StepperRow
        label="Zubehör"
        icon="ribbon"
        art="accessory"
        tint={colors.primary}
        options={AVATAR_ACCESSORIES}
        value={config.accessory}
        onChange={(accessory) => onChange({ ...config, accessory })}
      />
      {wearsSomething ? (
        <StepperRow
          label="Farbe des Zubehörs"
          icon="color-fill"
          art="accent"
          tint={colors.primary}
          options={accents}
          value={config.accent}
          onChange={(accent) => onChange({ ...config, accent })}
        />
      ) : null}
    </View>
  );
}

interface StepperRowProps {
  label: string;
  /** Symbol on the left. */
  icon: keyof typeof Ionicons.glyphMap;
  /** Key of the custom symbol for this part, when one is registered. */
  art: ProfileIconKey;
  /** One colour for every part: five different ones made the page a paint box. */
  tint: string;
  options: readonly Option[];
  value: string;
  onChange: (id: string) => void;
}

/**
 * Label on the left, the current choice between two arrows on the right.
 *
 * Wraps around at both ends: these are rings of a handful of options, and a
 * dead arrow at the end of a five-item list is a button that does nothing for
 * no reason anyone can see.
 */
function StepperRow({ label, icon, art, tint, options, value, onChange }: StepperRowProps) {
  const styles = useStyles();

  const index = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  );
  const current = options[index];
  const step = (delta: number) => {
    const next = options[(index + delta + options.length) % options.length];
    if (next) onChange(next.id);
  };

  return (
    <View style={[styles.card, { borderColor: `${tint}33` }]}>
      {/* Heading: what this row is, and where in its ring you are. */}
      <View style={styles.head}>
        {/* No plate behind it: the symbols bring their own shape, and a tinted
            square around each one boxed a row of them in. */}
        <AppIcon source={profileIcon(art)} fallback={icon} size={24} glyphSize={16} color={tint} />
        {/* White wording, tinted symbol: the colour is there to tell the
            parts apart, not to be read. */}
        <Text variant="label" numberOfLines={1} style={styles.headLabel}>
          {label.toUpperCase()}
        </Text>
        <Text variant="label" color="muted" style={styles.counter}>
          {index + 1}/{options.length}
        </Text>
      </View>

      {/* The control: two big ends and the value filling everything between. */}
      <View style={styles.control}>
        <Arrow icon="chevron-back" tint={tint} label={`${label}: vorheriges`} onPress={() => step(-1)} />

        <View style={styles.value}>
          {current?.swatch ? <View style={[styles.swatch, { backgroundColor: current.swatch }]} /> : null}
          <Text variant="bodyStrong" numberOfLines={1} style={styles.valueText}>
            {current?.name ?? '–'}
          </Text>
        </View>

        <Arrow icon="chevron-forward" tint={tint} label={`${label}: nächstes`} onPress={() => step(1)} />
      </View>
    </View>
  );
}

interface ArrowProps {
  icon: 'chevron-back' | 'chevron-forward';
  tint: string;
  label: string;
  onPress: () => void;
}

/** A full-height end of the control – the whole side is the target. */
function Arrow({ icon, tint, label, onPress }: ArrowProps) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.arrow, { backgroundColor: `${tint}1F` }, pressed && styles.arrowPressed]}
    >
      <Ionicons name={icon} size={20} color={tint} />
    </Pressable>
  );
}

/** Cat or dog – two words, so two buttons rather than a third stepper. */
function SpeciesTab({ species, active, onPress }: { species: AvatarSpecies; active: boolean; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={AVATAR_SPECIES_NAMES[species]}
      style={({ pressed }) => [styles.speciesTab, active && styles.speciesTabActive, pressed && styles.pressed]}
    >
      <Text variant="bodyStrong" style={[styles.speciesLabel, active && styles.activeLabel]}>
        {AVATAR_SPECIES_NAMES[species]}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  // Two per row: the rows are short and a single column of five pushed the
  // last of them well below the fold.
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pressed: { opacity: 0.6 },

  speciesRow: { width: '100%', flexDirection: 'row', gap: spacing.sm },
  divider: { width: '100%', height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  speciesTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  speciesTabActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  speciesLabel: { color: colors.textPrimary },
  // The chosen one keeps its blue frame and wash; the wording stays white.
  activeLabel: { color: colors.textPrimary },

  // One card per part, tinted in that part's colour.
  card: {
    // Just under half, so two sit side by side with the gap between them.
    flexBasis: '48%',
    flexGrow: 1,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    backgroundColor: colors.surfaceElevated,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headLabel: { flex: 1, fontSize: 10, color: colors.textPrimary },
  counter: { fontSize: 10 },

  // The arrows are the two ends of one bar, so the value can have the width it
  // needs and the targets still never move.
  control: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 44,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfacePressed,
  },
  arrow: { width: 40, alignItems: 'center', justifyContent: 'center' },
  arrowPressed: { opacity: 0.55 },
  value: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  swatch: { width: 14, height: 14, borderRadius: radius.full, borderWidth: 1, borderColor: colors.borderStrong },
  valueText: { flexShrink: 1, fontSize: 13, color: colors.textPrimary },
}));
