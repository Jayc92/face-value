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
