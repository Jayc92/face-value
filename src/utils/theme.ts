/**
 * Face Value design tokens — "concert/stadium at night".
 */
export const colors = {
  background: '#0D0B14',
  surface: '#1A0B2E',
  surfaceLight: '#2A1845',
  pink: '#FF2D78',
  yellow: '#FFE94D',
  purple: '#7B4DFF',
  white: '#FFFFFF',
  textDim: '#B9A8D4',
  success: '#3DDC84',
  danger: '#FF4D5E',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

export const typography = {
  /** Big display headers, e.g. the FACE VALUE logo. */
  display: { fontSize: 40, fontWeight: '900' as const, letterSpacing: 2 },
  title: { fontSize: 24, fontWeight: '800' as const },
  subtitle: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '600' as const },
} as const;
