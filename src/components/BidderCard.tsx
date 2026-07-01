import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { AiBidder } from '../game/types';
import { palette, radii, spacing } from '../utils/theme';

interface BidderCardProps {
  bidder: AiBidder;
  /** 0-1: live "heat" indicator. Drives the bar and the avatar's outer ring. */
  visibleCommitment: number;
}

/** Steady persona palette — picks a consistent color per name without emoji. */
function colorForName(name: string): string {
  const palettePool: string[] = [
    palette.pink,
    palette.yellow,
    palette.purple,
    palette.pinkSoft,
    palette.warning,
    palette.success,
  ];
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return palettePool[hash % palettePool.length];
}

function initialsFromName(name: string): string {
  const parts: string[] = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Rival bidder card. Replaces the previous emoji-faced design with a
 * monogram avatar and a live commitment bar. Reads like a bidder profile
 * card at a real auction house, not a children's app.
 */
export function BidderCard({ bidder, visibleCommitment }: BidderCardProps): React.JSX.Element {
  const accent: string = useMemo(() => colorForName(bidder.name), [bidder.name]);
  const initials: string = useMemo(() => initialsFromName(bidder.name), [bidder.name]);
  const commitment: number = Math.max(0, Math.min(1, visibleCommitment));

  const barStyle = useAnimatedStyle(() => ({
    width: withSpring(`${Math.round(commitment * 100)}%`, { damping: 14 }),
  }));

  // Heat classification — affects the bidder-status microtext only.
  const heat: 'cool' | 'warm' | 'hot' =
    commitment < 0.35 ? 'cool' : commitment < 0.7 ? 'warm' : 'hot';
  const heatLabel: string = heat === 'hot' ? 'AGGRESSIVE' : heat === 'warm' ? 'ACTIVE' : 'WATCHING';
  const heatColor: string =
    heat === 'hot' ? palette.pink : heat === 'warm' ? palette.yellow : palette.textLow;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.avatar, { borderColor: accent }]}>
          <Text style={[styles.initials, { color: accent }]}>{initials}</Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {bidder.name}
          </Text>
          <Text style={[styles.heat, { color: heatColor }]}>{heatLabel}</Text>
        </View>
        <View style={styles.poolColumn}>
          <Text style={styles.poolLabel}>POOL</Text>
          <Text style={styles.pool}>{bidder.creditPool.toLocaleString()}</Text>
        </View>
      </View>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { backgroundColor: accent }, barStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.panel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    backgroundColor: palette.panelRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: palette.textHi,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  heat: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  poolColumn: {
    alignItems: 'flex-end',
  },
  poolLabel: {
    color: palette.textLow,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  pool: {
    color: palette.textHi,
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: palette.panelRaised,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
});
