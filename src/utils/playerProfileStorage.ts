import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalRecords, PlayerProfile } from '../game/types';
import { StorageError } from './storage';

/**
 * Player profile is stored separately from the Ticket Vault so a future
 * profile migration (or corruption) never risks the vault. The key is
 * versioned; when we bump the schema we'll add a `v2` key and migrate
 * from `v1` on read.
 */
export const PLAYER_PROFILE_KEY = 'facevalue/playerProfile/v1';

const CURRENT_SCHEMA_VERSION = 1 as const;

const EMPTY_GLOBAL_RECORDS: GlobalRecords = {
  highestCreditsSingleRound: 0,
  bestCorrectCount: 0,
  bestCombo: 0,
  bestSeatTier: null,
  totalPerfectRounds: 0,
};

/**
 * Returns a fresh, default profile. Used on first launch and as the
 * recovery fallback when we detect corrupt profile data.
 */
export function createDefaultProfile(): PlayerProfile {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    currentDailyStreak: 0,
    longestDailyStreak: 0,
    lastDailyPlayDate: null,
    totalRoundsPlayed: 0,
    totalTicketsWon: 0,
    totalFrontRowsWon: 0,
    totalPerfectGauntlets: 0,
    totalCreditsEarned: 0,
    bestOverallCombo: 0,
    bestOverallCredits: 0,
    operatorRank: 'Rookie',
    lastUpdatedAt: new Date().toISOString(),
    perLeagueTier: {},
    globalRecords: { ...EMPTY_GLOBAL_RECORDS },
    processedRoundIds: [],
    unlockedAchievementIds: [],
    dailyChallengeProgress: {},
    dailyChallengeDate: null,
    dailyChallengeCompletedIds: [],
  };
}

/**
 * Migrates older schemas up to the current one. For v1 this is a no-op
 * but keeps the pattern in place so future adds don't cascade edits.
 */
function migrateProfile(raw: unknown): PlayerProfile {
  if (!raw || typeof raw !== 'object') {
    throw new Error('profile is not an object');
  }
  const candidate = raw as Partial<PlayerProfile>;

  // Any missing required fields fall back to defaults — partial recovery
  // is better than nuking a real profile because one field went missing.
  const defaults = createDefaultProfile();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    currentDailyStreak: candidate.currentDailyStreak ?? defaults.currentDailyStreak,
    longestDailyStreak: candidate.longestDailyStreak ?? defaults.longestDailyStreak,
    lastDailyPlayDate: candidate.lastDailyPlayDate ?? null,
    totalRoundsPlayed: candidate.totalRoundsPlayed ?? 0,
    totalTicketsWon: candidate.totalTicketsWon ?? 0,
    totalFrontRowsWon: candidate.totalFrontRowsWon ?? 0,
    totalPerfectGauntlets: candidate.totalPerfectGauntlets ?? 0,
    totalCreditsEarned: candidate.totalCreditsEarned ?? 0,
    bestOverallCombo: candidate.bestOverallCombo ?? 0,
    bestOverallCredits: candidate.bestOverallCredits ?? 0,
    operatorRank: candidate.operatorRank ?? defaults.operatorRank,
    lastUpdatedAt: candidate.lastUpdatedAt ?? defaults.lastUpdatedAt,
    perLeagueTier: candidate.perLeagueTier ?? {},
    globalRecords: candidate.globalRecords ?? { ...EMPTY_GLOBAL_RECORDS },
    // Migration-safe default: profiles written before idempotency existed
    // simply start with an empty processed-id list.
    processedRoundIds: Array.isArray(candidate.processedRoundIds)
      ? candidate.processedRoundIds
      : [],
    // Collectible/challenge fields added after the original schema —
    // older profiles migrate in with empty defaults (no data loss).
    unlockedAchievementIds: Array.isArray(candidate.unlockedAchievementIds)
      ? candidate.unlockedAchievementIds
      : [],
    dailyChallengeProgress:
      candidate.dailyChallengeProgress && typeof candidate.dailyChallengeProgress === 'object'
        ? candidate.dailyChallengeProgress
        : {},
    dailyChallengeDate: candidate.dailyChallengeDate ?? null,
    dailyChallengeCompletedIds: Array.isArray(candidate.dailyChallengeCompletedIds)
      ? candidate.dailyChallengeCompletedIds
      : [],
  };
}

/**
 * Loads the player profile from device storage. Corrupt or missing data
 * returns a fresh default profile rather than crashing the app; corruption
 * is logged loudly so it doesn't pass silently.
 */
export async function loadPlayerProfile(): Promise<PlayerProfile> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(PLAYER_PROFILE_KEY);
  } catch (error) {
    throw new StorageError('Failed to read player profile from device storage', error);
  }
  if (raw === null) {
    return createDefaultProfile();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return migrateProfile(parsed);
  } catch (error) {
    console.error('Player profile data was corrupt; resetting to defaults', error);
    return createDefaultProfile();
  }
}

export async function savePlayerProfile(profile: PlayerProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    throw new StorageError('Failed to save player profile to device storage', error);
  }
}

/** Dev-only: removes the player profile key entirely. */
export async function clearPlayerProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PLAYER_PROFILE_KEY);
  } catch (error) {
    throw new StorageError('Failed to clear the player profile', error);
  }
}
