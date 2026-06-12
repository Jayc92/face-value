import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../utils/theme';

const PIECE_COLORS: string[] = [colors.pink, colors.yellow, colors.purple, colors.white];
const PIECE_COUNT = 36;

interface ConfettiPieceSpec {
  startX: number;
  driftX: number;
  delayMs: number;
  durationMs: number;
  color: string;
  sizePx: number;
  spinTurns: number;
}

function ConfettiPiece({ spec, screenHeight }: { spec: ConfettiPieceSpec; screenHeight: number }): React.JSX.Element {
  const fall = useSharedValue(0);

  useEffect(() => {
    fall.value = withDelay(
      spec.delayMs,
      withTiming(1, { duration: spec.durationMs, easing: Easing.in(Easing.quad) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -40 + fall.value * (screenHeight + 80) },
      { translateX: spec.startX + fall.value * spec.driftX },
      { rotate: `${fall.value * spec.spinTurns * 360}deg` },
    ],
    opacity: fall.value < 0.85 ? 1 : (1 - fall.value) / 0.15,
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        animatedStyle,
        { backgroundColor: spec.color, width: spec.sizePx, height: spec.sizePx * 1.8 },
      ]}
    />
  );
}

/**
 * Full-screen confetti burst for winning the Front Row. Pieces are
 * generated once per mount; remount (via key) to replay.
 */
export function Confetti(): React.JSX.Element {
  const { height: screenHeight } = Dimensions.get('window');

  const pieces = useMemo<ConfettiPieceSpec[]>(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, index) => ({
        startX: Math.random() * Dimensions.get('window').width,
        driftX: (Math.random() - 0.5) * 160,
        delayMs: Math.random() * 600,
        durationMs: 1800 + Math.random() * 1400,
        color: PIECE_COLORS[index % PIECE_COLORS.length],
        sizePx: 6 + Math.random() * 7,
        spinTurns: 1 + Math.random() * 3,
      })),
    [],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((spec, index) => (
        <ConfettiPiece key={index} spec={spec} screenHeight={screenHeight} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 2,
  },
});
