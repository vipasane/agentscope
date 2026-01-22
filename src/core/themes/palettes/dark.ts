/**
 * Dark Theme Palette
 * Optimized for dark backgrounds with proper contrast
 */

import type { ThemePalette } from '../types.js';

export const darkTheme: ThemePalette = {
  id: 'dark',
  name: 'Dark',
  description: 'Dark theme optimized for dark mode viewing',
  scheme: 'dark',
  accessibility: 'AA',

  agents: {
    coordinator: {
      fill: '#0d47a1',
      stroke: '#64b5f6',
      text: '#e3f2fd',
      strokeWidth: 3,
    },
    worker: {
      fill: '#4a148c',
      stroke: '#ce93d8',
      text: '#f3e5f5',
      strokeWidth: 2,
    },
    specialist: {
      fill: '#1b5e20',
      stroke: '#81c784',
      text: '#e8f5e9',
      strokeWidth: 2,
    },
    reviewer: {
      fill: '#e65100',
      stroke: '#ffb74d',
      text: '#fff3e0',
      strokeWidth: 2,
    },
    custom: {
      fill: '#880e4f',
      stroke: '#f48fb1',
      text: '#fce4ec',
      strokeWidth: 2,
    },
  },

  elements: {
    input: {
      fill: '#2e7d32',
      stroke: '#a5d6a7',
      text: '#e8f5e9',
      strokeWidth: 2,
    },
    output: {
      fill: '#c62828',
      stroke: '#ef9a9a',
      text: '#ffebee',
      strokeWidth: 2,
    },
    hook: {
      fill: '#f57f17',
      stroke: '#fff176',
      text: '#fffde7',
      strokeWidth: 2,
      strokeDasharray: '5 5',
    },
    mcp: {
      fill: '#00695c',
      stroke: '#80cbc4',
      text: '#e0f2f1',
      strokeWidth: 2,
    },
    skill: {
      fill: '#1565c0',
      stroke: '#90caf9',
      text: '#e3f2fd',
      strokeWidth: 2,
      strokeDasharray: '5 5',
    },
    subgraph: {
      fill: '#263238',
      stroke: '#546e7a',
      text: '#eceff1',
      strokeWidth: 1,
    },
  },

  links: {
    delegation: {
      fill: 'none',
      stroke: '#64b5f6',
      strokeWidth: 2,
    },
    tool: {
      fill: 'none',
      stroke: '#80cbc4',
      strokeWidth: 1,
      strokeDasharray: '3 3',
    },
    data: {
      fill: 'none',
      stroke: '#ce93d8',
      strokeWidth: 1,
    },
  },

  chrome: {
    background: '#121212',
    border: '#424242',
    text: '#e0e0e0',
    muted: '#9e9e9e',
  },
};
