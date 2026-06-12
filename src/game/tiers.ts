import { TierConfig, TierLevel } from './types';

/**
 * Progression ladder. Tiers 3 and 4 are visible on the League screen to
 * tease progression but are flagged comingSoon and not playable in v1.
 *
 * fanScoreRequired is measured in total tickets won across all leagues.
 */
export const TIER_CONFIGS: Record<TierLevel, TierConfig> = {
  1: {
    level: 1,
    name: 'Local Show',
    tagline: 'Small room, big dreams',
    aiBidderCount: 2,
    difficultyMix: { easy: 7, medium: 3, hard: 0 },
    fanScoreRequired: 0,
    aiBaseCreditPool: 600,
    aiAggressionRange: [0.25, 0.55],
    comingSoon: false,
  },
  2: {
    level: 2,
    name: 'Regional Tour',
    tagline: 'The buses are rolling',
    aiBidderCount: 3,
    difficultyMix: { easy: 3, medium: 5, hard: 2 },
    fanScoreRequired: 3,
    aiBaseCreditPool: 1000,
    aiAggressionRange: [0.45, 0.75],
    comingSoon: false,
  },
  3: {
    level: 3,
    name: 'Arena Headliner',
    tagline: 'Lights. Lasers. Legends.',
    aiBidderCount: 4,
    difficultyMix: { easy: 1, medium: 4, hard: 5 },
    fanScoreRequired: 8,
    aiBaseCreditPool: 1600,
    aiAggressionRange: [0.6, 0.9],
    comingSoon: true,
  },
  4: {
    level: 4,
    name: 'Festival Mainstage',
    tagline: 'Every genre. One weekend.',
    aiBidderCount: 4,
    difficultyMix: { easy: 0, medium: 4, hard: 6 },
    fanScoreRequired: 15,
    aiBaseCreditPool: 2400,
    aiAggressionRange: [0.7, 0.95],
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
