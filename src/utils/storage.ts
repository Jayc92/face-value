import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ticket } from '../game/types';

const TICKETS_KEY = 'facevalue/tickets/v1';
const COMPLETED_LIVE_EVENTS_KEY = 'facevalue/completedLiveEvents/v1';

export class StorageError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Loads the Ticket Vault. Corrupt or missing data returns an empty vault
 * rather than crashing the app, but corruption is logged loudly so it
 * doesn't pass silently.
 */
export async function loadTickets(): Promise<Ticket[]> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(TICKETS_KEY);
  } catch (error) {
    throw new StorageError('Failed to read the Ticket Vault from device storage', error);
  }

  if (raw === null) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.error('Ticket Vault data was not an array; resetting to empty vault');
      return [];
    }
    return parsed as Ticket[];
  } catch (error) {
    console.error('Ticket Vault data was corrupt JSON; resetting to empty vault', error);
    return [];
  }
}

export async function saveTickets(tickets: Ticket[]): Promise<void> {
  try {
    await AsyncStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  } catch (error) {
    throw new StorageError('Failed to save the Ticket Vault to device storage', error);
  }
}

/** Ids of daily Live Events the player has already completed (for the 2x gate). */
export async function loadCompletedLiveEventIds(): Promise<string[]> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(COMPLETED_LIVE_EVENTS_KEY);
  } catch (error) {
    throw new StorageError('Failed to read completed Live Events from device storage', error);
  }

  if (raw === null) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch (error) {
    console.error('Completed Live Event data was corrupt; resetting', error);
    return [];
  }
}

export async function saveCompletedLiveEventIds(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(COMPLETED_LIVE_EVENTS_KEY, JSON.stringify(ids));
  } catch (error) {
    throw new StorageError('Failed to save completed Live Events to device storage', error);
  }
}

/** Dev-only: removes the Ticket Vault key entirely. */
export async function clearTickets(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TICKETS_KEY);
  } catch (error) {
    throw new StorageError('Failed to clear the Ticket Vault', error);
  }
}

// ---------------------------------------------------------------------------
// First-run onboarding flag
// ---------------------------------------------------------------------------

const ONBOARDING_KEY = 'facevalue/onboarding/v1';

/**
 * Whether the player has finished (or skipped) the first-run briefing.
 * Missing or corrupt data reads as `false` so a broken flag simply shows
 * the briefing again rather than crashing.
 */
export async function loadOnboardingComplete(): Promise<boolean> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(ONBOARDING_KEY);
  } catch (error) {
    // A read failure shouldn't block the app; treat as "not onboarded".
    console.error('Failed to read onboarding flag; showing briefing', error);
    return false;
  }
  if (raw === null) {
    return false;
  }
  try {
    return JSON.parse(raw) === true;
  } catch (error) {
    console.error('Onboarding flag was corrupt; showing briefing', error);
    return false;
  }
}

export async function saveOnboardingComplete(complete: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(complete));
  } catch (error) {
    throw new StorageError('Failed to save onboarding flag', error);
  }
}

export async function clearOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  } catch (error) {
    throw new StorageError('Failed to clear onboarding flag', error);
  }
}
