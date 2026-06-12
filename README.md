# Face Value 🎟️

A mobile trivia game where knowledge buys you the best seat in the house.
Answer timed music & sports trivia to earn credits, then outbid AI rivals on
the Bidding Floor for virtual front-row seats. Every seat you win becomes a
ticket in your permanent Ticket Vault.

Built with React Native + Expo. Runs on iOS and Android via Expo Go.

## How It Plays

1. **Pick a League** — Rock, Hip-Hop, Pop, Country, or Sports.
2. **Trivia Gauntlet** — 10 timed questions (15 seconds each). Faster correct
   answers earn more credits. Streaks of 3+ light the **Hype Multiplier**
   (x1.5 → x2 → x3).
3. **Bidding Floor** — Allocate your credits across Front Row, Mid Level, and
   Upper Deck against 2-3 AI rival bidders. Highest bid takes each tier; ties
   go to you, and losing bids are refunded.
4. **Ticket Vault** — Seats you win are saved as tickets, persisted across
   app restarts. Fan Score (total tickets) unlocks higher tiers.

A **Daily Live Event** rotates every day and pays **2x credits** when played
inside its window; missed days appear under Replays at standard rewards.

## Local Development

```bash
npm install
npx expo start
```

Then press `i` for the iOS Simulator, `a` for the Android Emulator, or scan
the QR code with the Expo Go app on a device.

Type checking:

```bash
npx tsc --noEmit
```

## Folder Structure

```
face-value/
├── App.tsx                 # Navigation stack + global providers
└── src/
    ├── screens/            # The six screens (Home, LeagueSelect, TriviaGauntlet,
    │                       #   BiddingFloor, Results, TicketVault)
    ├── components/         # Reusable UI (CountdownRing, Confetti, StreakBadge,
    │                       #   BidderCard, GlowButton)
    ├── game/               # Pure game logic: scoring, AI bidders, tiers,
    │                       #   events, question bank loader, GameContext
    ├── data/               # Trivia question banks (one JSON file per league)
    ├── assets/             # (reserved for images/fonts; sounds are synthesized)
    └── utils/              # Theme tokens, AsyncStorage wrapper, RNG, sounds
```

## Adding Trivia Questions

Question banks live in `src/data/<league>.json`. Each file is a JSON array;
**adding questions to an existing league requires no code changes** — just
append objects matching this shape:

```json
{
  "id": "rock-051",
  "league": "rock",
  "difficulty": "easy",
  "question": "Which band released the album 'Abbey Road'?",
  "choices": ["The Rolling Stones", "The Beatles", "The Who", "The Kinks"],
  "correctIndex": 1,
  "funFact": "Abbey Road's cover photo took just 10 minutes to shoot."
}
```

Field rules:

- `id` — unique string, conventionally `<league>-<number>`
- `difficulty` — `"easy"`, `"medium"`, or `"hard"` (tiers draw different mixes:
  Tier 1 wants mostly easy, Tier 2 mostly medium)
- `choices` — exactly 4 strings
- `correctIndex` — 0-3, the index of the right answer in `choices`
- `funFact` — shown after every answer, right or wrong

### Adding a Whole New League

1. Create `src/data/<newleague>.json` with at least ~30 questions across all
   three difficulties.
2. Add the league to the `League` union in `src/game/types.ts`.
3. Import the JSON and register it in `QUESTION_BANKS` in
   `src/game/questionBank.ts`.
4. Add label/emoji/event names in `src/game/events.ts`.

## Game Tuning Cheat Sheet

| Knob | File |
|------|------|
| Credits per difficulty, streak ladder, timer length | `src/game/scoring.ts` |
| Tier unlock thresholds, AI count & aggression ranges | `src/game/tiers.ts` |
| AI bid behavior and auction rules | `src/game/aiBidders.ts` |
| Fictional event/venue names, daily Live Event rotation | `src/game/events.ts` |
| Colors, spacing, typography | `src/utils/theme.ts` |

## v1 Scope

Tiers 1 (Local Show) and 2 (Regional Tour) are playable; Tiers 3 and 4 are
visible but locked ("coming soon"). No backend — trivia is bundled JSON and
the vault persists locally via AsyncStorage.
