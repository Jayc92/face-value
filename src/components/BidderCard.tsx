import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { AiBidder } from '../game/types';
import { colors, radii, spacing } from '../utils/theme';

interface BidderCardProps {
  bidder: AiBidder;
  /** 0-1: how much of their pool they've visibly committed (teaser bar). */
  visibleCommitment: number;
}

/**
 * AI opponent avatar with a live "heat" bar. The bar shows roughly how
 * committed the bidder looks — their exact allocation stays hidden until
 * the auction resolves, like real rival buyers.
 */
export function BidderCard({ bidder, visibleCommitment }: BidderCardProps): React.JSX.Element {
  const barStyle = useAnimatedStyle(() => ({
    width: withSpring(`${Math.round(Math.min(1, Math.max(0, visibleCommitment)) * 100)}%`, {
      damping: 14,
    }),
  }));

  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>{bidder.emoji}</Text>
      <Text style={styles.name} numberOfLines={1}>
        {bidder.name}
      </Text>
      <Text style={styles.pool}>{bidder.creditPool.toLocaleString()} cr</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.sm,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  emoji: {
    fontSize: 26,
  },
  name: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  pool: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  barTrack: {
    width: '100%',
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceLight,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.pink,
  },
});
