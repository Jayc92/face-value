/**
 * Daily streak engine.
 *
 * All records/streaks are LOCAL-ONLY in v1. We use the device's local
 * calendar date (YYYY-MM-DD) — no server clock, no timezone reconciliation.
 * The caller supplies the date so tests can drive deterministic scenarios.
 *
 * Rules:
 *  - Only a completed Live Event *inside its live window* is eligible.
 *  - First completion of a calendar day increments the streak once.
 *  - Same-day replays keep the streak; they don't double-increment.
 *  - Next-day completion adds 1.
 *  - A gap of ≥ 2 calendar days resets the streak to 1 on next completion.
 *  - Longest streak tracks the running max.
 *  - Replay events (already-past live windows) never advance the streak.
 */
import { PlayerProfile, StreakEvent } from './types';

/** Formats an epoch/Date as YYYY-MM-DD in the device's local time zone. */
export function toLocalDateString(input: Date | number): string {
  const date: Date = typeof input === 'number' ? new Date(input) : input;
  const y: number = date.getFullYear();
  const m: string = String(date.getMonth() + 1).padStart(2, '0');
  const d: string = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** True when `next` is exactly one calendar day after `prev` (both YYYY-MM-DD). */
export function isNextCalendarDay(prev: string, next: string): boolean {
  const p: Date = new Date(`${prev}T00:00:00`);
  const n: Date = new Date(`${next}T00:00:00`);
  const diffDays: number = Math.round((n.getTime() - p.getTime()) / (24 * 60 * 60 * 1000));
  return diffDays === 1;
}

export interface StreakInputs {
  today: string;
  liveEventCompletedInWindow: boolean;
}

export interface StreakOutcome {
  currentDailyStreak: number;
  longestDailyStreak: number;
  lastDailyPlayDate: string | null;
  event: StreakEvent;
}

/**
 * Applies a round completion to the profile's streak fields. Returns
 * the new values plus a `StreakEvent` describing what happened so the
 * Results screen can celebrate the right moment.
 */
export function advanceStreak(
  profile: Pick<PlayerProfile, 'currentDailyStreak' | 'longestDailyStreak' | 'lastDailyPlayDate'>,
  inputs: StreakInputs,
): StreakOutcome {
  if (!inputs.liveEventCompletedInWindow) {
    return {
      currentDailyStreak: profile.currentDailyStreak,
      longestDailyStreak: profile.longestDailyStreak,
      lastDailyPlayDate: profile.lastDailyPlayDate,
      event: { kind: 'not-eligible' },
    };
  }

  const last: string | null = profile.lastDailyPlayDate;
  const today: string = inputs.today;

  // Same day — no double-increment.
  if (last === today) {
    return {
      currentDailyStreak: profile.currentDailyStreak,
      longestDailyStreak: profile.longestDailyStreak,
      lastDailyPlayDate: last,
      event: { kind: 'already-claimed', current: profile.currentDailyStreak },
    };
  }

  // First-ever completion or exactly next calendar day → increment.
  if (last === null || isNextCalendarDay(last, today)) {
    const from: number = profile.currentDailyStreak;
    const to: number = from + 1;
    const longestUpdated: boolean = to > profile.longestDailyStreak;
    return {
      currentDailyStreak: to,
      longestDailyStreak: Math.max(profile.longestDailyStreak, to),
      lastDailyPlayDate: today,
      event: { kind: 'incremented', from, to, longestUpdated },
    };
  }

  // Missed at least one calendar day — reset to 1.
  return {
    currentDailyStreak: 1,
    longestDailyStreak: Math.max(profile.longestDailyStreak, 1),
    lastDailyPlayDate: today,
    event: { kind: 'reset', to: 1 },
  };
}

/** True when the profile already claimed a streak today (informative only). */
export function isStreakClaimedForToday(
  profile: Pick<PlayerProfile, 'lastDailyPlayDate'>,
  today: string,
): boolean {
  return profile.lastDailyPlayDate === today;
}
