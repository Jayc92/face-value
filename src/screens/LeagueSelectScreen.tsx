import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlowButton } from '../components/GlowButton';
import { LEAGUE_EMOJIS, LEAGUE_LABELS, LEAGUES } from '../game/events';
import { useGame } from '../game/GameContext';
import { ScreenProps } from '../game/navigation';
import { TIER_CONFIGS } from '../game/tiers';
import { League, TierConfig, TierLevel } from '../game/types';
import { colors, radii, spacing, typography } from '../utils/theme';

const ALL_TIER_LEVELS: TierLevel[] = [1, 2, 3, 4];

export function LeagueSelectScreen({ navigation, route }: ScreenProps<'LeagueSelect'>): React.JSX.Element {
  const { forcedLeague, liveEventId, liveEventName, liveBonusActive } = route.params ?? {};
  const { fanScore, tickets } = useGame();
  const [selectedLeague, setSelectedLeague] = useState<League>(forcedLeague ?? 'rock');

  const ticketsInLeague = (league: League): number =>
    tickets.filter((ticket) => ticket.league === league).length;

  const tierStatus = (config: TierConfig): 'playable' | 'locked' | 'comingSoon' => {
    if (config.comingSoon) {
      return 'comingSoon';
    }
    return fanScore >= config.fanScoreRequired ? 'playable' : 'locked';
  };

  const startGauntlet = (tierLevel: TierLevel): void => {
    navigation.navigate('TriviaGauntlet', {
      league: selectedLeague,
      tierLevel,
      liveEventId,
      liveEventName,
      liveBonusActive: liveBonusActive ?? false,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Home</Text>
        </Pressable>
        <Text style={styles.title}>CHOOSE YOUR STAGE</Text>

        {liveEventName ? (
          <View style={styles.liveStrip}>
            <Text style={styles.liveStripText}>
              {liveBonusActive ? '🔴 LIVE: ' : '▶️ Replay: '}
              {liveEventName}
              {liveBonusActive ? ' — 2x credits active!' : ' — standard rewards'}
            </Text>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.leagueRow}>
          {LEAGUES.map((league: League) => {
            const isSelected: boolean = league === selectedLeague;
            const isLockedByLive: boolean = Boolean(forcedLeague) && league !== forcedLeague;
            return (
              <Pressable
                key={league}
                disabled={isLockedByLive}
                onPress={() => setSelectedLeague(league)}
                style={[
                  styles.leagueChip,
                  isSelected && styles.leagueChipSelected,
                  isLockedByLive && styles.leagueChipDisabled,
                ]}
              >
                <Text style={styles.leagueChipEmoji}>{LEAGUE_EMOJIS[league]}</Text>
                <Text style={[styles.leagueChipText, isSelected && styles.leagueChipTextSelected]}>
                  {LEAGUE_LABELS[league]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.leagueMeta}>
          {ticketsInLeague(selectedLeague)} tickets won in {LEAGUE_LABELS[selectedLeague]} · Fan
          Score {fanScore}
        </Text>

        {ALL_TIER_LEVELS.map((level: TierLevel) => {
          const config: TierConfig = TIER_CONFIGS[level];
          const status = tierStatus(config);
          return (
            <View
              key={level}
              style={[styles.tierCard, status !== 'playable' && styles.tierCardLocked]}
            >
              <View style={styles.tierHeader}>
                <Text style={styles.tierName}>
                  Tier {level} · {config.name}
                </Text>
                {status === 'comingSoon' && <Text style={styles.tierBadge}>COMING SOON</Text>}
                {status === 'locked' && (
                  <Text style={styles.tierBadge}>
                    🔒 Fan Score {config.fanScoreRequired}
                  </Text>
                )}
              </View>
              <Text style={styles.tierTagline}>{config.tagline}</Text>
              <Text style={styles.tierMeta}>
                {config.aiBidderCount} rival bidders · {config.difficultyMix.easy}E/
                {config.difficultyMix.medium}M/{config.difficultyMix.hard}H questions
              </Text>
              {status === 'playable' && (
                <GlowButton
                  label="START GAUNTLET"
                  onPress={() => startGauntlet(level)}
                  style={styles.tierButton}
                />
              )}
            </View>
          );
        })}
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
  back: {
    color: colors.textDim,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.white,
    marginBottom: spacing.md,
  },
  liveStrip: {
    backgroundColor: colors.surface,
    borderColor: colors.yellow,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  liveStripText: {
    color: colors.yellow,
    fontSize: 13,
    fontWeight: '700',
  },
  leagueRow: {
    flexGrow: 0,
    marginBottom: spacing.sm,
  },
  leagueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  leagueChipSelected: {
    borderColor: colors.pink,
    backgroundColor: colors.surfaceLight,
  },
  leagueChipDisabled: {
    opacity: 0.35,
  },
  leagueChipEmoji: {
    fontSize: 16,
  },
  leagueChipText: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '700',
  },
  leagueChipTextSelected: {
    color: colors.white,
  },
  leagueMeta: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  tierCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  tierCardLocked: {
    opacity: 0.55,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tierName: {
    color: colors.white,
    ...typography.subtitle,
  },
  tierBadge: {
    color: colors.yellow,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tierTagline: {
    color: colors.pink,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  tierMeta: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  tierButton: {
    marginTop: spacing.md,
  },
});
