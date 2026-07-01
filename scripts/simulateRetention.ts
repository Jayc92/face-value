/**
 * Retention simulation.
 *
 * Deterministic pass/fail tests for the retention engine — medals,
 * streaks, records, and chase-goal derivation. Runs against the same
 * pure functions the app uses in production. No AsyncStorage; profiles
 * are built in memory.
 *
 * Run with: npx tsx scripts/simulateRetention.ts
 */
import { deriveChaseGoals } from '../src/game/goals';
import { bestOf, compareMedals, computeMedal } from '../src/game/medals';
import { applyRoundToProfile, bestMedalFor } from '../src/game/records';
import { advanceStreak } from '../src/game/streaks';
import {
  Medal,
  PlayerProfile,
  RoundOutcome,
  TierLevel,
} from '../src/game/types';
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

// ----- Medal rules ------------------------------------------------------

let outcomeCounter = 0;

function outcome(overrides: Partial<RoundOutcome>): RoundOutcome {
  outcomeCounter += 1;
  return {
    // Unique per call unless a test explicitly overrides roundId, so each
    // fabricated round is a distinct one the idempotency guard won't block.
    roundId: `sim-round-${outcomeCounter}`,
    league: 'rock',
    tierLevel: 1,
    correctCount: 5,
    totalQuestions: 10,
    creditsEarned: 400,
    bestComboThisRound: 3,
    seatWon: null,
    wasLiveEvent: false,
    liveEventCompletedInWindow: false,
    completedOnLocalDate: '2026-06-30',
    ...overrides,
  };
}

assertEq(
  'medal: no seat won → none',
  computeMedal(outcome({ seatWon: null, correctCount: 10 })),
  'none' as Medal,
);
assertEq(
  'medal: upper seat, weak trivia → bronze',
  computeMedal(outcome({ seatWon: 'upper', correctCount: 2 })),
  'bronze' as Medal,
);
assertEq(
  'medal: mid seat, 6 correct → silver',
  computeMedal(outcome({ seatWon: 'mid', correctCount: 6 })),
  'silver' as Medal,
);
assertEq(
  'medal: mid seat, 5 correct → bronze (needs 6+ for silver)',
  computeMedal(outcome({ seatWon: 'mid', correctCount: 5 })),
  'bronze' as Medal,
);
assertEq(
  'medal: front seat, 8 correct → gold',
  computeMedal(outcome({ seatWon: 'front', correctCount: 8 })),
  'gold' as Medal,
);
assertEq(
  'medal: front seat, 10/10 → platinum',
  computeMedal(outcome({ seatWon: 'front', correctCount: 10 })),
  'platinum' as Medal,
);
assertEq(
  'medal: front seat, 7 correct → silver (front qualifies as mid-or-better + 6+ correct)',
  computeMedal(outcome({ seatWon: 'front', correctCount: 7 })),
  'silver' as Medal,
);
assertEq(
  'medal: front seat, 5 correct → bronze (front but <6 correct)',
  computeMedal(outcome({ seatWon: 'front', correctCount: 5 })),
  'bronze' as Medal,
);
assertEq(
  'bestOf: higher medal wins',
  bestOf('gold', 'silver'),
  'gold' as Medal,
);
assertEq(
  'bestOf: equal medals stay',
  bestOf('silver', 'silver'),
  'silver' as Medal,
);
assert(
  'compareMedals: platinum > bronze',
  compareMedals('platinum', 'bronze') > 0,
);

// ----- Medal persistence (higher replaces lower; lower does not) --------

{
  let profile: PlayerProfile = createDefaultProfile();
  // Weak round: bronze.
  const bronzeRound = outcome({ seatWon: 'upper', correctCount: 2 });
  ({ nextProfile: profile } = applyRoundToProfile(profile, bronzeRound));
  assertEq('persist: after upper win, medal = bronze',
    bestMedalFor(profile, 'rock', 1), 'bronze' as Medal);

  // Strong round: platinum.
  const platRound = outcome({ seatWon: 'front', correctCount: 10, creditsEarned: 1500, bestComboThisRound: 10 });
  ({ nextProfile: profile } = applyRoundToProfile(profile, platRound));
  assertEq('persist: after 10/10 front row, medal = platinum',
    bestMedalFor(profile, 'rock', 1), 'platinum' as Medal);

  // Weak follow-up (a distinct round): bronze — must NOT downgrade.
  const bronzeRound2 = outcome({ seatWon: 'upper', correctCount: 2 });
  ({ nextProfile: profile } = applyRoundToProfile(profile, bronzeRound2));
  assertEq('persist: weak follow-up does not downgrade',
    bestMedalFor(profile, 'rock', 1), 'platinum' as Medal);
}

// ----- Streak rules -----------------------------------------------------

{
  const empty = createDefaultProfile();

  // First live completion → increments 0 → 1.
  const s1 = advanceStreak(empty, { today: '2026-06-30', liveEventCompletedInWindow: true });
  assertEq('streak: first live completion → 1', s1.currentDailyStreak, 1);
  assertEq('streak: longest also 1', s1.longestDailyStreak, 1);
  assertEq('streak: lastDailyPlayDate captured', s1.lastDailyPlayDate, '2026-06-30');

  // Same-day replay (live) → no double-increment.
  const s2 = advanceStreak(
    { currentDailyStreak: 1, longestDailyStreak: 1, lastDailyPlayDate: '2026-06-30' },
    { today: '2026-06-30', liveEventCompletedInWindow: true },
  );
  assertEq('streak: same-day live replay does not increment', s2.currentDailyStreak, 1);
  assert('streak: same-day event kind = already-claimed', s2.event.kind === 'already-claimed');

  // Next calendar day → +1.
  const s3 = advanceStreak(
    { currentDailyStreak: 1, longestDailyStreak: 1, lastDailyPlayDate: '2026-06-30' },
    { today: '2026-07-01', liveEventCompletedInWindow: true },
  );
  assertEq('streak: next calendar day → 2', s3.currentDailyStreak, 2);
  assertEq('streak: longest updated to 2', s3.longestDailyStreak, 2);
  assert('streak: incremented event kind', s3.event.kind === 'incremented');

  // Missed day → reset to 1.
  const s4 = advanceStreak(
    { currentDailyStreak: 5, longestDailyStreak: 5, lastDailyPlayDate: '2026-06-30' },
    { today: '2026-07-02', liveEventCompletedInWindow: true },
  );
  assertEq('streak: 1-day gap resets to 1', s4.currentDailyStreak, 1);
  assertEq('streak: longest preserved after reset', s4.longestDailyStreak, 5);
  assert('streak: reset event kind', s4.event.kind === 'reset');

  // Non-live round (replay) → no effect.
  const s5 = advanceStreak(
    { currentDailyStreak: 3, longestDailyStreak: 3, lastDailyPlayDate: '2026-06-30' },
    { today: '2026-07-01', liveEventCompletedInWindow: false },
  );
  assertEq('streak: non-live round leaves streak alone', s5.currentDailyStreak, 3);
  assertEq('streak: non-live round leaves date alone', s5.lastDailyPlayDate, '2026-06-30');
  assert('streak: not-eligible event kind', s5.event.kind === 'not-eligible');
}

// ----- Personal record deltas ------------------------------------------

{
  let profile: PlayerProfile = createDefaultProfile();
  ({ nextProfile: profile } = applyRoundToProfile(profile, outcome({
    seatWon: 'mid', correctCount: 6, creditsEarned: 500, bestComboThisRound: 4,
  })));
  const { delta: delta2 } = applyRoundToProfile(profile, outcome({
    seatWon: 'mid', correctCount: 4, creditsEarned: 300, bestComboThisRound: 2,
  }));
  const hasCorrectPB = delta2.personalBests.some((pb) => pb.key === 'correctCount');
  assert('records: weaker follow-up does NOT record a new PB',
    !hasCorrectPB, delta2.personalBests);

  const { delta: delta3 } = applyRoundToProfile(profile, outcome({
    seatWon: 'front', correctCount: 9, creditsEarned: 900, bestComboThisRound: 6,
  }));
  const hasCorrectPB3 = delta3.personalBests.some((pb) => pb.key === 'correctCount');
  const hasCreditsPB3 = delta3.personalBests.some((pb) => pb.key === 'creditsEarned');
  const hasSeatPB3 = delta3.personalBests.some((pb) => pb.key === 'seatTier' && pb.label === 'Best seat upgraded');
  assert('records: stronger round records correctCount PB', hasCorrectPB3);
  assert('records: stronger round records credits PB', hasCreditsPB3);
  assert('records: stronger round records seat upgrade', hasSeatPB3);
}

// ----- applyRoundToProfile side effects --------------------------------

{
  let profile: PlayerProfile = createDefaultProfile();
  ({ nextProfile: profile } = applyRoundToProfile(profile, outcome({
    seatWon: 'front', correctCount: 10, creditsEarned: 1200, bestComboThisRound: 10,
    liveEventCompletedInWindow: true, wasLiveEvent: true,
    completedOnLocalDate: '2026-06-30',
  })));
  assertEq('profile: totalRoundsPlayed incremented', profile.totalRoundsPlayed, 1);
  assertEq('profile: totalTicketsWon incremented', profile.totalTicketsWon, 1);
  assertEq('profile: totalFrontRowsWon incremented', profile.totalFrontRowsWon, 1);
  assertEq('profile: totalPerfectGauntlets incremented', profile.totalPerfectGauntlets, 1);
  assertEq('profile: totalCreditsEarned aggregated', profile.totalCreditsEarned, 1200);
  assertEq('profile: currentDailyStreak set', profile.currentDailyStreak, 1);
  assertEq('profile: rank still Rookie at 1 ticket', profile.operatorRank, 'Rookie' as const);

  // Push to Regular threshold.
  for (let i = 0; i < 2; i += 1) {
    ({ nextProfile: profile } = applyRoundToProfile(profile, outcome({
      seatWon: 'upper', correctCount: 4, creditsEarned: 100,
    })));
  }
  assertEq('profile: rank promoted to Regular at 3 tickets', profile.operatorRank, 'Regular' as const);
}

// ----- Chase goals -----------------------------------------------------

{
  const empty = createDefaultProfile();
  const goalsFresh = deriveChaseGoals({
    profile: empty,
    today: '2026-06-30',
    todaysLiveEventLeague: 'rock',
    todaysLiveEventCompleted: false,
    playableTiers: [1, 2] as TierLevel[],
  });
  assert('goals: fresh profile → at least one goal', goalsFresh.length > 0);
  assert('goals: fresh profile suggests live event first',
    goalsFresh[0]?.id.startsWith('streak-'));

  const veteran: PlayerProfile = {
    ...empty,
    totalFrontRowsWon: 2,
    perLeagueTier: {
      'rock:1': {
        totalRoundsPlayed: 5, totalTicketsWon: 3, totalFrontRowsWon: 2,
        bestMedal: 'silver',
      },
    },
  };
  const goalsVet = deriveChaseGoals({
    profile: veteran,
    today: '2026-06-30',
    todaysLiveEventLeague: 'rock',
    todaysLiveEventCompleted: true,
    playableTiers: [1, 2] as TierLevel[],
  });
  const rockMedalGoal = goalsVet.find((g) => g.id === 'medal-rock-1');
  assert('goals: veteran with silver in rock:1 gets a Gold chase',
    Boolean(rockMedalGoal) && (rockMedalGoal?.headline ?? '').includes('Gold'));
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
    if (r.actual !== undefined || r.expected !== undefined) {
      console.log(`      expected=${JSON.stringify(r.expected)} actual=${JSON.stringify(r.actual)}`);
    }
  }
}
console.log('');
console.log(`Retention sim: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  process.exit(1);
}
