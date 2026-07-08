import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Confetti } from '../components/Confetti';
import { Panel } from '../components/Panel';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { SpotlightHalo } from '../components/SpotlightHalo';
import { TicketReveal } from '../components/TicketReveal';
import { explainAuction } from '../game/auctionExplain';
import { LEAGUE_LABELS } from '../game/events';
import { useGame } from '../game/GameContext';
import { ScreenProps } from '../game/navigation';
import { toLocalDateString } from '../game/streaks';
import {
  AnsweredQuestion,
  MEDAL_LABELS,
  Medal,
  RetentionDelta,
  RoundOutcome,
  SEAT_TIER_LABELS,
  SeatTier,
  SeatTierResult,
  Ticket,
} from '../game/types';
import { getPreferences } from '../utils/preferences';
import {
  formatDuration,
  recordRound,
  SessionRoundSummary,
} from '../utils/sessionLog';
import { playSound } from '../utils/sounds';
import { palette, radii, seatAccents, spacing } from '../utils/theme';

const SEAT_RANK: Record<SeatTier, number> = { front: 0, mid: 1, upper: 2 };

/** Max consecutive `wasCorrect` streak within the round. */
function computeBestCombo(answered: AnsweredQuestion[]): number {
  let best: number = 0;
  let current: number = 0;
  for (const a of answered) {
    if (a.wasCorrect) {
      current += 1;
      if (current > best) {
        best = current;
      }
    } else {
      current = 0;
    }
  }
  return best;
}

const MEDAL_COLORS: Record<Medal, string> = {
  none: palette.textLow,
  bronze: '#C48A5D',
  silver: '#C9C9D6',
  gold: palette.yellow,
  platinum: '#7FE7FF',
};

export function ResultsScreen({ navigation, route }: ScreenProps<'Results'>): React.JSX.Element {
  const {
    roundId,
    league,
    tierLevel,
    event,
    auction,
    creditsEarned,
    answeredQuestions,
    liveEventId,
    roundStartedAtMs,
  } = route.params;
  const { addTicket, markLiveEventCompleted, applyRound, hasProcessedRound, tickets } = useGame();

  const wonFrontRow: boolean = auction.playerBestSeat === 'front';
  const wonAnySeat: boolean = auction.playerBestSeat !== null;
  const creditsKept: number = creditsEarned - auction.creditsSpent;
  const correctCount: number = answeredQuestions.filter((answer) => answer.wasCorrect).length;

  const [showRecap, setShowRecap] = useState<boolean>(false);
  const [showSessionSummary, setShowSessionSummary] = useState<boolean>(false);
  const [sessionSummary, setSessionSummary] = useState<SessionRoundSummary | null>(null);
  const [retentionDelta, setRetentionDelta] = useState<RetentionDelta | null>(null);
  const savedRef = useRef<boolean>(false);

  // Ticket id is derived from the stable roundId so a remount that
  // re-adds the same ticket dedupes in the vault (see addTicket).
  // correctCount / totalQuestions / bestCombo are stored so the ticket's
  // rarity stays deterministic forever.
  const claimedTicket: Ticket | null = wonAnySeat
    ? {
        id: `ticket-${roundId}`,
        eventName: event.name,
        venue: event.venue,
        league,
        seatTier: auction.playerBestSeat!,
        tierLevel,
        dateWonIso: new Date().toISOString(),
        creditsPaid: auction.creditsSpent,
        wasLiveEvent: event.isLiveEvent,
        correctCount,
        totalQuestions: answeredQuestions.length,
        bestCombo: computeBestCombo(answeredQuestions),
      }
    : null;

  useEffect(() => {
    if (savedRef.current) {
      return;
    }
    savedRef.current = true;

    // If this round was already folded into the profile (e.g. the player
    // navigated back to a still-mounted Results, or a reload replayed the
    // effect), don't re-apply anything and don't re-celebrate.
    const seenBefore: boolean = hasProcessedRound(roundId);

    if (liveEventId) {
      markLiveEventCompleted(liveEventId);
    }
    if (claimedTicket) {
      // addTicket is itself idempotent on ticket id.
      addTicket(claimedTicket);
    }

    // Local session summary (in-memory, non-persistent) — observational
    // tooling only. recordRound is idempotent on roundId.
    setSessionSummary(
      recordRound({
        roundId,
        league,
        tierLevel,
        correctCount,
        totalQuestions: answeredQuestions.length,
        creditsEarned,
        seatWon: auction.playerBestSeat,
        roundStartedAtMs: roundStartedAtMs ?? null,
        completedAtMs: Date.now(),
      }),
    );

    const outcome: RoundOutcome = {
      roundId,
      league,
      tierLevel,
      correctCount,
      totalQuestions: answeredQuestions.length,
      creditsEarned,
      bestComboThisRound: computeBestCombo(answeredQuestions),
      seatWon: auction.playerBestSeat,
      wasLiveEvent: event.isLiveEvent,
      // A live-event-in-window round is one where the caller passed
      // liveEventId (round started inside the live 2x window).
      liveEventCompletedInWindow: Boolean(liveEventId) && event.isLiveEvent,
      completedOnLocalDate: toLocalDateString(Date.now()),
    };
    // applyRound returns { alreadyProcessed: true } when the guard trips;
    // in that case the callouts panel renders nothing new.
    applyRound(outcome).then((delta) => {
      setRetentionDelta(seenBefore ? { ...delta, alreadyProcessed: true } : delta);
      if (!seenBefore && !delta.alreadyProcessed) {
        // Reward cues, staggered after the ticket reveal's shimmer so they
        // don't stack on top of each other. playSound respects the toggle.
        if (delta.completedChallengeTitles.length > 0) {
          setTimeout(() => playSound('challenge'), 1200);
        }
        if (delta.unlockedAchievements.length > 0) {
          setTimeout(() => playSound('achievement'), 1500);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recapFacts = answeredQuestions.filter((answer) => answer.wasCorrect).slice(0, 5);

  const orderedTiers: SeatTierResult[] = [...auction.perTier].sort(
    (a, b) => SEAT_RANK[a.seatTier] - SEAT_RANK[b.seatTier],
  );

  const explanation: string[] = explainAuction(auction, tierLevel, creditsEarned);

  // Copy tuned to performance, not just outcome — so a 2/10 player who
  // squeaks into Upper doesn't get a falsely triumphant headline.
  const performanceTone: 'strong' | 'okay' | 'weak' =
    correctCount >= 7 ? 'strong' : correctCount >= 4 ? 'okay' : 'weak';

  const kicker: string = wonFrontRow
    ? 'FRONT ROW SECURED'
    : wonAnySeat
      ? performanceTone === 'weak'
        ? 'YOU SQUEAKED IN'
        : 'SEAT CLAIMED'
      : 'OUTBID — RUN IT BACK';

  const headline: string = wonFrontRow
    ? performanceTone === 'strong'
      ? 'You took the floor.'
      : 'You stole it.'
    : wonAnySeat
      ? performanceTone === 'weak'
        ? `Upgrade next round — study up, climb closer.`
        : `You're in. ${SEAT_TIER_LABELS[auction.playerBestSeat!]}.`
      : performanceTone === 'weak'
        ? 'Rough night on trivia. Run another set.'
        : 'The rivals walked away with it.';

  const performanceStrip: string =
    performanceTone === 'strong'
      ? 'Trivia round: strong'
      : performanceTone === 'okay'
        ? 'Trivia round: solid'
        : 'Trivia round: rough';

  return (
    <ScreenShell scroll>
      {wonAnySeat ? (
        <SpotlightHalo
          color={wonFrontRow ? palette.yellow : seatAccents[auction.playerBestSeat!].line}
          intensity={wonFrontRow ? 1 : 0.7}
        />
      ) : null}

      <View style={styles.headerBlock}>
        <Text
          style={[
            styles.kicker,
            {
              color: wonFrontRow
                ? palette.yellow
                : wonAnySeat
                  ? palette.pinkSoft
                  : palette.textMed,
            },
          ]}
        >
          {kicker}
        </Text>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.subhead}>
          {performanceStrip} · {correctCount}/{answeredQuestions.length} correct
        </Text>
      </View>

      {claimedTicket ? (
        <View style={styles.ticketWrap}>
          <TicketReveal ticket={claimedTicket} />
        </View>
      ) : (
        <View style={styles.noTicketWrap}>
          <Panel variant="raised" style={styles.noTicketCard}>
            <Text style={styles.noTicketKicker}>{event.name}</Text>
            <Text style={styles.noTicketTitle}>No seat this round.</Text>
            <Text style={styles.noTicketBody}>
              You keep your credits.{' '}
              {performanceTone === 'weak'
                ? 'Better trivia means a fatter budget — take another set.'
                : 'The reserve was tough tonight — try smarter allocation next round.'}
            </Text>
          </Panel>
        </View>
      )}

      {/* Retention callouts — new medal, PBs, streak. Rendered above the
          primary CTA so the celebration lands before the next action. */}
      {retentionDelta ? (
        <RetentionCallouts delta={retentionDelta} />
      ) : null}

      {/* Primary CTA stack — kept above the auction breakdown so the next
          action is visible in the first viewport. */}
      <View style={styles.primaryCtas}>
        {(() => {
          const primary = deriveResultsPrimaryCta({
            wonAnySeat,
            justUnlockedTier2: tickets.length === 3 && wonAnySeat && tierLevel === 1,
          });
          return (
            <PrimaryButton
              label={primary.label}
              trailing="→"
              onPress={() => {
                if (primary.route === 'league-tier-2') {
                  navigation.replace('LeagueSelect', {});
                } else {
                  navigation.replace('LeagueSelect', { forcedLeague: league });
                }
              }}
            />
          );
        })()}
        <View style={styles.secondaryCtaRow}>
          <PrimaryButton
            label={retentionDelta?.medalUpgraded || (retentionDelta?.personalBests.length ?? 0) > 0 ? 'View records' : 'Vault'}
            variant="secondary"
            size="md"
            onPress={() => navigation.navigate('TicketVault')}
            style={styles.secondaryFlex}
          />
          <PrimaryButton
            label="Home"
            variant="ghost"
            size="md"
            onPress={() => navigation.popToTop()}
            style={styles.secondaryFlex}
          />
        </View>
      </View>

      {/* Achievement unlocks + daily-challenge completions from this round */}
      {retentionDelta && !retentionDelta.alreadyProcessed
        ? retentionDelta.unlockedAchievements.map((achievement) => (
            <View key={achievement.id} style={[styles.rewardRow, styles.achievementRow]}>
              <Text style={styles.rewardKicker}>ACHIEVEMENT UNLOCKED</Text>
              <Text style={styles.rewardTitle}>{achievement.title}</Text>
              <Text style={styles.rewardDetail}>{achievement.description}</Text>
            </View>
          ))
        : null}
      {retentionDelta && !retentionDelta.alreadyProcessed
        ? retentionDelta.completedChallengeTitles.map((title) => (
            <View key={title} style={[styles.rewardRow, styles.challengeRow]}>
              <Text style={[styles.rewardKicker, { color: palette.success }]}>
                DAILY CHALLENGE COMPLETE
              </Text>
              <Text style={styles.rewardTitle}>{title}</Text>
            </View>
          ))
        : null}

      {/* Auction breakdown — secondary detail */}
      <Panel variant="raised" style={styles.auctionCard}>
        <Text style={styles.sectionKicker}>Auction breakdown</Text>
        {orderedTiers.map((result: SeatTierResult) => {
          const tierAccent = seatAccents[result.seatTier];
          const winnerIsPlayer: boolean = result.winnerId === 'player';
          const unsold: boolean = result.winnerId === null;
          return (
            <View key={result.seatTier} style={styles.auctionRow}>
              <View style={[styles.auctionStripe, { backgroundColor: tierAccent.line }]} />
              <View style={styles.auctionTextBlock}>
                <Text style={[styles.auctionTier, { color: tierAccent.label }]}>
                  {SEAT_TIER_LABELS[result.seatTier]}
                </Text>
                <Text style={styles.auctionWinner}>
                  {unsold ? 'No sale' : winnerIsPlayer ? 'You' : result.winnerName}
                </Text>
              </View>
              <View style={styles.auctionBidColumn}>
                <Text
                  style={[
                    styles.auctionBid,
                    winnerIsPlayer && { color: palette.success },
                    unsold && { color: palette.textLow },
                  ]}
                >
                  {unsold ? '—' : `${result.winningBid.toLocaleString()} cr`}
                </Text>
                {!unsold && result.playerBid > 0 && !winnerIsPlayer ? (
                  <Text style={styles.auctionYourBid}>
                    yours · {result.playerBid.toLocaleString()}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}

        {explanation.length > 0 ? (
          <View style={styles.whatHappened}>
            <Text style={styles.whatHappenedKicker}>What happened</Text>
            {explanation.map((line, index) => (
              <Text key={index} style={styles.whatHappenedLine}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}
      </Panel>

      {/* Compact stats — single row */}
      <View style={styles.statRow}>
        <View style={styles.statCell}>
          <Text style={styles.statKicker}>SPENT</Text>
          <Text style={styles.statValue}>{auction.creditsSpent.toLocaleString()}</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statKicker}>KEPT</Text>
          <Text style={[styles.statValue, { color: palette.yellow }]}>
            {creditsKept.toLocaleString()}
          </Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statKicker}>EARNED</Text>
          <Text style={styles.statValue}>{creditsEarned.toLocaleString()}</Text>
        </View>
      </View>

      {/* Collapsible fun-fact recap */}
      {recapFacts.length > 0 ? (
        <Pressable
          onPress={() => setShowRecap((value) => !value)}
          style={styles.recapToggle}
          accessibilityRole="button"
        >
          <Text style={styles.recapToggleText}>
            {showRecap ? '▾' : '▸'}  From tonight&apos;s set  ·  {recapFacts.length}
          </Text>
          <Text style={styles.recapToggleHint}>
            {showRecap ? 'Hide' : 'View'}
          </Text>
        </Pressable>
      ) : null}
      {showRecap && recapFacts.length > 0 ? (
        <Panel variant="raised" style={styles.factsCard}>
          {recapFacts.map((answer, index) => (
            <View key={answer.question.id} style={styles.factRow}>
              <Text style={styles.factIndex}>0{index + 1}</Text>
              <Text style={styles.factText}>{answer.question.funFact}</Text>
            </View>
          ))}
        </Panel>
      ) : null}

      {/* Optional local session summary — a compact recap for the player
          (and for a playtest observer). In-memory only, no persistence. */}
      {sessionSummary ? (
        <Pressable
          onPress={() => setShowSessionSummary((value) => !value)}
          style={styles.recapToggle}
          accessibilityRole="button"
          accessibilityLabel="Toggle session summary"
        >
          <Text style={styles.recapToggleText}>
            {showSessionSummary ? '▾' : '▸'}  Session summary
          </Text>
          <Text style={styles.recapToggleHint}>{showSessionSummary ? 'Hide' : 'View'}</Text>
        </Pressable>
      ) : null}
      {showSessionSummary && sessionSummary ? (
        <Panel variant="raised" style={styles.summaryCard}>
          <SummaryRow
            label="Correct answers"
            value={`${sessionSummary.correctCount}/${sessionSummary.totalQuestions}`}
          />
          <SummaryRow label="Credits earned" value={sessionSummary.creditsEarned.toLocaleString()} />
          <SummaryRow
            label="Seat won"
            value={sessionSummary.seatWon ? SEAT_TIER_LABELS[sessionSummary.seatWon] : 'None'}
          />
          <SummaryRow label="Time spent" value={formatDuration(sessionSummary.timeSpentMs)} />
          <SummaryRow
            label="Attempt this session"
            value={`#${sessionSummary.retryCount} · ${LEAGUE_LABELS[sessionSummary.league]} T${sessionSummary.tierLevel}`}
          />
        </Panel>
      ) : null}

      {wonFrontRow && performanceTone === 'strong' && !getPreferences().reduceMotion ? (
        <Confetti />
      ) : null}

      <Text style={styles.contextStrip}>
        {LEAGUE_LABELS[league]} · Tier {tierLevel} · {event.venue}
      </Text>
    </ScreenShell>
  );
}

/** Simple deterministic CTA picker; keeps replay flow tight. */
interface PrimaryCta {
  label: string;
  route: 'league-same' | 'league-tier-2';
}

function deriveResultsPrimaryCta(input: {
  wonAnySeat: boolean;
  justUnlockedTier2: boolean;
}): PrimaryCta {
  if (input.justUnlockedTier2) {
    return { label: 'Play Tier 2', route: 'league-tier-2' };
  }
  if (!input.wonAnySeat) {
    return { label: 'Run it back', route: 'league-same' };
  }
  return { label: 'Play again', route: 'league-same' };
}

interface RetentionCalloutsProps {
  delta: RetentionDelta;
}

function RetentionCallouts({ delta }: RetentionCalloutsProps): React.JSX.Element | null {
  // Never re-celebrate an already-processed round (remount / reload).
  if (delta.alreadyProcessed) {
    return null;
  }

  const rows: Array<{ tone: string; label: string; value: string; color: string }> = [];

  if (delta.medalUpgraded && delta.newMedal !== 'none') {
    rows.push({
      tone: 'MEDAL',
      label: `New ${MEDAL_LABELS[delta.newMedal]} medal`,
      value: delta.priorMedal === 'none' ? 'Unlocked' : `Up from ${MEDAL_LABELS[delta.priorMedal]}`,
      color: MEDAL_COLORS[delta.newMedal],
    });
  } else if (!delta.medalUpgraded && delta.newMedal !== 'none') {
    rows.push({
      tone: 'MEDAL',
      label: `Best medal retained · ${MEDAL_LABELS[delta.newMedal]}`,
      value: 'Chase the next tier of gear',
      color: MEDAL_COLORS[delta.newMedal],
    });
  }

  if (delta.streakEvent.kind === 'incremented') {
    rows.push({
      tone: 'STREAK',
      label: delta.streakEvent.longestUpdated ? 'Longest streak yet' : 'Streak secured',
      value: `${delta.streakEvent.to} day${delta.streakEvent.to === 1 ? '' : 's'}`,
      color: palette.yellow,
    });
  } else if (delta.streakEvent.kind === 'reset') {
    rows.push({
      tone: 'STREAK',
      label: 'Streak restarted',
      value: 'Day 1 of a new run',
      color: palette.pinkSoft,
    });
  } else if (delta.streakEvent.kind === 'already-claimed') {
    rows.push({
      tone: 'STREAK',
      label: 'Daily already claimed',
      value: `Current streak · ${delta.streakEvent.current} day${delta.streakEvent.current === 1 ? '' : 's'}`,
      color: palette.textMed,
    });
  }

  // Personal bests (excluding the synthetic medal row if any)
  const pbsToShow = delta.personalBests.filter((pb) => pb.key !== 'seatTier' || pb.label !== 'New medal');
  for (const pb of pbsToShow.slice(0, 4)) {
    rows.push({ tone: 'PB', label: pb.label, value: pb.value, color: palette.success });
  }

  if (rows.length === 0) {
    return null;
  }

  // Sort so medals come first, then streak, then PBs (already in that order).
  return (
    <Panel variant="raised" style={styles.calloutsCard}>
      {rows.map((row, index) => (
        <View key={`${row.tone}-${index}`} style={styles.calloutRow}>
          <View style={[styles.calloutStripe, { backgroundColor: row.color }]} />
          <View style={styles.calloutText}>
            <Text style={[styles.calloutLabel, { color: row.color }]}>
              {row.label}
            </Text>
            <Text style={styles.calloutValue}>{row.value}</Text>
          </View>
        </View>
      ))}
    </Panel>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    gap: 4,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.4,
  },
  headline: {
    color: palette.textHi,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
    lineHeight: 30,
  },
  subhead: {
    color: palette.textMed,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  ticketWrap: {
    marginBottom: spacing.md,
  },
  calloutsCard: {
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  calloutStripe: {
    width: 3,
    height: 26,
    borderRadius: 2,
  },
  calloutText: {
    flex: 1,
    gap: 2,
  },
  calloutLabel: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  calloutValue: {
    color: palette.textMed,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  noTicketWrap: {
    marginBottom: spacing.md,
  },
  noTicketCard: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  noTicketKicker: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  noTicketTitle: {
    color: palette.textHi,
    fontSize: 20,
    fontWeight: '900',
  },
  noTicketBody: {
    color: palette.textMed,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  primaryCtas: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  secondaryCtaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryFlex: {
    flex: 1,
  },
  rewardRow: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
    gap: 2,
  },
  achievementRow: {
    borderColor: palette.yellow,
    backgroundColor: 'rgba(255, 233, 77, 0.06)',
  },
  challengeRow: {
    borderColor: palette.success,
    backgroundColor: 'rgba(61, 220, 132, 0.06)',
  },
  rewardKicker: {
    color: palette.yellow,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  rewardTitle: {
    color: palette.textHi,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  rewardDetail: {
    color: palette.textMed,
    fontSize: 12,
    fontWeight: '600',
  },
  auctionCard: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    gap: 2,
    marginBottom: spacing.md,
  },
  sectionKicker: {
    color: palette.textLow,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginBottom: 4,
    paddingTop: 4,
  },
  auctionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
  },
  auctionStripe: {
    width: 3,
    height: 24,
    borderRadius: 2,
  },
  auctionTextBlock: {
    flex: 1,
    gap: 2,
  },
  auctionTier: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  auctionWinner: {
    color: palette.textHi,
    fontSize: 13,
    fontWeight: '700',
  },
  auctionBidColumn: {
    alignItems: 'flex-end',
  },
  auctionBid: {
    color: palette.textHi,
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  auctionYourBid: {
    color: palette.textLow,
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  whatHappened: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
    gap: 4,
  },
  whatHappenedKicker: {
    color: palette.textLow,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  whatHappenedLine: {
    color: palette.textMed,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCell: {
    flex: 1,
    backgroundColor: palette.panel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  statKicker: {
    color: palette.textLow,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  statValue: {
    color: palette.textHi,
    fontSize: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  recapToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  recapToggleText: {
    color: palette.textMed,
    fontSize: 13,
    fontWeight: '800',
  },
  recapToggleHint: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '700',
  },
  factsCard: {
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 3,
  },
  summaryLabel: {
    color: palette.textLow,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryValue: {
    color: palette.textHi,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  factRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  factIndex: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    width: 18,
  },
  factText: {
    flex: 1,
    color: palette.textMed,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  contextStrip: {
    color: palette.textLow,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
