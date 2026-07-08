/**
 * Collection progress.
 *
 * Pure derivations over the Ticket Vault: completion per venue theme,
 * per league, and overall. Nothing here writes state — the Vault screen
 * reads these to render progress meters.
 *
 * "Completion" is measured against the number of distinct event names
 * available per league (5, matching EVENT_NAMES in events.ts) and per
 * venue theme (distinct venue names that map to that theme).
 */
import { LEAGUES } from './events';
import { ticketRarity, venueTheme, VenueTheme, VENUE_THEMES, Rarity } from './rarity';
import { rarityRank } from './rarity';
import { League, Ticket } from './types';

/** Distinct collectible event names per league (mirrors EVENT_NAMES). */
const EVENTS_PER_LEAGUE = 5;

export interface CollectionSlice {
  key: string;
  label: string;
  owned: number;
  total: number;
  /** 0–1 completion. */
  pct: number;
}

/** Completion per league (distinct event names collected / 5). */
export function leagueCollection(tickets: Ticket[]): Record<League, CollectionSlice> {
  const result = {} as Record<League, CollectionSlice>;
  for (const league of LEAGUES) {
    const names = new Set(
      tickets.filter((t) => t.league === league).map((t) => t.eventName),
    );
    const owned = Math.min(names.size, EVENTS_PER_LEAGUE);
    result[league] = {
      key: league,
      label: league,
      owned,
      total: EVENTS_PER_LEAGUE,
      pct: owned / EVENTS_PER_LEAGUE,
    };
  }
  return result;
}

/**
 * How many distinct venue names exist per theme across the game's venue
 * catalog (from events.ts). Hard-coded counts keep this pure and avoid a
 * dependency on the private VENUES map.
 */
const VENUES_PER_THEME: Record<VenueTheme, number> = {
  club: 3, // Basement Lounge, Corner Stage Club, Garage Room
  theater: 3, // Neon Alley Hall, Riverside Amphitheater, Grand Pavilion
  arena: 3, // Civic Sound Center, Pulse Arena, Colosseum Dome
  stadium: 3, // Apex Garden, Thunderdome Stadium, The Infinite Field
  festival: 4, // Sunset Fairgrounds, Horizon Festival Grounds, Mainstage Meadows, Solstice Park
};

/** Completion per venue theme (distinct venue names collected / theme total). */
export function venueCollection(tickets: Ticket[]): Record<VenueTheme, CollectionSlice> {
  const distinctByTheme: Record<VenueTheme, Set<string>> = {
    club: new Set(),
    arena: new Set(),
    stadium: new Set(),
    festival: new Set(),
    theater: new Set(),
  };
  for (const ticket of tickets) {
    distinctByTheme[venueTheme(ticket.venue)].add(ticket.venue);
  }

  const result = {} as Record<VenueTheme, CollectionSlice>;
  for (const theme of VENUE_THEMES) {
    const total = VENUES_PER_THEME[theme];
    const owned = Math.min(distinctByTheme[theme].size, total);
    result[theme] = {
      key: theme,
      label: theme,
      owned,
      total,
      pct: total > 0 ? owned / total : 0,
    };
  }
  return result;
}

/** Overall completion: distinct events collected across all leagues / 25. */
export function overallCollection(tickets: Ticket[]): CollectionSlice {
  const perLeague = leagueCollection(tickets);
  const owned = LEAGUES.reduce((sum, l) => sum + perLeague[l].owned, 0);
  const total = LEAGUES.length * EVENTS_PER_LEAGUE;
  return {
    key: 'overall',
    label: 'Overall',
    owned,
    total,
    pct: total > 0 ? owned / total : 0,
  };
}

/** Count of tickets per rarity across the vault. */
export function rarityCounts(tickets: Ticket[]): Record<Rarity, number> {
  const counts: Record<Rarity, number> = {
    standard: 0,
    prime: 0,
    collector: 0,
    legendary: 0,
    live: 0,
    golden: 0,
  };
  for (const ticket of tickets) {
    counts[ticketRarity(ticket)] += 1;
  }
  return counts;
}

/** The rarest rarity owned, or null for an empty vault. */
export function rarestOwned(tickets: Ticket[]): Rarity | null {
  let best: Rarity | null = null;
  for (const ticket of tickets) {
    const r = ticketRarity(ticket);
    if (best === null || rarityRank(r) > rarityRank(best)) {
      best = r;
    }
  }
  return best;
}
