/**
 * Records engine.
 *
 * Pure functions that ingest a RoundOutcome and produce a new
 * PlayerProfile with records/medals/counters updated, plus a RetentionDelta
 * describing what changed so the Results screen can celebrate PBs and
 * medal upgrades.
 *
 * Streaks live in ./streaks; medals in ./medals. This module composes
 * both plus the raw counters.
 */
import { evaluateAchievements } from './achievements';
import { advanceChallenges, dailyChallengesForDate } from './challenges';
import { LEAGUE_LABELS } from './events';
import { rarityFromRound } from './rarity';
import {
  bestOf,
  compareMedals,
  computeMedal,
  medalUpgradeHeadline,
} from './medals';
import { advanceStreak } from './streaks';
import {
  DailyChallenge,
  LeagueTierKey,
  LeagueTierRecord,
  Medal,
  OperatorRank,
  PersonalBestDelta,
  PlayerProfile,
  PROCESSED_ROUND_ID_CAP,
  Rarity,
  RetentionDelta,
  RoundOutcome,
  SEAT_TIER_LABELS,
  SeatTier,
  UnlockedAchievement,
} from './types';

/** Higher-index seat = worse; front is 0, mid 1, upper 2. */
const SEAT_ORDER: Record<SeatTier, number> = { front: 0, mid: 1, upper: 2 };

export function leagueTierKey(outcome: Pick<RoundOutcome, 'league' | 'tierLevel'>): LeagueTierKey {
  return `${outcome.league}:${outcome.tierLevel}` as LeagueTierKey;
}

function emptyLeagueTierRecord(): LeagueTierRecord {
  return {
    totalRoundsPlayed: 0,
    totalTicketsWon: 0,
    totalFrontRowsWon: 0,
    bestMedal: 'none',
  };
}

function seatIsBetter(candidate: SeatTier, current: SeatTier | null): boolean {
  if (current === null) {
    return true;
  }
  return SEAT_ORDER[candidate] < SEAT_ORDER[current];
}

function deriveOperatorRank(totalTickets: number, totalFrontRows: number): OperatorRank {
  if (totalTickets >= 40 || totalFrontRows >= 15) {
    return 'Icon';
  }
  if (totalTickets >= 15 || totalFrontRows >= 6) {
    return 'Headliner';
  }
  if (totalTickets >= 3) {
    return 'Regular';
  }
  return 'Rookie';
}

/**
 * Applies a round outcome to the profile. Returns the new profile plus
 * a delta describing what to celebrate on the Results screen.
 *
 * Pure: does not touch AsyncStorage. The caller persists.
 */
export function applyRoundToProfile(
  profile: PlayerProfile,
  outcome: RoundOutcome,
): { nextProfile: PlayerProfile; delta: RetentionDelta } {
  // Idempotency guard: if this exact round was already folded in, return
  // the profile untouched and a delta that says so. The caller/UI must
  // not re-celebrate medals, PBs, or streaks.
  const alreadyProcessed: boolean =
    outcome.roundId !== '' && profile.processedRoundIds.includes(outcome.roundId);
  if (alreadyProcessed) {
    const existingMedal: Medal =
      profile.perLeagueTier[leagueTierKey(outcome)]?.bestMedal ?? 'none';
    return {
      nextProfile: profile,
      delta: {
        alreadyProcessed: true,
        priorMedal: existingMedal,
        newMedal: existingMedal,
        medalUpgraded: false,
        personalBests: [],
        streakEvent: { kind: 'already-claimed', current: profile.currentDailyStreak },
        unlockedAchievements: [],
        completedChallengeTitles: [],
        ticketRarity: null,
      },
    };
  }

  const key: LeagueTierKey = leagueTierKey(outcome);
  const priorLtRecord: LeagueTierRecord =
    profile.perLeagueTier[key] ?? emptyLeagueTierRecord();
  const priorMedal: Medal = priorLtRecord.bestMedal;

  const newMedalCandidate: Medal = computeMedal(outcome);
  const newMedal: Medal = bestOf(priorMedal, newMedalCandidate);
  const medalUpgraded: boolean = compareMedals(newMedal, priorMedal) > 0;

  // Build updated per-league-tier record. `best*` fields update only when
  // this round beats the prior value.
  const updatedLtRecord: LeagueTierRecord = {
    ...priorLtRecord,
    totalRoundsPlayed: priorLtRecord.totalRoundsPlayed + 1,
    totalTicketsWon: priorLtRecord.totalTicketsWon + (outcome.seatWon !== null ? 1 : 0),
    totalFrontRowsWon:
      priorLtRecord.totalFrontRowsWon + (outcome.seatWon === 'front' ? 1 : 0),
    bestMedal: newMedal,
    bestCorrectCount: Math.max(priorLtRecord.bestCorrectCount ?? 0, outcome.correctCount),
    bestCreditsEarned: Math.max(priorLtRecord.bestCreditsEarned ?? 0, outcome.creditsEarned),
    bestCombo: Math.max(priorLtRecord.bestCombo ?? 0, outcome.bestComboThisRound),
    bestSeatTier: outcome.seatWon !== null && seatIsBetter(outcome.seatWon, priorLtRecord.bestSeatTier ?? null)
      ? outcome.seatWon
      : priorLtRecord.bestSeatTier,
  };

  // Compute streak update.
  const streak = advanceStreak(profile, {
    today: outcome.completedOnLocalDate,
    liveEventCompletedInWindow: outcome.liveEventCompletedInWindow,
  });

  // Detect global PBs BEFORE we overwrite the record.
  const priorGlobal = profile.globalRecords;
  const nextGlobal = { ...priorGlobal };
  const personalBests: PersonalBestDelta[] = [];

  const isPerfect: boolean = outcome.correctCount === outcome.totalQuestions;

  // Per-league-tier PBs
  if (outcome.correctCount > (priorLtRecord.bestCorrectCount ?? 0)) {
    personalBests.push({
      key: 'correctCount',
      label: `New PB · ${LEAGUE_LABELS[outcome.league]} T${outcome.tierLevel}`,
      value: `${outcome.correctCount}/${outcome.totalQuestions} correct`,
    });
  }
  if (outcome.creditsEarned > (priorLtRecord.bestCreditsEarned ?? 0)) {
    personalBests.push({
      key: 'creditsEarned',
      label: `New credit high · ${LEAGUE_LABELS[outcome.league]} T${outcome.tierLevel}`,
      value: `${outcome.creditsEarned.toLocaleString()} cr`,
    });
  }
  if (outcome.bestComboThisRound > (priorLtRecord.bestCombo ?? 0)) {
    personalBests.push({
      key: 'combo',
      label: 'Longest combo yet',
      value: `${outcome.bestComboThisRound}-in-a-row`,
    });
  }
  if (
    outcome.seatWon !== null &&
    seatIsBetter(outcome.seatWon, priorLtRecord.bestSeatTier ?? null)
  ) {
    personalBests.push({
      key: 'seatTier',
      label: 'Best seat upgraded',
      value: SEAT_TIER_LABELS[outcome.seatWon],
    });
  }

  // Global PBs
  if (outcome.creditsEarned > priorGlobal.highestCreditsSingleRound) {
    nextGlobal.highestCreditsSingleRound = outcome.creditsEarned;
    personalBests.push({
      key: 'globalCreditsRound',
      label: 'Overall best round',
      value: `${outcome.creditsEarned.toLocaleString()} cr`,
    });
  }
  if (outcome.correctCount > priorGlobal.bestCorrectCount) {
    nextGlobal.bestCorrectCount = outcome.correctCount;
  }
  if (outcome.bestComboThisRound > priorGlobal.bestCombo) {
    nextGlobal.bestCombo = outcome.bestComboThisRound;
  }
  if (outcome.seatWon !== null && seatIsBetter(outcome.seatWon, priorGlobal.bestSeatTier)) {
    nextGlobal.bestSeatTier = outcome.seatWon;
  }
  if (isPerfect) {
    nextGlobal.totalPerfectRounds = priorGlobal.totalPerfectRounds + 1;
    personalBests.push({
      key: 'perfectRound',
      label: 'Perfect gauntlet',
      value: `${outcome.totalQuestions}/${outcome.totalQuestions}`,
    });
  }
  if (streak.event.kind === 'incremented' && streak.event.longestUpdated) {
    personalBests.push({
      key: 'longestStreak',
      label: 'New longest streak',
      value: `${streak.event.to} days`,
    });
  }

  // Assemble the next profile.
  const nextTotalTickets: number = profile.totalTicketsWon + (outcome.seatWon !== null ? 1 : 0);
  const nextTotalFrontRows: number =
    profile.totalFrontRowsWon + (outcome.seatWon === 'front' ? 1 : 0);

  // Record this round id so a re-apply is a no-op. Keep only the most
  // recent PROCESSED_ROUND_ID_CAP so storage stays bounded. Empty ids
  // (defensive) are never stored.
  const nextProcessedRoundIds: string[] =
    outcome.roundId === ''
      ? profile.processedRoundIds
      : [...profile.processedRoundIds, outcome.roundId].slice(-PROCESSED_ROUND_ID_CAP);

  // Advance today's daily challenges (resets progress on date rollover).
  const challengeResult = advanceChallenges(profile, outcome, outcome.completedOnLocalDate);

  // Build the profile with all counters applied first, then evaluate
  // achievements against it so predicates see post-round totals.
  const nextProfile: PlayerProfile = {
    ...profile,
    currentDailyStreak: streak.currentDailyStreak,
    longestDailyStreak: streak.longestDailyStreak,
    lastDailyPlayDate: streak.lastDailyPlayDate,
    totalRoundsPlayed: profile.totalRoundsPlayed + 1,
    totalTicketsWon: nextTotalTickets,
    totalFrontRowsWon: nextTotalFrontRows,
    totalPerfectGauntlets: profile.totalPerfectGauntlets + (isPerfect ? 1 : 0),
    totalCreditsEarned: profile.totalCreditsEarned + outcome.creditsEarned,
    bestOverallCombo: Math.max(profile.bestOverallCombo, outcome.bestComboThisRound),
    bestOverallCredits: Math.max(profile.bestOverallCredits, outcome.creditsEarned),
    operatorRank: deriveOperatorRank(nextTotalTickets, nextTotalFrontRows),
    lastUpdatedAt: new Date().toISOString(),
    perLeagueTier: { ...profile.perLeagueTier, [key]: updatedLtRecord },
    globalRecords: nextGlobal,
    processedRoundIds: nextProcessedRoundIds,
    dailyChallengeDate: outcome.completedOnLocalDate,
    dailyChallengeProgress: challengeResult.progress,
    dailyChallengeCompletedIds: challengeResult.completedIds,
  };

  // Newly-earned achievements (evaluated against the updated profile).
  const unlockedAchievements: UnlockedAchievement[] = evaluateAchievements(
    nextProfile,
    profile.unlockedAchievementIds,
  );
  if (unlockedAchievements.length > 0) {
    nextProfile.unlockedAchievementIds = [
      ...profile.unlockedAchievementIds,
      ...unlockedAchievements.map((a) => a.id),
    ];
  }

  // Titles for challenges that crossed their target this round.
  const todaysChallenges: DailyChallenge[] = dailyChallengesForDate(outcome.completedOnLocalDate);
  const completedChallengeTitles: string[] = challengeResult.newlyCompleted
    .map((id) => todaysChallenges.find((c) => c.id === id)?.title)
    .filter((t): t is string => Boolean(t));

  const roundRarity: Rarity | null = rarityFromRound({
    seatWon: outcome.seatWon,
    correctCount: outcome.correctCount,
    totalQuestions: outcome.totalQuestions,
    wasLiveEvent: outcome.wasLiveEvent,
  });

  const delta: RetentionDelta = {
    alreadyProcessed: false,
    priorMedal,
    newMedal,
    medalUpgraded,
    personalBests,
    streakEvent: streak.event,
    unlockedAchievements,
    completedChallengeTitles,
    ticketRarity: roundRarity,
  };

  // Attach medal headline as a synthetic PB entry if there was one — the
  // Results screen shows medals in its own line, but this keeps callers
  // that only render personalBests informed.
  const headline: string | null = medalUpgradeHeadline(outcome, newMedal, medalUpgraded);
  if (headline && medalUpgraded) {
    delta.personalBests.unshift({
      key: 'seatTier',
      label: 'New medal',
      value: headline.replace(/^New /, ''),
    });
  }

  return { nextProfile, delta };
}

/** Convenience: returns the best medal for a league:tier or 'none'. */
export function bestMedalFor(
  profile: PlayerProfile,
  league: RoundOutcome['league'],
  tierLevel: RoundOutcome['tierLevel'],
): Medal {
  const key: LeagueTierKey = `${league}:${tierLevel}` as LeagueTierKey;
  return profile.perLeagueTier[key]?.bestMedal ?? 'none';
}
