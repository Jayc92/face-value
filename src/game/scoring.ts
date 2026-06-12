import { Difficulty } from './types';

/** Seconds the player has to answer each gauntlet question. */
export const QUESTION_TIME_SECONDS = 15;

/** Questions per gauntlet round. */
export const QUESTIONS_PER_ROUND = 10;

/** Base credits for a correct answer, before speed and streak bonuses. */
const BASE_CREDITS_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 80,
  medium: 120,
  hard: 180,
};

/**
 * Hype Multiplier ladder. A streak of 3+ correct answers heats things up;
 * longer streaks climb the ladder. Wrong answers reset the streak to 0.
 */
export function hypeMultiplierForStreak(streak: number): number {
  if (streak >= 8) {
    return 3;
  }
  if (streak >= 5) {
    return 2;
  }
  if (streak >= 3) {
    return 1.5;
  }
  return 1;
}

export interface CreditCalculation {
  creditsEarned: number;
  multiplierApplied: number;
}

/**
 * Credits for one answer.
 *
 * Speed matters: an instant answer earns the full base, while answering at
 * the buzzer earns half — so the reward floor never feels punishing but
 * fast play is clearly better. The streak passed in must already include
 * this answer (i.e. increment the streak first, then call this).
 */
export function creditsForAnswer(
  wasCorrect: boolean,
  difficulty: Difficulty,
  secondsRemaining: number,
  streakIncludingThisAnswer: number,
  liveEventBonusActive: boolean,
): CreditCalculation {
  if (!wasCorrect) {
    return { creditsEarned: 0, multiplierApplied: 1 };
  }

  const base: number = BASE_CREDITS_BY_DIFFICULTY[difficulty];
  const clampedSeconds: number = Math.max(0, Math.min(QUESTION_TIME_SECONDS, secondsRemaining));
  const speedFactor: number = 0.5 + 0.5 * (clampedSeconds / QUESTION_TIME_SECONDS);
  const multiplier: number = hypeMultiplierForStreak(streakIncludingThisAnswer);
  const liveFactor: number = liveEventBonusActive ? 2 : 1;

  const creditsEarned: number = Math.round(base * speedFactor * multiplier * liveFactor);
  return { creditsEarned, multiplierApplied: multiplier };
}
