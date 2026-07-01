import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Medal, TierConfig, TierLevel } from '../game/types';
import { palette, radii, spacing } from '../utils/theme';
import { MedalChip } from './MedalChip';
import { PrimaryButton } from './PrimaryButton';

type Status = 'playable' | 'locked' | 'comingSoon';

interface TierCardProps {
  config: TierConfig;
  status: Status;
  /** Player's current Fan Score — used to show the locked progress meter. */
  fanScore: number;
  onPlay: () => void;
  /** When true, this is the recommended next tier (gets a subtle accent). */
  highlighted?: boolean;
  /** Best medal earned in this league:tier so far, or 'none'. */
  bestMedal?: Medal;
}

const DIFFICULTY_DOTS: Record<TierLevel, number> = { 1: 1, 2: 2, 3: 3, 4: 4 };

/**
 * Progression tier as a premium circuit card. Locked tiers show as
 * aspirational silver, not disabled-gray. Coming-soon tiers get an
 * "EARLY ACCESS" stripe so they read as future content, not broken.
 */
export function TierCard({
  config,
  status,
  fanScore,
  onPlay,
  highlighted = false,
  bestMedal = 'none',
}: TierCardProps): React.JSX.Element {
  const stakesDots: number = DIFFICULTY_DOTS[config.level];

  const stakesRow = (
    <View style={styles.stakesRow}>
      <Text style={styles.statLabel}>STAKES</Text>
      <View style={styles.dotsRow}>
        {[1, 2, 3, 4].map((index) => (
          <View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: index <= stakesDots ? palette.pink : palette.panelRaised },
            ]}
          />
        ))}
      </View>
    </View>
  );

  if (status === 'comingSoon') {
    return (
      <View style={[styles.card, styles.cardSoon]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.tierKicker}>TIER {config.level}</Text>
            <Text style={styles.tierName}>{config.name}</Text>
          </View>
          <View style={styles.soonBadge}>
            <Text style={styles.soonBadgeText}>Early access</Text>
          </View>
        </View>
        <View style={styles.medalRow}>
          <Text style={styles.medalLabel}>Best medal</Text>
          <MedalChip medal="none" showEmpty compact />
        </View>
        <Text style={styles.tagline}>{config.tagline}</Text>
        <View style={styles.stripe}>
          <Text style={styles.stripeText}>
            Coming after Tier 2. The arena lights are on — stay tuned.
          </Text>
        </View>
      </View>
    );
  }

  if (status === 'locked') {
    const progress: number = Math.min(1, fanScore / Math.max(1, config.fanScoreRequired));
    return (
      <View style={[styles.card, styles.cardLocked]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.tierKicker}>TIER {config.level}</Text>
            <Text style={styles.tierName}>{config.name}</Text>
          </View>
          <View style={styles.lockBadge}>
            <Text style={styles.lockBadgeText}>Fan {config.fanScoreRequired}</Text>
          </View>
        </View>
        <View style={styles.medalRow}>
          <Text style={styles.medalLabel}>Best medal</Text>
          <MedalChip medal="none" showEmpty compact />
        </View>
        <Text style={styles.tagline}>{config.tagline}</Text>
        <View style={styles.lockTrack}>
          <View style={[styles.lockFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={styles.lockHint}>
          {fanScore}/{config.fanScoreRequired} tickets · win {config.fanScoreRequired - fanScore} more to unlock
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        styles.cardPlayable,
        highlighted && { borderColor: palette.pink },
      ]}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.tierKicker}>Tier {config.level}</Text>
          <Text style={styles.tierName}>{config.name}</Text>
        </View>
        {stakesRow}
      </View>

      <View style={styles.medalRow}>
        <Text style={styles.medalLabel}>Best medal</Text>
        <MedalChip medal={bestMedal} showEmpty compact />
      </View>

      <Text style={styles.tagline}>{config.tagline}</Text>

      <View style={styles.metaGrid}>
        <View style={styles.metaCell}>
          <Text style={styles.statLabel}>Rivals</Text>
          <Text style={styles.statValue}>{config.aiBidderCount}</Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.statLabel}>Pool</Text>
          <Text style={styles.statValue}>{config.aiBaseCreditPool.toLocaleString()}</Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.statLabel}>Mix · E/M/H</Text>
          <Text style={styles.statValue}>
            {config.difficultyMix.easy}·{config.difficultyMix.medium}·{config.difficultyMix.hard}
          </Text>
        </View>
      </View>

      <PrimaryButton label="Enter the gauntlet" trailing="→" onPress={onPlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  cardPlayable: {
    backgroundColor: palette.panel,
  },
  cardLocked: {
    backgroundColor: palette.panel,
    borderColor: palette.hairlineStrong,
  },
  cardSoon: {
    backgroundColor: palette.panelGlass,
    borderColor: palette.hairline,
    borderStyle: 'dashed',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  tierKicker: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tierName: {
    color: palette.textHi,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  tagline: {
    color: palette.pinkSoft,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  stakesRow: {
    alignItems: 'flex-end',
    gap: 4,
  },
  medalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: -spacing.xs,
  },
  medalLabel: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  metaCell: {
    flex: 1,
    backgroundColor: palette.ink800,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  statLabel: {
    color: palette.textLow,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statValue: {
    color: palette.textHi,
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  soonBadge: {
    borderWidth: 1,
    borderColor: palette.yellow,
    backgroundColor: 'rgba(255, 233, 77, 0.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  soonBadgeText: {
    color: palette.yellow,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  lockBadge: {
    backgroundColor: palette.panelRaised,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: palette.hairlineStrong,
  },
  lockBadgeText: {
    color: palette.textMed,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  lockTrack: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: palette.panelRaised,
    overflow: 'hidden',
  },
  lockFill: {
    height: '100%',
    backgroundColor: palette.purple,
    borderRadius: radii.pill,
  },
  lockHint: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  stripe: {
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
    paddingTop: spacing.sm,
  },
  stripeText: {
    color: palette.textMed,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
});
