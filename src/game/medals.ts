/**
 * Medal engine.
 *
 * Medals are deterministic per round outcome. Ranked lowest → highest
 * as `none → bronze → silver → gold → platinum`. A no-seat round never
 * earns a medal; higher medals never regress.
 *
 * Rules (v1):
 *  - Bronze:   any ticket won in this league/tier
 *  - Silver:   Mid Level or better AND ≥6/10 correct
 *  - Gold:     Front Row       AND ≥8/10 correct
 *  - Platinum: Front Row       AND 10/10 correct
 */
import {
  LEAGUE_LABELS,
} from './events';
import {
  Medal,
  MEDAL_ORDER,
  RoundOutcome,
} from './types';

export function medalRank(medal: Medal): number {
  return MEDAL_ORDER.indexOf(medal);
}

export function compareMedals(a: Medal, b: Medal): number {
  return medalRank(a) - medalRank(b);
}

/** Returns the higher of two medals. */
export function bestOf(a: Medal, b: Medal): Medal {
  return compareMedals(a, b) >= 0 ? a : b;
}

/**
 * Computes the medal earned from a round outcome. `outcome.seatWon` and
 * `outcome.correctCount` are the only inputs that matter — everything
 * else is context.
 */
export function computeMedal(outcome: RoundOutcome): Medal {
  if (outcome.seatWon === null) {
    return 'none';
  }
  const isFront: boolean = outcome.seatWon === 'front';
  const isMidOrBetter: boolean = outcome.seatWon === 'front' || outcome.seatWon === 'mid';

  if (isFront && outcome.correctCount === outcome.totalQuestions) {
    return 'platinum';
  }
  if (isFront && outcome.correctCount >= 8) {
    return 'gold';
  }
  if (isMidOrBetter && outcome.correctCount >= 6) {
    return 'silver';
  }
  return 'bronze';
}

/** Human copy for a medal upgrade — used by Results. */
export function medalUpgradeHeadline(
  outcome: RoundOutcome,
  newMedal: Medal,
  wasUpgrade: boolean,
): string | null {
  if (newMedal === 'none') {
    return null;
  }
  const league: string = LEAGUE_LABELS[outcome.league];
  const tier: string = `T${outcome.tierLevel}`;
  if (wasUpgrade) {
    return `New ${capitalize(newMedal)} medal · ${league} ${tier}`;
  }
  return `Best medal retained · ${capitalize(newMedal)} in ${league} ${tier}`;
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
