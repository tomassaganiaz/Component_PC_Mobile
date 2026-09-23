import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
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
} as const;

export const shadow: Record<'card' | 'top' | 'bottom' | 'panel', ViewStyle> = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  panel: {
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  top: {
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  bottom: {
    shadowColor: '#000000',
    shadowOpacity: 0.6,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
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