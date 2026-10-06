import type { TextStyle, ViewStyle } from 'react-native';

const dark = {
  canvas: '#0a0f1d',
  surface: '#0b1326',
  surfaceCard: '#111b2e',
  surfaceCardAlt: '#111827',
  surfaceElevated: '#1e293b',
  surfaceContainer: '#171f33',
  surfaceHigh: '#222a3d',
  surfaceHighest: '#2d3449',
  surfaceLow: '#131b2e',
  surfaceLowest: '#060e20',
  surfacePanel: '#162238',
  onSurface: '#dae2fd',
  onSurfaceVariant: '#94a3b8',
  primary: '#adc6ff',
  onPrimary: '#002e6a',
  primaryContainer: '#4d8eff',
  secondary: '#4edea3',
  onSecondary: '#003824',
  secondaryContainer: '#00a572',
  tertiary: '#4cd7f6',
  onTertiary: '#003640',
  accentCyan: '#06b6d4',
  accentEmerald: '#34d399',
  accentBlue: '#60a5fa',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  borderSubtle: '#1e293b',
  borderActive: '#334155',
  outline: '#8c909f',
  outlineVariant: '#424754',
  diagnosticAmber: '#f59e0b',
  diagnosticRed: '#ef4444',
  panel: '#111a2e',
  line: '#233554',
  inset: '#0a0f1d',
  elevated: '#162238',
  primarySoft: '#182845',
  primaryMid: '#1e3a73',
  successSoft: '#06271a',
  brandSoft: '#06222e',
  infoSoft: '#0a1b2e',
  warningSoft: '#2a1f08',
  dangerSoft: '#2a1010',
  successFg: '#6ee7b7',
  brandFg: '#67e8f9',
  infoFg: '#7dd3fc',
  warningFg: '#fcd34d',
  dangerFg: '#f87171',
};

const light = {
  canvas: '#f0f2f5',
  surface: '#fafafa',
  surfaceCard: '#fcfcfc',
  surfaceCardAlt: '#f5f5f5',
  surfaceElevated: '#f1f3f5',
  surfaceContainer: '#ffffff',
  surfaceHigh: '#ffffff',
  surfaceHighest: '#edeff2',
  surfaceLow: '#f8f9fb',
  surfaceLowest: '#f5f5f5',
  surfacePanel: '#ffffff',
  onSurface: '#333333',
  onSurfaceVariant: '#5a6472',
  primary: '#006d77',
  onPrimary: '#ffffff',
  primaryContainer: '#e0f2f4',
  secondary: '#009688',
  onSecondary: '#ffffff',
  secondaryContainer: '#e0f2ee',
  tertiary: '#e07a5f',
  onTertiary: '#ffffff',
  accentCyan: '#006d77',
  accentEmerald: '#009688',
  accentBlue: '#2563eb',
  textPrimary: '#333333',
  textSecondary: '#5a6472',
  textMuted: '#9aa3ae',
  borderSubtle: '#e0e0e0',
  borderActive: '#bdbdbd',
  outline: '#bdbdbd',
  outlineVariant: '#d6d6d6',
  diagnosticAmber: '#f59e0b',
  diagnosticRed: '#ef4444',
  panel: '#ffffff',
  line: '#d6d6d6',
  inset: '#eaecef',
  elevated: '#f1f3f5',
  primarySoft: '#e6f1f3',
  primaryMid: '#008c9e',
  successSoft: '#e7f6f0',
  brandSoft: '#e0f2f4',
  infoSoft: '#e8f4fd',
  warningSoft: '#fff4e5',
  dangerSoft: '#fdecec',
  successFg: '#047857',
  brandFg: '#0e7490',
  infoFg: '#1e40af',
  warningFg: '#b45309',
  dangerFg: '#dc2626',
};

export type ThemeColors = typeof dark;

let currentScheme: 'light' | 'dark' = 'dark';

export function setColorSchemeForInline(scheme: 'light' | 'dark') {
  currentScheme = scheme;
}

export const colors = new Proxy({} as ThemeColors, {
  get: (_, prop: string) => {
    const palette = currentScheme === 'dark' ? dark : light;
    return (palette as Record<string, string>)[prop] ?? '#000';
  },
});

export function getPalette(scheme: 'light' | 'dark'): ThemeColors {
  return scheme === 'dark' ? dark : light;
}

export const shadow: Record<'card' | 'top' | 'bottom' | 'panel', ViewStyle> = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  panel: {
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  top: {
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  bottom: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
};

export const glow = (color: string, radius = 8, opacity = 0.35): ViewStyle => ({
  shadowColor: color,
  shadowOpacity: opacity,
  shadowRadius: radius,
  shadowOffset: { width: 0, height: 0 },
  elevation: 8,
});

export const fontMono: TextStyle = {
  fontFamily: 'monospace',
};

export const typography = {
  headlineLgMobile: { fontSize: 28, lineHeight: 36, fontWeight: '700', letterSpacing: -0.5 },
  headlineMd: { fontSize: 24, lineHeight: 32, fontWeight: '600', letterSpacing: -0.4 },
  headlineSm: { fontSize: 20, lineHeight: 28, fontWeight: '600', letterSpacing: -0.3 },
  bodyMd: { fontSize: 14, lineHeight: 24, fontWeight: '400' },
  bodySm: { fontSize: 12, lineHeight: 20, fontWeight: '400', letterSpacing: 0.1 },
  labelMonoSm: { fontFamily: 'monospace', fontSize: 11, lineHeight: 16, fontWeight: '500', letterSpacing: 0.5 },
  labelMonoMd: { fontFamily: 'monospace', fontSize: 12, lineHeight: 18, fontWeight: '500', letterSpacing: 0.2 },
  labelMonoLg: { fontFamily: 'monospace', fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: -0.1 },
} as const;