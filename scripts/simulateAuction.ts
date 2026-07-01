/**
 * Balance simulation.
 *
 * Runs the real generateAiBidders + resolveAuction pipeline at credit
 * levels that match weak / mid / strong trivia rounds, and prints how
 * often the player wins Front Row when they dump everything into it.
 *
 * Acceptance bands (Tier 1):
 *  -  2/10 correct:   < 10% Front Row
 *  -  5/10 correct:   ~15-50% Front Row
 *  -  8/10 correct:   ~55-90% Front Row
 *  - 10/10 + streaks: > 75% Front Row
 *
 * Run with: npx tsx scripts/simulateAuction.ts
 *
 * (The script is invoked manually for QA; it is not part of any build.)
 */
import { generateAiBidders, resolveAuction } from '../src/game/aiBidders';
import { BidAllocation, TierLevel } from '../src/game/types';

interface Scenario {
  label: string;
  tierLevel: TierLevel;
  credits: number;
  /** "Dumb all-in on Front" vs "smart split that respects reserves". */
  strategy: 'all-front' | 'smart';
}

const SCENARIOS: Scenario[] = [
  { label: '2/10 correct, Tier 1', tierLevel: 1, credits: 150, strategy: 'all-front' },
  { label: '2/10 correct, Tier 1 — smart', tierLevel: 1, credits: 150, strategy: 'smart' },
  { label: '5/10 correct, Tier 1', tierLevel: 1, credits: 420, strategy: 'all-front' },
  { label: '5/10 correct, Tier 1 — smart', tierLevel: 1, credits: 420, strategy: 'smart' },
  { label: '8/10 correct, Tier 1', tierLevel: 1, credits: 800, strategy: 'all-front' },
  { label: '10/10 + streaks, Tier 1', tierLevel: 1, credits: 1500, strategy: 'all-front' },
  { label: '2/10 correct, Tier 2', tierLevel: 2, credits: 250, strategy: 'all-front' },
  { label: '5/10 correct, Tier 2', tierLevel: 2, credits: 700, strategy: 'all-front' },
  { label: '8/10 correct, Tier 2', tierLevel: 2, credits: 1400, strategy: 'all-front' },
  { label: '10/10 + streaks, Tier 2', tierLevel: 2, credits: 2400, strategy: 'all-front' },
];

const SAMPLES = 1000;

function buildAllocation(credits: number, strategy: Scenario['strategy']): BidAllocation {
  if (strategy === 'all-front') {
    return { front: credits, mid: 0, upper: 0 };
  }
  // Smart split: 60% front, 25% mid, 15% upper.
  const front = Math.round(credits * 0.6);
  const mid = Math.round(credits * 0.25);
  const upper = credits - front - mid;
  return { front, mid, upper };
}

for (const scenario of SCENARIOS) {
  let front = 0;
  let mid = 0;
  let upper = 0;
  let unsold = 0;
  for (let i = 0; i < SAMPLES; i += 1) {
    const bidders = generateAiBidders(scenario.tierLevel, scenario.credits);
    const allocation = buildAllocation(scenario.credits, scenario.strategy);
    const result = resolveAuction(allocation, bidders, scenario.tierLevel);
    switch (result.playerBestSeat) {
      case 'front':
        front += 1;
        break;
      case 'mid':
        mid += 1;
        break;
      case 'upper':
        upper += 1;
        break;
      default:
        unsold += 1;
    }
  }
  const pct = (n: number): string => `${((n / SAMPLES) * 100).toFixed(0).padStart(3)}%`;
  console.log(
    `${scenario.label.padEnd(34)} → front ${pct(front)} · mid ${pct(mid)} · upper ${pct(upper)} · none ${pct(unsold)}`,
  );
}
