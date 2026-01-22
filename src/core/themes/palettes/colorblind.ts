/**
 * Colorblind-Safe Theme Palettes
 * Uses the Okabe-Ito palette for maximum color distinction
 * Safe for deuteranopia, protanopia, and tritanopia
 *
 * Okabe-Ito Palette:
 * - #E69F00 (Orange)
 * - #56B4E9 (Sky Blue)
 * - #009E73 (Bluish Green)
 * - #F0E442 (Yellow)
 * - #0072B2 (Blue)
 * - #D55E00 (Vermillion)
 * - #CC79A7 (Reddish Purple)
 * - #000000 (Black)
 */

import type { ThemePalette } from '../types.js';

/**
 * Colorblind-Safe Light Theme
 * Okabe-Ito palette on light background
 */
export const colorblindLightTheme: ThemePalette = {
  id: 'colorblind-light',
  name: 'Colorblind Light',
  description: 'Colorblind-safe theme using Okabe-Ito palette on light background',
  scheme: 'light',
  accessibility: 'colorblind-safe',

  agents: {
    coordinator: {
      fill: '#56B4E9',
      stroke: '#0072B2',
      text: '#000000',
      strokeWidth: 3,
    },
    worker: {
      fill: '#E69F00',
      stroke: '#D55E00',
      text: '#000000',
      strokeWidth: 2,
    },
    specialist: {
      fill: '#009E73',
      stroke: '#005544',
      text: '#000000',
      strokeWidth: 2,
    },
    reviewer: {
      fill: '#CC79A7',
      stroke: '#9c4a78',
      text: '#000000',
      strokeWidth: 2,
    },
    custom: {
      fill: '#F0E442',
      stroke: '#b8a800',
      text: '#000000',
      strokeWidth: 2,
    },
  },

  elements: {
    input: {
      fill: '#009E73',
      stroke: '#005544',
      text: '#000000',
      strokeWidth: 2,
    },
    output: {
      fill: '#D55E00',
      stroke: '#a04800',
      text: '#000000',
      strokeWidth: 2,
    },
    hook: {
      fill: '#F0E442',
      stroke: '#b8a800',
      text: '#000000',
      strokeWidth: 2,
      strokeDasharray: '5 5',
    },
    mcp: {
      fill: '#0072B2',
      stroke: '#004d79',
      text: '#ffffff',
      strokeWidth: 2,
    },
    skill: {
      fill: '#56B4E9',
      stroke: '#0072B2',
      text: '#000000',
      strokeWidth: 2,
      strokeDasharray: '5 5',
    },
    subgraph: {
      fill: '#f5f5f5',
      stroke: '#666666',
      text: '#000000',
      strokeWidth: 1,
    },
  },

  links: {
    delegation: {
      fill: 'none',
      stroke: '#0072B2',
      strokeWidth: 2,
    },
    tool: {
      fill: 'none',
      stroke: '#009E73',
      strokeWidth: 1,
      strokeDasharray: '3 3',
    },
    data: {
      fill: 'none',
      stroke: '#CC79A7',
      strokeWidth: 1,
    },
  },

  chrome: {
    background: '#ffffff',
    border: '#cccccc',
    text: '#000000',
    muted: '#666666',
  },
};

/**
 * Colorblind-Safe Dark Theme
 * Okabe-Ito palette on dark background
 */
export const colorblindDarkTheme: ThemePalette = {
  id: 'colorblind-dark',
  name: 'Colorblind Dark',
  description: 'Colorblind-safe theme using Okabe-Ito palette on dark background',
  scheme: 'dark',
  accessibility: 'colorblind-safe',

  agents: {
    coordinator: {
      fill: '#0072B2',
      stroke: '#56B4E9',
      text: '#ffffff',
      strokeWidth: 3,
    },
    worker: {
      fill: '#D55E00',
      stroke: '#E69F00',
      text: '#ffffff',
      strokeWidth: 2,
    },
    specialist: {
      fill: '#005544',
      stroke: '#009E73',
      text: '#ffffff',
      strokeWidth: 2,
    },
    reviewer: {
      fill: '#9c4a78',
      stroke: '#CC79A7',
      text: '#ffffff',
      strokeWidth: 2,
    },
    custom: {
      fill: '#8a7d00',
      stroke: '#F0E442',
      text: '#ffffff',
      strokeWidth: 2,
    },
  },

  elements: {
    input: {
      fill: '#005544',
      stroke: '#009E73',
      text: '#ffffff',
      strokeWidth: 2,
    },
    output: {
      fill: '#a04800',
      stroke: '#D55E00',
      text: '#ffffff',
      strokeWidth: 2,
    },
    hook: {
      fill: '#8a7d00',
      stroke: '#F0E442',
      text: '#ffffff',
      strokeWidth: 2,
      strokeDasharray: '5 5',
    },
    mcp: {
      fill: '#004d79',
      stroke: '#56B4E9',
      text: '#ffffff',
      strokeWidth: 2,
    },
    skill: {
      fill: '#0072B2',
      stroke: '#56B4E9',
      text: '#ffffff',
      strokeWidth: 2,
      strokeDasharray: '5 5',
    },
    subgraph: {
      fill: '#1a1a1a',
      stroke: '#999999',
      text: '#ffffff',
      strokeWidth: 1,
    },
  },

  links: {
    delegation: {
      fill: 'none',
      stroke: '#56B4E9',
      strokeWidth: 2,
    },
    tool: {
      fill: 'none',
      stroke: '#009E73',
      strokeWidth: 1,
      strokeDasharray: '3 3',
    },
    data: {
      fill: 'none',
      stroke: '#CC79A7',
      strokeWidth: 1,
    },
  },

  chrome: {
    background: '#121212',
    border: '#444444',
    text: '#ffffff',
    muted: '#999999',
  },
};
