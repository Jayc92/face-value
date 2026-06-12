/**
 * Small random-number helpers.
 *
 * The daily Live Event must be identical for every player on a given date,
 * so it uses the seeded generator. Everything else (AI bids, shuffles)
 * uses Math.random for natural unpredictability.
 */

/** Deterministic 32-bit generator (mulberry32). Same seed -> same sequence. */
export function createSeededRandom(seed: number): () => number {
  let state: number = seed >>> 0;
  return (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t: number = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable string hash, used to seed the daily event from a date string. */
export function hashString(input: string): number {
  let hash: number = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Fisher-Yates shuffle. Returns a new array; the input is not mutated. */
export function shuffleArray<T>(items: T[], random: () => number = Math.random): T[] {
  const shuffled: T[] = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex: number = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

/** Random number in [min, max). */
export function randomInRange(min: number, max: number, random: () => number = Math.random): number {
  return min + random() * (max - min);
}

/** Applies +/- `percent` jitter to a value (percent = 0.1 means +/- 10%). */
export function applyJitter(value: number, percent: number, random: () => number = Math.random): number {
  const factor: number = 1 + randomInRange(-percent, percent, random);
  return value * factor;
}
