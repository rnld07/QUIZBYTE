import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { QuizQuestion } from '@quizbyte/shared';

import { useQuestionAudio } from '@/services/audio/useQuestionAudio';
import { colors, radius, spacing } from '@/theme';

import { Text } from '../ui';

interface QuestionCardProps {
  question: QuizQuestion;
}

/**
 * Question text with optional 1:1 image. Tapping the text plays the
 * pre-generated audio (if available) – no separate "Vorlesen" button.
 */
export function QuestionCard({ question }: QuestionCardProps) {
  const audio = useQuestionAudio(question.id, question.audioUrl);

  return (
    <View style={styles.container}>
      {question.imageUrl ? (
        <Image
          source={{ uri: question.imageUrl }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          accessibilityLabel="Bild zur Frage"
        />
      ) : null}

      <Pressable
        onPress={audio.available ? () => void audio.toggle() : undefined}
        disabled={!audio.available}
        accessibilityRole={audio.available ? 'button' : 'text'}
        accessibilityLabel={question.questionText}
        accessibilityHint={audio.available ? 'Tippen, um die Frage anzuhören' : undefined}
        style={({ pressed }) => [styles.textWrap, pressed && audio.available && styles.textPressed]}
      >
        <Text variant="title" style={styles.question}>
          {question.questionText}
        </Text>
        {audio.available ? (
          <View style={styles.audioHint} accessibilityElementsHidden>
            {audio.state === 'loading' ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <Ionicons name={audio.state === 'playing' ? 'volume-high' : 'volume-high-outline'} size={18} color={audio.state === 'playing' ? colors.primary : colors.textMuted} />
            )}
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg, marginBottom: spacing.xxl },
  image: { width: '100%', aspectRatio: 1, borderRadius: radius.lg, backgroundColor: colors.surface },
  textWrap: { borderRadius: radius.md, paddingVertical: spacing.xs, gap: spacing.sm },
  textPressed: { opacity: 0.7 },
  question: { },
  audioHint: { flexDirection: 'row', alignItems: 'center', height: 20 },
});
