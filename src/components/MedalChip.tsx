import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { Medal, MEDAL_LABELS } from '../game/types';
import { palette, radii } from '../utils/theme';

interface MedalChipProps {
  medal: Medal;
  /** When true, render as an empty slot ("—") instead of hiding. */
  showEmpty?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

const MEDAL_COLORS: Record<Medal, string> = {
  none: palette.textLow,
  bronze: '#C48A5D',
  silver: '#C9C9D6',
  gold: palette.yellow,
  platinum: '#7FE7FF',
};

const MEDAL_BACKGROUNDS: Record<Medal, string> = {
  none: 'transparent',
  bronze: 'rgba(196, 138, 93, 0.10)',
  silver: 'rgba(201, 201, 214, 0.10)',
  gold: 'rgba(255, 233, 77, 0.10)',
  platinum: 'rgba(127, 231, 255, 0.10)',
};

/**
 * Small medal chip: label + colored dot on a hairline pill. Renders as
 * "—" when there's no medal but the caller wants to reserve the space
 * (e.g. locked tier cards).
 */
export function MedalChip({
  medal,
  showEmpty = false,
  compact = false,
  style,
}: MedalChipProps): React.JSX.Element | null {
  if (medal === 'none' && !showEmpty) {
    return null;
  }
  const color: string = MEDAL_COLORS[medal];
  const bg: string = MEDAL_BACKGROUNDS[medal];
  const label: string = medal === 'none' ? '—' : MEDAL_LABELS[medal];

  return (
    <View
      style={[
        styles.chip,
        compact && styles.chipCompact,
        { borderColor: medal === 'none' ? palette.hairline : color, backgroundColor: bg },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: medal === 'none' ? palette.hairline : color }]} />
      <Text style={[styles.text, { color }, compact && styles.textCompact]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  chipCompact: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  textCompact: {
    fontSize: 10,
  },
});
