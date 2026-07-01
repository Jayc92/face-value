import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { LEAGUE_LABELS } from '../game/events';
import { SEAT_TIER_LABELS, SeatTier, Ticket } from '../game/types';
import { hashString } from '../utils/rng';
import { LEAGUE_VISUALS } from '../utils/leagueVisuals';
import { palette, radii, seatAccents, spacing } from '../utils/theme';
import { LeagueBadge } from './LeagueBadge';

interface TicketCardProps {
  ticket: Ticket;
  /** featured: large stub for the Results reveal. grid: compact for the vault. */
  variant?: 'featured' | 'grid';
}

const PERFORATION_COUNT = 8;

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

interface SeatDetails {
  section: string;
  row: string;
  seat: string;
  serial: string;
  rarity: 'STANDARD' | 'PRIME' | 'COLLECTOR' | 'GRAIL';
}

const RARITY_COLORS: Record<SeatDetails['rarity'], string> = {
  STANDARD: palette.textMed,
  PRIME: palette.pinkSoft,
  COLLECTOR: palette.yellow,
  GRAIL: palette.yellow,
};

/**
 * Derives concrete seat coordinates and a serial number from the ticket id.
 * Stable per ticket (the same ticket always shows the same seat) and bound
 * to the seat tier so Front Row stays in the front sections. No backend.
 */
function deriveSeatDetails(ticket: Ticket): SeatDetails {
  const seed: number = hashString(ticket.id);
  const tierSectionBands: Record<SeatTier, string[]> = {
    front: ['PIT', 'A1', 'A2', 'A3', 'B1'],
    mid: ['M2', 'M3', 'M4', '102', '108', '114'],
    upper: ['U7', 'U8', 'U12', '215', '224', '301'],
  };
  const tierRows: Record<SeatTier, string[]> = {
    front: ['AA', 'A', 'B', 'C'],
    mid: ['F', 'G', 'H', 'J', 'K'],
    upper: ['P', 'R', 'T', 'V', 'W'],
  };
  const sectionPool: string[] = tierSectionBands[ticket.seatTier];
  const rowPool: string[] = tierRows[ticket.seatTier];

  const section: string = sectionPool[seed % sectionPool.length];
  const row: string = rowPool[(seed >>> 4) % rowPool.length];
  const seatNumber: number = (seed >>> 8) % 38 + 1;
  const serialInt: number = (seed >>> 12) % 90000 + 10000;

  const rarity: SeatDetails['rarity'] = ticket.wasLiveEvent
    ? ticket.seatTier === 'front'
      ? 'GRAIL'
      : 'COLLECTOR'
    : ticket.seatTier === 'front'
      ? 'PRIME'
      : 'STANDARD';

  return {
    section,
    row,
    seat: String(seatNumber).padStart(2, '0'),
    serial: `#${serialInt}`,
    rarity,
  };
}

/**
 * Premium ticket-stub card. Real perforated edge (SVG dots), color-coded
 * foil border per seat tier, league badge as the "issuer mark", concrete
 * section / row / seat coordinates derived from the ticket id, and a
 * rarity label up top.
 */
export function TicketCard({ ticket, variant = 'grid' }: TicketCardProps): React.JSX.Element {
  const accent = seatAccents[ticket.seatTier];
  const leagueVisual = LEAGUE_VISUALS[ticket.league];
  const isFeatured: boolean = variant === 'featured';
  const seat = deriveSeatDetails(ticket);
  const rarityColor: string = RARITY_COLORS[seat.rarity];

  return (
    <View
      style={[
        styles.outer,
        isFeatured && styles.outerFeatured,
        { borderColor: accent.line },
      ]}
    >
      <View style={[styles.corner, { backgroundColor: accent.line }]} />

      <View style={styles.topRow}>
        <LeagueBadge league={ticket.league} size={isFeatured ? 40 : 28} />
        <View style={styles.identity}>
          <View style={styles.rarityRow}>
            <Text style={[styles.rarity, { color: rarityColor }]}>{seat.rarity}</Text>
            <Text style={styles.kickerDot}>·</Text>
            <Text style={styles.kicker}>
              {LEAGUE_LABELS[ticket.league]} · T{ticket.tierLevel}
            </Text>
          </View>
          <Text
            style={[styles.eventName, isFeatured && styles.eventNameFeatured]}
            numberOfLines={isFeatured ? 2 : 2}
          >
            {ticket.eventName}
          </Text>
          <Text style={styles.venue} numberOfLines={1}>
            {ticket.venue}
          </Text>
        </View>
      </View>

      <View style={styles.perforationRow}>
        <View style={[styles.notch, styles.notchLeft]} />
        <View style={styles.perforationLine}>
          <Svg width="100%" height="2">
            {Array.from({ length: PERFORATION_COUNT }).map((_, index) => (
              <Circle
                key={index}
                cx={`${(100 * (index + 0.5)) / PERFORATION_COUNT}%`}
                cy="1"
                r="1"
                fill={palette.hairlineStrong}
              />
            ))}
          </Svg>
        </View>
        <View style={[styles.notch, styles.notchRight]} />
      </View>

      {isFeatured ? (
        <View style={styles.coordsRow}>
          <View style={styles.coordCell}>
            <Text style={styles.coordLabel}>SECTION</Text>
            <Text style={[styles.coordValue, { color: accent.label }]}>{seat.section}</Text>
          </View>
          <View style={styles.coordCell}>
            <Text style={styles.coordLabel}>ROW</Text>
            <Text style={[styles.coordValue, { color: accent.label }]}>{seat.row}</Text>
          </View>
          <View style={styles.coordCell}>
            <Text style={styles.coordLabel}>SEAT</Text>
            <Text style={[styles.coordValue, { color: accent.label }]}>{seat.seat}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.coordsCompactRow}>
          <Text style={[styles.coordCompact, { color: accent.label }]}>
            {seat.section} · {seat.row} · {seat.seat}
          </Text>
        </View>
      )}

      <View style={styles.bottomRow}>
        <View style={styles.seatBlock}>
          <Text style={styles.seatLabel}>{SEAT_TIER_LABELS[ticket.seatTier].toUpperCase()}</Text>
          <Text style={styles.serial}>{seat.serial}</Text>
        </View>
        <View style={styles.dateBlock}>
          <Text style={styles.dateLabel}>{ticket.wasLiveEvent ? 'LIVE · CLAIMED' : 'CLAIMED'}</Text>
          <Text style={styles.dateValue}>{formatDate(ticket.dateWonIso)}</Text>
        </View>
      </View>

      {ticket.wasLiveEvent ? (
        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <Text style={styles.liveTagText}>LIVE</Text>
        </View>
      ) : null}

      <Svg
        style={styles.holoSvg}
        width="100%"
        height="100%"
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id={`holo-${ticket.id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={accent.line} stopOpacity="0" />
            <Stop offset="0.45" stopColor={accent.line} stopOpacity="0.05" />
            <Stop offset="0.55" stopColor={leagueVisual.accent} stopOpacity="0.05" />
            <Stop offset="1" stopColor={leagueVisual.accent} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path
          d="M 0 80 L 100 0 L 100 0 L 200 100"
          stroke={`url(#holo-${ticket.id})`}
          strokeWidth="40"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: palette.panel,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    padding: spacing.md,
    overflow: 'hidden',
    flex: 1,
  },
  outerFeatured: {
    padding: spacing.lg,
  },
  corner: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    transform: [{ rotate: '45deg' }, { translateX: 14 }, { translateY: -14 }],
    opacity: 0.85,
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  rarityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rarity: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  kickerDot: {
    color: palette.textLow,
    fontSize: 10,
    fontWeight: '900',
  },
  kicker: {
    color: palette.textLow,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  eventName: {
    color: palette.textHi,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.1,
    marginTop: 2,
    lineHeight: 17,
  },
  eventNameFeatured: {
    fontSize: 19,
    lineHeight: 23,
    letterSpacing: 0,
  },
  venue: {
    color: palette.textMed,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  perforationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
    marginHorizontal: -spacing.md,
  },
  notch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: palette.ink900,
  },
  notchLeft: {
    marginLeft: -6,
  },
  notchRight: {
    marginRight: -6,
  },
  perforationLine: {
    flex: 1,
    height: 2,
    justifyContent: 'center',
  },
  coordsRow: {
    flexDirection: 'row',
    backgroundColor: palette.ink800,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  coordCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  coordLabel: {
    color: palette.textLow,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  coordValue: {
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  coordsCompactRow: {
    paddingTop: 2,
    paddingBottom: spacing.xs,
  },
  coordCompact: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  seatBlock: {
    flexShrink: 1,
  },
  seatLabel: {
    color: palette.textLow,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  serial: {
    color: palette.textMed,
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  dateBlock: {
    alignItems: 'flex-end',
    flexShrink: 1,
  },
  dateLabel: {
    color: palette.textLow,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  dateValue: {
    color: palette.textHi,
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  liveTag: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.dangerDeep,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: palette.danger,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.danger,
  },
  liveTagText: {
    color: palette.danger,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  holoSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
