/**
 * Auction explanation.
 *
 * Turns an AuctionResult into one or two plain-language lines answering
 * "what happened?" — why the player won or lost a given tier. Pure and
 * deterministic so it can be unit-tested. Kept concise: at most two lines
 * so Results never turns into a lecture.
 */
import { TIER_CONFIGS } from './tiers';
import {
  AuctionResult,
  SEAT_TIER_LABELS,
  SeatTier,
  SeatTierResult,
  TierLevel,
} from './types';

const SEAT_RANK: Record<SeatTier, number> = { front: 0, mid: 1, upper: 2 };

/**
 * Returns 1–2 short sentences describing the key moment of the auction:
 * the seat won and (if relevant) why a better seat slipped away.
 */
export function explainAuction(
  auction: AuctionResult,
  tierLevel: TierLevel,
  creditsEarned: number,
): string[] {
  const reserves = TIER_CONFIGS[tierLevel].seatReserves;
  const byTier: Record<SeatTier, SeatTierResult> = {} as Record<SeatTier, SeatTierResult>;
  for (const result of auction.perTier) {
    byTier[result.seatTier] = result;
  }

  const lines: string[] = [];

  // Line 1 — what the player walked away with.
  if (auction.playerBestSeat !== null) {
    const wonTier: SeatTier = auction.playerBestSeat;
    lines.push(`You won ${SEAT_TIER_LABELS[wonTier]}.`);

    // If they also bid on a better tier and lost it, explain why.
    const betterTier: SeatTier | undefined = (['front', 'mid'] as SeatTier[]).find(
      (tier) => SEAT_RANK[tier] < SEAT_RANK[wonTier] && (byTier[tier]?.playerBid ?? 0) > 0,
    );
    if (betterTier) {
      lines.push(explainLostTier(byTier[betterTier], reserves[betterTier]));
    }

    // Note the refund when they spent on more than the winning tier.
    const spentElsewhere: boolean = auction.perTier.some(
      (r) => r.seatTier !== wonTier && r.playerBid > 0,
    );
    if (spentElsewhere && !betterTier) {
      lines.push('Your losing bids were refunded.');
    }
    return lines.slice(0, 2);
  }

  // No seat won.
  const anyBid: boolean = auction.perTier.some((r) => r.playerBid > 0);
  if (creditsEarned === 0) {
    lines.push('No credits to bid this round — better trivia means a bigger budget.');
    return lines;
  }
  if (!anyBid) {
    lines.push('You didn’t place any bids, so no seat was claimed.');
    return lines;
  }

  // They bid but won nothing — explain the closest miss (Front, then Mid, then Upper).
  const closestMiss: SeatTier | undefined = (['front', 'mid', 'upper'] as SeatTier[]).find(
    (tier) => (byTier[tier]?.playerBid ?? 0) > 0,
  );
  if (closestMiss) {
    lines.push(explainLostTier(byTier[closestMiss], reserves[closestMiss]));
  } else {
    lines.push('No seat won.');
  }
  lines.push('All your credits were returned.');
  return lines.slice(0, 2);
}

/** One sentence explaining why a specific tier bid lost. */
function explainLostTier(result: SeatTierResult, reserve: number): string {
  const label: string = SEAT_TIER_LABELS[result.seatTier];
  // Below reserve: nobody could win it with that bid.
  if (result.playerBid < reserve) {
    return `Your ${label} bid of ${result.playerBid.toLocaleString()} didn’t meet the ${reserve.toLocaleString()} reserve.`;
  }
  // Outbid by a named rival.
  if (result.winnerId !== null && result.winnerId !== 'player') {
    const margin: number = result.winningBid - result.playerBid;
    if (margin > 0) {
      return `${result.winnerName} beat your ${label} bid by ${margin.toLocaleString()} cr.`;
    }
    return `${result.winnerName} took ${label}.`;
  }
  // Unsold despite the player bidding (bid below reserve, no AI qualified either).
  return `${label} went unsold — no bid met the ${reserve.toLocaleString()} reserve.`;
}
