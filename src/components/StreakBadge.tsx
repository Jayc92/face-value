import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { hypeMultiplierForStreak } from '../game/scoring';
import { palette, radii } from '../utils/theme';

interface StreakBadgeProps {
  streak: number;
}

/**
 * Streak indicator. Below the 3-hype threshold it shows a quiet pip-row
 * "STREAK 2" badge. At hype levels (x1.5 / x2 / x3) it lights up,
 * pulses gently, and shows the multiplier prominently.
 */
export function StreakBadge({ streak }: StreakBadgeProps): React.JSX.Element {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  const multiplier: number = hypeMultiplierForStreak(streak);
  const isHype: boolean = multiplier > 1;

  useEffect(() => {
    if (streak > 0) {
      scale.value = withSequence(
        withSpring(1.12, { damping: 6, stiffness: 240 }),
        withSpring(1, { damping: 9, stiffness: 200 }),
      );
    }
    if (isHype) {
      glow.value = withTiming(1, { duration: 320 });
    } else {
      glow.value = withTiming(0, { duration: 200 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + glow.value * 0.4,
  }));

  if (!isHype) {
    // Quiet state: 5 small pips so the player can see streak building toward 3.
    return (
      <Animated.View style={[styles.badgeIdle, animatedStyle]}>
        <Text style={styles.idleLabel}>STREAK</Text>
        <View style={styles.pipsRow}>
          {[1, 2, 3, 4, 5].map((index) => (
            <View
              key={index}
              style={[styles.pip, index <= streak && { backgroundColor: palette.pink }]}
            />
          ))}
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.badgeHype, animatedStyle, glowStyle]}>
      <Text style={styles.hypeKicker}>HYPE</Text>
      <Text style={styles.hypeMultiplier}>×{multiplier}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badgeIdle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  idleLabel: {
    color: palette.textLow,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  pipsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  pip: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: palette.panelRaised,
  },
  badgeHype: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: palette.pink,
    borderWidth: 1.5,
    borderColor: palette.yellow,
    shadowColor: palette.pink,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  hypeKicker: {
    color: palette.textHi,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  hypeMultiplier: {
    color: palette.yellow,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
});
