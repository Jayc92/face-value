/**
 * Daily challenges.
 *
 * Three challenges are generated per local calendar day, seeded by the
 * date so every restart on the same day yields the same set (and no RNG
 * drift). Progress is tracked in the PlayerProfile and reset when the
 * date rolls over. All local — no backend.
 */
import { createSeededRandom, hashString } from '../utils/rng';
import { LEAGUE_LABELS, LEAGUES } from './events';
import {
  ChallengeMetric,
  DailyChallenge,
  DailyChallengeStatus,
  League,
  PlayerProfile,
  RoundOutcome,
} from './types';

interface ChallengeTemplate {
  metric: ChallengeMetric;
  /** Candidate targets; one is chosen deterministically. */
  targets: number[];
  /** Builds the display title given the chosen target + optional league. */
  title: (target: number, leagueLabel: string | null) => string;
  /** If true, the challenge may be scoped to a random league. */
  leagueScoped: boolean;
}

const TEMPLATES: ChallengeTemplate[] = [
  {
    metric: 'correctAnswers',
    targets: [12, 16, 20],
    leagueScoped: false,
    title: (t) => `Answer ${t} questions correctly`,
  },
  {
    metric: 'ticketsWon',
    targets: [1, 2, 3],
    leagueScoped: false,
    title: (t) => `Win ${t} ${t === 1 ? 'ticket' : 'tickets'}`,
  },
  {
    metric: 'frontRowWins',
    targets: [1, 2],
    leagueScoped: false,
    title: (t) => `Claim ${t} Front Row ${t === 1 ? 'seat' : 'seats'}`,
  },
  {
    metric: 'creditsEarned',
    targets: [800, 1200, 1800],
    leagueScoped: false,
    title: (t) => `Earn ${t.toLocaleString()} credits`,
  },
  {
    metric: 'bestCombo',
    targets: [5, 7, 10],
    leagueScoped: false,
    title: (t) => `Hit a ${t}-answer combo`,
  },
  {
    metric: 'roundsPlayed',
    targets: [2, 3],
    leagueScoped: false,
    title: (t) => `Play ${t} rounds`,
  },
  {
    metric: 'ticketsWon',
    targets: [1, 2],
    leagueScoped: true,
    title: (t, l) => `Win ${t} ${l} ${t === 1 ? 'ticket' : 'tickets'}`,
  },
];

/**
 * Generates today's three challenges. Deterministic: same dateKey →
 * same three challenges, always distinct metrics.
 */
export function dailyChallengesForDate(dateKey: string): DailyChallenge[] {
  const random = createSeededRandom(hashString(`challenges-${dateKey}`));

  // Shuffle template indices deterministically, then pick the first three
  // with distinct metrics.
  const order: number[] = TEMPLATES.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const chosen: DailyChallenge[] = [];
  const usedMetrics = new Set<ChallengeMetric>();
  for (const templateIndex of order) {
    if (chosen.length === 3) {
      break;
    }
    const template = TEMPLATES[templateIndex];
    if (usedMetrics.has(template.metric)) {
      continue;
    }
    usedMetrics.add(template.metric);

    const target: number = template.targets[Math.floor(random() * template.targets.length)];
    const league: League | undefined = template.leagueScoped
      ? LEAGUES[Math.floor(random() * LEAGUES.length)]
      : undefined;
    const leagueLabel: string | null = league ? LEAGUE_LABELS[league] : null;

    chosen.push({
      id: `dc-${dateKey}-${template.metric}${league ? `-${league}` : ''}`,
      title: template.title(target, leagueLabel),
      metric: template.metric,
      target,
      league,
    });
  }
  return chosen;
}

/**
 * How much a single round contributes to a given challenge metric. Pure.
 */
export function roundContribution(challenge: DailyChallenge, outcome: RoundOutcome): number {
  if (challenge.league && challenge.league !== outcome.league) {
    return 0;
  }
  switch (challenge.metric) {
    case 'correctAnswers':
      return outcome.correctCount;
    case 'creditsEarned':
      return outcome.creditsEarned;
    case 'ticketsWon':
      return outcome.seatWon !== null ? 1 : 0;
    case 'frontRowWins':
      return outcome.seatWon === 'front' ? 1 : 0;
    case 'roundsPlayed':
      return 1;
    case 'bestCombo':
      // Combo is a "reach" metric, not cumulative — handled specially in
      // advanceChallenges (we store the max, not a sum).
      return outcome.bestComboThisRound;
    default:
      return 0;
  }
}

/** True when a metric is a "reach the highest single value" style goal. */
function isReachMetric(metric: ChallengeMetric): boolean {
  return metric === 'bestCombo';
}

/**
 * Builds today's challenge statuses from the profile's stored progress.
 * If the profile's challenge date is stale (or null), progress reads as 0
 * for today — the caller resets it on the next round application.
 */
export function challengeStatuses(
  profile: PlayerProfile,
  dateKey: string,
): DailyChallengeStatus[] {
  const challenges = dailyChallengesForDate(dateKey);
  const freshDay: boolean = profile.dailyChallengeDate === dateKey;
  return challenges.map((challenge) => {
    const progress: number = freshDay ? profile.dailyChallengeProgress[challenge.id] ?? 0 : 0;
    return {
      challenge,
      progress: Math.min(progress, challenge.target),
      complete: progress >= challenge.target,
    };
  });
}

export interface ChallengeAdvanceResult {
  /** New progress map for today. */
  progress: Record<string, number>;
  /** Challenge ids newly completed by this round (for celebration). */
  newlyCompleted: string[];
  /** Full completed-id list for today after this round. */
  completedIds: string[];
}

/**
 * Advances daily-challenge progress for one round. Resets progress if the
 * stored date differs from today. Returns the new progress + which
 * challenges just crossed their target so the UI can celebrate them once.
 */
export function advanceChallenges(
  profile: PlayerProfile,
  outcome: RoundOutcome,
  dateKey: string,
): ChallengeAdvanceResult {
  const challenges = dailyChallengesForDate(dateKey);
  const sameDay: boolean = profile.dailyChallengeDate === dateKey;

  const prevProgress: Record<string, number> = sameDay ? profile.dailyChallengeProgress : {};
  const prevCompleted: string[] = sameDay ? profile.dailyChallengeCompletedIds : [];

  const progress: Record<string, number> = {};
  const completedIds: string[] = [...prevCompleted];
  const newlyCompleted: string[] = [];

  for (const challenge of challenges) {
    const prior: number = prevProgress[challenge.id] ?? 0;
    const contribution: number = roundContribution(challenge, outcome);
    const next: number = isReachMetric(challenge.metric)
      ? Math.max(prior, contribution)
      : prior + contribution;
    progress[challenge.id] = next;

    if (next >= challenge.target && !completedIds.includes(challenge.id)) {
      completedIds.push(challenge.id);
      newlyCompleted.push(challenge.id);
    }
  }

  return { progress, newlyCompleted, completedIds };
}
