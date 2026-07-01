import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { HeaderBar } from '../components/HeaderBar';
import { LeagueBadge } from '../components/LeagueBadge';
import { Panel } from '../components/Panel';
import { ScreenShell } from '../components/ScreenShell';
import { TierCard } from '../components/TierCard';
import { LEAGUE_LABELS, LEAGUES } from '../game/events';
import { useGame } from '../game/GameContext';
import { ScreenProps } from '../game/navigation';
import { bestMedalFor } from '../game/records';
import { TIER_CONFIGS } from '../game/tiers';
import { League, TierConfig, TierLevel } from '../game/types';
import { LEAGUE_VISUALS } from '../utils/leagueVisuals';
import { palette, radii, spacing } from '../utils/theme';

const ALL_TIER_LEVELS: TierLevel[] = [1, 2, 3, 4];

export function LeagueSelectScreen({
  navigation,
  route,
}: ScreenProps<'LeagueSelect'>): React.JSX.Element {
  const { forcedLeague, liveEventId, liveEventName, liveBonusActive } = route.params ?? {};
  const { fanScore, tickets, playerProfile } = useGame();
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

  const leagueVisual = LEAGUE_VISUALS[selectedLeague];

  return (
    <ScreenShell scroll>
      <HeaderBar
        kicker="THE CIRCUIT"
        title="Choose your stage"
        onBack={() => navigation.goBack()}
        backLabel="Home"
      />

      {liveEventName ? (
        <Panel
          variant="raised"
          borderColor={liveBonusActive ? palette.danger : palette.yellow}
          style={styles.liveStrip}
        >
          <View style={styles.liveStripRow}>
            {liveBonusActive ? (
              <View style={[styles.liveDot, { backgroundColor: palette.danger }]} />
            ) : null}
            <Text style={[styles.liveStripText, !liveBonusActive && { color: palette.yellow }]}>
              {liveBonusActive ? 'LIVE' : 'REPLAY'}
            </Text>
            <Text style={styles.liveStripName} numberOfLines={1}>
              {liveEventName}
            </Text>
            {liveBonusActive ? <Text style={styles.liveStripBonus}>2×</Text> : null}
          </View>
        </Panel>
      ) : null}

      {/* League pill row — horizontal, no emoji */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.leaguePillsRow}
      >
        {LEAGUES.map((league: League) => {
          const isSelected: boolean = league === selectedLeague;
          const isLockedByLive: boolean = Boolean(forcedLeague) && league !== forcedLeague;
          const visual = LEAGUE_VISUALS[league];
          return (
            <Pressable
              key={league}
              disabled={isLockedByLive}
              onPress={() => setSelectedLeague(league)}
              style={({ pressed }) => [
                styles.leaguePill,
                isSelected && {
                  borderColor: visual.accent,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                },
                isLockedByLive && styles.leaguePillDisabled,
                pressed && { opacity: 0.85 },
              ]}
            >
              <LeagueBadge league={league} size={24} outline={!isSelected} />
              <Text
                style={[
                  styles.leaguePillText,
                  isSelected && { color: palette.textHi },
                ]}
              >
                {LEAGUE_LABELS[league]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* League summary strip */}
      <View style={styles.leagueSummary}>
        <View style={styles.leagueSummaryLeft}>
          <Text style={styles.leagueSummaryKicker}>Selected</Text>
          <Text style={styles.leagueSummaryName}>{LEAGUE_LABELS[selectedLeague]}</Text>
          <Text style={[styles.leagueSummaryTag, { color: leagueVisual.accent }]}>
            {leagueVisual.tagline}
          </Text>
        </View>
        <View style={styles.leagueSummaryRight}>
          <Text style={styles.leagueSummaryStatVal}>{ticketsInLeague(selectedLeague)}</Text>
          <Text style={styles.leagueSummaryStatLabel}>
            Tickets · Fan {fanScore}
          </Text>
        </View>
      </View>

      <View style={styles.tierColumn}>
        {ALL_TIER_LEVELS.map((level: TierLevel) => {
          const config: TierConfig = TIER_CONFIGS[level];
          const status = tierStatus(config);
          const highlighted: boolean = status === 'playable' && level === highestPlayable(fanScore);
          return (
            <TierCard
              key={level}
              config={config}
              status={status}
              fanScore={fanScore}
              onPlay={() => startGauntlet(level)}
              highlighted={highlighted}
              bestMedal={bestMedalFor(playerProfile, selectedLeague, level)}
            />
          );
        })}
      </View>
    </ScreenShell>
  );
}

function highestPlayable(fanScore: number): TierLevel {
  if (fanScore >= 3) {
    return 2;
  }
  return 1;
}

const styles = StyleSheet.create({
  liveStrip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  liveStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveStripText: {
    color: palette.danger,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  liveStripName: {
    flex: 1,
    color: palette.textHi,
    fontSize: 12,
    fontWeight: '800',
  },
  liveStripBonus: {
    color: palette.yellow,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  leaguePillsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  leaguePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.panel,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  leaguePillDisabled: {
    opacity: 0.3,
  },
  leaguePillText: {
    color: palette.textMed,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  leagueSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
    borderBottomWidth: 1,
    borderBottomColor: palette.hairline,
  },
  leagueSummaryLeft: {
    flex: 1,
    gap: 2,
  },
  leagueSummaryKicker: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  leagueSummaryName: {
    color: palette.textHi,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  leagueSummaryTag: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  leagueSummaryRight: {
    alignItems: 'flex-end',
  },
  leagueSummaryStatVal: {
    color: palette.textHi,
    fontSize: 28,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  leagueSummaryStatLabel: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tierColumn: {
    gap: spacing.md,
  },
});
