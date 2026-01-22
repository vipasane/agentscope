/**
 * Light Theme Palette
 * Default theme optimized for light backgrounds
 */

import type { ThemePalette } from '../types.js';

export const lightTheme: ThemePalette = {
  id: 'light',
  name: 'Light',
  description: 'Default light theme with blue accents',
  scheme: 'light',
  accessibility: 'AA',

  agents: {
    coordinator: {
      fill: '#e1f5fe',
      stroke: '#01579b',
      text: '#01579b',
      strokeWidth: 3,
    },
    worker: {
      fill: '#f3e5f5',
      stroke: '#4a148c',
      text: '#4a148c',
      strokeWidth: 2,
    },
    specialist: {
      fill: '#e8f5e9',
      stroke: '#1b5e20',
      text: '#1b5e20',
      strokeWidth: 2,
    },
    reviewer: {
      fill: '#fff3e0',
      stroke: '#e65100',
      text: '#e65100',
      strokeWidth: 2,
    },
    custom: {
      fill: '#fce4ec',
      stroke: '#880e4f',
      text: '#880e4f',
      strokeWidth: 2,
    },
  },

  elements: {
    input: {
      fill: '#e8f5e9',
      stroke: '#2e7d32',
      text: '#2e7d32',
      strokeWidth: 2,
    },
    output: {
      fill: '#ffebee',
      stroke: '#c62828',
      text: '#c62828',
      strokeWidth: 2,
    },
    hook: {
      fill: '#fff8e1',
      stroke: '#f57f17',
      text: '#f57f17',
      strokeWidth: 2,
      strokeDasharray: '5 5',
    },
    mcp: {
      fill: '#e0f2f1',
      stroke: '#00695c',
      text: '#00695c',
      strokeWidth: 2,
    },
    skill: {
      fill: '#e3f2fd',
      stroke: '#0d47a1',
      text: '#0d47a1',
      strokeWidth: 2,
      strokeDasharray: '5 5',
    },
    subgraph: {
      fill: '#fafafa',
      stroke: '#9e9e9e',
      text: '#424242',
      strokeWidth: 1,
    },
  },

  links: {
    delegation: {
      fill: 'none',
      stroke: '#1565c0',
      strokeWidth: 2,
    },
    tool: {
      fill: 'none',
      stroke: '#00695c',
      strokeWidth: 1,
      strokeDasharray: '3 3',
    },
    data: {
      fill: 'none',
      stroke: '#7b1fa2',
      strokeWidth: 1,
    },
  },

  chrome: {
    background: '#ffffff',
    border: '#e0e0e0',
    text: '#212121',
    muted: '#757575',
  },
};
