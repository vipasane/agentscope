/**
 * Theme Palettes Index
 * Exports all predefined theme palettes
 */

export { lightTheme } from './light.js';
export { darkTheme } from './dark.js';
export { highContrastLightTheme, highContrastDarkTheme } from './high-contrast.js';
export { colorblindLightTheme, colorblindDarkTheme } from './colorblind.js';

import { lightTheme } from './light.js';
import { darkTheme } from './dark.js';
import { highContrastLightTheme, highContrastDarkTheme } from './high-contrast.js';
import { colorblindLightTheme, colorblindDarkTheme } from './colorblind.js';
import type { ThemePalette } from '../types.js';

/**
 * All built-in theme palettes
 */
export const builtinPalettes: ThemePalette[] = [
  lightTheme,
  darkTheme,
  highContrastLightTheme,
  highContrastDarkTheme,
  colorblindLightTheme,
  colorblindDarkTheme,
];

/**
 * Default theme
 */
export const defaultTheme: ThemePalette = lightTheme;
