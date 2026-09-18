import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';

import { FixedTheme, makeStyles, radius, spacing, useGradients } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

interface BottomSheetProps {
  visible: boolean;
  title: string;
  /** Kleine Zeile über dem Titel – meist der Zustand, den das Fenster ändert. */
  eyebrow?: string;
  /** Anteil der Bildschirmhöhe, den das Fenster einnimmt. */
  height?: number;
  onClose: () => void;
  children: React.ReactNode;
}

/** Ab dieser Strecke nach unten gilt ein Wisch als "zu". */
const CLOSE_DISTANCE = 0.28;
/** Oder ab dieser Geschwindigkeit, auch wenn die Strecke kurz war. */
const CLOSE_VELOCITY = 0.6;

/**
 * Ein Fenster, das von unten hereinfährt.
 *
 * Für Auswahl, die zu einer Seite gehört: Filter, Zeiträume, eine Handvoll
 * Optionen. Es deckt die Seite nicht ganz ab – man sieht weiter, worauf sich
 * die Auswahl bezieht, und genau das unterscheidet es von einem Dialog.
 *
 * Es schließt sich selbst, bevor es den Aufrufer benachrichtigt: erst läuft die
 * Ausfahrt, dann kommt `onClose`. Andersherum wäre das Fenster in dem Moment
 * aus dem Baum, in dem die Animation beginnen soll – und das ist der Grund,
 * warum es vorher nur herein- und nie hinausfuhr.
 *
 * Gewischt wird am Kopf, nicht auf der ganzen Fläche: darunter steht eine
 * Liste, die selbst scrollt, und eine Geste, die beides beansprucht, tut am
 * Ende keins von beidem richtig.
 */
function BottomSheetBody({ visible, title, eyebrow, height = 0.5, onClose, children }: BottomSheetProps) {
  const styles = useStyles();
  const gradients = useGradients();
  const window = useWindowDimensions();

  const sheetHeight = Math.round(window.height * Math.min(0.9, Math.max(0.3, height)));

  /** Verschiebung nach unten in Punkten: 0 ist offen, `sheetHeight` ist zu. */
  const [offset] = useState(() => new Animated.Value(sheetHeight));
  const dragStart = useRef(0);
  const dragLast = useRef({ y: 0, at: 0 });
  /** Verhindert, dass ein zweiter Wisch eine laufende Ausfahrt noch einmal startet. */
  const closing = useRef(false);

  useEffect(() => {
    if (!visible) {
      // Unten parken, solange zu: sonst stünde das Fenster beim nächsten
      // Öffnen schon oben und führe gar nicht mehr herein.
      offset.setValue(sheetHeight);
      closing.current = false;
      return;
    }

    offset.setValue(sheetHeight);
    Animated.timing(offset, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, sheetHeight, offset]);

  /** Fährt hinaus und meldet erst danach nach oben. */
  const dismiss = (fromY = 0) => {
    if (closing.current) return;
    closing.current = true;

    Animated.timing(offset, {
      toValue: sheetHeight,
      // Was schon halb unten ist, braucht den ganzen Weg nicht mehr.
      duration: Math.max(120, Math.round(200 * (1 - fromY / sheetHeight))),
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  const onGrant = (event: GestureResponderEvent) => {
    dragStart.current = event.nativeEvent.pageY;
    dragLast.current = { y: event.nativeEvent.pageY, at: Date.now() };
  };

  const onMove = (event: GestureResponderEvent) => {
    if (closing.current) return;
    const y = event.nativeEvent.pageY;
    dragLast.current = { y, at: Date.now() };
    // Nur nach unten: nach oben gibt es nichts, wohin das Fenster wachsen
    // könnte, und ein Gummiband dorthin wäre eine Bewegung ohne Bedeutung.
    offset.setValue(Math.max(0, y - dragStart.current));
  };

  const onRelease = (event: GestureResponderEvent) => {
    if (closing.current) return;
    const moved = Math.max(0, event.nativeEvent.pageY - dragStart.current);
    const elapsed = Math.max(1, Date.now() - dragLast.current.at);
    const velocity = (event.nativeEvent.pageY - dragLast.current.y) / elapsed;

    if (moved > sheetHeight * CLOSE_DISTANCE || velocity > CLOSE_VELOCITY) {
      dismiss(moved);
      return;
    }

    // Kurz genug: zurück nach oben, mit einer Feder statt einer Rampe – so
    // liest sich der abgebrochene Wisch als Zurückschnappen.
    Animated.spring(offset, { toValue: 0, useNativeDriver: true, friction: 9, tension: 120 }).start();
  };

  if (!visible) return null;

  // Der Vorhang folgt der Verschiebung: ganz unten ist er weg.
  const scrimOpacity = offset.interpolate({
    inputRange: [0, sheetHeight],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => dismiss()}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: scrimOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => dismiss()} accessibilityLabel="Schließen" />
        </Animated.View>

        <Animated.View style={[styles.sheet, { height: sheetHeight, transform: [{ translateY: offset }] }]} accessibilityViewIsModal>
          {/* Nur die Füllung, keine Lichtkante: die gehört auf eine Karte, die
              auf einer Seite liegt. Hier kam sie oben als heller Strich heraus,
              und ein Fenster, das von unten hereinfährt, braucht keine Kante,
              die sagt, wo oben ist. */}
          <View style={styles.fillClip}>
            <LinearGradient colors={gradients.dialog} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
          </View>

          {/*
            Der Griffbereich: Balken und Kopfzeile nehmen die Geste an, die
            Liste darunter behält ihre eigene. Die Responder-Eigenschaften der
            View statt eines PanResponder – ein PanResponder in einem useMemo
            ist genau das Muster, das der React-Compiler beanstandet.
          */}
          <View
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
            onResponderGrant={onGrant}
            onResponderMove={onMove}
            onResponderRelease={onRelease}
            onResponderTerminate={onRelease}
          >
            <View style={styles.handle} />

            <View style={styles.header}>
              <View style={styles.headerText}>
                {eyebrow ? (
                  <Text variant="label" style={styles.eyebrow}>
                    {eyebrow}
                  </Text>
                ) : null}
                <Text variant="headline" style={styles.title}>
                  {title}
                </Text>
              </View>
              <IconButton icon="close" accessibilityLabel="Schließen" size={20} onPress={() => dismiss()} />
            </View>
          </View>

          <View style={styles.body}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors, shadows) => ({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: 'rgba(3, 7, 13, 0.62)' },
  sheet: {
    ...shadows.tile,
    // Nur oben gerundet: unten geht es aus dem Bild heraus.
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    overflow: 'hidden',
  },
  fillClip: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.borderStrong,
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerText: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: colors.textMuted },
  title: { letterSpacing: -0.2, color: colors.textPrimary },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
}));

/** Dunkel, egal welches Thema eingestellt ist – wie jedes Fenster in der App. */
export function BottomSheet(props: BottomSheetProps) {
  return (
    <FixedTheme scheme="dark">
      <BottomSheetBody {...props} />
    </FixedTheme>
  );
}
