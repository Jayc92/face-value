/**
 * Ticket rarity + venue theming.
 *
 * Both are DETERMINISTIC — a given ticket always has the same rarity and
 * venue theme, computed purely from its stored fields. No RNG at display
 * time. This keeps the Vault stable across restarts and lets the reveal
 * animation and collection math agree on everything.
 */
import { Rarity, Ticket } from './types';

export type { Rarity };

// ---------------------------------------------------------------------------
// Rarity
// ---------------------------------------------------------------------------

/** Display order, weakest → rarest. Used for sorting and "best rarity". */
export const RARITY_ORDER: Rarity[] = [
  'standard',
  'prime',
  'collector',
  'legendary',
  'live',
  'golden',
];

export const RARITY_LABELS: Record<Rarity, string> = {
  standard: 'Standard',
  prime: 'Prime',
  collector: 'Collector',
  legendary: 'Legendary',
  live: 'Live',
  golden: 'Golden Ticket',
};

/** Accent + glow color per rarity (theme-palette hex, no imports to avoid cycles). */
export const RARITY_COLORS: Record<Rarity, { line: string; glow: string }> = {
  standard: { line: '#C9BFE0', glow: 'rgba(201, 191, 224, 0.20)' },
  prime: { line: '#FF6BA1', glow: 'rgba(255, 107, 161, 0.28)' },
  collector: { line: '#7FE7FF', glow: 'rgba(127, 231, 255, 0.30)' },
  legendary: { line: '#B98CFF', glow: 'rgba(185, 140, 255, 0.34)' },
  live: { line: '#FF4D5E', glow: 'rgba(255, 77, 94, 0.34)' },
  golden: { line: '#FFE94D', glow: 'rgba(255, 233, 77, 0.42)' },
};

export function rarityRank(rarity: Rarity): number {
  return RARITY_ORDER.indexOf(rarity);
}

/**
 * Computes a ticket's rarity from its stored fields. Deterministic.
 *
 * Priority (highest wins):
 *  1. Golden Ticket — a flawless live front-row: live event, Front Row,
 *     10/10 correct. The rarest, hardest-earned card.
 *  2. Live — any seat won during the daily Live Event window.
 *  3. Legendary — Front Row won with a perfect 10/10 (non-live).
 *  4. Collector — Front Row won with a strong round (>= 8 correct), or
 *     any seat with a perfect 10/10.
 *  5. Prime — Front Row won (any score), or Mid with >= 6 correct.
 *  6. Standard — everything else that still claimed a seat.
 *
 * Tickets minted before round-context was stored (correctCount undefined)
 * fall back to a seat+live heuristic so the Vault never shows a blank.
 */
export function ticketRarity(ticket: Ticket): Rarity {
  const isFront: boolean = ticket.seatTier === 'front';
  const isMidOrBetter: boolean = ticket.seatTier === 'front' || ticket.seatTier === 'mid';
  const correct: number | undefined = ticket.correctCount;
  const total: number = ticket.totalQuestions ?? 10;
  const perfect: boolean = correct !== undefined && correct >= total;
  const strong: boolean = correct !== undefined && correct >= 8;
  const solid: boolean = correct !== undefined && correct >= 6;

  if (ticket.wasLiveEvent && isFront && perfect) {
    return 'golden';
  }
  if (ticket.wasLiveEvent) {
    return 'live';
  }
  if (isFront && perfect) {
    return 'legendary';
  }
  if ((isFront && strong) || (isMidOrBetter && perfect)) {
    return 'collector';
  }

  // Legacy fallback (no round context): keep prior seat-based feel.
  if (correct === undefined) {
    return isFront ? 'prime' : 'standard';
  }

  if (isFront || (ticket.seatTier === 'mid' && solid)) {
    return 'prime';
  }
  return 'standard';
}

/**
 * Rarity from raw round context (used by the records engine, which works
 * with a RoundOutcome rather than a persisted Ticket). Mirrors
 * ticketRarity exactly. Returns null when no seat was won.
 */
export function rarityFromRound(input: {
  seatWon: 'front' | 'mid' | 'upper' | null;
  correctCount: number;
  totalQuestions: number;
  wasLiveEvent: boolean;
}): Rarity | null {
  if (input.seatWon === null) {
    return null;
  }
  return ticketRarity({
    id: '',
    eventName: '',
    venue: '',
    league: 'rock',
    seatTier: input.seatWon,
    tierLevel: 1,
    dateWonIso: '',
    creditsPaid: 0,
    wasLiveEvent: input.wasLiveEvent,
    correctCount: input.correctCount,
    totalQuestions: input.totalQuestions,
  });
}

// ---------------------------------------------------------------------------
// Venue themes
// ---------------------------------------------------------------------------

export type VenueTheme = 'club' | 'arena' | 'stadium' | 'festival' | 'theater';

export const VENUE_THEME_LABELS: Record<VenueTheme, string> = {
  club: 'Club',
  arena: 'Arena',
  stadium: 'Stadium',
  festival: 'Festival',
  theater: 'Theater',
};

export const VENUE_THEMES: VenueTheme[] = ['club', 'arena', 'stadium', 'festival', 'theater'];

/**
 * Per-theme ticket styling. `bg` tints the stub, `line` accents the frame,
 * `motif` is a short word rendered as a faint watermark on the featured
 * card so each theme reads distinctly without new art assets.
 */
export const VENUE_THEME_STYLES: Record<
  VenueTheme,
  { bg: string; line: string; motif: string }
> = {
  club: { bg: 'rgba(255, 45, 120, 0.06)', line: '#FF2D78', motif: 'LATE SET' },
  arena: { bg: 'rgba(123, 77, 255, 0.07)', line: '#7B4DFF', motif: 'SOLD OUT' },
  stadium: { bg: 'rgba(61, 220, 132, 0.06)', line: '#3DDC84', motif: 'GAMEDAY' },
  festival: { bg: 'rgba(255, 170, 61, 0.07)', line: '#FFAA3D', motif: 'MAINSTAGE' },
  theater: { bg: 'rgba(127, 231, 255, 0.06)', line: '#7FE7FF', motif: 'MATINÉE' },
};

/**
 * Explicit venue-name → theme mapping. Covers every venue in
 * events.ts VENUES so existing tickets theme correctly. Any unmapped
 * name falls back to a stable hash so nothing is ever unthemed.
 */
const VENUE_THEME_BY_NAME: Record<string, VenueTheme> = {
  // Tier 1 — intimate rooms
  'The Basement Lounge': 'club',
  'Corner Stage Club': 'club',
  'The Garage Room': 'club',
  'Neon Alley Hall': 'theater',
  // Tier 2 — mid venues
  'Riverside Amphitheater': 'theater',
  'The Grand Pavilion': 'theater',
  'Sunset Fairgrounds': 'festival',
  'Civic Sound Center': 'arena',
  // Tier 3 — big rooms
  'Pulse Arena': 'arena',
  'The Colosseum Dome': 'arena',
  'Apex Garden': 'stadium',
  'Thunderdome Stadium': 'stadium',
  // Tier 4 — festival grounds
  'Horizon Festival Grounds': 'festival',
  'Mainstage Meadows': 'festival',
  'The Infinite Field': 'stadium',
  'Solstice Park': 'festival',
};

/** Cheap stable hash for the venue-name fallback (self-contained). */
function stableHash(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function venueTheme(venue: string): VenueTheme {
  const mapped = VENUE_THEME_BY_NAME[venue];
  if (mapped) {
    return mapped;
  }
  return VENUE_THEMES[stableHash(venue) % VENUE_THEMES.length];
}
