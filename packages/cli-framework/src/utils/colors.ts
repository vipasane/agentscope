/**
 * Color utility for terminal output (zero dependencies)
 */

import type { ColorMap } from '../types.js';
import { env, stdout } from 'process';

// ANSI color codes
const colors: ColorMap = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

// Check if colors are supported
function supportsColor(): boolean {
  // Explicitly disabled
  if (env.NO_COLOR !== undefined) {
    return false;
  }

  // Explicitly enabled
  if (env.FORCE_COLOR !== undefined) {
    return true;
  }

  // Check if stdout is a TTY
  if (!stdout.isTTY) {
    return false;
  }

  // Check terminal type
  const term = env.TERM || '';
  if (term === 'dumb') {
    return false;
  }

  return true;
}

const colorEnabled = supportsColor();

/**
 * Apply color to text
 */
export function color(text: string, colorName: keyof ColorMap): string {
  if (!colorEnabled) {
    return text;
  }
  return `${colors[colorName]}${text}${colors.reset}`;
}

/**
 * Predefined color helpers
 */
export const c = {
  reset: (text: string) => color(text, 'reset'),
  bold: (text: string) => color(text, 'bold'),
  dim: (text: string) => color(text, 'dim'),
  red: (text: string) => color(text, 'red'),
  green: (text: string) => color(text, 'green'),
  yellow: (text: string) => color(text, 'yellow'),
  blue: (text: string) => color(text, 'blue'),
  magenta: (text: string) => color(text, 'magenta'),
  cyan: (text: string) => color(text, 'cyan'),
  white: (text: string) => color(text, 'white'),
  gray: (text: string) => color(text, 'gray'),

  // Semantic helpers
  error: (text: string) => color(text, 'red'),
  success: (text: string) => color(text, 'green'),
  warning: (text: string) => color(text, 'yellow'),
  info: (text: string) => color(text, 'blue'),

  // Combined styles
  errorBold: (text: string) => color(color(text, 'bold'), 'red'),
  successBold: (text: string) => color(color(text, 'bold'), 'green'),
};

/**
 * Strip ANSI color codes from text
 */
export function stripColors(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Get the display width of text (excluding ANSI codes)
 */
export function displayWidth(text: string): number {
  return stripColors(text).length;
}
