/**
 * In-memory session log for playtesting.
 *
 * Records a compact summary of each completed round so the Results screen
 * can show "how did this round go?" at a glance, and so we can count
 * retries of the same league/tier within a single app session.
 *
 * LOCAL ONLY and NON-PERSISTENT by design: this lives in module memory,
 * resets when the app restarts, and never touches AsyncStorage or the
 * network. It has zero effect on gameplay, balance, or the saved profile
 * — it is purely observational tooling for playtests.
 */
import { League, SeatTier, TierLevel } from '../game/types';

export interface SessionRoundSummary {
  roundId: string;
  league: League;
  tierLevel: TierLevel;
  correctCount: number;
  totalQuestions: number;
  creditsEarned: number;
  seatWon: SeatTier | null;
  /** Wall-clock milliseconds from gauntlet start to Results, if known. */
  timeSpentMs: number | null;
  /**
   * How many rounds of THIS league+tier have been completed this session,
   * including this one (1 = first attempt, 2 = first retry, …).
   */
  retryCount: number;
}

/** Round summaries in completion order (oldest first). */
const rounds: SessionRoundSummary[] = [];

/** roundIds already recorded, so a Results remount can't double-count. */
const recordedRoundIds = new Set<string>();

function leagueTierKey(league: League, tierLevel: TierLevel): string {
  return `${league}:${tierLevel}`;
}

interface RecordInput {
  roundId: string;
  league: League;
  tierLevel: TierLevel;
  correctCount: number;
  totalQuestions: number;
  creditsEarned: number;
  seatWon: SeatTier | null;
  /** Epoch ms the gauntlet started; null when unknown. */
  roundStartedAtMs: number | null;
  /** Epoch ms "now" (Results mount). Caller supplies for testability. */
  completedAtMs: number;
}

/**
 * Records a completed round and returns its summary. Idempotent on
 * roundId — a second call with the same id returns the existing summary
 * without inflating the retry count.
 */
export function recordRound(input: RecordInput): SessionRoundSummary {
  const existing = rounds.find((r) => r.roundId === input.roundId);
  if (existing) {
    return existing;
  }

  const key = leagueTierKey(input.league, input.tierLevel);
  const priorForKey = rounds.filter(
    (r) => leagueTierKey(r.league, r.tierLevel) === key,
  ).length;

  const timeSpentMs: number | null =
    input.roundStartedAtMs !== null && input.completedAtMs >= input.roundStartedAtMs
      ? input.completedAtMs - input.roundStartedAtMs
      : null;

  const summary: SessionRoundSummary = {
    roundId: input.roundId,
    league: input.league,
    tierLevel: input.tierLevel,
    correctCount: input.correctCount,
    totalQuestions: input.totalQuestions,
    creditsEarned: input.creditsEarned,
    seatWon: input.seatWon,
    timeSpentMs,
    retryCount: priorForKey + 1,
  };

  rounds.push(summary);
  recordedRoundIds.add(input.roundId);
  return summary;
}

/** Total rounds completed this session. */
export function sessionRoundCount(): number {
  return rounds.length;
}

/** All summaries this session (a copy — callers can't mutate the log). */
export function sessionRounds(): SessionRoundSummary[] {
  return [...rounds];
}

/** Clears the in-memory log. Used by the dev "reset" action and tests. */
export function clearSessionLog(): void {
  rounds.length = 0;
  recordedRoundIds.clear();
}

/** Formats a ms duration as "M:SS" (or "SS s" under a minute). */
export function formatDuration(ms: number | null): string {
  if (ms === null) {
    return '—';
  }
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
