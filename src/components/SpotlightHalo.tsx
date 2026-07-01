import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';
import { palette } from '../utils/theme';

interface SpotlightHaloProps {
  /** Halo accent color. Defaults to yellow (Front Row gold). */
  color?: string;
  /** Intensity of the halo, 0-1. */
  intensity?: number;
  style?: StyleProp<ViewStyle>;
  /** Override SVG height in points. */
  height?: number;
}

/**
 * A soft, single-source spotlight cone that fades from above. Layered
 * behind the Results "ticket reveal" so a Front Row win feels lit by
 * stage lights, not just confetti. Pure SVG — no images required.
 */
export function SpotlightHalo({
  color = palette.yellow,
  intensity = 1,
  style,
  height = 320,
}: SpotlightHaloProps): React.JSX.Element {
  const clamped: number = Math.max(0, Math.min(1, intensity));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height={height} viewBox="0 0 400 320" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="spotlight" cx="50%" cy="0%" r="70%">
            <Stop offset="0" stopColor={color} stopOpacity={String(0.45 * clamped)} />
            <Stop offset="0.45" stopColor={color} stopOpacity={String(0.18 * clamped)} />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="400" height="320" fill="url(#spotlight)" />
        <Ellipse cx="200" cy="0" rx="180" ry="40" fill={color} opacity={String(0.12 * clamped)} />
      </Svg>
    </View>
  );
}
