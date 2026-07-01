# Face Value — QA Checklist

**Version:** `v0.1.0-rc1`

Run through this before any external playtest. Tick each item; note the
device/OS in your report. To start from a clean state, either reinstall
Expo Go's app data or use the dev **Reset local data** button (only
available when `EXPO_PUBLIC_ENABLE_DEV_FIXTURES=true`).

## Setup / storage
- [ ] Fresh install or cleared storage starts with an empty Vault (0 tickets).
- [ ] Fan Score 0, Streak 0, Rank "Rookie" on a fresh profile.

## First-run onboarding
- [ ] Briefing appears automatically on first launch.
- [ ] "Skip" dismisses it to Home.
- [ ] "Next" advances through all 4 steps; final CTA closes it.
- [ ] After restarting the app, the briefing does **not** reappear.

## Home
- [ ] Wordmark, Fan/Streak/Rank status line, and Vault chip render.
- [ ] Daily Live Event banner shows a live countdown and 2× label.
- [ ] "Tonight's targets" chase goals are relevant to current progress.
- [ ] League cards show collection progress; tapping opens League Select.
- [ ] Footer has "How to play" and "Settings".

## League Select
- [ ] League pills switch the selected league.
- [ ] Tier 1 & Tier 2 are playable; Tier 3 & Tier 4 show as locked/soon.
- [ ] Best medal chip shows per tier (or an empty slot).

## Trivia Gauntlet
- [ ] 10 questions, 15-second countdown ring each.
- [ ] All four answer choices render and are tappable (44px+).
- [ ] Correct/incorrect shows a ✓/✗ glyph (not color only).
- [ ] Streak / Hype indicator updates on 3+ correct.
- [ ] Fun fact appears after each answer.

## Bidding Floor
- [ ] Seat map + three tier sliders render.
- [ ] "How it works" panel explains reserves, refunds, split strategy.
- [ ] Reserve label shows per tier; quick-bid chips work.
- [ ] Budget bar prevents over-allocation.
- [ ] "Lock in bids" moves to Results.

## Results
- [ ] Headline/subhead reflect actual performance (not falsely triumphant).
- [ ] "What happened?" explains the win/loss concisely.
- [ ] Auction breakdown lists each tier winner + bids.
- [ ] Primary CTA is visible without scrolling (above the fold).
- [ ] New medal / PB / streak callouts appear only when earned.

## Ticket Vault
- [ ] Won tickets appear, newest first.
- [ ] Records panel shows streak, best round, perfect rounds, medals.
- [ ] Filter/sort controls work.
- [ ] Collection completion % per league updates.

## Settings
- [ ] Sound toggle silences/enables effects.
- [ ] Reduced motion toggle calms confetti + countdown pulse.
- [ ] "How to play" reopens the briefing.
- [ ] Version label shows at the bottom (`v0.1.0-rc1 · …`).

## Balance sanity
- [ ] A weak round (≤3/10) does **not** easily win Front Row.
- [ ] A strong round (8–10/10) can realistically win Front Row.

## Persistence
- [ ] Win a ticket, fully close the app, reopen → ticket still in Vault.
- [ ] Streak, records, and Fan Score persist across restart.

## Idempotency / streaks
- [ ] Completing the Daily Live Event once increments the streak.
- [ ] Replaying the same live event the same day does **not** double it.
- [ ] Home shows "DAILY STREAK CLAIMED" after the first completion.

## Accessibility / motion / sound
- [ ] Reduced motion on: no confetti, no countdown pulse; states still clear.
- [ ] Sound off: no audio during trivia/bidding.
- [ ] Screen reader announces answer choices and slider values (spot check).

## Viewports
- [ ] Small phone (≈360×740): no clipped text, CTAs reachable.
- [ ] Larger phone (≈390–430 wide): layout scales cleanly.

## Platforms
- [ ] iOS via Expo Go.
- [ ] Android via Expo Go.
- [ ] iOS Simulator / Android Emulator (if available).

## Demo safety (must pass)
- [ ] With a plain `npx expo start` (no env flag): **no** `dev · 10/10`
      chip on Home, **no** "Reset local data" in Settings.
- [ ] Exported/production build shows no dev tools.
- [ ] With `EXPO_PUBLIC_ENABLE_DEV_FIXTURES=true`: dev tools appear (dev only).
