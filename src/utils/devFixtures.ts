/**
 * Development-only fixtures for verifying the Trivia → Bidding → Results
 * → Vault pipeline without scripting a natural round. Guarded behind
 * `__DEV__` — Expo/Metro strips this code from production builds.
 *
 * Do NOT import this module from production paths; it's referenced only
 * from the __DEV__-gated dev chip on the Home screen.
 */
import { generateAiBidders, resolveAuction } from '../game/aiBidders';
import { buildGameEvent, LEAGUES } from '../game/events';
import { drawGauntletQuestions } from '../game/questionBank';
import { RootStackParamList } from '../game/navigation';
import { creditsForAnswer, QUESTION_TIME_SECONDS } from '../game/scoring';
import {
  AnsweredQuestion,
  AuctionResult,
  BidAllocation,
  GameEvent,
  League,
  Ticket,
  TierLevel,
  TriviaQuestion,
} from '../game/types';

interface FabricatedRound {
  league: League;
  tierLevel: TierLevel;
  event: GameEvent;
  auction: AuctionResult;
  creditsEarned: number;
  answeredQuestions: AnsweredQuestion[];
}

/**
 * Simulates a perfect (10/10, fast, full-streak) Rock round and resolves
 * the auction with the player dumping everything on Front Row. Used to
 * verify the Front Row reveal + ticket persistence flow end-to-end.
 */
export function fabricatePerfectRound(): FabricatedRound {
  const league: League = 'rock';
  const tierLevel: TierLevel = 1;
  const questions: TriviaQuestion[] = drawGauntletQuestions(league, tierLevel);
  const event: GameEvent = buildGameEvent(league, tierLevel, false);

  // Every question correct in 4 seconds (11s remaining), full streak.
  const answeredQuestions: AnsweredQuestion[] = questions.map((q, index) => {
    const streakAtAnswer: number = index + 1;
    const { creditsEarned, multiplierApplied } = creditsForAnswer(
      true,
      q.difficulty,
      QUESTION_TIME_SECONDS - 4,
      streakAtAnswer,
      false,
    );
    return {
      question: q,
      chosenIndex: q.correctIndex,
      wasCorrect: true,
      creditsEarned,
      multiplierApplied,
    };
  });

  const creditsEarned: number = answeredQuestions.reduce(
    (total, a) => total + a.creditsEarned,
    0,
  );
  const allocation: BidAllocation = { front: creditsEarned, mid: 0, upper: 0 };
  const aiBidders = generateAiBidders(tierLevel, creditsEarned);
  const auction: AuctionResult = resolveAuction(allocation, aiBidders, tierLevel);

  return { league, tierLevel, event, auction, creditsEarned, answeredQuestions };
}

/** Route params for jumping straight to a fabricated Front Row Results screen. */
export function perfectResultsRouteParams(): RootStackParamList['Results'] {
  const round = fabricatePerfectRound();
  return {
    // Fresh round id each tap so the dev fixture always applies (and is
    // itself idempotent if Results remounts).
    roundId: `dev-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
    league: round.league,
    tierLevel: round.tierLevel,
    event: round.event,
    auction: round.auction,
    creditsEarned: round.creditsEarned,
    answeredQuestions: round.answeredQuestions,
    roundStartedAtMs: Date.now(),
  };
}

/**
 * Dev-only: synthesizes enough distinct Front Row tickets to unlock every
 * PLAYABLE tier (Tier 2 gates at Fan Score 3). One ticket per league so
 * the vault looks plausible. Tiers 3 & 4 stay `comingSoon` regardless —
 * this only clears the Fan-Score gate, it does not change balance or
 * unlock coming-soon content.
 */
export function fabricateUnlockTickets(): Ticket[] {
  const nowIso = new Date().toISOString();
  return LEAGUES.map((league: League, index: number): Ticket => {
    const event = buildGameEvent(league, 1, false);
    return {
      id: `dev-unlock-${league}-${index}`,
      eventName: event.name,
      venue: event.venue,
      league,
      seatTier: 'front',
      tierLevel: 1,
      dateWonIso: nowIso,
      creditsPaid: 300,
      wasLiveEvent: false,
      correctCount: 9,
      totalQuestions: 10,
      bestCombo: 6,
    };
  });
}
