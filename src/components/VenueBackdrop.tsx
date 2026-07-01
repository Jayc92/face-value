import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { palette } from '../utils/theme';

interface VenueBackdropProps {
  /** Total height of the backdrop. */
  height?: number;
}

/**
 * Subtle game-world atmosphere layered behind the Home hub: stadium
 * silhouette, distant seating arcs, two narrow spotlight beams sweeping
 * over the stage. Pure SVG, no images, intentionally low-contrast so
 * UI text on top stays legible.
 */
export function VenueBackdrop({ height = 360 }: VenueBackdropProps): React.JSX.Element {
  return (
    <View pointerEvents="none" style={[styles.wrap, { height }]}>
      <Svg width="100%" height={height} viewBox="0 0 400 360" preserveAspectRatio="xMidYMin slice">
        <Defs>
          <RadialGradient id="venueGlow" cx="50%" cy="78%" r="78%">
            <Stop offset="0" stopColor={palette.purple} stopOpacity="0.35" />
            <Stop offset="0.6" stopColor={palette.purple} stopOpacity="0.08" />
            <Stop offset="1" stopColor={palette.ink900} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="beamLeft" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.pink} stopOpacity="0" />
            <Stop offset="0.4" stopColor={palette.pink} stopOpacity="0.12" />
            <Stop offset="1" stopColor={palette.pink} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="beamRight" x1="1" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.yellow} stopOpacity="0" />
            <Stop offset="0.4" stopColor={palette.yellow} stopOpacity="0.1" />
            <Stop offset="1" stopColor={palette.yellow} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="vignette" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={palette.ink900} stopOpacity="1" />
            <Stop offset="1" stopColor={palette.ink900} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Ambient venue glow */}
        <Rect x="0" y="0" width="400" height="360" fill="url(#venueGlow)" />

        {/* Two spotlight beams crossing toward the stage */}
        <Path d="M 30 0 L 180 360 L 110 360 L -20 20 Z" fill="url(#beamLeft)" />
        <Path d="M 370 0 L 220 360 L 290 360 L 420 20 Z" fill="url(#beamRight)" />

        {/* Distant seating arcs — outer rings */}
        <Ellipse
          cx="200"
          cy="320"
          rx="220"
          ry="60"
          stroke={palette.hairlineStrong}
          strokeWidth="1"
          fill="none"
          opacity="0.45"
        />
        <Ellipse
          cx="200"
          cy="320"
          rx="170"
          ry="44"
          stroke={palette.hairlineStrong}
          strokeWidth="1"
          fill="none"
          opacity="0.3"
        />
        <Ellipse
          cx="200"
          cy="320"
          rx="120"
          ry="30"
          stroke={palette.hairlineStrong}
          strokeWidth="1"
          fill="none"
          opacity="0.25"
        />

        {/* Stage glow */}
        <Ellipse cx="200" cy="320" rx="84" ry="10" fill={palette.yellow} opacity="0.12" />
        <Rect x="155" y="316" width="90" height="4" rx="2" fill={palette.yellow} opacity="0.35" />

        {/* Bottom vignette so UI text on top stays legible */}
        <Rect x="0" y="200" width="400" height="160" fill="url(#vignette)" opacity="0.6" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
