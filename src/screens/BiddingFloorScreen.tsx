import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { BidAllocator } from '../components/BidAllocator';
import { BidderCard } from '../components/BidderCard';
import { HeaderBar } from '../components/HeaderBar';
import { LeagueBadge } from '../components/LeagueBadge';
import { Panel } from '../components/Panel';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { SeatMap } from '../components/SeatMap';
import { generateAiBidders, resolveAuction } from '../game/aiBidders';
import { buildGameEvent, LEAGUE_LABELS } from '../game/events';
import { ScreenProps } from '../game/navigation';
import { TIER_CONFIGS } from '../game/tiers';
import {
  AiBidder,
  BidAllocation,
  GameEvent,
  SeatTier,
  SEAT_TIERS,
} from '../game/types';
import { LEAGUE_VISUALS } from '../utils/leagueVisuals';
import { playSound } from '../utils/sounds';
import { palette, radii, shadows, spacing } from '../utils/theme';

export function BiddingFloorScreen({
  navigation,
  route,
}: ScreenProps<'BiddingFloor'>): React.JSX.Element {
  const {
    league,
    tierLevel,
    creditsEarned,
    answeredQuestions,
    liveEventId,
    liveEventName,
    liveBonusActive,
    roundStartedAtMs,
  } = route.params;
  const leagueVisual = LEAGUE_VISUALS[league];

  const event = useMemo<GameEvent>(
    () => buildGameEvent(league, tierLevel, liveBonusActive),
    [league, tierLevel, liveBonusActive],
  );
  const aiBidders = useMemo<AiBidder[]>(
    () => generateAiBidders(tierLevel, creditsEarned),
    [tierLevel, creditsEarned],
  );

  const [allocation, setAllocation] = useState<BidAllocation>({ front: 0, mid: 0, upper: 0 });
  const [teaser, setTeaser] = useState<number[]>(() => aiBidders.map((b) => b.aggression * 0.5));
  const [confirming, setConfirming] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTeaser(
        aiBidders.map((bidder) =>
          Math.min(1, Math.max(0.1, bidder.aggression + (Math.random() - 0.5) * 0.3)),
        ),
      );
    }, 1800);
    return () => clearInterval(interval);
  }, [aiBidders]);

  const totalAllocated: number = SEAT_TIERS.reduce((sum, tier) => sum + allocation[tier], 0);
  const remaining: number = creditsEarned - totalAllocated;
  const allocatedPct: number = creditsEarned > 0 ? totalAllocated / creditsEarned : 0;

  const remainingScale = useSharedValue(1);
  useEffect(() => {
    remainingScale.value = withTiming(remaining < 0 ? 1.05 : 1, { duration: 220 });
  }, [remaining, remainingScale]);
  const remainingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: remainingScale.value }],
  }));

  const setBid = (tier: SeatTier, value: number): void => {
    const rounded: number = Math.round(value);
    const otherTotal: number = totalAllocated - allocation[tier];
    const clamped: number = Math.min(rounded, creditsEarned - otherTotal);
    setAllocation((previous) => ({ ...previous, [tier]: Math.max(0, clamped) }));
  };

  const clearBids = (): void => {
    setAllocation({ front: 0, mid: 0, upper: 0 });
  };

  const lockInBids = (): void => {
    setConfirming(true);
    const auction = resolveAuction(allocation, aiBidders, tierLevel);
    if (auction.playerBestSeat !== null) {
      playSound('cheer');
    }
    // Mint a stable round id once, here — it travels through Results
    // params (React Navigation preserves params across remounts) so the
    // profile/vault/streak writes stay idempotent even if Results
    // re-mounts or its effect double-fires.
    const roundId = `round-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    navigation.replace('Results', {
      roundId,
      league,
      tierLevel,
      event,
      auction,
      creditsEarned,
      answeredQuestions,
      liveEventId,
      roundStartedAtMs,
    });
  };

  return (
    <ScreenShell scroll>
      <HeaderBar
        kicker="BIDDING FLOOR"
        title="Place your bids"
        onBack={() => navigation.popToTop()}
        backLabel="Quit"
        trailing={
          <Pressable
            hitSlop={10}
            onPress={() => setShowHelp((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel="How bidding works"
            accessibilityState={{ expanded: showHelp }}
            style={styles.helpToggle}
          >
            <Text style={styles.helpToggleText}>{showHelp ? 'Close' : 'How it works'}</Text>
          </Pressable>
        }
      />

      {showHelp ? (
        <Panel variant="raised" style={styles.helpPanel}>
          <Text style={styles.helpTitle}>How bidding works</Text>
          {[
            'Each tier has a reserve — a minimum winning bid. Bid below it and no one takes the seat.',
            'The highest qualifying bid wins each tier. Ties go to you.',
            'Losing bids are refunded — you only pay for seats you actually win.',
            'Splitting credits across tiers is often safer than going all-in on Front Row.',
          ].map((line, index) => (
            <View key={index} style={styles.helpRow}>
              <Text style={styles.helpBullet}>›</Text>
              <Text style={styles.helpLine}>{line}</Text>
            </View>
          ))}
        </Panel>
      ) : null}

      {/* Event header card */}
      <Panel variant="raised" style={styles.eventCard} borderColor={leagueVisual.accent}>
        <View style={styles.eventRow}>
          <LeagueBadge league={league} size={44} />
          <View style={styles.eventTextBlock}>
            <Text style={styles.eventKicker}>
              {LEAGUE_LABELS[league]} · Tier {tierLevel}
              {liveBonusActive ? '  ·  Live' : ''}
            </Text>
            <Text style={styles.eventName} numberOfLines={2}>
              {liveEventName ?? event.name}
            </Text>
            <Text style={styles.eventVenue}>{event.venue}</Text>
          </View>
        </View>
      </Panel>

      {/* Stadium SeatMap */}
      <View style={styles.seatMapWrap}>
        <SeatMap allocation={allocation} credits={creditsEarned} />
      </View>

      {/* Budget bar — visible single source of truth for spending */}
      <Panel variant="raised" style={styles.budgetCard}>
        <View style={styles.budgetRow}>
          <View>
            <Text style={styles.budgetLabel}>Remaining</Text>
            <Animated.View style={remainingStyle}>
              <Text
                style={[
                  styles.budgetValue,
                  remaining === 0 && allocatedPct > 0 ? { color: palette.success } : null,
                ]}
              >
                <Text style={styles.budgetBolt}>⚡ </Text>
                {remaining.toLocaleString()}
              </Text>
            </Animated.View>
          </View>
          <View style={styles.budgetRight}>
            <Text style={styles.budgetLabel}>Allocated</Text>
            <Text style={styles.budgetTotal}>
              {totalAllocated.toLocaleString()}
              <Text style={styles.budgetTotalDim}>
                {' / '}
                {creditsEarned.toLocaleString()}
              </Text>
            </Text>
          </View>
        </View>
        <View style={styles.budgetTrack}>
          <View
            style={[
              styles.budgetFill,
              { width: `${Math.round(allocatedPct * 100)}%` },
            ]}
          />
        </View>
        <View style={styles.budgetActions}>
          <Pressable
            onPress={clearBids}
            disabled={totalAllocated === 0}
            accessibilityRole="button"
            accessibilityLabel="Clear all bids"
            accessibilityState={{ disabled: totalAllocated === 0 }}
            style={({ pressed }) => [
              styles.budgetAction,
              pressed && { opacity: 0.7 },
              totalAllocated === 0 && { opacity: 0.35 },
            ]}
          >
            <Text style={styles.budgetActionText}>CLEAR</Text>
          </Pressable>
        </View>
      </Panel>

      {/* Bid allocators */}
      <View style={styles.allocatorsColumn}>
        {SEAT_TIERS.map((tier: SeatTier) => {
          const otherTotal: number = totalAllocated - allocation[tier];
          const maxForTier: number = Math.max(0, creditsEarned - otherTotal);
          return (
            <BidAllocator
              key={tier}
              tier={tier}
              amount={allocation[tier]}
              maxValue={maxForTier}
              totalCredits={creditsEarned}
              reserve={TIER_CONFIGS[tierLevel].seatReserves[tier]}
              onChange={(value: number) => setBid(tier, value)}
            />
          );
        })}
      </View>

      {/* Rival bidders */}
      <View style={styles.rivalsHeader}>
        <Text style={styles.rivalsKicker}>Rival bidders</Text>
        <Text style={styles.rivalsCount}>{aiBidders.length}</Text>
      </View>
      <View style={styles.rivalsColumn}>
        {aiBidders.map((bidder, index) => (
          <BidderCard
            key={bidder.id}
            bidder={bidder}
            visibleCommitment={teaser[index] ?? 0.3}
          />
        ))}
      </View>

      {/* Hint and primary CTA */}
      <Text style={styles.hint}>
        {creditsEarned === 0
          ? 'No credits this round — lock in to watch the auction play out, then run it back.'
          : 'Highest bid takes each tier. Ties go to you. Unspent credits stay with you.'}
      </Text>

      <PrimaryButton
        label={creditsEarned === 0 ? 'Watch the auction' : 'Lock in bids'}
        kicker={
          creditsEarned === 0
            ? 'NO CREDITS'
            : `COMMITTING  ⚡  ${totalAllocated.toLocaleString()}`
        }
        trailing="→"
        disabled={confirming}
        onPress={lockInBids}
        style={[styles.lockButton, shadows.glowPink]}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  helpToggle: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.hairlineStrong,
  },
  helpToggleText: {
    color: palette.textMed,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  helpPanel: {
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  helpTitle: {
    color: palette.textHi,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  helpRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  helpBullet: {
    color: palette.pink,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  helpLine: {
    flex: 1,
    color: palette.textMed,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
  eventCard: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  eventTextBlock: {
    flex: 1,
    gap: 2,
  },
  eventKicker: {
    color: palette.textLow,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  eventName: {
    color: palette.textHi,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  eventVenue: {
    color: palette.textMed,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  seatMapWrap: {
    backgroundColor: palette.ink800,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.hairline,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  budgetCard: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  budgetLabel: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  budgetValue: {
    color: palette.yellow,
    fontSize: 26,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  budgetBolt: {
    fontSize: 18,
  },
  budgetRight: {
    alignItems: 'flex-end',
  },
  budgetTotal: {
    color: palette.textHi,
    fontSize: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  budgetTotalDim: {
    color: palette.textLow,
    fontWeight: '700',
  },
  budgetTrack: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: palette.panelRaised,
    overflow: 'hidden',
  },
  budgetFill: {
    height: '100%',
    backgroundColor: palette.pink,
    borderRadius: radii.pill,
  },
  budgetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  budgetAction: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  budgetActionText: {
    color: palette.textMed,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  allocatorsColumn: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  rivalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  rivalsKicker: {
    color: palette.textLow,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  rivalsCount: {
    color: palette.textHi,
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  rivalsColumn: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  hint: {
    color: palette.textLow,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    lineHeight: 17,
  },
  lockButton: {
    marginBottom: spacing.md,
  },
});
