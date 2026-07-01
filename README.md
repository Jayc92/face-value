# Face Value

**Version:** `v0.1.0-rc1` — release candidate for external playtesting.
Local-only prototype: no accounts, no backend, no cloud sync, no online
leaderboards.

A mobile trivia game where knowledge buys you the best seat in the house.
Answer timed music & sports trivia to earn credits, then outbid AI rivals on
the Bidding Floor for virtual front-row seats. Every seat you win becomes a
ticket in your permanent Ticket Vault.

Built with React Native + Expo. Runs on iOS and Android via Expo Go.

Leagues: **Rock (RK)**, **Hip-Hop (HH)**, **Pop (P★)**, **Country (CN)**,
**Sports (SP)**.

### Playtesting this build

- [PLAYTESTING.md](PLAYTESTING.md) — what to play and what we want to learn.
- [QA_CHECKLIST.md](QA_CHECKLIST.md) — full manual pass before a playtest.
- [PLAYTEST_FEEDBACK.md](PLAYTEST_FEEDBACK.md) — tester questionnaire.
- [.gitlab/issue_templates/Bug.md](.gitlab/issue_templates/Bug.md) — bug template.

The tested version is shown at the bottom of the in-app **Settings** screen.

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

Balance simulation (1000 Monte Carlo samples against the real auction code):

```bash
npx tsx scripts/simulateAuction.ts
```

Prints Front Row / Mid / Upper / no-seat percentages across the acceptance
scenarios (2/10, 5/10, 8/10, 10/10 rounds at Tier 1 and Tier 2, all-in and
smart-split strategies). Use it before shipping any auction tuning change.

Retention engine tests (pure functions — medals, streaks, records, goals):

```bash
npx tsx scripts/simulateRetention.ts
```

Runs 40+ deterministic assertions against the real retention pipeline and
prints pass/fail per case. Exit code is non-zero on any failure.

Round-idempotency tests (double-apply guards, streak/vault dedupe, cap,
onboarding-flag semantics):

```bash
npx tsx scripts/testRoundIdempotency.ts
```

Verifies that re-applying the same `roundId` is a hard no-op against the
Player Profile — counters, streaks, medals, and records all stay put.
Exit code is non-zero on any failure.

### Dev fixtures (developers only)

Two internal tools are gated behind an env flag:

- the Home header `dev · 10/10` chip (jumps straight to a fabricated Front
  Row Results using the real `generateAiBidders` + `resolveAuction` +
  `addTicket` path), and
- the **Reset local data** button in Settings (wipes vault + profile +
  onboarding on the device).

Both are double-gated:

```ts
__DEV__ && process.env.EXPO_PUBLIC_ENABLE_DEV_FIXTURES === 'true'
```

so they stay hidden during ordinary Expo Go runs and are absent from
exported/production builds. To enable them locally:

```bash
EXPO_PUBLIC_ENABLE_DEV_FIXTURES=true npx expo start
```

> ⚠️ **Do not set `EXPO_PUBLIC_ENABLE_DEV_FIXTURES=true` for an external
> playtest.** A plain `npx expo start` keeps all dev/reset tools hidden,
> which is what testers should see.

### Release-candidate checklist

Before handing a build to testers, all of these should pass:

```bash
npx tsc --noEmit
npx expo export --platform ios
npx expo export --platform android
npx tsx scripts/simulateAuction.ts
npx tsx scripts/simulateRetention.ts
npx tsx scripts/testRoundIdempotency.ts
```

## Design System / UI Direction

Face Value is themed around **"ticket-night adrenaline"** — late-night arena
lights, ticket drops, live-event urgency, and competitive bidding tension.
The visual language is intentionally restrained: dark glass surfaces, neon
accents used sparingly, and tabular numerals everywhere a value matters.

**Palette** (in `src/utils/theme.ts`)

- Ink (`#0D0B14`, `#13101F`, `#181227`) — backgrounds and panels
- Hot pink (`#FF2D78`) — primary action, live event accent, "Hype" mode
- Electric yellow (`#FFE94D`) — Front Row gold, credits, live-bonus chips
- Steel/lavender (`#5C5276`, `#C9BFE0`) — muted UI text, locked tiers
- Per-tier accents: Front=gold, Mid=pink, Upper=steel — used consistently
  across the SeatMap, BidAllocator, TicketCard, and Results auction rows

**Token files**

- `src/utils/theme.ts` — `palette`, `spacing`, `radii`, `type`, `shadows`,
  `motion`, `layout`, plus per-seat-tier accent groups
- `src/utils/leagueVisuals.ts` — typographic mark + accent color + tagline
  for each league (no emoji — every league gets a real brand glyph: `RK`,
  `HH`, `P★`, `CN`, `SP`)

**Reusable primitives** (in `src/components/`)

- `ScreenShell` — page chrome with consistent padding & safe area
- `PrimaryButton` — single CTA component (primary / secondary / ghost /
  danger variants), with kicker, trailing glyph, and Reanimated press
- `Panel` — the only card primitive; replaces ~12 ad-hoc card styles
- `StatPill`, `SectionHeader`, `HeaderBar` — layout chrome
- `Wordmark` — the FACE · VALUE logo with a neon scanner line under it

**Domain components**

- `SeatMap` — SVG stadium cross-section: three seating arcs of seat-dots
  fanning above a glowing stage. Tiers light up with the player's
  allocation and bloom with a halo on the won tier.
- `BidAllocator` — color-coded tactile slider with quick-bid 25/50/75/100%
  shortcuts, percent readout, and a tier-tagged stripe
- `BidderCard` — rival profile with monogram avatar (no emoji), heat
  status (`WATCHING / ACTIVE / AGGRESSIVE`), and a live commitment bar
- `LeagueCard` / `LeagueBadge` — premium league entry with type mark and
  collection progress meter
- `TierCard` — circuit-style tier card with three states: playable (full
  with stakes dots + rivals/pool/mix grid), locked (silver with progress
  bar toward unlock), comingSoon (dashed "EARLY ACCESS" stripe)
- `TicketCard` — collectible ticket stub: SVG perforated edge with
  notches, foil corner in seat-tier color, league badge as issuer mark,
  optional `LIVE` tag, holographic ribbon flourish
- `CountdownRing` — ring with per-second tick marks; color shifts
  pink → yellow → red and pulses critically under 5s
- `CountdownHeader` — HH:MM:SS countdown that goes critical under 30 mins
- `StreakBadge` — quiet pip-row in pre-hype mode; pink-on-yellow hype pill
  with multiplier callout (`×1.5 / ×2 / ×3`) once a 3+ streak triggers
- `AnswerChoice` — large tappable trivia answer with reveal states
- `SpotlightHalo` — soft yellow stage-light cone for the Results reveal
- `Confetti` — particle burst gated behind Front Row wins only

**Motion principles**

Motion is intentional and short (140–420ms ranges in `motion`). Press
states scale 0.97. Streak badges pulse on streak change. The countdown
ring pulses 4% scale under 5s. Ticket reveal slides up + scales on the
Results screen. No bouncing cartoon animations.

**Typography**

`type.wordmark` for the logo, `type.display` for screen headlines,
`type.title` for section titles, and `numeric` (tabular-nums, weight 900)
everywhere a count, credit, or countdown is shown so digits stay aligned.

## Folder Structure

```
face-value/
├── App.tsx                 # Navigation stack + global providers
└── src/
    ├── screens/            # The six screens (Home, LeagueSelect, TriviaGauntlet,
    │                       #   BiddingFloor, Results, TicketVault)
    ├── components/         # Reusable UI (PrimaryButton, ScreenShell, Panel,
    │                       #   SeatMap, TicketCard, BidderCard, BidAllocator,
    │                       #   CountdownRing/Header, StreakBadge, Wordmark,
    │                       #   VenueBackdrop, SpotlightHalo, Confetti…)
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

## Auction Balance

Face Value's stakes are enforced by three balance levers, all in
`src/game/tiers.ts` and `src/game/aiBidders.ts`:

- **Seat reserves** — Each tier has a minimum winning bid (Tier 1 Front =
  260 cr, Mid = 100, Upper = 30; Tier 2 Front = 550, Mid = 220, Upper = 70).
  A bid below the reserve loses the seat even if it tops the table — the
  seat goes unsold instead. This is what keeps a 2/10 player from
  accidentally squeaking into the front.
- **AI pool anchor** — Rivals draw from `baseline + surplus × 0.65` where
  surplus is the player's credit haul above 100. Low rounds face
  tier-baseline rivals; strong rounds face proportionally beefier rivals
  so Front Row remains a fight even at 10/10.
- **Front Row specialist** — Exactly one AI per round is flagged
  `frontRowSpecialist`. They get a 1.15× pool bonus, a wider aggression
  range (0.6-0.98), and a front-heavy commit weight. Guarantees a real
  contender for the front seat every round.

Latest simulation (1000 samples per scenario, player going all-in on Front):

| Round | Tier 1 Front Row | Tier 2 Front Row |
|---|---|---|
| 2/10 correct | 0% (blocked by reserve) | 0% |
| 5/10 correct | 6% (lucky-rival window) | 0% |
| 5/10 smart split | 100% Upper | competes for Upper |
| 8/10 correct | 91% (not guaranteed) | 57% |
| 10/10 + streaks | 100% (earned) | 100% |

**Known balance limitation:** 5/10 → Front Row at Tier 2 is currently 0%
by design. Tier 2 is harder trivia and the reserves are scaled up; a mid
round at that tier is expected to compete for Upper/Mid, not Front. Raising
the 5/10 chance further starts to make 8/10 automatic, which the spec
explicitly rejects.

## Retention Systems

Face Value's replay hooks are all local — no backend, no network, no
global leaderboards. Everything lives in AsyncStorage on the device.

### AsyncStorage keys

| Key | Purpose |
|-----|---------|
| `facevalue/tickets/v1` | Ticket Vault array |
| `facevalue/completedLiveEvents/v1` | Ids of daily Live Events already claimed for 2× |
| `facevalue/playerProfile/v1` | Player profile (streaks, records, medals, processed round ids) |
| `facevalue/onboarding/v1` | Whether the first-run briefing has been seen (boolean) |
| `facevalue/preferences/v1` | Sound + reduced-motion toggles |

The profile is stored separately from the vault so a future profile
migration never risks tickets. All keys are versioned; on schema bump
we'll add `v2` keys and migrate on read. Onboarding and preferences read
as sensible defaults (`false` / sound-on) when missing or corrupt.

### Player profile schema

```ts
{
  schemaVersion: 1,
  currentDailyStreak: number,          // 0 on fresh install
  longestDailyStreak: number,
  lastDailyPlayDate: 'YYYY-MM-DD' | null,
  totalRoundsPlayed: number,
  totalTicketsWon: number,
  totalFrontRowsWon: number,
  totalPerfectGauntlets: number,
  totalCreditsEarned: number,
  bestOverallCombo: number,
  bestOverallCredits: number,
  operatorRank: 'Rookie' | 'Regular' | 'Headliner' | 'Icon',
  lastUpdatedAt: ISO-8601,
  perLeagueTier: {
    // key = `${league}:${tierLevel}`
    'rock:1': {
      totalRoundsPlayed, totalTicketsWon, totalFrontRowsWon,
      bestMedal, bestCorrectCount, bestCreditsEarned,
      bestCombo, bestSeatTier, fastestAverageAnswerMs
    },
    ...
  },
  globalRecords: {
    highestCreditsSingleRound, bestCorrectCount,
    bestCombo, bestSeatTier, totalPerfectRounds
  },
  processedRoundIds: string[]   // recent round ids, capped at 150
}
```

Corrupt profile data is logged and replaced with a fresh default rather
than crashing the app. `processedRoundIds` was added after the initial
schema; older profiles migrate in with an empty list (no migration break).

### First-run onboarding

A 4-step "Opening Night Briefing" (`src/components/HowToPlay.tsx`) shows
once on first launch: *answer fast → bid smart (reserves + refunds) →
collect tickets & medals → live events pay double*. It's fully skippable
and premium-styled, not a forced tutorial round. Completion is persisted
to `facevalue/onboarding/v1`; returning players never see it again unless
they tap **How to play** (Home footer or Settings). Readable at 360×740.

### Idempotent round processing

When a round is locked in on the Bidding Floor, a stable `roundId` is
minted and threaded through the Results route params (React Navigation
preserves params across remounts). Everything the round writes is keyed
on that id:

- **Profile** — `applyRoundToProfile` records the id in
  `processedRoundIds`; a second call with the same id returns
  `{ alreadyProcessed: true }` and leaves every counter, streak, medal,
  and record untouched. Results also suppresses the celebration panel.
- **Vault** — the ticket id is derived from the `roundId`, and `addTicket`
  dedupes on id, so a remount can't add the same ticket twice.
- **Streak** — because the whole round is guarded, a re-applied live
  round can't double-advance the daily streak.

The `processedRoundIds` list is capped at the most recent 150 entries so
storage never grows unbounded. This is covered by
`scripts/testRoundIdempotency.ts`.

### Preferences & reduced motion

`facevalue/preferences/v1` stores a **sound** toggle (gates all
`playSound` calls) and a **reduce motion** toggle (suppresses confetti and
the countdown-ring critical pulse — urgency still reads via the red color
shift). Both live in the Settings screen. A synchronous in-memory mirror
lets fire-and-forget call sites read the current value without awaiting
storage.

### Daily streaks

Streaks are advanced only when a **daily Live Event is completed inside
its live window**:

- First live completion of a calendar day → `currentDailyStreak + 1`
- Same-day replay of that live event → no double-increment
- Next calendar day → +1, and `longestDailyStreak` grows if it beats the
  previous max
- Missed day (≥1 calendar day gap) → resets to 1 on the next live
  completion (longest is preserved)
- A non-live "Replay" round never advances the streak

**Local-only v1 note:** streaks use the device's local calendar date
(YYYY-MM-DD). There is no server clock reconciliation, so travel across
time zones or setting the system date can affect the streak. This is
by design for v1.

### Medals

Each `(league, tier)` slot tracks a best medal. Rules (deterministic —
no randomness):

| Medal    | Condition |
|----------|-----------|
| Bronze   | Any ticket won |
| Silver   | Mid Level or better AND ≥6/10 correct |
| Gold     | Front Row AND ≥8/10 correct |
| Platinum | Front Row AND 10/10 correct |

A no-seat round never earns a medal. Higher medals never regress — a
weak follow-up will not downgrade a previously earned Gold.

### Personal records

Per (league, tier):
`bestCorrectCount`, `bestCreditsEarned`, `bestCombo`, `bestSeatTier`,
`totalRoundsPlayed`, `totalTicketsWon`, `totalFrontRowsWon`, `bestMedal`.

Global:
`highestCreditsSingleRound`, `bestCorrectCount`, `bestCombo`,
`bestSeatTier`, `totalPerfectRounds`.

Records only update when strictly improved. The Results screen renders a
new-PB row for each field that just improved, plus a synthetic row when
the medal upgrades.

### Chase goals (Home)

`deriveChaseGoals` produces 2–3 deterministic goals from the local
profile:

1. Live streak unclaimed today (keep, restart, or start)
2. Win your first Front Row (if none yet)
3. Chase the next medal in the strongest (league, tier) still short of
   Platinum
4. Try the least-played league
5. Fall-through: generic replay prompt

Same profile + same day = same list. No flicker between renders.

### Retention modules

- `src/game/medals.ts` — pure medal computation and comparison
- `src/game/streaks.ts` — pure daily-streak advancement
- `src/game/records.ts` — `applyRoundToProfile(profile, outcome)` — the
  one composition point, returns `{ nextProfile, delta }`
- `src/game/goals.ts` — `deriveChaseGoals(inputs)`
- `src/utils/playerProfileStorage.ts` — load/save with corruption
  recovery and versioned migration hook
- `src/screens/*` — consume via `useGame()` context; screens hold no
  retention logic themselves

## v1 Scope

Tiers 1 (Local Show) and 2 (Regional Tour) are playable; Tiers 3 and 4 are
visible but locked ("coming soon"). No backend — trivia is bundled JSON and
the vault persists locally via AsyncStorage. **All streaks, medals, and
records are local-only in v1**; there is no cross-device sync and no
global leaderboard.
