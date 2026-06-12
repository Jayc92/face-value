import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { hypeMultiplierForStreak } from '../game/scoring';
import { colors, radii } from '../utils/theme';

/**
 * Pulsing "HYPE x1.5 / x2 / x3" pill shown once a 3+ streak is alive.
 * Below 3 it renders the plain streak count to keep the player oriented.
 */
export function StreakBadge({ streak }: { streak: number }): React.JSX.Element {
  const scale = useSharedValue(1);
  const multiplier: number = hypeMultiplierForStreak(streak);
  const isHype: boolean = multiplier > 1;

  useEffect(() => {
    if (streak > 0) {
      scale.value = withSequence(withSpring(1.25, { damping: 4 }), withSpring(1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[styles.badge, isHype ? styles.badgeHype : styles.badgeIdle, animatedStyle]}
    >
      <Text style={[styles.text, isHype ? styles.textHype : styles.textIdle]}>
        {isHype ? `🔥 HYPE x${multiplier}` : `Streak ${streak}`}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  badgeIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceLight,
  },
  badgeHype: {
    backgroundColor: colors.pink,
    borderColor: colors.yellow,
  },
  text: {
    fontSize: 14,
    fontWeight: '800',
  },
  textIdle: {
    color: colors.textDim,
  },
  textHype: {
    color: colors.white,
  },
});
