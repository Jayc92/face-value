/**
 * Single source of truth for the app's human-facing version label.
 *
 * Face Value has no backend and no build pipeline in v1, so this is just
 * a local constant. Bump VERSION when cutting a new release candidate.
 * Displayed subtly in Settings so a playtester can report exactly what
 * they ran.
 */

/** Semantic version + release-candidate suffix. */
export const APP_VERSION = '0.1.0-rc1';

/**
 * Build channel. `__DEV__` distinguishes a Metro dev bundle (Expo Go /
 * `expo start`) from an exported/production bundle. No EAS channels in v1.
 */
export const BUILD_CHANNEL: string = __DEV__ ? 'dev' : 'release';

/** Short note reminding testers this is a local-only prototype. */
export const BUILD_NOTE = 'Local-only prototype · no accounts, no cloud sync';

/** Convenience one-liner, e.g. "v0.1.0-rc1 · dev". */
export const VERSION_LABEL = `v${APP_VERSION} · ${BUILD_CHANNEL}`;
