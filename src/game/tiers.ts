import { TierConfig, TierLevel } from './types';

/**
 * Progression ladder. Tiers 3 and 4 are visible on the League screen to
 * tease progression but are flagged comingSoon and not playable in v1.
 *
 * fanScoreRequired is measured in total tickets won across all leagues.
 */
/**
 * Tier balance.
 *
 * seatReserves are the *minimum* winning bid per tier — a Front Row bid
 * below the reserve loses the seat. The reserves are sized to be roughly
 * what a 7-correct, no-streak, easy-mix round earns at that tier, so a
 * weak round can't accidentally squeak into the front. The values below
 * are tuned against:
 *   - 2/10 correct, no streak, Tier 1: ~120-180 credits
 *   - 5/10 correct, light streak, Tier 1: ~350-500 credits
 *   - 8/10 correct, multiple streaks, Tier 1: ~700-900 credits
 *   - 10/10 with full streak, Tier 1: ~1400+ credits
 *
 * AI pools are sized so a weak round meets aggressive AI, while a strong
 * round still has to fight for Front Row.
 */
export const TIER_CONFIGS: Record<TierLevel, TierConfig> = {
  1: {
    level: 1,
    name: 'Local Show',
    tagline: 'Small room, big dreams',
    aiBidderCount: 2,
    difficultyMix: { easy: 7, medium: 3, hard: 0 },
    fanScoreRequired: 0,
    aiBaseCreditPool: 520,
    aiAggressionRange: [0.4, 0.65],
    seatReserves: { front: 260, mid: 100, upper: 30 },
    comingSoon: false,
  },
  2: {
    level: 2,
    name: 'Regional Tour',
    tagline: 'The buses are rolling',
    aiBidderCount: 3,
    difficultyMix: { easy: 3, medium: 5, hard: 2 },
    fanScoreRequired: 3,
    aiBaseCreditPool: 1100,
    aiAggressionRange: [0.5, 0.75],
    seatReserves: { front: 550, mid: 220, upper: 70 },
    comingSoon: false,
  },
  3: {
    level: 3,
    name: 'Arena Headliner',
    tagline: 'Lights. Lasers. Legends.',
    aiBidderCount: 4,
    difficultyMix: { easy: 1, medium: 4, hard: 5 },
    fanScoreRequired: 8,
    aiBaseCreditPool: 2000,
    aiAggressionRange: [0.65, 0.9],
    seatReserves: { front: 1100, mid: 450, upper: 130 },
    comingSoon: true,
  },
  4: {
    level: 4,
    name: 'Festival Mainstage',
    tagline: 'Every genre. One weekend.',
    aiBidderCount: 4,
    difficultyMix: { easy: 0, medium: 4, hard: 6 },
    fanScoreRequired: 15,
    aiBaseCreditPool: 2800,
    aiAggressionRange: [0.75, 0.95],
    seatReserves: { front: 1600, mid: 650, upper: 180 },
    comingSoon: true,
  },
};

export const PLAYABLE_TIERS: TierLevel[] = [1, 2];

/** Highest tier the player has unlocked for a given Fan Score. */
export function unlockedTierLevels(fanScore: number): TierLevel[] {
  return (Object.values(TIER_CONFIGS) as TierConfig[])
    .filter((tier: TierConfig) => fanScore >= tier.fanScoreRequired)
    .map((tier: TierConfig) => tier.level);
}

export function isTierPlayable(level: TierLevel, fanScore: number): boolean {
  const config: TierConfig = TIER_CONFIGS[level];
  return !config.comingSoon && fanScore >= config.fanScoreRequired;
}
