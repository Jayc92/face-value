/**
 * Collectibles tests: ticket rarity, venue themes, daily challenges, and
 * achievements. All deterministic — same input, same output.
 *
 * Run with: npx tsx scripts/testCollectibles.ts
 */
import { evaluateAchievements } from '../src/game/achievements';
import {
  advanceChallenges,
  challengeStatuses,
  dailyChallengesForDate,
} from '../src/game/challenges';
import { leagueCollection, overallCollection, venueCollection } from '../src/game/collection';
import {
  rarityFromRound,
  ticketRarity,
  VENUE_THEMES,
  venueTheme,
} from '../src/game/rarity';
import { applyRoundToProfile } from '../src/game/records';
import { PlayerProfile, Rarity, RoundOutcome, Ticket } from '../src/game/types';
import { createDefaultProfile } from '../src/utils/playerProfileStorage';

interface Assertion {
  label: string;
  passed: boolean;
  actual?: unknown;
  expected?: unknown;
}
const results: Assertion[] = [];
function assert(label: string, passed: boolean, actual?: unknown, expected?: unknown): void {
  results.push({ label, passed, actual, expected });
}
function assertEq<T>(label: string, actual: T, expected: T): void {
  assert(label, actual === expected, actual, expected);
}

function ticket(overrides: Partial<Ticket>): Ticket {
  return {
    id: 'tk-1',
    eventName: 'Test Event',
    venue: 'The Basement Lounge',
    league: 'rock',
    seatTier: 'front',
    tierLevel: 1,
    dateWonIso: '2026-07-01T00:00:00.000Z',
    creditsPaid: 100,
    wasLiveEvent: false,
    correctCount: 10,
    totalQuestions: 10,
    ...overrides,
  };
}

// ----- Rarity determinism + rules --------------------------------------
assertEq('rarity: live + front + 10/10 → golden',
  ticketRarity(ticket({ wasLiveEvent: true, seatTier: 'front', correctCount: 10 })), 'golden' as Rarity);
assertEq('rarity: any live seat → live',
  ticketRarity(ticket({ wasLiveEvent: true, seatTier: 'mid', correctCount: 6 })), 'live' as Rarity);
assertEq('rarity: front + perfect (non-live) → legendary',
  ticketRarity(ticket({ wasLiveEvent: false, seatTier: 'front', correctCount: 10 })), 'legendary' as Rarity);
assertEq('rarity: front + 8 correct → collector',
  ticketRarity(ticket({ seatTier: 'front', correctCount: 8 })), 'collector' as Rarity);
assertEq('rarity: mid + perfect → collector',
  ticketRarity(ticket({ seatTier: 'mid', correctCount: 10 })), 'collector' as Rarity);
assertEq('rarity: front + 7 correct → prime',
  ticketRarity(ticket({ seatTier: 'front', correctCount: 7 })), 'prime' as Rarity);
assertEq('rarity: upper + 3 correct → standard',
  ticketRarity(ticket({ seatTier: 'upper', correctCount: 3 })), 'standard' as Rarity);
assertEq('rarity: legacy front (no correctCount) → prime',
  ticketRarity(ticket({ seatTier: 'front', correctCount: undefined })), 'prime' as Rarity);
assertEq('rarity: legacy upper (no correctCount) → standard',
  ticketRarity(ticket({ seatTier: 'upper', correctCount: undefined })), 'standard' as Rarity);

// Determinism: same ticket, same rarity every call.
{
  const t = ticket({ seatTier: 'front', correctCount: 9 });
  assertEq('rarity: deterministic across calls', ticketRarity(t), ticketRarity(t));
}

// rarityFromRound mirrors ticketRarity.
assertEq('rarityFromRound: no seat → null',
  rarityFromRound({ seatWon: null, correctCount: 10, totalQuestions: 10, wasLiveEvent: true }), null);
assertEq('rarityFromRound: golden path matches',
  rarityFromRound({ seatWon: 'front', correctCount: 10, totalQuestions: 10, wasLiveEvent: true }),
  'golden' as Rarity);

// ----- Venue themes ----------------------------------------------------
assertEq('venue: Basement Lounge → club', venueTheme('The Basement Lounge'), 'club');
assertEq('venue: Thunderdome Stadium → stadium', venueTheme('Thunderdome Stadium'), 'stadium');
assertEq('venue: Sunset Fairgrounds → festival', venueTheme('Sunset Fairgrounds'), 'festival');
assert('venue: unknown name still themes (no crash)',
  VENUE_THEMES.includes(venueTheme('Some Unmapped Room 42')));
assertEq('venue: deterministic for unmapped',
  venueTheme('Some Unmapped Room 42'), venueTheme('Some Unmapped Room 42'));

// ----- Daily challenges ------------------------------------------------
{
  const a = dailyChallengesForDate('2026-07-01');
  const b = dailyChallengesForDate('2026-07-01');
  assertEq('challenges: exactly 3 generated', a.length, 3);
  assertEq('challenges: deterministic per date', JSON.stringify(a), JSON.stringify(b));
  const differentDay = dailyChallengesForDate('2026-07-02');
  assert('challenges: differ across days',
    JSON.stringify(a) !== JSON.stringify(differentDay));
  const metrics = new Set(a.map((c) => c.metric));
  assertEq('challenges: distinct metrics', metrics.size, a.length);
}

// Challenge progress advances and resets on date rollover.
{
  let profile: PlayerProfile = createDefaultProfile();
  const day = '2026-07-01';
  const chals = dailyChallengesForDate(day);
  const win: RoundOutcome = {
    roundId: 'r1', league: 'rock', tierLevel: 1, correctCount: 10, totalQuestions: 10,
    creditsEarned: 900, bestComboThisRound: 10, seatWon: 'front', wasLiveEvent: false,
    liveEventCompletedInWindow: false, completedOnLocalDate: day,
  };
  ({ nextProfile: profile } = applyRoundToProfile(profile, win));
  assertEq('challenges: profile date set', profile.dailyChallengeDate, day);
  const statuses = challengeStatuses(profile, day);
  assert('challenges: some progress recorded after a strong round',
    statuses.some((s) => s.progress > 0));

  // Next day → progress resets (fresh statuses read 0).
  const nextDayStatuses = challengeStatuses(profile, '2026-07-02');
  assert('challenges: progress resets on date rollover',
    nextDayStatuses.every((s) => s.progress === 0));
  void chals;
}

// newlyCompleted fires once, not twice.
{
  const day = '2026-07-05';
  const chals = dailyChallengesForDate(day);
  // Pick the "roundsPlayed" or "correctAnswers"-style challenge to drive.
  let profile: PlayerProfile = createDefaultProfile();
  const outcome: RoundOutcome = {
    roundId: 'x1', league: 'rock', tierLevel: 1, correctCount: 20, totalQuestions: 10,
    creditsEarned: 2000, bestComboThisRound: 10, seatWon: 'front', wasLiveEvent: false,
    liveEventCompletedInWindow: false, completedOnLocalDate: day,
  };
  const first = advanceChallenges(profile, outcome, day);
  ({ nextProfile: profile } = applyRoundToProfile(profile, outcome));
  const outcome2: RoundOutcome = { ...outcome, roundId: 'x2' };
  const second = advanceChallenges(profile, outcome2, day);
  assert('challenges: a big round completes at least one', first.newlyCompleted.length > 0);
  // Anything completed in round 1 must not be reported "newly" in round 2.
  const overlap = second.newlyCompleted.filter((id) => first.newlyCompleted.includes(id));
  assertEq('challenges: no double-completion celebration', overlap.length, 0);
  void chals;
}

// ----- Achievements ----------------------------------------------------
{
  const fresh = createDefaultProfile();
  assertEq('achievements: fresh profile unlocks none', evaluateAchievements(fresh, []).length, 0);

  const withTicket: PlayerProfile = { ...fresh, totalTicketsWon: 1, totalFrontRowsWon: 1 };
  const unlocked = evaluateAchievements(withTicket, []);
  assert('achievements: first-ticket unlocks', unlocked.some((a) => a.id === 'first-ticket'));
  assert('achievements: front-row-debut unlocks', unlocked.some((a) => a.id === 'front-row-debut'));

  // Already-unlocked ids are not re-reported.
  const again = evaluateAchievements(withTicket, ['first-ticket', 'front-row-debut']);
  assertEq('achievements: no re-unlock', again.length, 0);
}

// Achievement flows through applyRoundToProfile delta once.
{
  let profile: PlayerProfile = createDefaultProfile();
  const win: RoundOutcome = {
    roundId: 'ach-1', league: 'rock', tierLevel: 1, correctCount: 10, totalQuestions: 10,
    creditsEarned: 900, bestComboThisRound: 10, seatWon: 'front', wasLiveEvent: false,
    liveEventCompletedInWindow: false, completedOnLocalDate: '2026-07-01',
  };
  const { nextProfile, delta } = applyRoundToProfile(profile, win);
  profile = nextProfile;
  assert('achievements: round delta reports unlocks', delta.unlockedAchievements.length > 0);
  assert('achievements: ids stored on profile',
    profile.unlockedAchievementIds.includes('first-ticket'));
  // Re-applying same round is idempotent — no new unlocks.
  const { delta: delta2 } = applyRoundToProfile(profile, win);
  assertEq('achievements: idempotent re-apply reports none', delta2.unlockedAchievements.length, 0);
}

// ----- Collection math -------------------------------------------------
{
  const vault: Ticket[] = [
    ticket({ id: 'a', league: 'rock', eventName: 'Midnight Riot World Tour', venue: 'The Basement Lounge' }),
    ticket({ id: 'b', league: 'rock', eventName: 'Velvet Thunder Live', venue: 'Corner Stage Club' }),
    ticket({ id: 'c', league: 'pop', eventName: 'Neon Hearts World Tour', venue: 'Sunset Fairgrounds' }),
  ];
  const leagues = leagueCollection(vault);
  assertEq('collection: rock owns 2 distinct events', leagues.rock.owned, 2);
  assertEq('collection: pop owns 1', leagues.pop.owned, 1);
  const overall = overallCollection(vault);
  assertEq('collection: overall owned = 3', overall.owned, 3);
  assertEq('collection: overall total = 25', overall.total, 25);
  const venues = venueCollection(vault);
  assert('collection: club venue owns >= 2', venues.club.owned >= 2);
}

// ----- Report ----------------------------------------------------------
let pass = 0;
let fail = 0;
for (const r of results) {
  if (r.passed) {
    pass += 1;
    console.log(`  ✓ ${r.label}`);
  } else {
    fail += 1;
    console.log(`  ✗ ${r.label}`);
    console.log(`      expected=${JSON.stringify(r.expected)} actual=${JSON.stringify(r.actual)}`);
  }
}
console.log('');
console.log(`Collectibles sim: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  process.exit(1);
}
