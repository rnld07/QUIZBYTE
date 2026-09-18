import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

import { useSettingsStore } from '@/state/settingsStore';

import {
  accuracyColorsFor,
  darkColors,
  darkGradients,
  darkShadows,
  lightColors,
  lightGradients,
  lightShadows,
} from './tokens';
import type { ThemeColors, ThemeGradients, ThemeShadows } from './tokens';

/** What the user picked; `system` follows the device. */
export type ThemeMode = 'system' | 'light' | 'dark';
/** What is actually on screen. */
export type ColorScheme = 'light' | 'dark';

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  gradients: ThemeGradients;
  shadows: ThemeShadows;
}

const DARK: Theme = { scheme: 'dark', colors: darkColors, gradients: darkGradients, shadows: darkShadows };
const LIGHT: Theme = { scheme: 'light', colors: lightColors, gradients: lightGradients, shadows: lightShadows };

// Dark is the default, so a component rendered outside the provider (a test, a
// detached tree) still gets QuizByte's usual look instead of blank styling.
const ThemeContext = createContext<Theme>(DARK);

export function QuizByteTheme({ children }: PropsWithChildren) {
  const mode = useSettingsStore((state) => state.themeMode);
  const system = useColorScheme();
  const scheme: ColorScheme = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;

  return <ThemeContext.Provider value={scheme === 'light' ? LIGHT : DARK}>{children}</ThemeContext.Provider>;
}

/**
 * Pins a subtree to one theme, whatever the user picked.
 *
 * Used by the quiz, which keeps its dark, colour-washed backdrop in both
 * themes: the tint belongs to the category, and a light card sitting on it
 * would need a second set of colours for every element on top.
 */
export function FixedTheme({ scheme, children }: PropsWithChildren<{ scheme: ColorScheme }>) {
  return <ThemeContext.Provider value={scheme === 'light' ? LIGHT : DARK}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

export function useThemeColors(): ThemeColors {
  return useContext(ThemeContext).colors;
}

export function useGradients(): ThemeGradients {
  return useContext(ThemeContext).gradients;
}

export function useShadows(): ThemeShadows {
  return useContext(ThemeContext).shadows;
}

/** Traffic-light colours for the current theme. */
export function useAccuracyColors() {
  const colors = useThemeColors();
  return useMemo(() => accuracyColorsFor(colors), [colors]);
}

type StyleFactory<T> = (colors: ThemeColors, shadows: ThemeShadows, gradients: ThemeGradients) => T;

/**
 * Theme-aware replacement for `StyleSheet.create`.
 *
 * Styles have to be built per theme, not once at module load – that is the
 * whole reason a colour change can reach an already rendered screen. Both
 * variants are created eagerly and cached here, so switching costs nothing at
 * render time and the hook stays a plain lookup.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: StyleFactory<T>): () => T {
  const sheets: Record<ColorScheme, T> = {
    dark: StyleSheet.create(factory(darkColors, darkShadows, darkGradients)),
    light: StyleSheet.create(factory(lightColors, lightShadows, lightGradients)),
  };
  return function useStyles(): T {
    return sheets[useContext(ThemeContext).scheme];
  };
}
