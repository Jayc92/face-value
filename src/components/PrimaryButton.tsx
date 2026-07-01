import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
  PressableProps,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { motion, palette, radii, shadows, spacing } from '../utils/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'lg' | 'md' | 'sm';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  /** Optional kicker rendered above the label in micro-caps. */
  kicker?: string;
  /** Optional trailing glyph (>, →, ✓) — kept as text so it scales with the label. */
  trailing?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: PressableProps['testID'];
}

/**
 * Primary CTA. Uses a flat fill + colored halo (no gradient slop), a press
 * scale-down, and a subtle hover sheen via Reanimated.
 *
 * Variants:
 *  - primary: pink fill, hot pink halo — the "do it" button
 *  - secondary: dark glass with pink hairline — quieter actions
 *  - ghost: text-only with hairline — tertiary navigation
 *  - danger: muted red, for destructive choices (unused in v1 but available)
 */
export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  kicker,
  trailing,
  style,
  accessibilityLabel,
  testID,
}: PrimaryButtonProps): React.JSX.Element {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn = (): void => {
    scale.value = withTiming(0.97, { duration: motion.fast });
  };
  const onPressOut = (): void => {
    scale.value = withTiming(1, { duration: motion.fast });
  };

  const sizeStyle: ViewStyle =
    size === 'sm'
      ? { paddingVertical: 10, paddingHorizontal: spacing.lg }
      : size === 'md'
        ? { paddingVertical: 13, paddingHorizontal: spacing.lg }
        : { paddingVertical: 16, paddingHorizontal: spacing.xl };

  const labelFontSize: number = size === 'sm' ? 13 : size === 'md' ? 15 : 16;

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        testID={testID}
        style={[
          styles.base,
          sizeStyle,
          variant === 'primary' && styles.primary,
          variant === 'secondary' && styles.secondary,
          variant === 'ghost' && styles.ghost,
          variant === 'danger' && styles.danger,
          disabled && styles.disabled,
        ]}
      >
        <View style={styles.inner}>
          {kicker ? (
            <Text style={[styles.kicker, variant === 'primary' && styles.kickerOnPrimary]}>
              {kicker}
            </Text>
          ) : null}
          <View style={styles.labelRow}>
            <Text
              style={[
                styles.label,
                { fontSize: labelFontSize },
                variant === 'secondary' && styles.labelSecondary,
                variant === 'ghost' && styles.labelGhost,
                variant === 'danger' && styles.labelDanger,
              ]}
            >
              {loading ? 'Loading…' : label}
            </Text>
            {trailing && !loading ? (
              <Text
                style={[
                  styles.trailing,
                  { fontSize: labelFontSize },
                  variant === 'secondary' && styles.labelSecondary,
                  variant === 'ghost' && styles.labelGhost,
                ]}
              >
                {trailing}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  primary: {
    backgroundColor: palette.pink,
    ...shadows.glowPink,
  },
  secondary: {
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.pink,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: palette.hairlineStrong,
  },
  danger: {
    backgroundColor: palette.dangerDeep,
    borderWidth: 1,
    borderColor: palette.danger,
  },
  disabled: {
    opacity: 0.35,
  },
  inner: {
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  kicker: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 2,
  },
  kickerOnPrimary: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  label: {
    color: palette.textHi,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  trailing: {
    color: palette.textHi,
    fontWeight: '900',
  },
  labelSecondary: {
    color: palette.pink,
  },
  labelGhost: {
    color: palette.textMed,
  },
  labelDanger: {
    color: palette.danger,
  },
});
