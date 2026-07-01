/**
 * Shared domain types for Face Value.
 *
 * Everything the game engine and screens exchange flows through these
 * types so the trivia data, bidding logic, and persistence stay in sync.
 */

export type League = 'rock' | 'hiphop' | 'pop' | 'country' | 'sports';

export type Difficulty = 'easy' | 'medium' | 'hard';

/** Shape of every entry in the src/data/*.json question banks. */
export interface TriviaQuestion {
  id: string;
  league: League;
  difficulty: Difficulty;
  question: string;
  choices: string[];
  correctIndex: number;
  funFact: string;
}

/** The three seat tiers players bid on at the Bidding Floor. */
export type SeatTier = 'front' | 'mid' | 'upper';

export const SEAT_TIERS: SeatTier[] = ['front', 'mid', 'upper'];

export const SEAT_TIER_LABELS: Record<SeatTier, string> = {
  front: 'Front Row',
  mid: 'Mid Level',
  upper: 'Upper Deck',
};

/** Progression tier levels. Tiers 3 and 4 are defined but locked in v1. */
export type TierLevel = 1 | 2 | 3 | 4;

export interface TierConfig {
  level: TierLevel;
  name: string;
  tagline: string;
  /** How many AI opponents show up on the Bidding Floor. */
  aiBidderCount: number;
  /** Weighted difficulty mix used when drawing the 10-question gauntlet. */
  difficultyMix: Record<Difficulty, number>;
  /** Fan Score (total tickets won) required to unlock this tier. */
  fanScoreRequired: number;
  /** Base credit pool AI bidders are built around at this tier. */
  aiBaseCreditPool: number;
  /** Aggression range for AI bidders at this tier. */
  aiAggressionRange: [number, number];
  /**
   * Minimum winning bid per seat tier. A bid below the reserve loses the
   * seat even if it tops the table — keeps the venue's premium tiers from
   * going to a bargain bidder on a weak round.
   */
  seatReserves: Record<SeatTier, number>;
  /** True for tiers that exist in the progression but are not playable in v1. */
  comingSoon: boolean;
}

export interface AiBidder {
  id: string;
  name: string;
  emoji: string;
  creditPool: number;
  /**
   * Hidden 0.0-1.0 stat: how much of the credit pool this bidder is willing
   * to commit, and how strongly they chase the Front Row.
   */
  aggression: number;
  /**
   * True when this bidder is the round's Front Row specialist — commits
   * most of their pool to the front and almost ignores the cheap seats.
   * Exactly one specialist is generated per round so Front Row always has
   * a serious contender regardless of how the player did on trivia.
   */
  frontRowSpecialist: boolean;
}

/** Credits a single participant (player or AI) places on each seat tier. */
export type BidAllocation = Record<SeatTier, number>;

export interface SeatTierResult {
  seatTier: SeatTier;
  /** 'player' or an AI bidder id. Null when nobody bid on this tier. */
  winnerId: string | null;
  winnerName: string;
  winningBid: number;
  playerBid: number;
}

export interface AuctionResult {
  perTier: SeatTierResult[];
  /** Best seat tier the player won this round, if any (front > mid > upper). */
  playerBestSeat: SeatTier | null;
  /** Credits the player spent on tiers they actually won. Losing bids are refunded. */
  creditsSpent: number;
}

/** A fictional event the player bids on after the trivia gauntlet. */
export interface GameEvent {
  id: string;
  name: string;
  venue: string;
  league: League;
  tierLevel: TierLevel;
  /** True when this round is the daily Live Event played inside its window. */
  isLiveEvent: boolean;
}

/** A claimed seat, persisted forever in the Ticket Vault. */
export interface Ticket {
  id: string;
  eventName: string;
  venue: string;
  league: League;
  seatTier: SeatTier;
  tierLevel: TierLevel;
  /** ISO-8601 timestamp of when the seat was won. */
  dateWonIso: string;
  creditsPaid: number;
  wasLiveEvent: boolean;
}

/** Outcome of one answered gauntlet question, used for the Results recap. */
export interface AnsweredQuestion {
  question: TriviaQuestion;
  chosenIndex: number | null;
  wasCorrect: boolean;
  creditsEarned: number;
  multiplierApplied: number;
}

/** The daily rotating Live Event shown on the Home screen. */
export interface DailyLiveEvent {
  /** Stable id derived from the date, e.g. 'live-2026-06-11'. */
  id: string;
  name: string;
  league: League;
  /** Epoch ms when the live 2x window opens / closes. */
  windowStartMs: number;
  windowEndMs: number;
}

// ============================================================================
// Retention / progression types
// ============================================================================

/** Medals earned per league × tier. Ranked in this enum's order. */
export type Medal = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';

export const MEDAL_ORDER: Medal[] = ['none', 'bronze', 'silver', 'gold', 'platinum'];

export const MEDAL_LABELS: Record<Medal, string> = {
  none: 'None',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

/** A single league/tier key used as an index into per-league-tier maps. */
export type LeagueTierKey = `${League}:${TierLevel}`;

/**
 * Per-league-tier personal records. Every field is optional so a fresh
 * profile can be an empty object and progressive updates can layer in.
 */
export interface LeagueTierRecord {
  bestCorrectCount?: number;
  bestCreditsEarned?: number;
  bestCombo?: number;
  bestSeatTier?: SeatTier;
  fastestAverageAnswerMs?: number;
  totalRoundsPlayed: number;
  totalTicketsWon: number;
  totalFrontRowsWon: number;
  bestMedal: Medal;
}

/** Global bests across every round the player has completed. */
export interface GlobalRecords {
  highestCreditsSingleRound: number;
  bestCorrectCount: number;
  bestCombo: number;
  bestSeatTier: SeatTier | null;
  totalPerfectRounds: number;
}

/** Full local player profile, versioned so we can migrate later. */
export interface PlayerProfile {
  schemaVersion: 1;
  currentDailyStreak: number;
  longestDailyStreak: number;
  /** YYYY-MM-DD local date. Null before any live event completion. */
  lastDailyPlayDate: string | null;
  totalRoundsPlayed: number;
  totalTicketsWon: number;
  totalFrontRowsWon: number;
  totalPerfectGauntlets: number;
  totalCreditsEarned: number;
  bestOverallCombo: number;
  bestOverallCredits: number;
  /** Derived progression label ("Rookie", "Regular", "Headliner", "Icon"). */
  operatorRank: OperatorRank;
  /** ISO-8601 timestamp of the last update. */
  lastUpdatedAt: string;
  perLeagueTier: Partial<Record<LeagueTierKey, LeagueTierRecord>>;
  globalRecords: GlobalRecords;
  /**
   * Round ids already folded into the profile. Guards against double-apply
   * when the Results screen remounts / reloads. Capped to the most recent
   * PROCESSED_ROUND_ID_CAP entries so storage never grows unbounded.
   */
  processedRoundIds: string[];
}

/** How many processed round ids we retain before dropping the oldest. */
export const PROCESSED_ROUND_ID_CAP = 150;

export type OperatorRank = 'Rookie' | 'Regular' | 'Headliner' | 'Icon';

/**
 * Compact round outcome the retention engine consumes to compute deltas.
 * All the raw data the retention modules need to update the profile.
 */
export interface RoundOutcome {
  /**
   * Stable id for this specific round, minted once when the auction is
   * locked in. Used to make profile/vault/streak application idempotent
   * across Results screen remounts.
   */
  roundId: string;
  league: League;
  tierLevel: TierLevel;
  correctCount: number;
  totalQuestions: number;
  creditsEarned: number;
  bestComboThisRound: number;
  /** null when no seat was won. */
  seatWon: SeatTier | null;
  wasLiveEvent: boolean;
  liveEventCompletedInWindow: boolean;
  /** YYYY-MM-DD of the completion; caller supplies so we can deterministically test. */
  completedOnLocalDate: string;
}

/** Delta returned by applyRoundToProfile — used by Results to celebrate. */
export interface RetentionDelta {
  /**
   * True when this roundId was already folded into the profile. The UI
   * must NOT re-celebrate medals/PBs/streaks in this case, and the
   * profile counters are returned unchanged.
   */
  alreadyProcessed: boolean;
  /** Previous best medal for this league:tier before this round. */
  priorMedal: Medal;
  /** New best medal after this round (equal to priorMedal if no upgrade). */
  newMedal: Medal;
  medalUpgraded: boolean;
  /** Personal best callouts to highlight on Results. */
  personalBests: PersonalBestDelta[];
  /** Streak event, if any. */
  streakEvent: StreakEvent;
}

export interface PersonalBestDelta {
  key:
    | 'correctCount'
    | 'creditsEarned'
    | 'combo'
    | 'seatTier'
    | 'perfectRound'
    | 'globalCreditsRound'
    | 'longestStreak';
  label: string;
  value: string;
}

export type StreakEvent =
  | { kind: 'incremented'; from: number; to: number; longestUpdated: boolean }
  | { kind: 'already-claimed'; current: number }
  | { kind: 'reset'; to: 1 }
  | { kind: 'not-eligible' };

/** Chase goals surfaced on Home. Deterministic, derived from local profile. */
export interface ChaseGoal {
  id: string;
  headline: string;
  detail: string;
  /** Optional accent color hint, or a league to color-anchor to. */
  league?: League;
  /** Optional deep-link target — home currently doesn't route via id, but useful for future. */
  cta?: 'live' | 'league' | 'vault';
}
