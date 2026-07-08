import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CountdownHeader } from '../components/CountdownHeader';
import { HowToPlay } from '../components/HowToPlay';
import { LeagueBadge } from '../components/LeagueBadge';
import { LeagueCard } from '../components/LeagueCard';
import { Panel } from '../components/Panel';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { SectionHeader } from '../components/SectionHeader';
import { VenueBackdrop } from '../components/VenueBackdrop';
import { Wordmark } from '../components/Wordmark';
import {
  dailyLiveEventForDate,
  LEAGUE_LABELS,
  LEAGUES,
  recentLiveEvents,
} from '../game/events';
import { challengeStatuses } from '../game/challenges';
import { useGame } from '../game/GameContext';
import { deriveChaseGoals } from '../game/goals';
import { ScreenProps } from '../game/navigation';
import { toLocalDateString } from '../game/streaks';
import {
  ChaseGoal,
  DailyChallengeStatus,
  DailyLiveEvent,
  League,
  TierLevel,
} from '../game/types';
import { perfectResultsRouteParams } from '../utils/devFixtures';
import { LEAGUE_VISUALS } from '../utils/leagueVisuals';
import {
  loadOnboardingComplete,
  saveOnboardingComplete,
} from '../utils/storage';
import { palette, radii, shadows, spacing } from '../utils/theme';

const PLAYABLE_TIERS: TierLevel[] = [1, 2];

/**
 * Dev fixtures like the "dev · 10/10" chip are gated by BOTH __DEV__ and
 * an explicit env flag. Expo Go demos run in dev mode too, so we don't
 * want the chip to appear during external testing — set
 * EXPO_PUBLIC_ENABLE_DEV_FIXTURES=true in your local env only.
 */
const ENABLE_DEV_FIXTURES: boolean =
  __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DEV_FIXTURES === 'true';

export function HomeScreen({ navigation }: ScreenProps<'Home'>): React.JSX.Element {
  const { fanScore, tickets, completedLiveEventIds, collectionCompletion, playerProfile, isHydrating } =
    useGame();
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [showReplays, setShowReplays] = useState<boolean>(false);

  // Onboarding: null = unknown (still loading the flag). Once resolved we
  // either show the briefing (first run) or don't. Replays open it manually.
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [howToPlayVisible, setHowToPlayVisible] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load the onboarding flag once the app has hydrated its storage.
  useEffect(() => {
    if (isHydrating) {
      return;
    }
    let cancelled = false;
    loadOnboardingComplete().then((complete) => {
      if (cancelled) {
        return;
      }
      setOnboardingComplete(complete);
      if (!complete) {
        setHowToPlayVisible(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isHydrating]);

  const finishOnboarding = (): void => {
    setHowToPlayVisible(false);
    if (!onboardingComplete) {
      setOnboardingComplete(true);
      saveOnboardingComplete(true).catch((error) =>
        console.error('Failed to persist onboarding flag', error),
      );
    }
  };

  const liveEvent: DailyLiveEvent = useMemo(() => dailyLiveEventForDate(new Date(nowMs)), [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    new Date(nowMs).toDateString(),
  ]);

  const liveEventCompleted: boolean = completedLiveEventIds.includes(liveEvent.id);
  const liveAccent = LEAGUE_VISUALS[liveEvent.league];

  const replayEvents: DailyLiveEvent[] = useMemo(
    () =>
      recentLiveEvents(new Date(nowMs), 5).filter(
        (event) => !completedLiveEventIds.includes(event.id),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [new Date(nowMs).toDateString(), completedLiveEventIds],
  );

  const ticketsInLeague = (league: League): number =>
    tickets.filter((ticket) => ticket.league === league).length;

  const today: string = useMemo(() => toLocalDateString(nowMs), [nowMs]);
  const streakClaimedToday: boolean = playerProfile.lastDailyPlayDate === today;

  const chaseGoals: ChaseGoal[] = useMemo(
    () =>
      deriveChaseGoals({
        profile: playerProfile,
        today,
        todaysLiveEventLeague: liveEvent.league,
        todaysLiveEventCompleted: liveEventCompleted,
        playableTiers: PLAYABLE_TIERS,
      }),
    [playerProfile, today, liveEvent.league, liveEventCompleted],
  );

  const dailyChallenges: DailyChallengeStatus[] = useMemo(
    () => challengeStatuses(playerProfile, today),
    [playerProfile, today],
  );

  const startLiveEvent = (event: DailyLiveEvent, bonusActive: boolean): void => {
    navigation.navigate('LeagueSelect', {
      forcedLeague: event.league,
      liveEventId: event.id,
      liveEventName: event.name,
      liveBonusActive: bonusActive,
    });
  };

  return (
    <ScreenShell scroll>
      <HowToPlay
        visible={howToPlayVisible}
        onClose={finishOnboarding}
        finishLabel={onboardingComplete ? 'Got it' : 'Enter'}
      />

      {/* Atmospheric backdrop fills the top of the page, well behind content. */}
      <VenueBackdrop height={420} />

      {/* Status header: wordmark left, integrated Fan Score + Vault right.
          Replaces the "two dashboard cards" pattern from the first pass. */}
      <View style={styles.headerBlock}>
        <View style={styles.headerTop}>
          <Wordmark size="sm" />
          <View style={styles.headerRightGroup}>
            {ENABLE_DEV_FIXTURES ? (
              <Pressable
                onPress={() => navigation.navigate('Results', perfectResultsRouteParams())}
                style={styles.devChip}
                accessibilityLabel="Dev: simulate perfect round"
              >
                <Text style={styles.devChipText}>dev · 10/10</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => navigation.navigate('TicketVault')}
              style={styles.vaultChip}
              accessibilityLabel="Open Ticket Vault"
            >
              <View style={styles.vaultDot} />
              <Text style={styles.vaultChipText}>Vault</Text>
              <Text style={styles.vaultChipCount}>{tickets.length}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statusLine}>
          <View style={styles.statusItem}>
            <Text style={styles.statusItemLabel}>Fan</Text>
            <Text style={styles.statusItemValue}>{fanScore}</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <Text style={styles.statusItemLabel}>Streak</Text>
            <Text
              style={[
                styles.statusItemValue,
                playerProfile.currentDailyStreak > 0 && { color: palette.yellow },
              ]}
            >
              {playerProfile.currentDailyStreak}
              {playerProfile.currentDailyStreak > 0 ? (
                <Text style={styles.statusItemUnit}>d</Text>
              ) : null}
            </Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <Text style={styles.statusItemLabel}>Rank</Text>
            <Text style={styles.statusItemValue}>{playerProfile.operatorRank}</Text>
          </View>
        </View>

        <Text style={styles.statusSecondary}>
          {getTierLabel(fanScore)} stage
          {getNextTierGap(fanScore) > 0 ? `  ·  +${getNextTierGap(fanScore)} tickets to next tier` : '  ·  Top tier reached'}
          {playerProfile.longestDailyStreak > 0
            ? `  ·  Longest streak ${playerProfile.longestDailyStreak}d`
            : ''}
        </Text>
      </View>

      {/* Live Event Hero */}
      <Panel
        variant="raised"
        borderColor={liveEventCompleted ? palette.success : liveAccent.accent}
        borderWidth={1.5}
        style={[styles.liveCard, !liveEventCompleted && shadows.glowPink]}
      >
        <View style={styles.liveTopRow}>
          <View style={styles.liveBadgeRow}>
            <View style={[styles.livePulse, { backgroundColor: palette.danger }]} />
            <Text style={styles.liveBadgeText}>LIVE TONIGHT</Text>
          </View>
          <View style={styles.liveBonus}>
            <Text style={styles.liveBonusText}>2× CREDITS</Text>
          </View>
        </View>

        <View style={styles.liveBodyRow}>
          <LeagueBadge league={liveEvent.league} size={56} />
          <View style={styles.liveTextBlock}>
            <Text style={styles.liveEventName} numberOfLines={2}>
              {liveEvent.name}
            </Text>
            <Text style={styles.liveLeagueLabel}>
              {LEAGUE_LABELS[liveEvent.league]} League · One night only
            </Text>
          </View>
        </View>

        <View style={styles.liveFooter}>
          {liveEventCompleted ? (
            <View style={styles.liveDone}>
              <Text style={styles.liveDoneText}>
                {streakClaimedToday
                  ? `DAILY STREAK CLAIMED  ·  ${playerProfile.currentDailyStreak} DAY${playerProfile.currentDailyStreak === 1 ? '' : 'S'}`
                  : 'SET COMPLETE · COME BACK TOMORROW'}
              </Text>
            </View>
          ) : (
            <CountdownHeader endsAtMs={liveEvent.windowEndMs} />
          )}
          {!liveEventCompleted ? (
            <PrimaryButton
              label="Enter live event"
              trailing="→"
              kicker={`${LEAGUE_LABELS[liveEvent.league].toUpperCase()}  ·  2× MULTIPLIER`}
              onPress={() => startLiveEvent(liveEvent, true)}
            />
          ) : null}
        </View>
      </Panel>

      {/* Chase goals — local-only, deterministic replay hooks */}
      {chaseGoals.length > 0 ? (
        <View style={styles.chaseBlock}>
          <Text style={styles.chaseKicker}>Tonight's targets</Text>
          <View style={styles.chaseList}>
            {chaseGoals.map((goal) => {
              const accent: string = goal.league
                ? LEAGUE_VISUALS[goal.league].accent
                : palette.pink;
              return (
                <Pressable
                  key={goal.id}
                  style={styles.chaseRow}
                  onPress={() => {
                    if (goal.cta === 'vault') {
                      navigation.navigate('TicketVault');
                    } else if (goal.cta === 'live' && !liveEventCompleted) {
                      startLiveEvent(liveEvent, true);
                    } else if (goal.league) {
                      navigation.navigate('LeagueSelect', { forcedLeague: goal.league });
                    } else {
                      navigation.navigate('LeagueSelect', {});
                    }
                  }}
                >
                  <View style={[styles.chaseStripe, { backgroundColor: accent }]} />
                  <View style={styles.chaseText}>
                    <Text style={styles.chaseHeadline} numberOfLines={1}>
                      {goal.headline}
                    </Text>
                    <Text style={styles.chaseDetail} numberOfLines={1}>
                      {goal.detail}
                    </Text>
                  </View>
                  <Text style={styles.chaseChevron}>›</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Daily challenges — three deterministic goals for today */}
      {dailyChallenges.length > 0 ? (
        <View style={styles.challengeBlock}>
          <View style={styles.challengeHeader}>
            <Text style={styles.chaseKicker}>Daily challenges</Text>
            <Text style={styles.challengeCount}>
              {dailyChallenges.filter((c) => c.complete).length}/{dailyChallenges.length}
            </Text>
          </View>
          <View style={styles.challengeList}>
            {dailyChallenges.map((status) => {
              const pct: number = status.challenge.target > 0
                ? Math.min(1, status.progress / status.challenge.target)
                : 0;
              return (
                <View key={status.challenge.id} style={styles.challengeRow}>
                  <View style={styles.challengeTextRow}>
                    <Text
                      style={[styles.challengeTitle, status.complete && styles.challengeTitleDone]}
                      numberOfLines={1}
                    >
                      {status.complete ? '✓ ' : ''}
                      {status.challenge.title}
                    </Text>
                    <Text style={styles.challengeProgress}>
                      {Math.min(status.progress, status.challenge.target)}/{status.challenge.target}
                    </Text>
                  </View>
                  <View style={styles.challengeTrack}>
                    <View
                      style={[
                        styles.challengeFill,
                        {
                          width: `${Math.round(pct * 100)}%`,
                          backgroundColor: status.complete ? palette.success : palette.pink,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Replays */}
      {replayEvents.length > 0 ? (
        <Pressable
          style={styles.replayToggle}
          onPress={() => setShowReplays((value) => !value)}
        >
          <Text style={styles.replayToggleText}>
            {showReplays ? '▾' : '▸'}  Replays  ·  {replayEvents.length} missed
          </Text>
          <Text style={styles.replayToggleHint}>Standard rewards</Text>
        </Pressable>
      ) : null}
      {showReplays
        ? replayEvents.map((event) => (
            <Pressable
              key={event.id}
              style={styles.replayCard}
              onPress={() => startLiveEvent(event, false)}
            >
              <LeagueBadge league={event.league} size={32} outline />
              <View style={styles.replayTextBlock}>
                <Text style={styles.replayName} numberOfLines={1}>
                  {event.name}
                </Text>
                <Text style={styles.replayMeta}>
                  {LEAGUE_LABELS[event.league]} · standard rewards
                </Text>
              </View>
              <Text style={styles.replayChevron}>›</Text>
            </Pressable>
          ))
        : null}

      {/* Leagues — first card gets a "FEATURED" treatment, others compact */}
      <SectionHeader
        kicker="TONIGHT'S CIRCUIT"
        title="Pick your league"
        action={{ label: 'See all', onPress: () => navigation.navigate('LeagueSelect', {}) }}
        style={{ marginTop: spacing.xl }}
      />
      <View style={styles.leagueColumn}>
        {LEAGUES.map((league: League, index: number) => (
          <LeagueCard
            key={league}
            league={league}
            ticketsWon={ticketsInLeague(league)}
            completionPct={collectionCompletion[league]}
            compact={index !== 0}
            onPress={() => navigation.navigate('LeagueSelect', { forcedLeague: league })}
          />
        ))}
      </View>

      {/* Footer: replayable briefing + settings */}
      <View style={styles.footerRow}>
        <Pressable
          hitSlop={8}
          onPress={() => setHowToPlayVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="How to play"
          style={styles.footerLink}
        >
          <Text style={styles.footerLinkText}>How to play</Text>
        </Pressable>
        <View style={styles.footerDivider} />
        <Pressable
          hitSlop={8}
          onPress={() => navigation.navigate('Settings')}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          style={styles.footerLink}
        >
          <Text style={styles.footerLinkText}>Settings</Text>
        </Pressable>
      </View>
    </ScreenShell>
  );
}

function getTierLabel(fanScore: number): string {
  if (fanScore >= 15) {
    return 'Festival';
  }
  if (fanScore >= 8) {
    return 'Arena';
  }
  if (fanScore >= 3) {
    return 'Regional';
  }
  return 'Local';
}

function getNextTierGap(fanScore: number): number {
  if (fanScore < 3) {
    return 3 - fanScore;
  }
  if (fanScore < 8) {
    return 8 - fanScore;
  }
  if (fanScore < 15) {
    return 15 - fanScore;
  }
  return 0;
}

const styles = StyleSheet.create({
  headerBlock: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  devChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.hairline,
    backgroundColor: palette.panelGlass,
  },
  devChipText: {
    color: palette.textLow,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  vaultChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.panelGlass,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.hairlineStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  vaultDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.yellow,
  },
  vaultChipText: {
    color: palette.textMed,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  vaultChipCount: {
    color: palette.textHi,
    fontSize: 13,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.panelGlass,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statusItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  statusItemLabel: {
    color: palette.textLow,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statusItemValue: {
    color: palette.textHi,
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
  },
  statusItemUnit: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '800',
  },
  statusSecondary: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: 6,
    paddingHorizontal: spacing.md,
  },
  statusDivider: {
    width: 1,
    height: 16,
    backgroundColor: palette.hairline,
    marginHorizontal: spacing.sm,
  },
  chaseBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  chaseKicker: {
    color: palette.pink,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  chaseList: {
    gap: spacing.xs,
  },
  chaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.panelGlass,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  chaseStripe: {
    width: 3,
    height: 26,
    borderRadius: 2,
  },
  chaseText: {
    flex: 1,
    gap: 2,
  },
  chaseHeadline: {
    color: palette.textHi,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  chaseDetail: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '600',
  },
  chaseChevron: {
    color: palette.textLow,
    fontSize: 22,
    fontWeight: '900',
  },
  challengeBlock: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  challengeCount: {
    color: palette.textMed,
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  challengeList: {
    gap: spacing.sm,
    backgroundColor: palette.panelGlass,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: spacing.md,
  },
  challengeRow: {
    gap: 6,
  },
  challengeTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  challengeTitle: {
    flex: 1,
    color: palette.textHi,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  challengeTitleDone: {
    color: palette.success,
  },
  challengeProgress: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  challengeTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.panelRaised,
    overflow: 'hidden',
  },
  challengeFill: {
    height: '100%',
    borderRadius: 2,
  },
  liveCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  liveTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: palette.danger,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  liveBonus: {
    backgroundColor: palette.yellow,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  liveBonusText: {
    color: palette.ink900,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  liveBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  liveTextBlock: {
    flex: 1,
    gap: 4,
  },
  liveEventName: {
    color: palette.textHi,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 26,
  },
  liveLeagueLabel: {
    color: palette.textMed,
    fontSize: 12,
    fontWeight: '700',
  },
  liveFooter: {
    gap: spacing.md,
  },
  liveDone: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
  },
  liveDoneText: {
    color: palette.success,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  replayToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  replayToggleText: {
    color: palette.textMed,
    fontSize: 12,
    fontWeight: '800',
  },
  replayToggleHint: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '700',
  },
  replayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.panel,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  replayTextBlock: {
    flex: 1,
    gap: 2,
  },
  replayName: {
    color: palette.textHi,
    fontSize: 14,
    fontWeight: '800',
  },
  replayMeta: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '700',
  },
  replayChevron: {
    color: palette.textLow,
    fontSize: 22,
    fontWeight: '900',
  },
  leagueColumn: {
    gap: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  footerLink: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  footerLinkText: {
    color: palette.textLow,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  footerDivider: {
    width: 1,
    height: 14,
    backgroundColor: palette.hairline,
  },
});
