import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlowButton } from '../components/GlowButton';
import {
  dailyLiveEventForDate,
  LEAGUE_EMOJIS,
  LEAGUE_LABELS,
  LEAGUES,
  recentLiveEvents,
} from '../game/events';
import { useGame } from '../game/GameContext';
import { ScreenProps } from '../game/navigation';
import { DailyLiveEvent, League } from '../game/types';
import { colors, radii, spacing, typography } from '../utils/theme';

function formatCountdown(milliseconds: number): string {
  const totalSeconds: number = Math.max(0, Math.floor(milliseconds / 1000));
  const hours: number = Math.floor(totalSeconds / 3600);
  const minutes: number = Math.floor((totalSeconds % 3600) / 60);
  const seconds: number = totalSeconds % 60;
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function HomeScreen({ navigation }: ScreenProps<'Home'>): React.JSX.Element {
  const { fanScore, tickets, completedLiveEventIds } = useGame();
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [showReplays, setShowReplays] = useState<boolean>(false);

  // Tick once a second to drive the live countdown.
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const liveEvent: DailyLiveEvent = useMemo(() => dailyLiveEventForDate(new Date(nowMs)), [
    // Re-derive only when the date flips, not every second.
    new Date(nowMs).toDateString(),
  ]);

  const liveEventCompleted: boolean = completedLiveEventIds.includes(liveEvent.id);
  const msUntilWindowCloses: number = liveEvent.windowEndMs - nowMs;

  const replayEvents: DailyLiveEvent[] = useMemo(
    () =>
      recentLiveEvents(new Date(nowMs), 5).filter(
        (event) => !completedLiveEventIds.includes(event.id),
      ),
    // Recompute when the date flips or completions change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [new Date(nowMs).toDateString(), completedLiveEventIds],
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.logoTop}>FACE</Text>
          <Text style={styles.logoBottom}>VALUE</Text>
          <Text style={styles.tagline}>Win trivia. Outbid the crowd. Claim the front row.</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{fanScore}</Text>
            <Text style={styles.statLabel}>FAN SCORE</Text>
          </View>
          <Pressable style={styles.statCard} onPress={() => navigation.navigate('TicketVault')}>
            <Text style={styles.statValue}>🎟️ {tickets.length}</Text>
            <Text style={styles.statLabel}>TICKET VAULT</Text>
          </Pressable>
        </View>

        <View style={styles.liveBanner}>
          <View style={styles.liveBadgeRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>TODAY&apos;S LIVE EVENT</Text>
          </View>
          <Text style={styles.liveName}>
            {LEAGUE_EMOJIS[liveEvent.league]} {liveEvent.name}
          </Text>
          <Text style={styles.liveLeague}>{LEAGUE_LABELS[liveEvent.league]} League · 2x credits</Text>
          {liveEventCompleted ? (
            <Text style={styles.liveDone}>✅ Completed — come back tomorrow!</Text>
          ) : (
            <>
              <Text style={styles.liveCountdown}>
                Window closes in {formatCountdown(msUntilWindowCloses)}
              </Text>
              <GlowButton
                label="PLAY LIVE — 2x CREDITS"
                onPress={() => startLiveEvent(liveEvent, true)}
              />
            </>
          )}
        </View>

        <Pressable style={styles.replayToggle} onPress={() => setShowReplays((value) => !value)}>
          <Text style={styles.replayToggleText}>
            {showReplays ? '▾' : '▸'} Replays ({replayEvents.length} missed events)
          </Text>
        </Pressable>
        {showReplays &&
          replayEvents.map((event) => (
            <Pressable
              key={event.id}
              style={styles.replayCard}
              onPress={() => startLiveEvent(event, false)}
            >
              <Text style={styles.replayName}>
                {LEAGUE_EMOJIS[event.league]} {event.name}
              </Text>
              <Text style={styles.replayMeta}>
                {LEAGUE_LABELS[event.league]} · standard rewards
              </Text>
            </Pressable>
          ))}

        <Text style={styles.sectionTitle}>PICK YOUR LEAGUE</Text>
        <View style={styles.leagueGrid}>
          {LEAGUES.map((league: League) => (
            <Pressable
              key={league}
              style={styles.leagueCard}
              onPress={() => navigation.navigate('LeagueSelect', { forcedLeague: league })}
            >
              <Text style={styles.leagueEmoji}>{LEAGUE_EMOJIS[league]}</Text>
              <Text style={styles.leagueName}>{LEAGUE_LABELS[league]}</Text>
            </Pressable>
          ))}
        </View>

        <GlowButton
          label="BROWSE ALL LEAGUES"
          variant="secondary"
          onPress={() => navigation.navigate('LeagueSelect', {})}
          style={styles.browseButton}
        />
      </ScrollView>
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
  header: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  logoTop: {
    ...typography.display,
    color: colors.white,
    lineHeight: 42,
  },
  logoBottom: {
    ...typography.display,
    color: colors.pink,
    lineHeight: 42,
    textShadowColor: colors.pink,
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  tagline: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.sm,
    textAlign: 'center',
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
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  liveBanner: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.pink,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  liveBadgeText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  liveName: {
    color: colors.white,
    ...typography.title,
  },
  liveLeague: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
  },
  liveCountdown: {
    color: colors.yellow,
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  liveDone: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
  },
  replayToggle: {
    paddingVertical: spacing.sm,
  },
  replayToggleText: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '700',
  },
  replayCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  replayName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  replayMeta: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  leagueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  leagueCard: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  leagueEmoji: {
    fontSize: 34,
  },
  leagueName: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  browseButton: {
    marginTop: spacing.lg,
  },
});
