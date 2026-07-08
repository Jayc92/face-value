import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AnsweredQuestion, AuctionResult, GameEvent, League, TierLevel } from './types';

/**
 * Route params for the whole app. Round state (credits, recap, auction
 * outcome) travels through params so each screen stays a pure function of
 * its inputs; only the vault lives in global context.
 */
export type RootStackParamList = {
  Home: undefined;
  LeagueSelect: {
    /** Pre-selected league when launched from a Live Event banner. */
    forcedLeague?: League;
    liveEventId?: string;
    liveEventName?: string;
    /** True when playing inside the live 2x window. */
    liveBonusActive?: boolean;
  };
  TriviaGauntlet: {
    league: League;
    tierLevel: TierLevel;
    liveEventId?: string;
    liveEventName?: string;
    liveBonusActive: boolean;
  };
  BiddingFloor: {
    league: League;
    tierLevel: TierLevel;
    creditsEarned: number;
    answeredQuestions: AnsweredQuestion[];
    liveEventId?: string;
    liveEventName?: string;
    liveBonusActive: boolean;
    /** Epoch ms the gauntlet started; carried through for the session summary. */
    roundStartedAtMs?: number;
  };
  Results: {
    /** Stable id for this round; makes profile/vault/streak writes idempotent. */
    roundId: string;
    league: League;
    tierLevel: TierLevel;
    event: GameEvent;
    auction: AuctionResult;
    creditsEarned: number;
    answeredQuestions: AnsweredQuestion[];
    liveEventId?: string;
    /** Epoch ms the gauntlet started; used only for the local session summary. */
    roundStartedAtMs?: number;
  };
  TicketVault: undefined;
  Settings: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
