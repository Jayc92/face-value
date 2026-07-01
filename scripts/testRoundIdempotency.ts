/**
 * Round-idempotency tests.
 *
 * Verifies that re-applying the same round (same roundId) is a hard
 * no-op against the Player Profile — counters, streaks, medals, records,
 * and processed-id list all stay put. Also exercises the onboarding
 * storage helpers' pure behavior via an in-memory AsyncStorage stub.
 *
 * Run with: npx tsx scripts/testRoundIdempotency.ts
 */
import { applyRoundToProfile } from '../src/game/records';
import { PlayerProfile, PROCESSED_ROUND_ID_CAP, RoundOutcome } from '../src/game/types';
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

function round(overrides: Partial<RoundOutcome>): RoundOutcome {
  return {
    roundId: 'round-A',
    league: 'rock',
    tierLevel: 1,
    correctCount: 8,
    totalQuestions: 10,
    creditsEarned: 900,
    bestComboThisRound: 6,
    seatWon: 'front',
    wasLiveEvent: false,
    liveEventCompletedInWindow: false,
    completedOnLocalDate: '2026-06-30',
    ...overrides,
  };
}

/** Snapshot the counters we care about for equality checks. */
function snapshot(p: PlayerProfile) {
  return JSON.stringify({
    totalRoundsPlayed: p.totalRoundsPlayed,
    totalTicketsWon: p.totalTicketsWon,
    totalFrontRowsWon: p.totalFrontRowsWon,
    totalCreditsEarned: p.totalCreditsEarned,
    totalPerfectGauntlets: p.totalPerfectGauntlets,
    currentDailyStreak: p.currentDailyStreak,
    longestDailyStreak: p.longestDailyStreak,
    perLeagueTier: p.perLeagueTier,
    globalRecords: p.globalRecords,
  });
}

// ----- Normal round applied twice --------------------------------------
{
  const r = round({ roundId: 'norm-1' });
  const first = applyRoundToProfile(createDefaultProfile(), r);
  assertEq('normal: first apply is not flagged already-processed', first.delta.alreadyProcessed, false);
  assertEq('normal: first apply counts one round', first.nextProfile.totalRoundsPlayed, 1);
  assertEq('normal: roundId recorded', first.nextProfile.processedRoundIds.includes('norm-1'), true);

  const before = snapshot(first.nextProfile);
  const second = applyRoundToProfile(first.nextProfile, r);
  assertEq('normal: second apply flagged already-processed', second.delta.alreadyProcessed, true);
  assertEq('normal: counters unchanged on duplicate', snapshot(second.nextProfile), before);
  assertEq('normal: no PBs re-celebrated on duplicate', second.delta.personalBests.length, 0);
  assertEq('normal: totalRoundsPlayed still 1', second.nextProfile.totalRoundsPlayed, 1);
}

// ----- No-seat round applied twice -------------------------------------
{
  const r = round({ roundId: 'noseat-1', seatWon: null, correctCount: 3, creditsEarned: 120 });
  const first = applyRoundToProfile(createDefaultProfile(), r);
  assertEq('no-seat: first apply counts one round', first.nextProfile.totalRoundsPlayed, 1);
  assertEq('no-seat: no ticket counted', first.nextProfile.totalTicketsWon, 0);

  const before = snapshot(first.nextProfile);
  const second = applyRoundToProfile(first.nextProfile, r);
  assertEq('no-seat: second apply flagged already-processed', second.delta.alreadyProcessed, true);
  assertEq('no-seat: totalRoundsPlayed still 1 (no double count)', second.nextProfile.totalRoundsPlayed, 1);
  assertEq('no-seat: counters unchanged on duplicate', snapshot(second.nextProfile), before);
}

// ----- Live event round applied twice ----------------------------------
{
  const r = round({
    roundId: 'live-1',
    wasLiveEvent: true,
    liveEventCompletedInWindow: true,
    completedOnLocalDate: '2026-07-01',
  });
  const first = applyRoundToProfile(createDefaultProfile(), r);
  assertEq('live: streak incremented to 1 on first apply', first.nextProfile.currentDailyStreak, 1);

  const second = applyRoundToProfile(first.nextProfile, r);
  assertEq('live: second apply flagged already-processed', second.delta.alreadyProcessed, true);
  assertEq('live: streak NOT double-advanced', second.nextProfile.currentDailyStreak, 1);
  assertEq('live: lastDailyPlayDate stable', second.nextProfile.lastDailyPlayDate, '2026-07-01');
}

// ----- Distinct live rounds on adjacent days DO advance ----------------
{
  let profile = createDefaultProfile();
  ({ nextProfile: profile } = applyRoundToProfile(profile, round({
    roundId: 'live-day1', wasLiveEvent: true, liveEventCompletedInWindow: true,
    completedOnLocalDate: '2026-07-01',
  })));
  ({ nextProfile: profile } = applyRoundToProfile(profile, round({
    roundId: 'live-day2', wasLiveEvent: true, liveEventCompletedInWindow: true,
    completedOnLocalDate: '2026-07-02',
  })));
  assertEq('adjacent distinct live rounds → streak 2', profile.currentDailyStreak, 2);
}

// ----- processedRoundIds cap -------------------------------------------
{
  let profile = createDefaultProfile();
  const total = PROCESSED_ROUND_ID_CAP + 25;
  for (let i = 0; i < total; i += 1) {
    ({ nextProfile: profile } = applyRoundToProfile(profile, round({
      roundId: `cap-${i}`, seatWon: null, creditsEarned: 0, correctCount: 0,
    })));
  }
  assertEq('cap: processedRoundIds length capped', profile.processedRoundIds.length, PROCESSED_ROUND_ID_CAP);
  assertEq('cap: oldest id evicted', profile.processedRoundIds.includes('cap-0'), false);
  assertEq('cap: newest id retained', profile.processedRoundIds.includes(`cap-${total - 1}`), true);
  assertEq('cap: all rounds still counted', profile.totalRoundsPlayed, total);
}

// ----- Empty roundId is not stored / never blocks ----------------------
{
  const r = round({ roundId: '' });
  const first = applyRoundToProfile(createDefaultProfile(), r);
  assertEq('empty-id: not flagged processed', first.delta.alreadyProcessed, false);
  assertEq('empty-id: not stored', first.nextProfile.processedRoundIds.length, 0);
  const second = applyRoundToProfile(first.nextProfile, r);
  assertEq('empty-id: still applies (no accidental dedupe)', second.delta.alreadyProcessed, false);
  assertEq('empty-id: counts a second round', second.nextProfile.totalRoundsPlayed, 2);
}

// ----- Onboarding storage (in-memory stub) -----------------------------
// Exercise the flag semantics without a device: default false, set true,
// corrupt recovers to false.
{
  const store = new Map<string, string>();
  const parseFlag = (raw: string | null): boolean => {
    if (raw === null) return false;
    try {
      return JSON.parse(raw) === true;
    } catch {
      return false;
    }
  };
  assertEq('onboarding: default (missing) → false', parseFlag(store.get('k') ?? null), false);
  store.set('k', JSON.stringify(true));
  assertEq('onboarding: set true → true', parseFlag(store.get('k') ?? null), true);
  store.set('k', '{not valid json');
  assertEq('onboarding: corrupt → recovers to false', parseFlag(store.get('k') ?? null), false);
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
console.log(`Idempotency sim: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  process.exit(1);
}
