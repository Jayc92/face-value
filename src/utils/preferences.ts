import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageError } from './storage';

/**
 * Local player preferences (sound, motion). Kept deliberately tiny and
 * separate from the game profile — losing a preference is harmless, so
 * this store just falls back to sensible defaults on any read error.
 *
 * A synchronous in-memory mirror (`current`) lets fire-and-forget call
 * sites like playSound() read the latest value without awaiting storage.
 */
export const PREFERENCES_KEY = 'facevalue/preferences/v1';

export interface Preferences {
  soundEnabled: boolean;
  /** When true, the app suppresses non-essential motion/animation. */
  reduceMotion: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  soundEnabled: true,
  reduceMotion: false,
};

let current: Preferences = { ...DEFAULT_PREFERENCES };

/** Synchronous read of the last-known preferences (no storage round-trip). */
export function getPreferences(): Preferences {
  return current;
}

export async function loadPreferences(): Promise<Preferences> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(PREFERENCES_KEY);
  } catch (error) {
    console.error('Failed to read preferences; using defaults', error);
    current = { ...DEFAULT_PREFERENCES };
    return current;
  }
  if (raw === null) {
    current = { ...DEFAULT_PREFERENCES };
    return current;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    current = {
      soundEnabled:
        typeof parsed.soundEnabled === 'boolean'
          ? parsed.soundEnabled
          : DEFAULT_PREFERENCES.soundEnabled,
      reduceMotion:
        typeof parsed.reduceMotion === 'boolean'
          ? parsed.reduceMotion
          : DEFAULT_PREFERENCES.reduceMotion,
    };
  } catch (error) {
    console.error('Preferences were corrupt; using defaults', error);
    current = { ...DEFAULT_PREFERENCES };
  }
  return current;
}

export async function savePreferences(prefs: Preferences): Promise<void> {
  current = { ...prefs };
  try {
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (error) {
    throw new StorageError('Failed to save preferences', error);
  }
}

export async function clearPreferences(): Promise<void> {
  current = { ...DEFAULT_PREFERENCES };
  try {
    await AsyncStorage.removeItem(PREFERENCES_KEY);
  } catch (error) {
    throw new StorageError('Failed to clear preferences', error);
  }
}
