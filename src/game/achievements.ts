/**
 * Achievements.
 *
 * Persistent, local, milestone-style unlocks. Each is a pure predicate
 * over the post-round PlayerProfile, so evaluation is deterministic and
 * idempotent — an achievement can only unlock once (its id is stored in
 * profile.unlockedAchievementIds). No RNG, no backend.
 */
import { rarityRank } from './rarity';
import { Achievement, PlayerProfile, Ticket, UnlockedAchievement } from './types';
import { RARITY_ORDER, ticketRarity, Rarity } from './rarity';

/**
 * The catalog. Predicates read only fields already tracked on the profile
 * (counters, records, streaks). Ordered roughly by difficulty for display.
 */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-ticket',
    title: 'First Stub',
    description: 'Win your first ticket.',
    isUnlocked: (p) => p.totalTicketsWon >= 1,
  },
  {
    id: 'front-row-debut',
    title: 'Front Row Debut',
    description: 'Claim your first Front Row seat.',
    isUnlocked: (p) => p.totalFrontRowsWon >= 1,
  },
  {
    id: 'perfect-round',
    title: 'Flawless',
    description: 'Finish a gauntlet 10 for 10.',
    isUnlocked: (p) => p.totalPerfectGauntlets >= 1,
  },
  {
    id: 'combo-master',
    title: 'On Fire',
    description: 'Reach a 10-answer combo in one round.',
    isUnlocked: (p) => p.bestOverallCombo >= 10,
  },
  {
    id: 'streak-3',
    title: 'Regular',
    description: 'Keep a 3-day live streak.',
    isUnlocked: (p) => p.longestDailyStreak >= 3,
  },
  {
    id: 'streak-7',
    title: 'Season Ticket Holder',
    description: 'Keep a 7-day live streak.',
    isUnlocked: (p) => p.longestDailyStreak >= 7,
  },
  {
    id: 'collector-10',
    title: 'Collector',
    description: 'Win 10 tickets in total.',
    isUnlocked: (p) => p.totalTicketsWon >= 10,
  },
  {
    id: 'front-row-5',
    title: 'Floor General',
    description: 'Claim 5 Front Row seats.',
    isUnlocked: (p) => p.totalFrontRowsWon >= 5,
  },
  {
    id: 'high-roller',
    title: 'High Roller',
    description: 'Earn 2,000 credits in a single round.',
    isUnlocked: (p) => p.globalRecords.highestCreditsSingleRound >= 2000,
  },
  {
    id: 'headliner-rank',
    title: 'Headliner',
    description: 'Reach the Headliner rank.',
    isUnlocked: (p) => p.operatorRank === 'Headliner' || p.operatorRank === 'Icon',
  },
];

const ACHIEVEMENTS_BY_ID: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

/**
 * Given the profile AFTER a round's counters have been applied, returns
 * the ids of any achievements newly satisfied that aren't already in
 * `alreadyUnlocked`. Pure — the caller merges these into the profile.
 */
export function evaluateAchievements(
  profile: PlayerProfile,
  alreadyUnlocked: string[],
): UnlockedAchievement[] {
  const unlocked: UnlockedAchievement[] = [];
  for (const achievement of ACHIEVEMENTS) {
    if (alreadyUnlocked.includes(achievement.id)) {
      continue;
    }
    if (achievement.isUnlocked(profile)) {
      unlocked.push({
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
      });
    }
  }
  return unlocked;
}

/** Total defined achievements (for "N / M unlocked" display). */
export const ACHIEVEMENT_COUNT: number = ACHIEVEMENTS.length;

export function achievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS_BY_ID[id];
}

/**
 * Rarest rarity present across a set of tickets, or null when empty.
 * Small helper the Vault uses for its "rarest pull" line.
 */
export function rarestTicketRarity(tickets: Ticket[]): Rarity | null {
  let best: Rarity | null = null;
  for (const ticket of tickets) {
    const rarity = ticketRarity(ticket);
    if (best === null || rarityRank(rarity) > rarityRank(best)) {
      best = rarity;
    }
  }
  return best;
}

/** All rarities, exported for callers that want the full ladder. */
export { RARITY_ORDER };
