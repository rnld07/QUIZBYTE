import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import type { NativeSyntheticEvent, TextLayoutEventData } from 'react-native';

import type { QuizQuestion } from '@quizbyte/shared';

import type { QuestionAudioState } from '@/services/audio/questionAudio';
import { useQuestionAudio } from '@/services/audio/useQuestionAudio';
import { makeStyles, radius, spacing, useThemeColors } from '@/theme';

import { ImageZoomOverlay } from './ImageZoomOverlay';
import type { ZoomOrigin } from './ImageZoomOverlay';

import { Text } from '../ui';

interface QuestionCardProps {
  question: QuizQuestion;
  sessionIndex?: number;
  sessionTotal?: number;
  /**
   * Reports how many lines the question text needs, so the screen can widen the
   * gap to the answers for a short question.
   */
  onLineCount?: (lines: number) => void;
  /** True when the user has answered this question in an earlier session. */
  seen?: boolean;
  /**
   * Drawn as a miniature somewhere else – in the chat, say.
   *
   * Then the card is a picture of a question, not a question: no audio, and
   * nothing that plays by itself.
   */
  preview?: boolean;
}

/**
 * Question card with optional 1:1 image and a small audio button in the
 * bottom-left corner (only when the question has pre-generated audio).
 */
export function QuestionCard({ question, onLineCount, seen = false, preview = false }: QuestionCardProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const audio = useQuestionAudio(question.id, question.audioUrl, !preview);
  const imageRef = useRef<View>(null);
  // Non-null while the enlarged image is on screen; holds the thumbnail's rect
  // so the overlay can grow out of it and shrink back into it.
  const [zoomOrigin, setZoomOrigin] = useState<ZoomOrigin | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  // Shown after a tap that cannot play anything, so the card answers instead of
  // staying dead. Cleared as soon as the next question arrives.
  const [hint, setHint] = useState<string | null>(null);

  const readAloud = () => {
    if (audio.available) {
      setHint(null);
      void audio.toggle();
      return;
    }
    setHint('Für diese Frage gibt es noch keine Audio.');
  };

  const handleTextLayout = (event: NativeSyntheticEvent<TextLayoutEventData>) => {
    onLineCount?.(event.nativeEvent.lines.length);
  };

  const openZoom = () => {
    imageRef.current?.measureInWindow((x, y, width, height) => {
      setZoomOrigin({ x, y, width, height });
      setZoomOpen(true);
    });
  };

  return (
    // Tapping the card reads the question out. The image keeps its own tap –
    // a nested Pressable takes the touch before this one sees it.
    <Pressable
      onPress={readAloud}
      accessibilityRole="button"
      accessibilityLabel={audio.state !== 'idle' ? 'Vorlesen stoppen' : 'Frage vorlesen'}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* If question has an image: image on the right, text on the left */}
      {question.imageUrl ? (
        <View style={styles.rowLayout}>
          <View style={styles.textSide}>
            <Text variant="title" style={styles.questionText} onTextLayout={handleTextLayout}>
              {question.questionText}
            </Text>
          </View>
          <Pressable
            ref={imageRef}
            onPress={openZoom}
            accessibilityRole="imagebutton"
            accessibilityLabel="Bild zur Frage"
            accessibilityHint="Vergrößert das Bild"
            style={({ pressed }) => [styles.image, pressed && styles.imagePressed]}
          >
            <Image
              source={{ uri: question.imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          </Pressable>
        </View>
      ) : (
        <Text variant="title" style={styles.questionText} onTextLayout={handleTextLayout}>
          {question.questionText}
        </Text>
      )}

      {hint ? (
        <Text variant="caption" color="muted" style={styles.hint}>
          {hint}
        </Text>
      ) : null}

      <View style={styles.footerRow}>
        {/* No speaker on a preview – there is nothing behind it to play. */}
        {preview ? <View /> : <AudioButton enabled={audio.available} state={audio.state} onPress={readAloud} />}

        <View style={[styles.seenBadge, seen ? styles.seenBadgeOld : styles.seenBadgeNew]}>
          <Ionicons
            name={seen ? 'checkmark-circle-outline' : 'sparkles-outline'}
            size={11}
            color={seen ? colors.textMuted : colors.primaryStrong}
          />
          <Text variant="label" style={[styles.seenText, seen ? styles.seenTextOld : styles.seenTextNew]}>
            {seen ? 'Schon beantwortet' : 'Neu'}
          </Text>
        </View>
      </View>

      {question.imageUrl && zoomOrigin && zoomOpen ? (
        <ImageZoomOverlay
          uri={question.imageUrl}
          origin={zoomOrigin}
          accessibilityLabel="Bild zur Frage"
          onClose={() => setZoomOpen(false)}
        />
      ) : null}
    </Pressable>
  );
}

interface AudioButtonProps {
  enabled: boolean;
  state: QuestionAudioState;
  /** The same handler as the card, so both taps answer the same way. */
  onPress: () => void;
}

/** Small speaker toggle, bottom-left of the question card. */
function AudioButton({ enabled, state, onPress }: AudioButtonProps) {
  const styles = useStyles();
  const colors = useThemeColors();
  const active = state !== 'idle';
  const color = !enabled ? colors.textMuted : active ? colors.primary : colors.textSecondary;
  // Never the crossed-out speaker: unavailable is said by the muted colour, and
  // a struck-through icon reads as "sound is off" rather than "not there yet".
  const icon = active ? 'volume-high' : 'volume-medium-outline';

  return (
    <View style={styles.audioRow}>
      {/*
        Never disabled: a tap that cannot play still deserves the reason, and a
        disabled button here would swallow the touch before the card sees it.
      */}
      <Pressable
        onPress={onPress}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={!enabled ? 'Vorlesen – nicht verfügbar' : active ? 'Vorlesen stoppen' : 'Frage vorlesen'}
        accessibilityState={{ selected: active }}
        style={({ pressed }) => [styles.audioButton, !enabled && styles.audioButtonIdle, pressed && styles.audioButtonPressed]}
      >
        {state === 'loading' ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name={icon} size={22} color={color} />}
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors, shadows, gradients) => ({
  card: {
    // Opaque and lifted so the question stands clear of the tinted backdrop.
    ...shadows.tile,
    backgroundColor: colors.quizSurface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.xl,
  },
  // Presses give a little, the way the answer options do – it is the only sign
  // that the tap was registered while the audio still loads.
  cardPressed: { transform: [{ scale: 0.985 }], backgroundColor: colors.surfacePressed },
  rowLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  textSide: {
    flex: 1,
  },
  questionText: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700',
  },
  image: {
    width: 100,
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    flexShrink: 0,
  },
  imagePressed: { opacity: 0.75 },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  audioRow: { flexDirection: 'row' },
  hint: { marginTop: spacing.md },
  seenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  seenBadgeNew: { backgroundColor: colors.white, borderColor: colors.badgeNewBorder },
  seenBadgeOld: { backgroundColor: colors.badgeSeenFill, borderColor: colors.badgeSeenBorder },
  seenText: { fontSize: 10, letterSpacing: 0.3, fontWeight: '700' },
  seenTextNew: { color: colors.primaryStrong },
  seenTextOld: { color: colors.textMuted },
  // Plain icon, no chip: it sits inside the question card and does not need a
  // second surface around it.
  audioButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioButtonIdle: { opacity: 0.55 },
  // Without a chip a coloured press state would be a stray square – dim instead.
  audioButtonPressed: { opacity: 0.5 },
}));
