import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LEAGUE_LABELS } from '../game/events';
import { League } from '../game/types';
import { LEAGUE_VISUALS } from '../utils/leagueVisuals';
import { palette, radii, spacing } from '../utils/theme';
import { LeagueBadge } from './LeagueBadge';

interface LeagueCardProps {
  league: League;
  ticketsWon: number;
  completionPct: number;
  selected?: boolean;
  /** Compact mode (used in dense rows on the Home screen). */
  compact?: boolean;
  onPress: () => void;
}

/**
 * Premium league entry tile. Brand badge + name + collection progress
 * meter — looks like an event category card you'd see in a real
 * ticketing app, not an emoji grid.
 */
export function LeagueCard({
  league,
  ticketsWon,
  completionPct,
  selected = false,
  compact = false,
  onPress,
}: LeagueCardProps): React.JSX.Element {
  const visual = LEAGUE_VISUALS[league];
  const pct: number = Math.max(0, Math.min(1, completionPct));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Choose ${LEAGUE_LABELS[league]} league`}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        selected && { borderColor: visual.accent },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.row}>
        <LeagueBadge league={league} size={compact ? 36 : 44} />
        <View style={styles.identity}>
          <Text style={styles.name}>{LEAGUE_LABELS[league]}</Text>
          <Text style={styles.tagline} numberOfLines={1}>
            {visual.tagline}
          </Text>
        </View>
      </View>
      <View style={styles.meterRow}>
        <View style={styles.meterTrack}>
          <View
            style={[
              styles.meterFill,
              { width: `${Math.round(pct * 100)}%`, backgroundColor: visual.accent },
            ]}
          />
        </View>
        <Text style={styles.meterText}>
          <Text style={[styles.meterTextStrong, { color: visual.accent }]}>{ticketsWon}</Text>
          <Text style={styles.meterTextDim}>
            {' '}
            tickets · {Math.round(pct * 100)}%
          </Text>
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.panel,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardCompact: {
    padding: spacing.sm + 2,
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: palette.textHi,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  tagline: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  meterRow: {
    gap: 6,
  },
  meterTrack: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: palette.panelRaised,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  meterText: {
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  meterTextStrong: {
    fontWeight: '900',
  },
  meterTextDim: {
    color: palette.textLow,
    fontWeight: '700',
  },
});
