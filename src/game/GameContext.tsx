import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { LEAGUES } from './events';
import { League, Ticket } from './types';
import {
  loadCompletedLiveEventIds,
  loadTickets,
  saveCompletedLiveEventIds,
  saveTickets,
} from '../utils/storage';

interface GameContextValue {
  /** Every ticket in the vault, newest first. */
  tickets: Ticket[];
  /** Fan Score = total tickets won across all leagues. Gates tier unlocks. */
  fanScore: number;
  /** Live Event ids the player has completed (each only pays 2x once). */
  completedLiveEventIds: string[];
  /** True until the vault has been loaded from AsyncStorage. */
  isHydrating: boolean;
  addTicket: (ticket: Ticket) => Promise<void>;
  markLiveEventCompleted: (liveEventId: string) => Promise<void>;
  /** Vault completion (0-1) per league, driven by distinct event names collected. */
  collectionCompletion: Record<League, number>;
}

const GameContext = createContext<GameContextValue | null>(null);

/**
 * Distinct collectible event names per league (must match EVENT_NAMES in
 * events.ts — 5 per league). Used for the vault completion percentage.
 */
const COLLECTIBLES_PER_LEAGUE = 5;

export function GameProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [completedLiveEventIds, setCompletedLiveEventIds] = useState<string[]>([]);
  const [isHydrating, setIsHydrating] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [storedTickets, storedLiveIds] = await Promise.all([
          loadTickets(),
          loadCompletedLiveEventIds(),
        ]);
        if (!cancelled) {
          setTickets(storedTickets);
          setCompletedLiveEventIds(storedLiveIds);
        }
      } catch (error) {
        // Storage read failures shouldn't brick the app; start fresh in
        // memory and surface the problem in the console.
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
  }, []);

  const addTicket = useCallback(async (ticket: Ticket): Promise<void> => {
    setTickets((previous) => {
      const next: Ticket[] = [ticket, ...previous];
      // Persist outside the updater's pure path; failure keeps the
      // in-memory ticket so the session continues, and logs the error.
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
    }),
    [tickets, completedLiveEventIds, isHydrating, addTicket, markLiveEventCompleted, collectionCompletion],
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
