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

/** Persona pool the AI opponents are drawn from each round. */
const BIDDER_PERSONAS: Array<{ name: string; emoji: string }> = [
  { name: 'Mosh Pit Mel', emoji: '🤘' },
  { name: 'Scalper Sam', emoji: '🕶️' },
  { name: 'Front Row Fiona', emoji: '💃' },
  { name: 'Big Spender Benny', emoji: '💸' },
  { name: 'Encore Eddie', emoji: '🎸' },
  { name: 'VIP Vicky', emoji: '👑' },
  { name: 'Tailgate Tony', emoji: '🏈' },
  { name: 'Backstage Bella', emoji: '🎤' },
];

/**
 * Builds the AI opponents for a round. Aggression is sampled from the
 * tier's range, and the credit pool is jittered +/-10% around the tier
 * base — scaled by how flush the player is, so a monster trivia round
 * still faces real competition without being unwinnable.
 */
export function generateAiBidders(tierLevel: TierLevel, playerCredits: number): AiBidder[] {
  const config = TIER_CONFIGS[tierLevel];
  const personas = shuffleArray(BIDDER_PERSONAS).slice(0, config.aiBidderCount);

  // Anchor pools between the tier baseline and the player's haul so the
  // auction stays competitive at any skill level.
  const anchorPool: number = (config.aiBaseCreditPool + playerCredits) / 2;

  return personas.map((persona, index): AiBidder => {
    const aggression: number = randomInRange(config.aiAggressionRange[0], config.aiAggressionRange[1]);
    const creditPool: number = Math.max(100, Math.round(applyJitter(anchorPool, 0.1)));
    return {
      id: `ai-${index}-${persona.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: persona.name,
      emoji: persona.emoji,
      creditPool,
      aggression,
    };
  });
}

/**
 * How an AI bidder splits its committed credits across the three tiers.
 *
 * Aggressive bidders chase the Front Row hard; timid bidders hedge toward
 * the cheaper seats. Each tier's share gets +/-10% jitter so the same
 * bidder never plays two identical rounds.
 */
export function computeAiAllocation(bidder: AiBidder): BidAllocation {
  const committedTotal: number = bidder.creditPool * (0.4 + 0.55 * bidder.aggression);

  const frontWeight: number = 0.25 + 0.6 * bidder.aggression;
  const midWeight: number = 0.45 - 0.15 * bidder.aggression;
  const upperWeight: number = Math.max(0.05, 1 - frontWeight - midWeight);

  const rawBids: Record<SeatTier, number> = {
    front: applyJitter(committedTotal * frontWeight, 0.1),
    mid: applyJitter(committedTotal * midWeight, 0.1),
    upper: applyJitter(committedTotal * upperWeight, 0.1),
  };

  // Round and clamp so the bidder never exceeds its pool after jitter.
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
 * Resolves the auction: highest bid takes each seat tier.
 *
 * Ties go to the player — the house never beats a fan on a matched bid.
 * Tiers nobody bid on stay unsold. Losing bids are refunded (you only pay
 * for seats you actually win), which keeps the post-round credit math
 * feeling fair.
 */
export function resolveAuction(playerAllocation: BidAllocation, aiBidders: AiBidder[]): AuctionResult {
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
      // Strict > means the player keeps the seat on a tie.
      if (aiBid > winningBid) {
        winnerId = participant.id;
        winnerName = participant.name;
        winningBid = aiBid;
      }
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
