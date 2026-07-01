import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { palette, radii } from '../utils/theme';

interface PanelProps {
  children: React.ReactNode;
  /** raised: solid dark glass. glass: faint translucent. flat: hairline only. */
  variant?: 'raised' | 'glass' | 'flat';
  /** Accent border color (default: hairline). */
  borderColor?: string;
  /** Custom border width (default: 1). */
  borderWidth?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The single dark-card primitive. Replaces ~12 different ad-hoc card
 * styles across the screens. Use `borderColor` to add a single accent
 * (live event = pink, tier locked = mute, etc.) instead of inventing a
 * new shadow stack every time.
 */
export function Panel({
  children,
  variant = 'raised',
  borderColor,
  borderWidth = 1,
  radius = radii.lg,
  style,
}: PanelProps): React.JSX.Element {
  return (
    <View
      style={[
        styles.base,
        variant === 'raised' && styles.raised,
        variant === 'glass' && styles.glass,
        variant === 'flat' && styles.flat,
        {
          borderRadius: radius,
          borderColor: borderColor ?? palette.hairline,
          borderWidth,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  raised: {
    backgroundColor: palette.panel,
  },
  glass: {
    backgroundColor: palette.panelGlass,
  },
  flat: {
    backgroundColor: 'transparent',
  },
});
