import { shuffleArray } from '../utils/rng';
import { QUESTIONS_PER_ROUND } from './scoring';
import { TIER_CONFIGS } from './tiers';
import { Difficulty, League, TierLevel, TriviaQuestion } from './types';

import rockQuestions from '../data/rock.json';
import hiphopQuestions from '../data/hiphop.json';
import popQuestions from '../data/pop.json';
import countryQuestions from '../data/country.json';
import sportsQuestions from '../data/sports.json';

/**
 * To add a new league: drop a JSON file in src/data, import it, and add it
 * here plus the League union in types.ts and the labels in events.ts.
 * Adding more questions to an existing league needs no code changes at all.
 */
const QUESTION_BANKS: Record<League, TriviaQuestion[]> = {
  rock: rockQuestions as TriviaQuestion[],
  hiphop: hiphopQuestions as TriviaQuestion[],
  pop: popQuestions as TriviaQuestion[],
  country: countryQuestions as TriviaQuestion[],
  sports: sportsQuestions as TriviaQuestion[],
};

export function questionsForLeague(league: League): TriviaQuestion[] {
  return QUESTION_BANKS[league];
}

/**
 * Draws the 10-question gauntlet for a league + tier.
 *
 * The tier's difficultyMix says how many easy/medium/hard questions to
 * deal. If a difficulty bucket runs short, the gap is backfilled from the
 * remaining pool so the round always has a full 10 questions.
 */
export function drawGauntletQuestions(league: League, tierLevel: TierLevel): TriviaQuestion[] {
  const bank: TriviaQuestion[] = QUESTION_BANKS[league];
  const mix: Record<Difficulty, number> = TIER_CONFIGS[tierLevel].difficultyMix;

  const drawn: TriviaQuestion[] = [];
  const usedIds = new Set<string>();

  (Object.keys(mix) as Difficulty[]).forEach((difficulty: Difficulty) => {
    const wanted: number = mix[difficulty];
    const pool: TriviaQuestion[] = shuffleArray(bank.filter((q) => q.difficulty === difficulty));
    for (const question of pool.slice(0, wanted)) {
      drawn.push(question);
      usedIds.add(question.id);
    }
  });

  if (drawn.length < QUESTIONS_PER_ROUND) {
    const backfill: TriviaQuestion[] = shuffleArray(bank.filter((q) => !usedIds.has(q.id)));
    drawn.push(...backfill.slice(0, QUESTIONS_PER_ROUND - drawn.length));
  }

  return shuffleArray(drawn).slice(0, QUESTIONS_PER_ROUND);
}
