import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { HeaderBar } from '../components/HeaderBar';
import { LeagueBadge } from '../components/LeagueBadge';
import { MedalChip } from '../components/MedalChip';
import { Panel } from '../components/Panel';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { TicketCard } from '../components/TicketCard';
import { ACHIEVEMENTS, ACHIEVEMENT_COUNT } from '../game/achievements';
import { rarityCounts, venueCollection } from '../game/collection';
import { LEAGUE_LABELS, LEAGUES } from '../game/events';
import { useGame } from '../game/GameContext';
import { medalRank } from '../game/medals';
import { ScreenProps } from '../game/navigation';
import {
  RARITY_COLORS,
  RARITY_LABELS,
  RARITY_ORDER,
  VENUE_THEME_LABELS,
  VENUE_THEME_STYLES,
  VENUE_THEMES,
} from '../game/rarity';
import {
  League,
  Medal,
  Rarity,
  SEAT_TIER_LABELS,
  SeatTier,
  Ticket,
} from '../game/types';
import { LEAGUE_VISUALS } from '../utils/leagueVisuals';
import { palette, radii, spacing } from '../utils/theme';

type SortMode = 'date' | 'league' | 'seat';

const SEAT_ORDER: Record<SeatTier, number> = { front: 0, mid: 1, upper: 2 };

const SORT_LABELS: Record<SortMode, string> = {
  date: 'Newest',
  league: 'League',
  seat: 'Best seat',
};

export function TicketVaultScreen({
  navigation,
}: ScreenProps<'TicketVault'>): React.JSX.Element {
  const { tickets, collectionCompletion, isHydrating, playerProfile } = useGame();
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [leagueFilter, setLeagueFilter] = useState<League | 'all'>('all');
  const { width: screenWidth } = useWindowDimensions();
  // On narrow phones (Pixel 4a / iPhone SE class) one column reads much
  // better than a cramped 2-col grid; wider phones get the 2-col grid.
  const numColumns: number = screenWidth < 380 ? 1 : 2;

  const visibleTickets = useMemo<Ticket[]>(() => {
    const filtered: Ticket[] =
      leagueFilter === 'all'
        ? tickets
        : tickets.filter((ticket) => ticket.league === leagueFilter);
    const sorted: Ticket[] = [...filtered];
    switch (sortMode) {
      case 'date':
        sorted.sort((a, b) => b.dateWonIso.localeCompare(a.dateWonIso));
        break;
      case 'league':
        sorted.sort((a, b) => a.league.localeCompare(b.league));
        break;
      case 'seat':
        sorted.sort((a, b) => SEAT_ORDER[a.seatTier] - SEAT_ORDER[b.seatTier]);
        break;
    }
    return sorted;
  }, [tickets, sortMode, leagueFilter]);

  const totalCompletion: number =
    LEAGUES.reduce((sum, league) => sum + collectionCompletion[league], 0) / LEAGUES.length;

  const frontRowCount: number = tickets.filter((t) => t.seatTier === 'front').length;
  const liveCount: number = tickets.filter((t) => t.wasLiveEvent).length;

  /** Highest medal earned in each league across all tier levels. */
  const bestMedalByLeague: Record<League, Medal> = useMemo(() => {
    const map: Record<League, Medal> = {
      rock: 'none',
      hiphop: 'none',
      pop: 'none',
      country: 'none',
      sports: 'none',
    };
    for (const key of Object.keys(playerProfile.perLeagueTier)) {
      const [league] = key.split(':') as [League, string];
      const record = playerProfile.perLeagueTier[key as keyof typeof playerProfile.perLeagueTier];
      if (!record) continue;
      if (medalRank(record.bestMedal) > medalRank(map[league])) {
        map[league] = record.bestMedal;
      }
    }
    return map;
  }, [playerProfile.perLeagueTier]);

  const hasAnyProfileData: boolean =
    playerProfile.totalRoundsPlayed > 0 ||
    playerProfile.longestDailyStreak > 0 ||
    tickets.length > 0;

  const rarityTally = useMemo(() => rarityCounts(tickets), [tickets]);
  const venueSlices = useMemo(() => venueCollection(tickets), [tickets]);
  const unlockedCount: number = playerProfile.unlockedAchievementIds.length;

  return (
    <ScreenShell scroll>
      <HeaderBar
        kicker="VAULT"
        title="Your collection"
        onBack={() => navigation.goBack()}
      />

      {/* Hero stats — three columns */}
      <View style={styles.heroRow}>
        <View style={styles.heroCell}>
          <Text style={styles.heroKicker}>Total</Text>
          <Text style={styles.heroValue}>{tickets.length}</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroCell}>
          <Text style={styles.heroKicker}>Front row</Text>
          <Text style={[styles.heroValue, { color: palette.yellow }]}>{frontRowCount}</Text>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroCell}>
          <Text style={styles.heroKicker}>Live wins</Text>
          <Text style={[styles.heroValue, { color: palette.danger }]}>{liveCount}</Text>
        </View>
      </View>

      {/* Records — deep progression stats. Shown only after any activity. */}
      {hasAnyProfileData ? (
        <Panel variant="raised" style={styles.recordsCard}>
          <View style={styles.recordsHeader}>
            <Text style={styles.recordsKicker}>Records</Text>
            <Text style={styles.recordsRank}>{playerProfile.operatorRank}</Text>
          </View>
          <View style={styles.recordsGrid}>
            <View style={styles.recordsCell}>
              <Text style={styles.recordsLabel}>Longest streak</Text>
              <Text style={styles.recordsValue}>
                {playerProfile.longestDailyStreak}
                <Text style={styles.recordsUnit}>d</Text>
              </Text>
            </View>
            <View style={styles.recordsDivider} />
            <View style={styles.recordsCell}>
              <Text style={styles.recordsLabel}>Best round</Text>
              <Text style={styles.recordsValue}>
                {playerProfile.globalRecords.highestCreditsSingleRound.toLocaleString()}
                <Text style={styles.recordsUnit}> cr</Text>
              </Text>
            </View>
            <View style={styles.recordsDivider} />
            <View style={styles.recordsCell}>
              <Text style={styles.recordsLabel}>Perfect rounds</Text>
              <Text style={styles.recordsValue}>
                {playerProfile.globalRecords.totalPerfectRounds}
              </Text>
            </View>
          </View>
          <View style={styles.recordsMedalRow}>
            {LEAGUES.map((league: League) => (
              <View key={league} style={styles.recordsMedalCell}>
                <LeagueBadge league={league} size={24} outline />
                <View style={{ marginTop: 4 }}>
                  <MedalChip medal={bestMedalByLeague[league]} showEmpty compact />
                </View>
              </View>
            ))}
          </View>
        </Panel>
      ) : null}

      {/* Rarity breakdown — how many of each ticket rarity you hold */}
      {tickets.length > 0 ? (
        <Panel variant="raised" style={styles.rarityCard}>
          <Text style={styles.completionKicker}>Rarity</Text>
          <View style={styles.rarityGrid}>
            {RARITY_ORDER.map((rarity: Rarity) => (
              <View key={rarity} style={styles.rarityCell}>
                <Text style={[styles.rarityCount, { color: RARITY_COLORS[rarity].line }]}>
                  {rarityTally[rarity]}
                </Text>
                <Text style={styles.rarityName}>{RARITY_LABELS[rarity]}</Text>
              </View>
            ))}
          </View>
        </Panel>
      ) : null}

      {/* Venue collection — completion per venue theme */}
      {tickets.length > 0 ? (
        <Panel variant="raised" style={styles.completionCard}>
          <Text style={styles.completionKicker}>Venues</Text>
          <View style={styles.completionGrid}>
            {VENUE_THEMES.map((theme) => {
              const slice = venueSlices[theme];
              const style = VENUE_THEME_STYLES[theme];
              return (
                <View key={theme} style={styles.venueRow}>
                  <Text style={styles.venueName}>{VENUE_THEME_LABELS[theme]}</Text>
                  <View style={styles.completionTrack}>
                    <View
                      style={[
                        styles.completionFill,
                        { width: `${Math.round(slice.pct * 100)}%`, backgroundColor: style.line },
                      ]}
                    />
                  </View>
                  <Text style={styles.venueCount}>
                    {slice.owned}/{slice.total}
                  </Text>
                </View>
              );
            })}
          </View>
        </Panel>
      ) : null}

      {/* Achievements — persistent milestones */}
      {hasAnyProfileData ? (
        <Panel variant="raised" style={styles.achievementsCard}>
          <View style={styles.completionHeader}>
            <Text style={styles.completionKicker}>Achievements</Text>
            <Text style={styles.completionTotal}>
              {unlockedCount}/{ACHIEVEMENT_COUNT}
            </Text>
          </View>
          <View style={styles.achievementList}>
            {ACHIEVEMENTS.map((achievement) => {
              const earned: boolean = playerProfile.unlockedAchievementIds.includes(
                achievement.id,
              );
              return (
                <View key={achievement.id} style={styles.achievementItem}>
                  <View
                    style={[
                      styles.achievementDot,
                      { backgroundColor: earned ? palette.yellow : palette.panelRaised },
                    ]}
                  />
                  <View style={styles.achievementText}>
                    <Text
                      style={[
                        styles.achievementName,
                        !earned && styles.achievementLocked,
                      ]}
                    >
                      {achievement.title}
                    </Text>
                    <Text style={styles.achievementDesc} numberOfLines={1}>
                      {achievement.description}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Panel>
      ) : null}

      {/* Collection completion — per league */}
      <Panel variant="raised" style={styles.completionCard}>
        <View style={styles.completionHeader}>
          <Text style={styles.completionKicker}>Collection</Text>
          <Text style={styles.completionTotal}>{Math.round(totalCompletion * 100)}%</Text>
        </View>
        <View style={styles.completionGrid}>
          {LEAGUES.map((league: League) => {
            const visual = LEAGUE_VISUALS[league];
            const pct: number = collectionCompletion[league];
            return (
              <Pressable
                key={league}
                onPress={() => setLeagueFilter(leagueFilter === league ? 'all' : league)}
                style={({ pressed }) => [
                  styles.completionRow,
                  leagueFilter === league && { borderColor: visual.accent },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <LeagueBadge league={league} size={28} outline />
                <View style={styles.completionRowText}>
                  <Text style={styles.completionLeagueName}>{LEAGUE_LABELS[league]}</Text>
                  <View style={styles.completionTrack}>
                    <View
                      style={[
                        styles.completionFill,
                        { width: `${Math.round(pct * 100)}%`, backgroundColor: visual.accent },
                      ]}
                    />
                  </View>
                </View>
                <Text style={[styles.completionPct, { color: visual.accent }]}>
                  {Math.round(pct * 100)}%
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Panel>

      {/* Sort/Filter bar */}
      <View style={styles.controlRow}>
        <View style={styles.controlGroup}>
          <Text style={styles.controlGroupLabel}>Sort by</Text>
          <View style={styles.controlSegment}>
            {(['date', 'league', 'seat'] as SortMode[]).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setSortMode(mode)}
                style={[
                  styles.controlSegmentItem,
                  sortMode === mode && styles.controlSegmentItemActive,
                ]}
              >
                <Text
                  style={[
                    styles.controlSegmentText,
                    sortMode === mode && styles.controlSegmentTextActive,
                  ]}
                >
                  {SORT_LABELS[mode]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {leagueFilter !== 'all' ? (
        <View style={styles.filterBar}>
          <Text style={styles.filterText}>
            Showing {LEAGUE_LABELS[leagueFilter as League]} only
          </Text>
          <Pressable hitSlop={8} onPress={() => setLeagueFilter('all')}>
            <Text style={styles.filterClear}>Clear</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        key={`vault-cols-${numColumns}`}
        data={visibleTickets}
        keyExtractor={(ticket) => ticket.id}
        numColumns={numColumns}
        scrollEnabled={false}
        columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
        contentContainerStyle={styles.gridContent}
        renderItem={({ item }) => (
          <View style={numColumns > 1 ? styles.gridCell : styles.singleCell}>
            <TicketCard ticket={item} variant={numColumns === 1 ? 'featured' : 'grid'} />
          </View>
        )}
        ListEmptyComponent={
          <Panel variant="raised" style={styles.emptyCard}>
            <Text style={styles.emptyKicker}>VAULT</Text>
            <Text style={styles.emptyTitle}>
              {isHydrating ? 'Opening the vault…' : 'No tickets yet.'}
            </Text>
            {!isHydrating ? (
              <>
                <Text style={styles.emptyBody}>
                  Win a seat on the Bidding Floor to start your collection. Every
                  ticket counts toward your Fan Score and unlocks bigger stages.
                </Text>
                <PrimaryButton
                  label="HIT THE GAUNTLET"
                  trailing="→"
                  onPress={() => navigation.popToTop()}
                />
              </>
            ) : null}
          </Panel>
        }
      />

      {tickets.length > 0 ? (
        <Text style={styles.footerHint}>
          {visibleTickets.length} of {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}{' '}
          shown
        </Text>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: 'row',
    backgroundColor: palette.panel,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  heroCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  heroDivider: {
    width: 1,
    backgroundColor: palette.hairline,
  },
  heroKicker: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  heroValue: {
    color: palette.textHi,
    fontSize: 24,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  recordsCard: {
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  recordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  recordsKicker: {
    color: palette.textLow,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  recordsRank: {
    color: palette.textHi,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  recordsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordsDivider: {
    width: 1,
    height: 30,
    backgroundColor: palette.hairline,
    marginHorizontal: spacing.sm,
  },
  recordsCell: {
    flex: 1,
    gap: 2,
  },
  recordsLabel: {
    color: palette.textLow,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  recordsValue: {
    color: palette.textHi,
    fontSize: 16,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  recordsUnit: {
    color: palette.textLow,
    fontSize: 12,
    fontWeight: '800',
  },
  recordsMedalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
    paddingTop: spacing.sm,
  },
  recordsMedalCell: {
    alignItems: 'center',
    gap: 2,
  },
  completionCard: {
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  rarityCard: {
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  rarityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  rarityCell: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: 2,
  },
  rarityCount: {
    fontSize: 20,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  rarityName: {
    color: palette.textLow,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  venueName: {
    color: palette.textHi,
    fontSize: 13,
    fontWeight: '800',
    width: 76,
  },
  venueCount: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    width: 34,
    textAlign: 'right',
  },
  achievementsCard: {
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  achievementList: {
    gap: spacing.sm,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  achievementDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  achievementText: {
    flex: 1,
    gap: 1,
  },
  achievementName: {
    color: palette.textHi,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  achievementLocked: {
    color: palette.textLow,
  },
  achievementDesc: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '600',
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  completionKicker: {
    color: palette.textLow,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  completionTotal: {
    color: palette.textHi,
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  completionGrid: {
    gap: spacing.sm,
  },
  completionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.hairline,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  completionRowText: {
    flex: 1,
    gap: 4,
  },
  completionLeagueName: {
    color: palette.textHi,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  completionTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: palette.panelRaised,
    overflow: 'hidden',
  },
  completionFill: {
    height: '100%',
    borderRadius: 2,
  },
  completionPct: {
    fontSize: 12,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'right',
  },
  controlRow: {
    marginBottom: spacing.md,
  },
  controlGroup: {
    gap: 6,
  },
  controlGroupLabel: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  controlSegment: {
    flexDirection: 'row',
    backgroundColor: palette.panel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: 2,
  },
  controlSegmentItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  controlSegmentItemActive: {
    backgroundColor: palette.panelRaised,
  },
  controlSegmentText: {
    color: palette.textLow,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  controlSegmentTextActive: {
    color: palette.textHi,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.panelGlass,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  filterText: {
    color: palette.pink,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  filterClear: {
    color: palette.textMed,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  gridRow: {
    gap: spacing.sm,
  },
  gridContent: {
    gap: spacing.sm,
  },
  gridCell: {
    flex: 1,
  },
  singleCell: {
    marginBottom: spacing.sm,
  },
  emptyCard: {
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  emptyKicker: {
    color: palette.textLow,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  emptyTitle: {
    color: palette.textHi,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  emptyBody: {
    color: palette.textMed,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  footerHint: {
    color: palette.textLow,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
