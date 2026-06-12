import Slider from '@react-native-community/slider';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BidderCard } from '../components/BidderCard';
import { GlowButton } from '../components/GlowButton';
import { generateAiBidders, resolveAuction } from '../game/aiBidders';
import { buildGameEvent, LEAGUE_LABELS } from '../game/events';
import { ScreenProps } from '../game/navigation';
import {
  AiBidder,
  BidAllocation,
  GameEvent,
  SeatTier,
  SEAT_TIER_LABELS,
  SEAT_TIERS,
} from '../game/types';
import { playSound } from '../utils/sounds';
import { colors, radii, spacing, typography } from '../utils/theme';

const TIER_EMOJIS: Record<SeatTier, string> = {
  front: '🔥',
  mid: '🎫',
  upper: '🪜',
};

/** Stylized venue cross-section: stage at the bottom, tiers stacked above. */
function VenueDiagram({ allocation, credits }: { allocation: BidAllocation; credits: number }): React.JSX.Element {
  const intensity = (tier: SeatTier): number =>
    credits === 0 ? 0 : Math.min(1, allocation[tier] / Math.max(1, credits));

  const rowStyle = (tier: SeatTier) => ({
    borderColor: intensity(tier) > 0 ? colors.pink : colors.surfaceLight,
    backgroundColor:
      intensity(tier) > 0.5
        ? '#4A1335'
        : intensity(tier) > 0
          ? '#2E1330'
          : colors.surface,
  });

  return (
    <View style={venueStyles.container}>
      <View style={[venueStyles.row, venueStyles.upper, rowStyle('upper')]}>
        <Text style={venueStyles.rowText}>UPPER DECK</Text>
      </View>
      <View style={[venueStyles.row, venueStyles.mid, rowStyle('mid')]}>
        <Text style={venueStyles.rowText}>MID LEVEL</Text>
      </View>
      <View style={[venueStyles.row, venueStyles.front, rowStyle('front')]}>
        <Text style={venueStyles.rowText}>FRONT ROW</Text>
      </View>
      <View style={venueStyles.stage}>
        <Text style={venueStyles.stageText}>★ STAGE ★</Text>
      </View>
    </View>
  );
}

export function BiddingFloorScreen({ navigation, route }: ScreenProps<'BiddingFloor'>): React.JSX.Element {
  const { league, tierLevel, creditsEarned, answeredQuestions, liveEventId, liveEventName, liveBonusActive } =
    route.params;

  // The event and rival lineup are fixed for the round.
  const event = useMemo<GameEvent>(
    () => buildGameEvent(league, tierLevel, liveBonusActive),
    [league, tierLevel, liveBonusActive],
  );
  const aiBidders = useMemo<AiBidder[]>(
    () => generateAiBidders(tierLevel, creditsEarned),
    [tierLevel, creditsEarned],
  );

  const [allocation, setAllocation] = useState<BidAllocation>({ front: 0, mid: 0, upper: 0 });
  // Teaser bars: drift every couple seconds toward each bidder's aggression
  // so the floor feels alive without leaking exact bids.
  const [teaser, setTeaser] = useState<number[]>(() => aiBidders.map((b) => b.aggression * 0.5));

  useEffect(() => {
    const interval = setInterval(() => {
      setTeaser(
        aiBidders.map(
          (bidder) => Math.min(1, Math.max(0.1, bidder.aggression + (Math.random() - 0.5) * 0.3)),
        ),
      );
    }, 1800);
    return () => clearInterval(interval);
  }, [aiBidders]);

  const totalAllocated: number = SEAT_TIERS.reduce((sum, tier) => sum + allocation[tier], 0);
  const remaining: number = creditsEarned - totalAllocated;

  const setBid = (tier: SeatTier, value: number): void => {
    const rounded: number = Math.round(value);
    const otherTotal: number = totalAllocated - allocation[tier];
    // Never let the combined allocation exceed the player's credits.
    const clamped: number = Math.min(rounded, creditsEarned - otherTotal);
    setAllocation((previous) => ({ ...previous, [tier]: Math.max(0, clamped) }));
  };

  const lockInBids = (): void => {
    const auction = resolveAuction(allocation, aiBidders);
    if (auction.playerBestSeat !== null) {
      playSound('cheer');
    }
    navigation.replace('Results', {
      league,
      tierLevel,
      event,
      auction,
      creditsEarned,
      answeredQuestions,
      liveEventId,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.kicker}>THE BIDDING FLOOR</Text>
        <Text style={styles.eventName}>{liveEventName ?? event.name}</Text>
        <Text style={styles.eventMeta}>
          {event.venue} · {LEAGUE_LABELS[league]} · Tier {tierLevel}
        </Text>

        <VenueDiagram allocation={allocation} credits={creditsEarned} />

        <View style={styles.walletRow}>
          <Text style={styles.walletLabel}>YOUR CREDITS</Text>
          <Text style={styles.walletValue}>
            ⚡ {remaining.toLocaleString()} <Text style={styles.walletTotal}>/ {creditsEarned.toLocaleString()}</Text>
          </Text>
        </View>

        <Text style={styles.sectionLabel}>RIVAL BIDDERS</Text>
        <View style={styles.biddersRow}>
          {aiBidders.map((bidder, index) => (
            <BidderCard key={bidder.id} bidder={bidder} visibleCommitment={teaser[index] ?? 0.3} />
          ))}
        </View>

        <Text style={styles.sectionLabel}>PLACE YOUR BIDS</Text>
        {SEAT_TIERS.map((tier: SeatTier) => (
          <View key={tier} style={styles.bidBlock}>
            <View style={styles.bidHeader}>
              <Text style={styles.bidTierName}>
                {TIER_EMOJIS[tier]} {SEAT_TIER_LABELS[tier]}
              </Text>
              <Text style={styles.bidAmount}>{allocation[tier].toLocaleString()} cr</Text>
            </View>
            <Slider
              minimumValue={0}
              maximumValue={Math.max(1, creditsEarned)}
              step={creditsEarned > 0 ? Math.max(1, Math.round(creditsEarned / 100)) : 1}
              value={allocation[tier]}
              onValueChange={(value: number) => setBid(tier, value)}
              minimumTrackTintColor={colors.pink}
              maximumTrackTintColor={colors.surfaceLight}
              thumbTintColor={colors.yellow}
              disabled={creditsEarned === 0}
            />
          </View>
        ))}

        {creditsEarned === 0 ? (
          <Text style={styles.brokeNote}>
            No credits this round — lock in to watch the auction play out, then run it back.
          </Text>
        ) : (
          <Text style={styles.hint}>
            Unspent credits are kept, but they don&apos;t win seats. Losing bids are refunded.
          </Text>
        )}

        <GlowButton label="LOCK IN BIDS 🔨" onPress={lockInBids} style={styles.lockButton} />
      </ScrollView>
    </SafeAreaView>
  );
}

const venueStyles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
    gap: 6,
  },
  row: {
    borderRadius: radii.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    paddingVertical: 7,
  },
  upper: {
    marginHorizontal: 0,
  },
  mid: {
    marginHorizontal: spacing.lg,
  },
  front: {
    marginHorizontal: spacing.xl + spacing.sm,
  },
  rowText: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  stage: {
    backgroundColor: colors.yellow,
    borderRadius: radii.sm,
    alignItems: 'center',
    paddingVertical: 6,
    marginHorizontal: spacing.xl * 2,
  },
  stageText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  kicker: {
    color: colors.pink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  eventName: {
    ...typography.title,
    color: colors.white,
    marginTop: 2,
  },
  eventMeta: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  walletLabel: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  walletValue: {
    color: colors.yellow,
    fontSize: 18,
    fontWeight: '900',
  },
  walletTotal: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionLabel: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  biddersRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    marginHorizontal: -spacing.xs,
  },
  bidBlock: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  bidTierName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  bidAmount: {
    color: colors.yellow,
    fontSize: 14,
    fontWeight: '900',
  },
  hint: {
    color: colors.textDim,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  brokeNote: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  lockButton: {
    marginTop: spacing.md,
  },
});
