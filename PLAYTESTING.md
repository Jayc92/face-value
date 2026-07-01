# Face Value — Playtesting Guide

**Version:** `v0.1.0-rc1` (local-only prototype)

## What it is

Face Value is a mobile-first trivia + auction game. You answer a fast
10-question trivia gauntlet to earn **credits**, then spend those credits
bidding against AI rivals for **front-row seats** at fictional shows and
games. Seats you win become collectible tickets in your **Vault**, and
your best rounds build medals, personal records, and a daily streak.
Everything is stored locally on the device — there are no accounts, no
servers, and no online leaderboards in this build.

## Install & run

```bash
npm install
npx expo start
```

Then open the app one of these ways:

- **Expo Go (recommended):** install *Expo Go* from the App Store / Play
  Store, then scan the QR code printed by `npx expo start` (iPhone: Camera
  app; Android: the Expo Go scanner).
- **iOS Simulator:** press `i` in the Expo CLI (requires Xcode).
- **Android Emulator:** press `a` in the Expo CLI (requires Android Studio).
- **Web preview:** press `w` (layout is representative but native gestures
  and sound behave best on a device).

> Do **not** set `EXPO_PUBLIC_ENABLE_DEV_FIXTURES=true` for a real
> playtest — that exposes internal dev tools. A normal `npx expo start`
> keeps them hidden.

## What to play (≈10 minutes)

1. **First launch** — the "Opening Night Briefing" appears. Read or skip it.
2. **One non-live round** — from Home, pick any league → Tier 1 → play the
   gauntlet → allocate credits on the Bidding Floor → see Results.
3. **The Daily Live Event** — tap the glowing "Enter live event" banner on
   Home. It pays 2× credits and advances your daily streak.
4. **One intentionally weak round** — answer badly on purpose. Notice you
   should *not* easily win Front Row.
5. **One strong round** — try to ace it and go for Front Row.
6. **Bidding** — try splitting credits across tiers vs. going all-in.
   Open **"How it works"** on the Bidding Floor.
7. **Results** — read the **"What happened?"** explanation of your win/loss.
8. **Ticket Vault** — open it from Home; check your tickets, records, and
   collection progress.
9. **Settings** — toggle sound and reduced motion; replay **How to Play**.

## What we want to learn

- Did you understand that **trivia earns the credits** you bid with?
- Did you understand **reserves** (a minimum bid per tier) and that
  **losing bids are refunded**?
- After Results, did you understand **why you won or lost**?
- Did you **want to play again**? What pulled you back?
- Did the **Vault / medals / streak** feel motivating, or ignorable?
- Was anything confusing, slow, or visually off?

## Known limitations (v1)

- **Local-only data** — progress lives on the device; reinstalling wipes it.
- **No online leaderboard** and **no cross-device sync**.
- **Daily streaks use the device's local date** — changing the system
  clock or timezone can affect the streak.
- **Tier 3 and Tier 4 are locked** teaser content; only Tier 1 and Tier 2
  are playable.
- Sound effects are short synthesized tones (no music).

## Submitting feedback

- File issues using the template in
  `.gitlab/issue_templates/Bug.md` (bugs) — attach a screenshot/video and
  note the version from **Settings** (bottom of the screen).
- For subjective impressions, answer the prompts in `PLAYTEST_FEEDBACK.md`.
- The full manual pass lives in `QA_CHECKLIST.md`.
