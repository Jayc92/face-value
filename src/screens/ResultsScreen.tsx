import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Confetti } from '../components/Confetti';
import { GlowButton } from '../components/GlowButton';
import { LEAGUE_LABELS } from '../game/events';
import { useGame } from '../game/GameContext';
import { ScreenProps } from '../game/navigation';
import { SEAT_TIER_LABELS, SeatTierResult, Ticket } from '../game/types';
import { colors, radii, spacing, typography } from '../utils/theme';

export function ResultsScreen({ navigation, route }: ScreenProps<'Results'>): React.JSX.Element {
  const { league, tierLevel, event, auction, creditsEarned, answeredQuestions, liveEventId } =
    route.params;
  const { addTicket, markLiveEventCompleted } = useGame();

  const wonFrontRow: boolean = auction.playerBestSeat === 'front';
  const wonAnySeat: boolean = auction.playerBestSeat !== null;
  const creditsKept: number = creditsEarned - auction.creditsSpent;
  const correctCount: number = answeredQuestions.filter((answer) => answer.wasCorrect).length;

  const [vaultStatus, setVaultStatus] = useState<'pending' | 'saved'>('pending');
  // Guard against double-saving on re-render (e.g. fast refresh).
  const savedRef = useRef<boolean>(false);

  useEffect(() => {
    if (savedRef.current) {
      return;
    }
    savedRef.current = true;

    // The round counts as completing the day's Live Event even on a loss.
    if (liveEventId) {
      markLiveEventCompleted(liveEventId);
    }

    if (auction.playerBestSeat !== null) {
      const ticket: Ticket = {
        id: `ticket-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        eventName: event.name,
        venue: event.venue,
        league,
        seatTier: auction.playerBestSeat,
        tierLevel,
        dateWonIso: new Date().toISOString(),
        creditsPaid: auction.creditsSpent,
        wasLiveEvent: event.isLiveEvent,
      };
      addTicket(ticket).then(() => setVaultStatus('saved'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recapFacts = answeredQuestions.filter((answer) => answer.wasCorrect).slice(0, 3);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.kicker}>{wonAnySeat ? 'SEAT CLAIMED' : 'OUTBID'}</Text>
        <Text style={styles.headline}>
          {wonFrontRow
            ? '🏆 FRONT ROW!'
            : wonAnySeat
              ? `🎟️ ${SEAT_TIER_LABELS[auction.playerBestSeat!]}!`
              : '😤 The rivals took it all'}
        </Text>
        <Text style={styles.eventName}>
          {event.name} · {event.venue}
        </Text>
        <Text style={styles.eventMeta}>
          {LEAGUE_LABELS[league]} · Tier {tierLevel}
        </Text>

        <View style={styles.auctionCard}>
          {auction.perTier.map((result: SeatTierResult) => (
            <View key={result.seatTier} style={styles.auctionRow}>
              <Text style={styles.auctionTier}>{SEAT_TIER_LABELS[result.seatTier]}</Text>
              <Text
                style={[
                  styles.auctionWinner,
                  result.winnerId === 'player' && styles.auctionWinnerPlayer,
                ]}
              >
                {result.winnerId === 'player' ? '🎉 You' : result.winnerName}
                {result.winnerId !== null && ` · ${result.winningBid.toLocaleString()} cr`}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{correctCount}/10</Text>
            <Text style={styles.statLabel}>CORRECT</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>⚡ {creditsKept.toLocaleString()}</Text>
            <Text style={styles.statLabel}>CREDITS KEPT</Text>
          </View>
        </View>

        {wonAnySeat && (
          <Text style={styles.vaultNote}>
            {vaultStatus === 'saved'
              ? '✅ Ticket added to your Vault'
              : 'Adding ticket to your Vault…'}
          </Text>
        )}

        {recapFacts.length > 0 && (
          <View style={styles.factsCard}>
            <Text style={styles.factsTitle}>💡 FROM TONIGHT&apos;S SET</Text>
            {recapFacts.map((answer) => (
              <Text key={answer.question.id} style={styles.factText}>
                • {answer.question.funFact}
              </Text>
            ))}
          </View>
        )}

        <GlowButton
          label="PLAY ANOTHER ROUND"
          onPress={() => navigation.replace('LeagueSelect', {})}
          style={styles.button}
        />
        <GlowButton
          label="VIEW TICKET VAULT"
          variant="secondary"
          onPress={() => navigation.navigate('TicketVault')}
          style={styles.button}
        />
        <GlowButton
          label="Home"
          variant="ghost"
          onPress={() => navigation.popToTop()}
          style={styles.button}
        />
      </ScrollView>
      {wonFrontRow && <Confetti />}
    </SafeAreaView>
  );
}

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
    textAlign: 'center',
    marginTop: spacing.md,
  },
  headline: {
    ...typography.display,
    fontSize: 34,
    color: colors.yellow,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  eventName: {
    color: colors.white,
    ...typography.subtitle,
    textAlign: 'center',
  },
  eventMeta: {
    color: colors.textDim,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  auctionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  auctionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  auctionTier: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '700',
  },
  auctionWinner: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  auctionWinnerPlayer: {
    color: colors.success,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    color: colors.yellow,
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  vaultNote: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  factsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  factsTitle: {
    color: colors.pink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  factText: {
    color: colors.textDim,
    fontSize: 13,
    lineHeight: 19,
  },
  button: {
    marginTop: spacing.sm,
  },
});
