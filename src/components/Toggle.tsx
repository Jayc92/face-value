import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { palette } from '../utils/theme';

interface ToggleProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

/**
 * Small on/off switch styled to the venue palette. Uses the platform
 * "switch" a11y role so screen readers announce it correctly, with a
 * 44×44 touch target even though the visual track is smaller.
 */
export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
}: ToggleProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={12}
      onPress={() => onValueChange(!value)}
      style={styles.hit}
    >
      <View
        style={[
          styles.track,
          { backgroundColor: value ? palette.pink : palette.panelRaised },
          disabled && styles.disabled,
        ]}
      >
        <View style={[styles.knob, value ? styles.knobOn : styles.knobOff]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.textHi,
  },
  knobOn: {
    alignSelf: 'flex-end',
  },
  knobOff: {
    alignSelf: 'flex-start',
  },
});
