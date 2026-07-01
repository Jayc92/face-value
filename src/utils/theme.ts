/**
 * Face Value design system tokens.
 *
 * "Ticket-night adrenaline" — dark glass, neon accents used sparingly,
 * tabular numerals for stats, condensed display for headers.
 */

export const palette = {
  ink: '#0A0810',
  ink900: '#0D0B14',
  ink800: '#13101F',
  panel: '#181227',
  panelRaised: '#221937',
  panelOverlay: 'rgba(34, 25, 55, 0.72)',
  panelGlass: 'rgba(255, 255, 255, 0.04)',
  hairline: 'rgba(255, 255, 255, 0.08)',
  hairlineStrong: 'rgba(255, 255, 255, 0.18)',

  pink: '#FF2D78',
  pinkSoft: '#FF6BA1',
  pinkDeep: '#B5125A',
  pinkHalo: 'rgba(255, 45, 120, 0.35)',

  yellow: '#FFE94D',
  yellowDeep: '#E5C700',
  yellowHalo: 'rgba(255, 233, 77, 0.32)',

  purple: '#7B4DFF',
  purpleDeep: '#3D2A6B',

  textHi: '#F6F2FF',
  textMed: '#C9BFE0',
  textLow: '#8579A8',
  textMute: '#5C5276',

  success: '#3DDC84',
  successDeep: '#0F4F2D',
  danger: '#FF4D5E',
  dangerDeep: '#4A0E16',
  warning: '#FFAA3D',
} as const;

/** Back-compat alias map so older code that imports `colors.x` keeps working. */
export const colors = {
  background: palette.ink900,
  surface: palette.panel,
  surfaceLight: palette.panelRaised,
  pink: palette.pink,
  yellow: palette.yellow,
  purple: palette.purple,
  white: palette.textHi,
  textDim: palette.textMed,
  success: palette.success,
  danger: palette.danger,
} as const;

/** Per-seat-tier accent colors. Front Row is gold, mid is pink, upper is steel. */
export const seatAccents = {
  front: { line: palette.yellow, glow: palette.yellowHalo, label: palette.yellow },
  mid: { line: palette.pink, glow: palette.pinkHalo, label: palette.pink },
  upper: { line: '#4F4B6B', glow: 'rgba(155, 145, 200, 0.18)', label: palette.textMed },
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/**
 * Type system. "display" is a condensed wordmark face; we approximate it with
 * heavy weight + tight tracking since we can't ship a custom font in v1.
 */
export const type = {
  wordmark: {
    fontSize: 44,
    fontWeight: '900' as const,
    letterSpacing: 6,
  },
  display: {
    fontSize: 34,
    fontWeight: '900' as const,
    letterSpacing: 1,
  },
  hero: {
    fontSize: 26,
    fontWeight: '800' as const,
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  body: {
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
  },
  bodyStrong: {
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.1,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  micro: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 1.4,
  },
  /** For credit values, countdowns, percentages — anything where digits should line up. */
  numeric: {
    fontSize: 18,
    fontWeight: '900' as const,
    fontVariant: ['tabular-nums' as const],
    letterSpacing: 0,
  },
} as const;

/** Legacy export some screens still reference. */
export const typography = {
  display: { fontSize: type.display.fontSize, fontWeight: type.display.fontWeight, letterSpacing: 2 },
  title: type.title,
  subtitle: type.subtitle,
  body: type.body,
  caption: type.caption,
} as const;

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  lift: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  glowPink: {
    shadowColor: palette.pink,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  glowYellow: {
    shadowColor: palette.yellow,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
} as const;

export const motion = {
  fast: 140,
  base: 240,
  slow: 420,
  reveal: 560,
} as const;

export const z = {
  base: 0,
  raised: 1,
  overlay: 10,
  spotlight: 20,
  confetti: 30,
  toast: 40,
} as const;

export const layout = {
  screenPaddingX: spacing.lg,
  screenPaddingTop: spacing.md,
  screenPaddingBottom: spacing.xxl,
  sectionGap: spacing.xl,
  cardRadius: radii.lg,
  buttonRadius: radii.md,
  hairline: 1,
} as const;
