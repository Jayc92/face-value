import { applyJitter, randomInRange, shuffleArray } from '../utils/rng';
import { TIER_CONFIGS } from './tiers';
import {
  AiBidder,
  AuctionResult,
  BidAllocation,
  BidderArchetype,
  SeatTier,
  SeatTierResult,
  SEAT_TIERS,
  SEAT_TIER_LABELS,
  TierLevel,
} from './types';

/**
 * Rival bidder persona pool. Names are competitive, brand-safe, and
 * evoke premium seating culture — no goofy caricatures. Each persona has
 * a fixed archetype so the same rival always bids with the same
 * recognizable personality (front-runner, value hunter, etc.). The
 * BidderCard renders a monogram avatar + heat status.
 */
const BIDDER_PERSONAS: Array<{ name: string; emoji: string; archetype: BidderArchetype }> = [
  { name: 'Row A Rae', emoji: '', archetype: 'frontRunner' },
  { name: 'Platinum Jules', emoji: '', archetype: 'frontRunner' },
  { name: 'Floorline Dex', emoji: '', archetype: 'valueHunter' },
  { name: 'Velvet Quinn', emoji: '', archetype: 'balanced' },
  { name: 'Rush Club Kai', emoji: '', archetype: 'opportunist' },
  { name: 'Nova Vale', emoji: '', archetype: 'balanced' },
  { name: 'Section Zero', emoji: '', archetype: 'valueHunter' },
  { name: 'Encore Vale', emoji: '', archetype: 'opportunist' },
];

/**
 * Builds the AI opponents for a round.
 *
 * Pool sizing is anchored to the tier baseline first and the player's
 * haul second, so a weak round never collapses the auction. The first
 * persona drawn becomes the Front Row "specialist" — high aggression
 * plus a larger pool — guaranteeing the front always has a real bidder.
 */
export function generateAiBidders(tierLevel: TierLevel, playerCredits: number): AiBidder[] {
  const config = TIER_CONFIGS[tierLevel];
  const personas = shuffleArray(BIDDER_PERSONAS).slice(0, config.aiBidderCount);

  // Pool anchor: never weaker than the tier baseline, and grows with
  // the player's haul so a strong round faces real competition. Coefs
  // tuned against the balance simulation to hit:
  //   2/10  → ~0% Front Row, 5/10 → 15-50%, 8/10 → 70-90%, 10/10 → ~95%+
  const surplus: number = Math.max(0, playerCredits - 100);
  const anchorPool: number = config.aiBaseCreditPool + surplus * 0.65;

  return personas.map((persona, index): AiBidder => {
    const isSpecialist: boolean = index === 0;
    // Specialist gets a modest 1.1× pool bonus and a high but variable
    // aggression range. Widening the low end of the range gives the
    // occasional "off-night specialist" that lets a mid-round player
    // steal Front Row, and it also introduces the friction that keeps
    // 8/10 rounds from being a guaranteed win.
    const aggression: number = isSpecialist
      ? randomInRange(0.6, 0.98)
      : randomInRange(config.aiAggressionRange[0], config.aiAggressionRange[1]);
    const poolFactor: number = isSpecialist ? 1.15 : 1;
    const creditPool: number = Math.max(
      150,
      Math.round(applyJitter(anchorPool * poolFactor, 0.13)),
    );
    return {
      id: `ai-${index}-${persona.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: persona.name,
      emoji: persona.emoji,
      creditPool,
      aggression,
      frontRowSpecialist: isSpecialist,
      // The round's specialist always plays as a front-runner; everyone
      // else keeps their persona's archetype.
      archetype: isSpecialist ? 'frontRunner' : persona.archetype,
    };
  });
}

/**
 * How an AI bidder splits its committed credits across the three tiers.
 *
 * - Specialist: commits ~95% of pool, ~80% of it on Front Row.
 * - Regular: commits 60-85% of pool (scaled by aggression), with
 *   front-row weighting that grows with aggression.
 * Each tier's share gets +/-10% jitter so the same bidder never plays two
 * identical rounds.
 */
export function computeAiAllocation(bidder: AiBidder): BidAllocation {
  // Specialist commits 60-90% of pool scaled by aggression; regular
  // bidders commit 55-80%.
  const committedTotal: number = bidder.frontRowSpecialist
    ? bidder.creditPool * (0.55 + 0.35 * bidder.aggression)
    : bidder.creditPool * (0.55 + 0.25 * bidder.aggression);

  let frontWeight: number;
  let midWeight: number;
  // Per-tier jitter widens for the unpredictable "opportunist" archetype.
  let tierJitter = 0.1;
  if (bidder.frontRowSpecialist) {
    // Front-leaning, scales with aggression: 0.6 - 0.78. Unchanged — this
    // is the balance-critical Front Row contender.
    frontWeight = 0.6 + 0.18 * bidder.aggression;
    midWeight = 0.22;
  } else {
    // Baseline non-specialist split (aggression-driven), then nudged by
    // archetype. The nudges are deliberately small and roughly zero-sum
    // around the baseline so aggregate Front Row pressure — and thus the
    // tuned auction balance — stays intact; only the *personality* reads
    // differently round to round.
    const baseFront: number = 0.35 + 0.4 * bidder.aggression;
    const baseMid: number = 0.42 - 0.12 * bidder.aggression;
    switch (bidder.archetype) {
      case 'frontRunner':
        frontWeight = baseFront + 0.1;
        midWeight = baseMid - 0.06;
        break;
      case 'valueHunter':
        frontWeight = baseFront - 0.1;
        midWeight = baseMid + 0.06;
        break;
      case 'opportunist':
        // Same central tendency as balanced, but noisier per tier.
        frontWeight = baseFront;
        midWeight = baseMid;
        tierJitter = 0.22;
        break;
      case 'balanced':
      default:
        frontWeight = baseFront;
        midWeight = baseMid;
        break;
    }
    frontWeight = Math.max(0.1, Math.min(0.8, frontWeight));
    midWeight = Math.max(0.1, Math.min(0.6, midWeight));
  }
  const upperWeight: number = Math.max(0.05, 1 - frontWeight - midWeight);

  const rawBids: Record<SeatTier, number> = {
    front: applyJitter(committedTotal * frontWeight, tierJitter),
    mid: applyJitter(committedTotal * midWeight, tierJitter),
    upper: applyJitter(committedTotal * upperWeight, tierJitter),
  };

  const allocation: BidAllocation = { front: 0, mid: 0, upper: 0 };
  let spent = 0;
  for (const tier of SEAT_TIERS) {
    const bid: number = Math.max(0, Math.round(rawBids[tier]));
    const affordable: number = Math.max(0, bidder.creditPool - spent);
    allocation[tier] = Math.min(bid, affordable);
    spent += allocation[tier];
  }
  return allocation;
}

export interface AuctionParticipant {
  id: string;
  name: string;
  allocation: BidAllocation;
}

/**
 * Resolves the auction: highest bid takes each seat tier, subject to the
 * tier's reserve floor. A bid below the reserve doesn't win, even if it
 * tops the table — the seat goes unsold instead. Reserves keep premium
 * tiers from going to a bargain bidder on a weak round.
 *
 * Ties go to the player. Losing bids are refunded (you only pay for
 * seats you actually win).
 */
export function resolveAuction(
  playerAllocation: BidAllocation,
  aiBidders: AiBidder[],
  tierLevel: TierLevel,
): AuctionResult {
  const reserves = TIER_CONFIGS[tierLevel].seatReserves;
  const aiParticipants: AuctionParticipant[] = aiBidders.map((bidder) => ({
    id: bidder.id,
    name: bidder.name,
    allocation: computeAiAllocation(bidder),
  }));

  const perTier: SeatTierResult[] = SEAT_TIERS.map((seatTier): SeatTierResult => {
    const playerBid: number = playerAllocation[seatTier];
    let winnerId: string | null = playerBid > 0 ? 'player' : null;
    let winnerName: string = playerBid > 0 ? 'You' : 'Unsold';
    let winningBid: number = playerBid;

    for (const participant of aiParticipants) {
      const aiBid: number = participant.allocation[seatTier];
      if (aiBid > winningBid) {
        winnerId = participant.id;
        winnerName = participant.name;
        winningBid = aiBid;
      }
    }

    // Reserve enforcement: if the high bid is below the reserve, the seat
    // doesn't sell. Keeps the front from being claimed by a 100-credit
    // player against a couple of cheap AI rounds.
    const reserve: number = reserves[seatTier] ?? 0;
    if (winningBid < reserve) {
      return { seatTier, winnerId: null, winnerName: 'Unsold', winningBid, playerBid };
    }

    return { seatTier, winnerId, winnerName, winningBid, playerBid };
  });

  const tiersWonByPlayer: SeatTierResult[] = perTier.filter((result) => result.winnerId === 'player');
  const bestSeatOrder: SeatTier[] = ['front', 'mid', 'upper'];
  const playerBestSeat: SeatTier | null =
    bestSeatOrder.find((tier) => tiersWonByPlayer.some((result) => result.seatTier === tier)) ?? null;

  const creditsSpent: number = tiersWonByPlayer.reduce((total, result) => total + result.playerBid, 0);

  return { perTier, playerBestSeat, creditsSpent };
}

export { SEAT_TIER_LABELS };
