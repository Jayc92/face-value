import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../utils/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CountdownRingProps {
  /** Total seconds for the question. */
  totalSeconds: number;
  /** Seconds left right now (drives the number in the middle). */
  secondsRemaining: number;
  /** Bump this to restart the ring animation (e.g. the question index). */
  resetKey: number;
  /** Freeze the ring (after an answer is locked in). */
  paused: boolean;
  size?: number;
}

/**
 * Circular countdown that sweeps from full to empty over the question
 * timer, shifting pink -> yellow -> red as time runs out.
 */
export function CountdownRing({
  totalSeconds,
  secondsRemaining,
  resetKey,
  paused,
  size = 84,
}: CountdownRingProps): React.JSX.Element {
  const strokeWidth = 7;
  const radius: number = (size - strokeWidth) / 2;
  const circumference: number = 2 * Math.PI * radius;

  const progress = useSharedValue(1);

  useEffect(() => {
    progress.value = 1;
    progress.value = withTiming(0, {
      duration: totalSeconds * 1000,
      easing: Easing.linear,
    });
    // Restart only when a new question arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, totalSeconds]);

  useEffect(() => {
    if (paused) {
      // Freeze in place by re-assigning the current value (cancels the timing).
      progress.value = progress.value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const urgency: 'calm' | 'warning' | 'critical' =
    secondsRemaining <= 5 ? 'critical' : secondsRemaining <= 9 ? 'warning' : 'calm';
  const ringColor: string =
    urgency === 'critical' ? colors.danger : urgency === 'warning' ? colors.yellow : colors.pink;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceLight}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.label}>
        <Text style={[styles.seconds, { color: ringColor }]}>{secondsRemaining}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seconds: {
    fontSize: 26,
    fontWeight: '900',
  },
});
