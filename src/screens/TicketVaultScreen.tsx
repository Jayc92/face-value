import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LEAGUE_EMOJIS, LEAGUE_LABELS, LEAGUES } from '../game/events';
import { useGame } from '../game/GameContext';
import { ScreenProps } from '../game/navigation';
import { League, SEAT_TIER_LABELS, SeatTier, Ticket } from '../game/types';
import { colors, radii, spacing, typography } from '../utils/theme';

type SortMode = 'date' | 'league' | 'seat';

const SEAT_ORDER: Record<SeatTier, number> = { front: 0, mid: 1, upper: 2 };
const SEAT_BORDER: Record<SeatTier, string> = {
  front: colors.yellow,
  mid: colors.pink,
  upper: colors.surfaceLight,
};

function TicketCard({ ticket }: { ticket: Ticket }): React.JSX.Element {
  const wonDate = new Date(ticket.dateWonIso);
  const dateLabel: string = wonDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <View style={[styles.ticketCard, { borderColor: SEAT_BORDER[ticket.seatTier] }]}>
      <View style={styles.ticketNotchLeft} />
      <View style={styles.ticketNotchRight} />
      <Text style={styles.ticketEmoji}>{LEAGUE_EMOJIS[ticket.league]}</Text>
      <Text style={styles.ticketEvent} numberOfLines={2}>
        {ticket.eventName}
      </Text>
      <Text style={styles.ticketVenue} numberOfLines={1}>
        {ticket.venue}
      </Text>
      <View style={styles.ticketDivider} />
      <Text style={styles.ticketSeat}>{SEAT_TIER_LABELS[ticket.seatTier].toUpperCase()}</Text>
      <Text style={styles.ticketMeta}>
        {LEAGUE_LABELS[ticket.league]} · Tier {ticket.tierLevel}
      </Text>
      <Text style={styles.ticketMeta}>
        {dateLabel}
        {ticket.wasLiveEvent ? ' · 🔴 LIVE' : ''}
      </Text>
    </View>
  );
}

export function TicketVaultScreen({ navigation }: ScreenProps<'TicketVault'>): React.JSX.Element {
  const { tickets, collectionCompletion, isHydrating } = useGame();
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [leagueFilter, setLeagueFilter] = useState<League | 'all'>('all');

  const visibleTickets = useMemo<Ticket[]>(() => {
    const filtered: Ticket[] =
      leagueFilter === 'all' ? tickets : tickets.filter((ticket) => ticket.league === leagueFilter);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>🎟️ TICKET VAULT</Text>
        <Text style={styles.subtitle}>{tickets.length} tickets collected</Text>
      </View>

      <View style={styles.completionRow}>
        {LEAGUES.map((league: League) => (
          <View key={league} style={styles.completionChip}>
            <Text style={styles.completionEmoji}>{LEAGUE_EMOJIS[league]}</Text>
            <Text style={styles.completionPct}>
              {Math.round(collectionCompletion[league] * 100)}%
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.controls}>
        <View style={styles.controlGroup}>
          {(['date', 'league', 'seat'] as SortMode[]).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setSortMode(mode)}
              style={[styles.controlChip, sortMode === mode && styles.controlChipActive]}
            >
              <Text
                style={[styles.controlText, sortMode === mode && styles.controlTextActive]}
              >
                {mode === 'date' ? 'Newest' : mode === 'league' ? 'League' : 'Best Seat'}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.controlGroup}>
          <Pressable
            onPress={() => setLeagueFilter('all')}
            style={[styles.controlChip, leagueFilter === 'all' && styles.controlChipActive]}
          >
            <Text style={[styles.controlText, leagueFilter === 'all' && styles.controlTextActive]}>
              All
            </Text>
          </Pressable>
          {LEAGUES.map((league: League) => (
            <Pressable
              key={league}
              onPress={() => setLeagueFilter(league)}
              style={[styles.controlChip, leagueFilter === league && styles.controlChipActive]}
            >
              <Text
                style={[styles.controlText, leagueFilter === league && styles.controlTextActive]}
              >
                {LEAGUE_EMOJIS[league]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={visibleTickets}
        keyExtractor={(ticket) => ticket.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        renderItem={({ item }) => <TicketCard ticket={item} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {isHydrating
              ? 'Opening the vault…'
              : leagueFilter === 'all'
                ? 'No tickets yet. Win a seat at the Bidding Floor to start your collection!'
                : `No ${LEAGUE_LABELS[leagueFilter as League]} tickets yet.`}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.md,
    paddingBottom: 0,
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
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  completionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  completionChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  completionEmoji: {
    fontSize: 14,
  },
  completionPct: {
    color: colors.yellow,
    fontSize: 11,
    fontWeight: '800',
  },
  controls: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  controlGroup: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  controlChip: {
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  controlChipActive: {
    borderColor: colors.pink,
    backgroundColor: colors.surfaceLight,
  },
  controlText: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
  },
  controlTextActive: {
    color: colors.white,
  },
  gridRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  gridContent: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  ticketCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    padding: spacing.md,
    overflow: 'hidden',
  },
  ticketNotchLeft: {
    position: 'absolute',
    left: -8,
    top: '58%',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  ticketNotchRight: {
    position: 'absolute',
    right: -8,
    top: '58%',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  ticketEmoji: {
    fontSize: 22,
  },
  ticketEvent: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
    marginTop: spacing.xs,
    minHeight: 36,
  },
  ticketVenue: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '600',
  },
  ticketDivider: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.surfaceLight,
    marginVertical: spacing.sm,
  },
  ticketSeat: {
    color: colors.yellow,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  ticketMeta: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  empty: {
    color: colors.textDim,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
    lineHeight: 21,
  },
});
