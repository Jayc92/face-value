# Playtest Notes (facilitator)

Quick reference for running a Face Value playtest session. Keep the tester
talking aloud; you take the notes. One full loop takes ~3–5 minutes.

> Enable dev tooling with `EXPO_PUBLIC_ENABLE_DEV_FIXTURES=true npx expo start`.
> Settings → **Playtest Mode** gives you: Force daily event · Unlock all
> tiers · Clear vault · Reset profile. Sound and Reduce motion are the
> toggles at the top of Settings. Leave the flag OFF for hands-off demos.

## What to observe

- **Onboarding:** Do they read it or skip it? Can they explain the loop
  afterward in one sentence?
- **Trivia:** Do they notice faster answers pay more? Do they chase streaks?
- **Bidding:** Do they understand the reserve? Do they split credits or dump
  everything on Front Row? Do they realize losing bids are refunded?
- **Results:** Do they understand *why* they won or lost? Do they read the
  "What happened" line? Do they open the session summary?
- **Replay pull:** After one round, do they immediately start another? What
  makes them stop?
- **Collection:** Do medals / rarity / streak register as something to chase?

## Common confusion points (watch for these)

- Thinking credits are money to keep, rather than fuel to spend bidding.
- Not realizing a below-reserve bid wins nothing (seat goes unsold).
- Expecting the highest bid to always win even below reserve.
- Missing that Tier 2 unlocks via Fan Score (total tickets), not a purchase.
- Assuming the daily live event is always available (it's a window).

## Questions to ask (open-ended, after one round)

1. In your words, what's the goal of the game?
2. How did you decide how much to bid, and on which seat?
3. Why do you think you won / lost that seat?
4. Would you play another round right now? Why or why not?
5. Was anything unclear, slow, or annoying?
6. What made you feel good? What felt unfair?

## Bugs to look for

- Session summary numbers not matching the round (correct count, credits,
  seat, time).
- Retry count not incrementing across repeated same-league/tier rounds.
- Ticket added twice, or profile stats double-counting after navigating
  back to Results.
- Reduced motion still showing confetti / countdown pulse.
- Sound playing while the sound toggle is off.
- Layout clipping at small widths (≈360px) or large system font sizes.
- Dev / Playtest Mode controls visible **without** the env flag (must not
  happen in a normal build).

## Session logistics

- Note device + OS. File bugs with `.gitlab/issue_templates/Bug.md`.
- Have the tester fill `FEEDBACK_SCORECARD.md` at the end.
- All progress is local to the device — "Reset profile" in Playtest Mode
  gives the next tester a clean start.
