import { applyJitter, randomInRange, shuffleArray } from '../utils/rng';
import { TIER_CONFIGS } from './tiers';
import {
  AiBidder,
  AuctionResult,
  BidAllocation,
  SeatTier,
  SeatTierResult,
  SEAT_TIERS,
  SEAT_TIER_LABELS,
  TierLevel,
} from './types';

/**
 * Rival bidder persona pool. Names are competitive, brand-safe, and
 * evoke premium seating culture — no goofy caricatures. The BidderCard
 * component renders these with a monogram avatar (first + last
 * initial) and a "heat" status. The `emoji` field is retained on the
 * AiBidder type but no longer surfaced anywhere in the UI.
 */
const BIDDER_PERSONAS: Array<{ name: string; emoji: string }> = [
  { name: 'Row A Rae', emoji: '' },
  { name: 'Platinum Jules', emoji: '' },
  { name: 'Floorline Dex', emoji: '' },
  { name: 'Velvet Quinn', emoji: '' },
  { name: 'Rush Club Kai', emoji: '' },
  { name: 'Nova Vale', emoji: '' },
  { name: 'Section Zero', emoji: '' },
  { name: 'Encore Vale', emoji: '' },
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
  if (bidder.frontRowSpecialist) {
    // Front-leaning, scales with aggression: 0.6 - 0.78.
    frontWeight = 0.6 + 0.18 * bidder.aggression;
    midWeight = 0.22;
  } else {
    frontWeight = 0.35 + 0.4 * bidder.aggression;
    midWeight = 0.42 - 0.12 * bidder.aggression;
  }
  const upperWeight: number = Math.max(0.05, 1 - frontWeight - midWeight);

  const rawBids: Record<SeatTier, number> = {
    front: applyJitter(committedTotal * frontWeight, 0.1),
    mid: applyJitter(committedTotal * midWeight, 0.1),
    upper: applyJitter(committedTotal * upperWeight, 0.1),
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
