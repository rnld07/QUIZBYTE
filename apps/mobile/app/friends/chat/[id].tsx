import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { duelExpired, equippedFrame, formatRelativeTime } from '@quizbyte/shared';

import { AmbientBackground } from '@/components/layout/AmbientBackground';
import { DuelBubble } from '@/components/friends/DuelBubble';
import { DuelSummaryDialog } from '@/components/friends/DuelSummaryDialog';
import { SharedQuestionBubble } from '@/components/friends/SharedQuestionBubble';
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Screen,
  Skeleton,
  Text,
} from '@/components/ui';
import {
  useConversation,
  useDeclineDuel,
  useFriends,
  useMarkConversationRead,
} from '@/features/friends/useFriends';
import { useProfile } from '@/features/profile/useProfile';
import { useNow } from '@/features/time/useNow';
import { useStartQuiz } from '@/features/quiz/useStartQuiz';
import { fetchCategories } from '@/services/api/categoriesApi';
import { settleDuel } from '@/services/api/friendsApi';
import type { ChatMessage } from '@/services/api/friendsApi';
import { fetchQuestionsByIds } from '@/services/api/questionsApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useFeature } from '@/state/featureStore';
import { getUserMessage } from '@/services/errors';
import { useAuthStore } from '@/state/authStore';
import { makeStyles, radius, spacing, useGradients, useThemeColors } from '@/theme';

/**
 * Ein Duell, das zwischen den beiden noch aussteht.
 *
 * Weder abgerechnet noch abgelaufen – egal, wer herausgefordert hat und wer
 * schon gespielt hat. Das ist die Bedingung für die nächste Herausforderung,
 * und sie ist bewusst weiter als `playableDuel`: auch ein Duell, in dem ich
 * fertig bin und der andere nicht, steht noch aus.
 */
function unfinishedDuel(message: ChatMessage, now: number): boolean {
  const duel = message.duel;
  if (!duel || (duel.status !== 'active' && duel.status !== 'pending')) return false;
  return !duelExpired(message.createdAt, now);
}

/**
 * A duel still waiting for my round.
 *
 * "pending" as well as "active": a fresh challenge is pending until one of the
 * two starts playing, and that is exactly when there is most to do about it.
 */
function playableDuel(message: ChatMessage, myId: string | null): boolean {
  const duel = message.duel;
  if (!duel || (duel.status !== 'active' && duel.status !== 'pending')) return false;
  if (duelExpired(message.createdAt, Date.now())) return false;
  // Played, not scored: the score arrives only once both sides are done.
  return !(duel.challengerId === myId ? duel.challengerPlayed : duel.opponentPlayed);
}

/**
 * The chat with one friend.
 *
 * Two kinds of message and nothing else: a question that can be answered on the
 * spot, and a duel. Questions arrive from the quiz – the "Freund senden" button
 * under a question – so the only thing to start from here is a challenge, which
 * is why the bar at the bottom has one thing on it.
 */
export default function FriendChatScreen() {
  const styles = useStyles();
  const colors = useThemeColors();
  const gradients = useGradients();
  const router = useRouter();
  const { id: friendId } = useLocalSearchParams<{ id: string }>();
  const myId = useAuthStore((state) => state.userId);

  const friends = useFriends();
  const profile = useProfile();
  const friend = friends.friends.find((entry) => entry.id === friendId) ?? null;
  const friendName = friend?.displayName ?? friend?.username ?? 'Dein Freund';
  const conversation = useConversation(friendId ?? null);
  const queryClient = useQueryClient();
  const declineDuel = useDeclineDuel(friendId ?? null);
  const startQuiz = useStartQuiz();

  // The whole message, not just the duel: the sheet needs its id to start the
  // round, and who sent it to know whether declining is on offer.
  const [openDuel, setOpenDuel] = useState<ChatMessage | null>(null);
  // Auch bei einer neuen Nachricht, nicht nur beim Oeffnen: wer den Chat offen
  // liegen hat, soll den Punkt nicht behalten, bis er ihn einmal schliesst.
  useMarkConversationRead(friendId ?? null, conversation.messages.at(-1)?.id ?? null);
  // Der Schalter greift am Einstieg, nicht nur am Tab: ein abgeschaltetes
  // Duell darf sich nicht herausfordern lassen.
  const duelsEnabled = useFeature('duels');

  // The text of every shared question in this chat, in one request.
  const questionIds = conversation.messages
    .map((message) => message.questionId)
    .filter((id): id is string => Boolean(id));
  const questions = useQuery({
    queryKey: ['friends', 'chat-questions', friendId, questionIds.join(',')],
    queryFn: async () => {
      const list = await fetchCategories();
      const lookup = new Map(list.map((entry) => [entry.id, entry]));
      return fetchQuestionsByIds(questionIds, lookup);
    },
    enabled: questionIds.length > 0,
    staleTime: 5 * 60 * 1000,
    /*
      The key carries the ids, so every new message in the chat is a new query.
      Keeping the previous answer means the texts already on screen stay put
      while the one that just arrived is fetched – without it the whole chat
      would fall back to its skeleton every time a message lands.
    */
    placeholderData: keepPreviousData,
  });
  const questionById = new Map((questions.data ?? []).map((question) => [question.id, question]));

  /*
    Nothing is drawn until the question texts are there as well.

    A shared question is as tall as its text, so a chat rendered before they
    arrive lays itself out at the wrong height, jumps to the bottom, and jumps
    again once the texts land – which is the flicker you see the first time a
    chat is opened. Every later visit is served from the cache and has nothing
    to wait for.
  */
  const loading =
    conversation.isLoading || (questionIds.length > 0 && questions.data === undefined);

  /*
    Solange eines aussteht, gibt es keine zweite Herausforderung.

    Sonst stapeln sich im Chat Runden, die niemand mehr auseinanderhält, und
    der Gegner hat drei vor sich, bevor er die erste gespielt hat. Die
    Datenbank prüft dasselbe (`open_duel_with()`) – zwei Leute können sich im
    selben Moment herausfordern, und das entscheidet nur sie.
  */
  const now = useNow();
  const duelOutstanding = conversation.messages.some((message) => unfinishedDuel(message, now));

  /*
    Scoring is idempotent; asking on open is what finishes a duel once the
    second player is done – and what closes one whose three days ran out, which
    is why a merely pending duel is asked about too.

    The refetch afterwards is the point: settling changes the duel rows in the
    database, and without asking for the chat again the screen kept showing the
    scores it had loaded a moment earlier. That is why the numbers only moved
    after leaving the chat and coming back.
  */
  /*
    Each duel is asked about once per visit. Without that mark the refetch below
    would hand back the same open duel, the effect would settle it again, and
    the two would chase each other for as long as the chat is on screen – an
    open duel stays open until the other player is done, however often it is
    asked.
  */
  const asked = useRef(new Set<string>());

  useEffect(() => {
    const open = conversation.messages.filter(
      (message) =>
        message.duelId &&
        (message.duel?.status === 'active' || message.duel?.status === 'pending') &&
        !asked.current.has(message.duelId),
    );
    if (open.length === 0) return;

    for (const message of open) asked.current.add(message.duelId as string);

    let cancelled = false;
    void Promise.all(open.map((message) => settleDuel(message.duelId as string)))
      .then(() => {
        if (!cancelled)
          void queryClient.invalidateQueries({ queryKey: [...queryKeys.conversation, friendId] });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [conversation.messages, friendId, queryClient]);

  const playDuel = (message: ChatMessage) => {
    if (!message.duelId) return;
    setOpenDuel(null);
    void startQuiz.start({
      type: 'duel',
      duelId: message.duelId,
      mode: message.duel?.mode,
      friendId,
    });
  };

  return (
    <Screen
      backdrop={<AmbientBackground />}
      stickToBottom
      header={
        <View style={styles.topBar}>
          <IconButton
            icon="chevron-back"
            accessibilityLabel="Zurück"
            onPress={() => router.back()}
          />
          {/* The face opens the profile, here as in the friends list. */}
          <Pressable
            onPress={() =>
              friendId && router.push({ pathname: '/friends/[id]', params: { id: friendId } })
            }
            accessibilityRole="button"
            accessibilityLabel={`Profil von ${friendName}`}
            style={({ pressed }) => [styles.titleRow, pressed && styles.pressed]}
          >
            <Avatar
              config={friend?.avatarConfig}
              name={friendName}
              size={36}
              frame={equippedFrame(friend?.selectedFrame)}
            />
            <View style={styles.titleText}>
              <Text variant="bodyStrong" numberOfLines={1} style={styles.title}>
                {friendName}
              </Text>
              {friend ? (
                <Text variant="caption" color="muted" numberOfLines={1}>
                  Level {friend.level} · Profil ansehen
                </Text>
              ) : null}
            </View>
          </Pressable>
        </View>
      }
      footer={
        <>
          {/* Ein fehlgeschlagenes Ablehnen sagt jetzt, warum – vorher war ein
              Kreuz, das nicht mehr zutrifft, ein Tipp ins Leere. */}
          {declineDuel.isError ? (
            <Text color="danger" align="center" variant="caption" style={styles.declineError}>
              {getUserMessage(declineDuel.error)}
            </Text>
          ) : null}

          {!duelsEnabled ? null : duelOutstanding ? (
            // Kein Knopf, sondern der Grund: ein ausgegrauter Knopf lässt einen
            // suchen, was man falsch macht.
            <View style={[styles.duelBar, styles.duelBarIdle]} accessibilityRole="text">
              <Ionicons name="hourglass-outline" size={19} color={colors.textMuted} />
              <Text variant="bodyStrong" style={{ color: colors.textMuted }}>
                Erst das offene Duell zu Ende
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() =>
                friendId && router.push({ pathname: '/quiz/modes', params: { duelWith: friendId } })
              }
              accessibilityRole="button"
              accessibilityLabel={`${friendName} zum Duell herausfordern`}
              style={({ pressed }) => [styles.duelBar, pressed && styles.pressed]}
            >
              <Ionicons name="flash" size={19} color={colors.warning} />
              <Text variant="bodyStrong" style={{ color: colors.warning }}>
                Zum Duell herausfordern
              </Text>
            </Pressable>
          )}
        </>
      }
    >
      {loading ? (
        <View style={styles.skeletons}>
          <Skeleton height={150} borderRadius={18} />
          <Skeleton height={110} borderRadius={18} />
        </View>
      ) : conversation.isError ? (
        <ErrorState
          message={getUserMessage(conversation.error)}
          onRetry={() => void conversation.refetch()}
        />
      ) : conversation.messages.length === 0 ? (
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="Noch nichts hier"
          message={`Fordere ${friendName} zum Duell heraus – oder schick eine Frage: In einer Quizrunde steht unter jeder Frage „Freund senden".`}
        />
      ) : (
        <>
          {/* Aeltere Nachrichten auf Wunsch. Der Chat laedt das neue Ende
              zuerst; was davor liegt, holt dieser Knopf. */}
          {conversation.hasOlder ? (
            <Button
              title={conversation.loadingOlder ? 'Wird geladen …' : 'Ältere Nachrichten'}
              variant="ghost"
              onPress={conversation.loadOlder}
              disabled={conversation.loadingOlder}
            />
          ) : null}
          {conversation.messages.map((message) => {
          const mine = message.senderId === myId;
          return (
            <View key={message.id} style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
              {/* Their messages get the face beside them, mine do not – on my
                  own side the alignment already says who is speaking. */}
              {mine ? null : (
                <Avatar
                  config={friend?.avatarConfig}
                  name={friendName}
                  size={26}
                  frame={equippedFrame(friend?.selectedFrame)}
                />
              )}

              {/* Full width for both kinds: a question is shown at question
                  size, and a duel card squeezed into 88 percent had its score
                  and its buttons fighting for the same line. The colour, not
                  the margin, says who sent it. */}
              <View
                style={[
                  styles.bubbleColumn,
                  message.kind === 'question' && styles.bubbleColumnQuestion,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    mine ? styles.bubbleMine : styles.bubbleTheirs,
                    message.kind === 'question' && styles.bubbleQuestion,
                    // A duel card is already a card: banner, border, shadow.
                    // The bubble around it was a second frame around a frame.
                    message.kind === 'duel' && styles.bubbleBare,
                    message.kind === 'duel' &&
                      (mine ? styles.bubbleBareMine : styles.bubbleBareTheirs),
                  ]}
                >
                  {/* Light from the top left and a hairline along the top edge,
                      the same two things every card in the app is built from.
                      The colours are unchanged – a flat tint just had nothing
                      for the light to fall on. */}
                  <View
                    style={[
                      styles.bubbleFill,
                      mine ? styles.bubbleFillMine : styles.bubbleFillTheirs,
                    ]}
                  >
                    <LinearGradient
                      colors={
                        mine
                          ? ['rgba(255, 255, 255, 0.14)', 'rgba(3, 7, 13, 0.18)']
                          : ['rgba(255, 255, 255, 0.07)', 'rgba(3, 7, 13, 0.14)']
                      }
                      start={{ x: 0.1, y: 0 }}
                      end={{ x: 0.9, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <LinearGradient colors={gradients.edge} style={styles.bubbleEdge} />
                  </View>

                  {message.kind === 'question' ? (
                    <SharedQuestionBubble
                      question={questionById.get(message.questionId ?? '') ?? null}
                      mine={mine}
                      answer={message.answer}
                      friendName={friendName}
                      onOpen={() =>
                        friendId &&
                        router.push({
                          pathname: '/friends/question/[id]',
                          params: { id: message.id, friendId },
                        })
                      }
                    />
                  ) : message.duel ? (
                    <DuelBubble
                      duel={message.duel}
                      mine={mine}
                      friendName={friendName}
                      myId={myId}
                      starting={startQuiz.starting}
                      onPlay={() =>
                        message.duelId &&
                        void startQuiz.start({
                          type: 'duel',
                          duelId: message.duelId,
                          mode: message.duel?.mode,
                          friendId,
                        })
                      }
                      friendAvatar={friend?.avatarConfig}
                      friendFrame={friend?.selectedFrame}
                      myAvatar={profile.data?.avatarConfig}
                      myFrame={profile.data?.selectedFrame}
                      createdAt={message.createdAt}
                      onDecline={() => message.duelId && declineDuel.mutate(message.duelId)}
                      onOpen={() => setOpenDuel(message)}
                    />
                  ) : null}
                </View>

                {/* Outside the bubble: a timestamp inside it competes with the
                    question for attention, and it is only ever context. */}
                <Text variant="label" color="muted" style={[styles.time, mine && styles.timeMine]}>
                  {formatRelativeTime(new Date(message.createdAt).toISOString())}
                </Text>
              </View>
            </View>
          );
          })}
        </>
      )}

      {startQuiz.error ? <Text color="danger">{startQuiz.error}</Text> : null}

      <DuelSummaryDialog
        visible={openDuel !== null}
        duel={openDuel?.duel ?? null}
        myId={myId}
        myName={profile.data?.displayName ?? profile.data?.username ?? 'Du'}
        myAvatar={profile.data?.avatarConfig}
        myFrame={profile.data?.selectedFrame}
        friendName={friendName}
        friendAvatar={friend?.avatarConfig}
        friendFrame={friend?.selectedFrame}
        starting={startQuiz.starting}
        // Only while there is something to play: an open duel I have not
        // answered yet. Declining is the recipient's call alone.
        onPlay={openDuel && playableDuel(openDuel, myId) ? () => playDuel(openDuel) : undefined}
        onDecline={
          openDuel && playableDuel(openDuel, myId) && openDuel.senderId !== myId
            ? () => {
                if (openDuel.duelId) declineDuel.mutate(openDuel.duelId);
                setOpenDuel(null);
              }
            : undefined
        }
        onClose={() => setOpenDuel(null)}
      />
    </Screen>
  );
}

const useStyles = makeStyles((colors, shadows) => ({
  // No bottom margin – the pinned bar brings its own padding and rule.
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleText: { flex: 1, gap: 1 },
  title: { fontSize: 16, color: colors.textPrimary },
  pressed: { opacity: 0.65 },
  skeletons: { gap: spacing.md },

  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, marginBottom: spacing.md },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  // Leaves the other side of the row free: a message that runs wall to wall
  // does not read as a message. The preview inside scales to whatever width
  // it gets, so it stays in proportion either way.
  // A fixed share rather than a max: the preview inside is absolutely
  // positioned and scaled, so it has no width of its own to be shrunk to.
  bubbleColumn: { width: '78%' },
  // Narrower still for a question: it is a whole screen in miniature, and at
  // the width of a duel card it was the loudest thing in the chat.
  bubbleColumnQuestion: { width: '62%' },
  bubble: {
    ...shadows.tile,
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  // The preview brings its own frame – the bubble is only the tinted edge
  // around it, so it must not add a second ring of padding.
  bubbleQuestion: { padding: spacing.xs },
  // No bubble of its own – the duel card is already one – but a bright edge
  // around it, so it reads as the one message in the chat with a score on it.
  /*
    Der Rand sagt, von wem die Nachricht kommt – dasselbe, was bei allen anderen
    Ballons die Füllung sagt. Weiß sagte gar nichts und stach zudem stärker
    hervor als jede Nachricht daneben.
  */
  bubbleBare: { padding: 0, borderWidth: 2, backgroundColor: 'transparent' },
  bubbleBareMine: { borderColor: colors.primary },
  bubbleBareTheirs: { borderColor: colors.borderStrong },
  // Its own clipping view, so the rounded corners hold without cutting the
  // shadow off the bubble itself.
  /*
    Die Füllung nimmt dieselben Ecken wie die Blase.

    Vorher war sie rundum `radius.xl` gerundet, die Blase an einer Ecke aber nur
    `radius.sm` – genau die Ecke, die zur sprechenden Person zeigt. Dort lag die
    Füllung nicht an, und es blieb ein Stück der flachen Tönung darunter stehen,
    das nach Hintergrund aussah.
  */
  bubbleFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.xl - 1,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  bubbleEdge: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  /*
    Blue is mine, grey is theirs – the plainest signal there is, and the one
    every chat app has trained people to read. Tinted rather than a flat blue:
    the cards inside a bubble carry their own text in the app's colours, and on
    a fully saturated ground the muted ones stop being readable.

    Each also squares off the corner on its own side – the classic tail,
    without drawing a tail that would fight the rounded cards elsewhere.
  */
  bubbleMine: {
    backgroundColor: `${colors.primary}55`,
    borderColor: colors.primary,
    borderBottomRightRadius: radius.sm,
  },
  bubbleFillMine: { borderBottomRightRadius: radius.sm - 1 },
  bubbleFillTheirs: { borderBottomLeftRadius: radius.sm - 1 },
  bubbleTheirs: {
    backgroundColor: colors.surfacePressed,
    borderColor: colors.border,
    borderBottomLeftRadius: radius.sm,
  },
  time: { fontSize: 10, marginTop: 3, marginLeft: spacing.xs },
  timeMine: { textAlign: 'right', marginRight: spacing.xs },

  duelBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: `${colors.warning}55`,
  },
  duelBarIdle: { backgroundColor: colors.surfacePressed, borderColor: colors.border },
  declineError: { marginBottom: spacing.sm },
}));
