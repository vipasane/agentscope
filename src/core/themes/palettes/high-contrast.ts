/**
 * High Contrast Theme Palettes
 * WCAG AAA compliant themes for maximum readability
 */

import type { ThemePalette } from '../types.js';

/**
 * High Contrast Light Theme
 * WCAG AAA compliant (7:1 contrast ratio) for light backgrounds
 */
export const highContrastLightTheme: ThemePalette = {
  id: 'high-contrast-light',
  name: 'High Contrast Light',
  description: 'WCAG AAA compliant high contrast theme for light backgrounds',
  scheme: 'high-contrast',
  accessibility: 'AAA',

  agents: {
    coordinator: {
      fill: '#ffffff',
      stroke: '#000000',
      text: '#000000',
      strokeWidth: 4,
    },
    worker: {
      fill: '#ffffff',
      stroke: '#000000',
      text: '#000000',
      strokeWidth: 3,
    },
    specialist: {
      fill: '#ffffff',
      stroke: '#000000',
      text: '#000000',
      strokeWidth: 3,
    },
    reviewer: {
      fill: '#ffffff',
      stroke: '#000000',
      text: '#000000',
      strokeWidth: 3,
    },
    custom: {
      fill: '#ffffff',
      stroke: '#000000',
      text: '#000000',
      strokeWidth: 3,
    },
  },

  elements: {
    input: {
      fill: '#ffffff',
      stroke: '#006400',
      text: '#006400',
      strokeWidth: 3,
    },
    output: {
      fill: '#ffffff',
      stroke: '#8b0000',
      text: '#8b0000',
      strokeWidth: 3,
    },
    hook: {
      fill: '#ffffff',
      stroke: '#000000',
      text: '#000000',
      strokeWidth: 3,
      strokeDasharray: '8 4',
    },
    mcp: {
      fill: '#ffffff',
      stroke: '#00008b',
      text: '#00008b',
      strokeWidth: 3,
    },
    skill: {
      fill: '#ffffff',
      stroke: '#000000',
      text: '#000000',
      strokeWidth: 3,
      strokeDasharray: '8 4',
    },
    subgraph: {
      fill: '#f5f5f5',
      stroke: '#000000',
      text: '#000000',
      strokeWidth: 2,
    },
  },

  links: {
    delegation: {
      fill: 'none',
      stroke: '#000000',
      strokeWidth: 3,
    },
    tool: {
      fill: 'none',
      stroke: '#000000',
      strokeWidth: 2,
      strokeDasharray: '5 3',
    },
    data: {
      fill: 'none',
      stroke: '#000000',
      strokeWidth: 2,
    },
  },

  chrome: {
    background: '#ffffff',
    border: '#000000',
    text: '#000000',
    muted: '#505050',
  },
};

/**
 * High Contrast Dark Theme
 * WCAG AAA compliant (7:1 contrast ratio) for dark backgrounds
 */
export const highContrastDarkTheme: ThemePalette = {
  id: 'high-contrast-dark',
  name: 'High Contrast Dark',
  description: 'WCAG AAA compliant high contrast theme for dark backgrounds',
  scheme: 'high-contrast',
  accessibility: 'AAA',

  agents: {
    coordinator: {
      fill: '#000000',
      stroke: '#ffffff',
      text: '#ffffff',
      strokeWidth: 4,
    },
    worker: {
      fill: '#000000',
      stroke: '#ffffff',
      text: '#ffffff',
      strokeWidth: 3,
    },
    specialist: {
      fill: '#000000',
      stroke: '#ffffff',
      text: '#ffffff',
      strokeWidth: 3,
    },
    reviewer: {
      fill: '#000000',
      stroke: '#ffffff',
      text: '#ffffff',
      strokeWidth: 3,
    },
    custom: {
      fill: '#000000',
      stroke: '#ffffff',
      text: '#ffffff',
      strokeWidth: 3,
    },
  },

  elements: {
    input: {
      fill: '#000000',
      stroke: '#00ff00',
      text: '#00ff00',
      strokeWidth: 3,
    },
    output: {
      fill: '#000000',
      stroke: '#ff6666',
      text: '#ff6666',
      strokeWidth: 3,
    },
    hook: {
      fill: '#000000',
      stroke: '#ffffff',
      text: '#ffffff',
      strokeWidth: 3,
      strokeDasharray: '8 4',
    },
    mcp: {
      fill: '#000000',
      stroke: '#00ffff',
      text: '#00ffff',
      strokeWidth: 3,
    },
    skill: {
      fill: '#000000',
      stroke: '#ffffff',
      text: '#ffffff',
      strokeWidth: 3,
      strokeDasharray: '8 4',
    },
    subgraph: {
      fill: '#1a1a1a',
      stroke: '#ffffff',
      text: '#ffffff',
      strokeWidth: 2,
    },
  },

  links: {
    delegation: {
      fill: 'none',
      stroke: '#ffffff',
      strokeWidth: 3,
    },
    tool: {
      fill: 'none',
      stroke: '#ffffff',
      strokeWidth: 2,
      strokeDasharray: '5 3',
    },
    data: {
      fill: 'none',
      stroke: '#ffffff',
      strokeWidth: 2,
    },
  },

  chrome: {
    background: '#000000',
    border: '#ffffff',
    text: '#ffffff',
    muted: '#b0b0b0',
  },
};
