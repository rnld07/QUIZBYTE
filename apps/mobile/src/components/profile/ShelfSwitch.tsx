import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { makeStyles } from '@/theme';

interface ShelfSwitchProps {
  /** Was gerade gezeigt wird – ein Wechsel löst den Übergang aus. */
  shelfKey: string;
  children: React.ReactNode;
}

/**
 * Der Übergang zwischen zwei Regalen.
 *
 * Vorher wurde das eine durch das andere ersetzt, ohne dass etwas dazwischen
 * lag: bei zwei unterschiedlich hohen Inhalten sah das aus, als sei die Seite
 * gesprungen. Jetzt blendet der neue Inhalt auf und kommt dabei ein paar Punkte
 * von unten – dieselbe Bewegung, die auch die Reiterzeile darüber andeutet.
 *
 * Kein Kreuzblenden: dafür müssten beide Regale gleichzeitig im Baum stehen,
 * und ein Rahmengitter, das unsichtbar unter den Medaillen hängt, ist Arbeit
 * für nichts.
 */
export function ShelfSwitch({ shelfKey, children }: ShelfSwitchProps) {
  const styles = useStyles();
  const [enter] = useState(() => new Animated.Value(1));

  useEffect(() => {
    enter.setValue(0);
    Animated.timing(enter, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [shelfKey, enter]);

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <View style={styles.stage}>
      <Animated.View style={{ opacity: enter, transform: [{ translateY }] }}>{children}</Animated.View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  // Verdeckt nichts und misst nichts – die Bühne ist nur da, damit die
  // Bewegung innerhalb der Seite stattfindet und nicht an ihrem Rand.
  stage: { overflow: 'hidden' },
}));
