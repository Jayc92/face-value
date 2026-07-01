import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { palette, spacing } from '../utils/theme';

interface CountdownHeaderProps {
  /** Epoch ms when the countdown should hit zero. */
  endsAtMs: number;
  /** Tiny micro-caps label above the digits. */
  label?: string;
  /** Render dense for tight rows (no kicker, tabular HH:MM:SS). */
  dense?: boolean;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * HH:MM:SS countdown for the daily Live Event banner. Goes critical
 * (red + soft pulse) under 30 minutes, hard zero on expiry.
 */
export function CountdownHeader({
  endsAtMs,
  label = 'WINDOW CLOSES IN',
  dense = false,
}: CountdownHeaderProps): React.JSX.Element {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const msLeft: number = Math.max(0, endsAtMs - now);
  const totalSeconds: number = Math.floor(msLeft / 1000);
  const hours: number = Math.floor(totalSeconds / 3600);
  const minutes: number = Math.floor((totalSeconds % 3600) / 60);
  const seconds: number = totalSeconds % 60;
  const critical: boolean = msLeft <= 30 * 60 * 1000 && msLeft > 0;

  const pulse = useSharedValue(0);
  useEffect(() => {
    if (critical) {
      pulse.value = withRepeat(
        withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })),
        -1,
        false,
      );
    } else {
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [critical, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + pulse.value * 0.55,
  }));

  const color: string = critical ? palette.danger : palette.yellow;

  return (
    <View style={[styles.wrap, dense && styles.wrapDense]}>
      {!dense && label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.digitsRow}>
        {critical ? (
          <Animated.View style={[styles.dot, { backgroundColor: palette.danger }, pulseStyle]} />
        ) : null}
        <Text style={[styles.digits, { color }, dense && styles.digitsDense]}>
          {pad(hours)}
          <Text style={[styles.colon, { color }]}>:</Text>
          {pad(minutes)}
          <Text style={[styles.colon, { color }]}>:</Text>
          {pad(seconds)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  wrapDense: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    color: palette.textLow,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  digitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  digits: {
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.6,
  },
  digitsDense: {
    fontSize: 14,
  },
  colon: {
    opacity: 0.5,
  },
});
