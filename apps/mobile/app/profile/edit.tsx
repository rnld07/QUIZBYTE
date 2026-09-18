import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { DEFAULT_AVATAR_CONFIG, describeAvatar, resolveFrame, validateUsername } from '@quizbyte/shared';
import type { AvatarConfig, UsernameError } from '@quizbyte/shared';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { AvatarStudio } from '@/components/profile/AvatarStudio';
import { AppIcon, Avatar, Button, IconButton, RaisedCard, Screen, Text } from '@/components/ui';
import { profileIcon } from '@/content/profileIcons';
import type { ProfileIconKey } from '@/content/profileIcons';
import { useProfile, useUpdateAvatar, useUpdateProfile } from '@/features/profile/useProfile';
import { useProgress } from '@/features/progress/useProgress';
import { getUserMessage } from '@/services/errors';
import { makeStyles, radius, spacing, typography, useThemeColors } from '@/theme';

const USERNAME_MESSAGES: Record<UsernameError, string> = {
  too_short: 'Mindestens 3 Zeichen.',
  too_long: 'Maximal 20 Zeichen.',
  invalid_chars: 'Nur a-z, 0-9, Punkt und Unterstrich.',
  invalid_edge: 'Darf nicht mit einem Punkt beginnen oder enden.',
  consecutive_dots: 'Keine zwei Punkte hintereinander.',
  // Deliberately says nothing about which word it was: naming it invites the
  // next attempt, and the server answers with the same sentence.
  blocked: 'Dieser Benutzername ist nicht erlaubt.',
};

/** Big enough to see what a bow or a pair of glasses actually looks like, small
 * enough to sit in a bar that never leaves the screen. */
const PREVIEW = 86;

/**
 * Editing the profile.
 *
 * The pet sits in a bar pinned to the top, because the rows that change it
 * scroll a long way and watching it change is the whole point of the page.
 * Under it: the username first – one line, and what other people look for –
 * then a row per part of the avatar.
 *
 * No display name: a second name to keep in step with the first, shown instead
 * of it everywhere, for no gain anyone asked for.
 *
 * Saving is pinned to the bottom, because the page scrolls past it.
 */
export default function EditProfileScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const router = useRouter();
  const profile = useProfile();
  const { level } = useProgress();
  const update = useUpdateProfile();
  const avatar = useUpdateAvatar();

  // Local edits are overrides, so the fields show server values until typed in.
  const [usernameInput, setUsernameInput] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [avatarDraft, setAvatarDraft] = useState<AvatarConfig | null>(null);

  const username = usernameInput ?? profile.data?.username ?? '';
  const savedAvatar = profile.data?.avatarConfig ?? DEFAULT_AVATAR_CONFIG;
  const shownAvatar = avatarDraft ?? savedAvatar;
  const nameChanged = profile.data ? username !== profile.data.username : false;
  const avatarChanged = avatarDraft !== null && JSON.stringify(avatarDraft) !== JSON.stringify(savedAvatar);
  const dirty = nameChanged || avatarChanged;

  const save = () => {
    const usernameResult = validateUsername(username);
    if (!usernameResult.ok) {
      setValidationError(USERNAME_MESSAGES[usernameResult.error]);
      return;
    }
    setValidationError(null);

    // Only once it is actually stored – on an error the page stays open with
    // the values still in it.
    const done = () => router.back();

    if (avatarChanged && avatarDraft) {
      avatar.mutate(avatarDraft, {
        onSuccess: () => {
          setAvatarDraft(null);
          if (!nameChanged) done();
        },
      });
    }

    if (nameChanged) {
      update.mutate({ username: usernameResult.value }, { onSuccess: done });
    } else if (!avatarChanged) {
      done();
    }
  };

  const failure = update.error ?? avatar.error;

  return (
    <Screen
      backdrop={<AmbientBackground />}
      header={
        <>
          <View style={styles.topBar}>
            <Text variant="headline">Profil bearbeiten</Text>
            <IconButton icon="close" accessibilityLabel="Schließen" onPress={() => router.back()} />
          </View>

          {/* Pinned: the rows below scroll a long way, and every one of them
              changes this. Watching the pet change is the whole point, so it
              does not get to leave the screen. Side by side rather than stacked
              – a bar this tall would take half the page. */}
          <RaisedCard style={styles.stage} glow={`${colors.primary}40`}>
            <Avatar
              config={shownAvatar}
              name={username || '?'}
              size={PREVIEW}
              frame={resolveFrame(profile.data?.selectedFrame, level?.level ?? 1)}
            />
            <View style={styles.stageText}>
              <Text variant="bodyStrong" numberOfLines={1} style={styles.stageName}>
                @{username}
              </Text>
              {/* Room for two lines whether it needs them or not: "Graue Katze"
                  and "Graue Katze mit runder Brille und Schleife" are one tap
                  apart, and the bar must not change height between them. */}
              <Text variant="caption" color="muted" numberOfLines={2} style={styles.stageDescription}>
                {describeAvatar(shownAvatar)}
              </Text>
              {/* Always laid out, only sometimes visible: appearing and
                  disappearing would change the bar's height, and the rows you
                  are tapping would jump a line. */}
              <View
                style={[
                  styles.badge,
                  { borderColor: colors.primary, backgroundColor: colors.primarySoft },
                  !avatarChanged && styles.badgeHidden,
                ]}
              >
                <Text variant="label" style={{ color: colors.primary }}>
                  NOCH NICHT GESPEICHERT
                </Text>
              </View>
            </View>
          </RaisedCard>
        </>
      }
      footer={
        <Button
          title={dirty ? 'Speichern' : 'Gespeichert'}
          onPress={save}
          disabled={!dirty || profile.isLoading}
          loading={update.isPending || avatar.isPending}
        />
      }
    >
      {/* The name first: it is the shortest thing to change and the one other
          people go looking for. */}
      <SectionLabel icon="at" art="username" tint={colors.primary} textColor={colors.textPrimary} text="BENUTZERNAME" />

      <Field hint="Darunter finden dich Freunde. Nur a-z, 0-9, Punkt und Unterstrich." prefix="@">
        <TextInput
          value={username}
          onChangeText={(value) => setUsernameInput(value.toLowerCase())}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          placeholder="benutzername"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          accessibilityLabel="Benutzername"
        />
      </Field>

      <SectionLabel icon="color-wand" art="avatar" tint={colors.primary} textColor={colors.textPrimary} text="AVATAR" />

      {/* The parts, each one tap from its neighbour. */}
      <AvatarStudio config={shownAvatar} onChange={setAvatarDraft} />

      {validationError ? <Text color="danger">{validationError}</Text> : null}
      {failure ? <Text color="danger">{getUserMessage(failure)}</Text> : null}
    </Screen>
  );
}

/** A tinted rule with a label on it – the page's own section heading. */
function SectionLabel({
  icon,
  art,
  tint,
  textColor,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  /** Key of the custom symbol for this heading, when one is registered. */
  art: ProfileIconKey;
  tint: string;
  /** Overrides the wording colour; the icon and rule keep the tint. */
  textColor?: string;
  text: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.sectionLabel}>
      {/* No plate: the symbols are drawn with their own shape, and a tinted
          square around them made the headings look like buttons. */}
      <AppIcon source={profileIcon(art)} fallback={icon} size={30} glyphSize={19} color={tint} />
      <Text variant="label" style={{ color: textColor ?? tint }}>
        {text}
      </Text>
      <View style={[styles.rule, { backgroundColor: `${tint}33` }]} />
    </View>
  );
}

interface FieldProps {
  hint: string;
  /** A fixed character in front of the input, e.g. the "@" of a username. */
  prefix?: string;
  children: React.ReactNode;
}

/**
 * One input with its explanation.
 *
 * The heading above it already names the field, so the box carries no label of
 * its own – just the value, on its own surface, with the rule underneath it in
 * plain words.
 */
function Field({ hint, prefix, children }: FieldProps) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <View style={styles.inputRow}>
        {prefix ? (
          <Text variant="bodyStrong" color="muted">
            {prefix}
          </Text>
        ) : null}
        {children}
      </View>
      <Text variant="caption" color="muted">
        {hint}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  stage: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.md },
  stageText: { flex: 1, gap: 2, alignItems: 'flex-start' },
  stageName: { fontSize: 15, color: colors.textPrimary },
  // Two caption lines at 17 px each – fixed, so the bar keeps its height.
  stageDescription: { height: 34 },
  badge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  // Still there, still the same height – just not seen.
  badgeHidden: { opacity: 0 },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  // Runs out to the edge and fades with the section's colour, so the heading
  // divides the page instead of just sitting on it.
  rule: { flex: 1, height: 1 },

  panel: { gap: spacing.md },
  field: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  fieldHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // The frame is the card around it; the input itself is just the line of text.
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfacePressed,
  },
  input: { ...typography.body, flex: 1, height: 46, color: colors.textPrimary },
}));
