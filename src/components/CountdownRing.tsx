import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import { getPreferences } from '../utils/preferences';
import { palette } from '../utils/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CountdownRingProps {
  totalSeconds: number;
  secondsRemaining: number;
  /** Bump to restart the animation when a new question loads. */
  resetKey: number;
  paused: boolean;
  size?: number;
}

/**
 * Circular countdown with tick marks every second on the dial. Color
 * shifts pink (calm) → yellow (warning) → red (critical) and the
 * ring pulses subtly under 5s without bouncing or distracting.
 */
export function CountdownRing({
  totalSeconds,
  secondsRemaining,
  resetKey,
  paused,
  size = 112,
}: CountdownRingProps): React.JSX.Element {
  const strokeWidth = 6;
  const radius: number = (size - strokeWidth - 8) / 2;
  const circumference: number = 2 * Math.PI * radius;
  const cx: number = size / 2;
  const cy: number = size / 2;

  const progress = useSharedValue(1);
  const pulse = useSharedValue(0);

  useEffect(() => {
    progress.value = 1;
    progress.value = withTiming(0, {
      duration: totalSeconds * 1000,
      easing: Easing.linear,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, totalSeconds]);

  useEffect(() => {
    if (paused) {
      cancelAnimation(progress);
    }
  }, [paused, progress]);

  // The decorative "critical" pulse is suppressed under reduced motion;
  // the color shift to red still communicates urgency without movement.
  const critical: boolean =
    secondsRemaining <= 5 && !paused && !getPreferences().reduceMotion;
  useEffect(() => {
    if (critical) {
      pulse.value = withRepeat(
        withSequence(withTiming(1, { duration: 380 }), withTiming(0, { duration: 380 })),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [critical, pulse]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.04 }],
    opacity: 0.92 + pulse.value * 0.08,
  }));

  const ringColor: string =
    secondsRemaining <= 5
      ? palette.danger
      : secondsRemaining <= 9
        ? palette.yellow
        : palette.pink;

  // Tick marks every second
  const ticks: number[] = Array.from({ length: totalSeconds }, (_, index) => index);

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, pulseStyle]}>
      <Svg width={size} height={size}>
        {/* Tick marks */}
        {ticks.map((index) => {
          const angle: number = (index / totalSeconds) * 2 * Math.PI - Math.PI / 2;
          const outerR: number = radius + 4;
          const innerR: number = radius + (index % 5 === 0 ? -1 : 1);
          return (
            <Line
              key={index}
              x1={cx + Math.cos(angle) * innerR}
              y1={cy + Math.sin(angle) * innerR}
              x2={cx + Math.cos(angle) * outerR}
              y2={cy + Math.sin(angle) * outerR}
              stroke={palette.hairlineStrong}
              strokeWidth={index % 5 === 0 ? 1.5 : 0.75}
            />
          );
        })}
        {/* Track */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={palette.panelRaised}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      <View
        style={styles.center}
        accessibilityRole="timer"
        accessibilityLabel={`${secondsRemaining} seconds remaining`}
      >
        <Text style={styles.label} accessibilityElementsHidden importantForAccessibility="no">
          SECONDS
        </Text>
        <Text
          style={[styles.seconds, { color: ringColor }]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {secondsRemaining}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: palette.textLow,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 2,
  },
  seconds: {
    fontSize: 36,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
});
