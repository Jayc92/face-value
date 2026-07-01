/**
 * Chase-goal generator.
 *
 * Produces 2–3 deterministic, locally-derived goals for the Home
 * "Tonight's targets" list. No fake marketing text — every goal is
 * anchored to something in the player's local profile.
 *
 * Priorities (highest first):
 *  1. Live streak unclaimed today → "Keep your N-day streak alive"
 *  2. Front Row not yet earned in any league → "Win your first Front Row"
 *  3. Any league:tier where the player is short of the next PB threshold
 *  4. New league to try (least-played)
 *  5. Fall-through: replay best league for a medal upgrade
 */
import { LEAGUE_LABELS, LEAGUES } from './events';
import { medalRank } from './medals';
import {
  ChaseGoal,
  League,
  Medal,
  PlayerProfile,
  TierLevel,
} from './types';

interface GoalInputs {
  profile: PlayerProfile;
  today: string;
  todaysLiveEventLeague: League;
  todaysLiveEventCompleted: boolean;
  /** Which tier levels are currently playable (1 and 2 for v1). */
  playableTiers: TierLevel[];
}

const NEXT_MEDAL_LABEL: Record<Medal, string> = {
  none: 'Bronze',
  bronze: 'Silver',
  silver: 'Gold',
  gold: 'Platinum',
  platinum: 'Platinum',
};

/**
 * Returns 2–3 chase goals derived from the profile. Deterministic:
 * same profile + same day = same list, so the Home screen doesn't
 * flicker between renders.
 */
export function deriveChaseGoals(inputs: GoalInputs): ChaseGoal[] {
  const { profile, today, todaysLiveEventLeague, todaysLiveEventCompleted } = inputs;
  const goals: ChaseGoal[] = [];

  // 1. Live streak
  if (!todaysLiveEventCompleted) {
    if (profile.currentDailyStreak > 0 && profile.lastDailyPlayDate) {
      const yesterday: string = yesterdayOf(today);
      if (profile.lastDailyPlayDate === yesterday) {
        goals.push({
          id: 'streak-keep',
          headline: `Keep your ${profile.currentDailyStreak}-day streak alive`,
          detail: `Complete tonight's ${LEAGUE_LABELS[todaysLiveEventLeague]} live event`,
          league: todaysLiveEventLeague,
          cta: 'live',
        });
      } else {
        goals.push({
          id: 'streak-restart',
          headline: 'Start a new daily streak',
          detail: `Tonight's live event · ${LEAGUE_LABELS[todaysLiveEventLeague]}`,
          league: todaysLiveEventLeague,
          cta: 'live',
        });
      }
    } else {
      goals.push({
        id: 'streak-first',
        headline: 'Start your first daily streak',
        detail: `Complete tonight's ${LEAGUE_LABELS[todaysLiveEventLeague]} live event`,
        league: todaysLiveEventLeague,
        cta: 'live',
      });
    }
  }

  // 2. First Front Row anywhere
  if (profile.totalFrontRowsWon === 0) {
    goals.push({
      id: 'first-front',
      headline: 'Win your first Front Row',
      detail: 'Any league, any tier',
      cta: 'league',
    });
  }

  // 3. Best-league medal upgrade
  const medalGoal = deriveMedalUpgradeGoal(profile, inputs.playableTiers);
  if (medalGoal) {
    goals.push(medalGoal);
  }

  // 4. Least-played league (only if we still have room)
  if (goals.length < 3) {
    const untouched = leastPlayedLeague(profile);
    if (untouched) {
      goals.push({
        id: `try-${untouched}`,
        headline: `Try the ${LEAGUE_LABELS[untouched]} circuit`,
        detail: 'Every league counts toward Fan Score',
        league: untouched,
        cta: 'league',
      });
    }
  }

  // 5. Fall-through
  if (goals.length === 0) {
    goals.push({
      id: 'replay-any',
      headline: 'Chase another ticket',
      detail: 'Every round adds to your Fan Score',
      cta: 'league',
    });
  }

  return goals.slice(0, 3);
}

function deriveMedalUpgradeGoal(
  profile: PlayerProfile,
  playableTiers: TierLevel[],
): ChaseGoal | null {
  // Find the league:tier the player has ROOM to upgrade (not already Platinum)
  // and pick the one nearest to the next medal — prefer the one with the
  // highest current medal so we point them at the closest reward.
  let bestKey: string | null = null;
  let bestMedal: Medal = 'none';
  let bestLeague: League | null = null;
  let bestTier: TierLevel | null = null;

  for (const league of LEAGUES) {
    for (const tier of playableTiers) {
      const key = `${league}:${tier}`;
      const record = profile.perLeagueTier[key as keyof typeof profile.perLeagueTier];
      const currentMedal: Medal = record?.bestMedal ?? 'none';
      if (currentMedal === 'platinum') {
        continue;
      }
      if (medalRank(currentMedal) > medalRank(bestMedal) || bestKey === null) {
        bestKey = key;
        bestMedal = currentMedal;
        bestLeague = league;
        bestTier = tier;
      }
    }
  }

  if (bestLeague === null || bestTier === null) {
    return null;
  }
  const next: string = NEXT_MEDAL_LABEL[bestMedal];
  return {
    id: `medal-${bestLeague}-${bestTier}`,
    headline: `Chase ${next} in ${LEAGUE_LABELS[bestLeague]} T${bestTier}`,
    detail: bestMedal === 'none'
      ? 'Win any ticket to earn Bronze'
      : `Currently ${capitalize(bestMedal)}`,
    league: bestLeague,
    cta: 'league',
  };
}

function leastPlayedLeague(profile: PlayerProfile): League | null {
  const counts: Record<League, number> = { rock: 0, hiphop: 0, pop: 0, country: 0, sports: 0 };
  for (const key of Object.keys(profile.perLeagueTier)) {
    const [league] = key.split(':') as [League];
    const record = profile.perLeagueTier[key as keyof typeof profile.perLeagueTier];
    counts[league] += record?.totalRoundsPlayed ?? 0;
  }
  let least: League | null = null;
  let leastCount: number = Number.POSITIVE_INFINITY;
  for (const league of LEAGUES) {
    if (counts[league] < leastCount) {
      leastCount = counts[league];
      least = league;
    }
  }
  return leastCount === 0 ? least : null;
}

function yesterdayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
