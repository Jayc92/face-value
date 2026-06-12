import { createSeededRandom, hashString } from '../utils/rng';
import { DailyLiveEvent, GameEvent, League, TierLevel } from './types';

export const LEAGUES: League[] = ['rock', 'hiphop', 'pop', 'country', 'sports'];

export const LEAGUE_LABELS: Record<League, string> = {
  rock: 'Rock',
  hiphop: 'Hip-Hop',
  pop: 'Pop',
  country: 'Country',
  sports: 'Sports',
};

export const LEAGUE_EMOJIS: Record<League, string> = {
  rock: '🎸',
  hiphop: '🎤',
  pop: '🌟',
  country: '🤠',
  sports: '🏟️',
};

/** Fictional headliner-style event names, per league. */
const EVENT_NAMES: Record<League, string[]> = {
  rock: [
    'Midnight Riot World Tour',
    'The Feedback Loop Reunion',
    'Static Avenue: Amped Up',
    'Velvet Thunder Live',
    'The Last Power Chord',
  ],
  hiphop: [
    'Crown Heights Cypher',
    'Golden Mic Sessions',
    'The 808 Block Party',
    'Midnight Freestyle Summit',
    'Platinum Flow Tour',
  ],
  pop: [
    'Neon Hearts World Tour',
    'The Glitter Anthem Show',
    'Starlight Confetti Live',
    'Bubblegum Skyline Tour',
    'The Chart Toppers Ball',
  ],
  country: [
    'Dust & Denim Jamboree',
    'The Whiskey River Revue',
    'Boots on the Boulevard',
    'Neon Saddle Nights',
    'The Front Porch Finale',
  ],
  sports: [
    'Friday Night Lights Classic',
    'The Rivalry Bowl',
    'Overtime Thunder Finals',
    'The Buzzer Beater Invitational',
    'Championship Saturday Showdown',
  ],
};

const VENUES: Record<TierLevel, string[]> = {
  1: ['The Basement Lounge', 'Corner Stage Club', 'The Garage Room', 'Neon Alley Hall'],
  2: ['Riverside Amphitheater', 'The Grand Pavilion', 'Sunset Fairgrounds', 'Civic Sound Center'],
  3: ['Pulse Arena', 'The Colosseum Dome', 'Apex Garden', 'Thunderdome Stadium'],
  4: ['Horizon Festival Grounds', 'Mainstage Meadows', 'The Infinite Field', 'Solstice Park'],
};

/** Builds the fictional event the player will bid on after a gauntlet. */
export function buildGameEvent(league: League, tierLevel: TierLevel, isLiveEvent: boolean): GameEvent {
  const names: string[] = EVENT_NAMES[league];
  const venues: string[] = VENUES[tierLevel];
  const name: string = names[Math.floor(Math.random() * names.length)];
  const venue: string = venues[Math.floor(Math.random() * venues.length)];
  return {
    id: `event-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    name,
    venue,
    league,
    tierLevel,
    isLiveEvent,
  };
}

/** 'YYYY-MM-DD' in the device's local timezone. */
export function localDateKey(date: Date): string {
  const year: number = date.getFullYear();
  const month: string = String(date.getMonth() + 1).padStart(2, '0');
  const day: string = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const LIVE_EVENT_TITLES: string[] = [
  'Saturday Night Showdown',
  'Encore Hour Live',
  'The Midnight Setlist',
  'Primetime Pit Pass',
  'The Golden Ticket Hour',
  'Spotlight Sunday Special',
  'The Soundcheck Sprint',
];

/**
 * The featured Live Event for a given date. Seeded by the date string so
 * every player (and every app restart) sees the same event on the same
 * day. The 2x window runs from local midnight to midnight.
 */
export function dailyLiveEventForDate(date: Date): DailyLiveEvent {
  const dateKey: string = localDateKey(date);
  const random = createSeededRandom(hashString(dateKey));

  const league: League = LEAGUES[Math.floor(random() * LEAGUES.length)];
  const title: string = LIVE_EVENT_TITLES[Math.floor(random() * LIVE_EVENT_TITLES.length)];

  const windowStart = new Date(date);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + 1);

  return {
    id: `live-${dateKey}`,
    name: title,
    league,
    windowStartMs: windowStart.getTime(),
    windowEndMs: windowEnd.getTime(),
  };
}

/** The last `count` days of live events (excluding today), oldest last — the Replay list. */
export function recentLiveEvents(today: Date, count: number): DailyLiveEvent[] {
  const events: DailyLiveEvent[] = [];
  for (let daysAgo = 1; daysAgo <= count; daysAgo += 1) {
    const past = new Date(today);
    past.setDate(past.getDate() - daysAgo);
    events.push(dailyLiveEventForDate(past));
  }
  return events;
}
