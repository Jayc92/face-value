import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LEAGUES } from './events';
import { applyRoundToProfile } from './records';
import { League, PlayerProfile, RetentionDelta, RoundOutcome, Ticket } from './types';
import {
  clearTickets,
  loadCompletedLiveEventIds,
  loadTickets,
  saveCompletedLiveEventIds,
  saveTickets,
} from '../utils/storage';
import {
  clearPlayerProfile,
  createDefaultProfile,
  loadPlayerProfile,
  savePlayerProfile,
} from '../utils/playerProfileStorage';
import { loadPreferences } from '../utils/preferences';

interface GameContextValue {
  /** Every ticket in the vault, newest first. */
  tickets: Ticket[];
  /** Fan Score = total tickets won across all leagues. Gates tier unlocks. */
  fanScore: number;
  /** Live Event ids the player has completed (each only pays 2x once). */
  completedLiveEventIds: string[];
  /** True until the vault + profile have been loaded from AsyncStorage. */
  isHydrating: boolean;
  addTicket: (ticket: Ticket) => Promise<void>;
  markLiveEventCompleted: (liveEventId: string) => Promise<void>;
  /** Vault completion (0-1) per league, driven by distinct event names collected. */
  collectionCompletion: Record<League, number>;
  /**
   * Player profile — records, streaks, medals. Separate from the vault so
   * a future profile-schema migration never risks tickets.
   */
  playerProfile: PlayerProfile;
  /**
   * Applies a round outcome to the profile, persists, and returns the
   * delta (medal upgrades, PBs, streak event) for the Results screen to
   * celebrate. Idempotent: re-applying the same outcome.roundId returns
   * `{ alreadyProcessed: true }` and leaves the profile unchanged.
   */
  applyRound: (outcome: RoundOutcome) => Promise<RetentionDelta>;
  /** True once the current outcome.roundId has been folded into the profile. */
  hasProcessedRound: (roundId: string) => boolean;
  /**
   * Dev-only: wipes vault + profile + live-event completions. Guarded at
   * the call site behind __DEV__ + EXPO_PUBLIC_ENABLE_DEV_FIXTURES.
   */
  resetLocalData: () => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

const COLLECTIBLES_PER_LEAGUE = 5;

export function GameProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [completedLiveEventIds, setCompletedLiveEventIds] = useState<string[]>([]);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile>(() => createDefaultProfile());
  const [isHydrating, setIsHydrating] = useState<boolean>(true);

  // The ref always mirrors the latest profile so applyRound can read a
  // fresh, deterministic snapshot (state closures can be stale across a
  // remount). Keep it in lockstep with setPlayerProfile.
  const profileRef = useRef<PlayerProfile>(playerProfile);
  const setProfile = useCallback((next: PlayerProfile): void => {
    profileRef.current = next;
    setPlayerProfile(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [storedTickets, storedLiveIds, storedProfile] = await Promise.all([
          loadTickets(),
          loadCompletedLiveEventIds(),
          loadPlayerProfile(),
          // Warm the in-memory preferences mirror so playSound() and
          // reduced-motion reads are correct from the first frame.
          loadPreferences(),
        ]);
        if (!cancelled) {
          setTickets(storedTickets);
          setCompletedLiveEventIds(storedLiveIds);
          setProfile(storedProfile);
        }
      } catch (error) {
        console.error('Failed to hydrate game state', error);
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setProfile]);

  const addTicket = useCallback(async (ticket: Ticket): Promise<void> => {
    setTickets((previous) => {
      // Idempotent: a ticket id is derived from the stable roundId, so a
      // Results remount that re-adds the same ticket is a no-op.
      if (previous.some((existing) => existing.id === ticket.id)) {
        return previous;
      }
      const next: Ticket[] = [ticket, ...previous];
      saveTickets(next).catch((error) => console.error('Failed to persist ticket', error));
      return next;
    });
  }, []);

  const markLiveEventCompleted = useCallback(async (liveEventId: string): Promise<void> => {
    setCompletedLiveEventIds((previous) => {
      if (previous.includes(liveEventId)) {
        return previous;
      }
      const next: string[] = [...previous, liveEventId];
      saveCompletedLiveEventIds(next).catch((error) =>
        console.error('Failed to persist live event completion', error),
      );
      return next;
    });
  }, []);

  const applyRound = useCallback(
    async (outcome: RoundOutcome): Promise<RetentionDelta> => {
      // Read the freshest profile from the ref (not a possibly-stale state
      // closure), compute the delta, then commit + persist. The
      // idempotency guard lives in applyRoundToProfile, keyed on roundId.
      const { nextProfile, delta } = applyRoundToProfile(profileRef.current, outcome);
      if (!delta.alreadyProcessed) {
        setProfile(nextProfile);
        savePlayerProfile(nextProfile).catch((error) =>
          console.error('Failed to persist player profile', error),
        );
      }
      return delta;
    },
    [setProfile],
  );

  const hasProcessedRound = useCallback(
    (roundId: string): boolean => profileRef.current.processedRoundIds.includes(roundId),
    [],
  );

  const resetLocalData = useCallback(async (): Promise<void> => {
    const fresh = createDefaultProfile();
    setTickets([]);
    setCompletedLiveEventIds([]);
    setProfile(fresh);
    await Promise.all([
      clearTickets().catch((error) => console.error('Failed to clear vault', error)),
      clearPlayerProfile().catch((error) => console.error('Failed to clear profile', error)),
      saveCompletedLiveEventIds([]).catch((error) =>
        console.error('Failed to clear live events', error),
      ),
    ]);
  }, [setProfile]);

  const collectionCompletion = useMemo<Record<League, number>>(() => {
    const completion = {} as Record<League, number>;
    for (const league of LEAGUES) {
      const distinctEventNames = new Set(
        tickets.filter((ticket) => ticket.league === league).map((ticket) => ticket.eventName),
      );
      completion[league] = Math.min(1, distinctEventNames.size / COLLECTIBLES_PER_LEAGUE);
    }
    return completion;
  }, [tickets]);

  const value = useMemo<GameContextValue>(
    () => ({
      tickets,
      fanScore: tickets.length,
      completedLiveEventIds,
      isHydrating,
      addTicket,
      markLiveEventCompleted,
      collectionCompletion,
      playerProfile,
      applyRound,
      hasProcessedRound,
      resetLocalData,
    }),
    [
      tickets,
      completedLiveEventIds,
      isHydrating,
      addTicket,
      markLiveEventCompleted,
      collectionCompletion,
      playerProfile,
      applyRound,
      hasProcessedRound,
      resetLocalData,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (context === null) {
    throw new Error('useGame must be used inside a GameProvider');
  }
  return context;
}
