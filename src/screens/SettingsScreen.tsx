import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HeaderBar } from '../components/HeaderBar';
import { HowToPlay } from '../components/HowToPlay';
import { Panel } from '../components/Panel';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { Toggle } from '../components/Toggle';
import { useGame } from '../game/GameContext';
import { ScreenProps } from '../game/navigation';
import { BUILD_NOTE, VERSION_LABEL } from '../utils/buildInfo';
import {
  getPreferences,
  Preferences,
  savePreferences,
} from '../utils/preferences';
import { clearOnboarding } from '../utils/storage';
import { palette, radii, spacing } from '../utils/theme';

/**
 * Destructive/dev tools are gated by BOTH __DEV__ and the explicit env
 * flag so ordinary Expo Go demos never surface a reset button.
 */
const ENABLE_DEV_FIXTURES: boolean =
  __DEV__ && process.env.EXPO_PUBLIC_ENABLE_DEV_FIXTURES === 'true';

export function SettingsScreen({ navigation }: ScreenProps<'Settings'>): React.JSX.Element {
  const { resetLocalData } = useGame();
  // Seed from the synchronous mirror (already warmed at hydration).
  const [prefs, setPrefs] = useState<Preferences>(() => getPreferences());
  const [howToPlayVisible, setHowToPlayVisible] = useState<boolean>(false);
  const [resetDone, setResetDone] = useState<boolean>(false);

  useEffect(() => {
    // Ensure we reflect the persisted value even if the mirror was cold.
    setPrefs(getPreferences());
  }, []);

  const update = (patch: Partial<Preferences>): void => {
    const next: Preferences = { ...prefs, ...patch };
    setPrefs(next);
    savePreferences(next).catch((error) => console.error('Failed to save preferences', error));
  };

  const handleReset = async (): Promise<void> => {
    await resetLocalData();
    await clearOnboarding().catch((error) => console.error('Failed to clear onboarding', error));
    setResetDone(true);
  };

  return (
    <ScreenShell scroll>
      <HowToPlay
        visible={howToPlayVisible}
        onClose={() => setHowToPlayVisible(false)}
        finishLabel="Got it"
      />

      <HeaderBar kicker="SETTINGS" title="Preferences" onBack={() => navigation.goBack()} />

      <Panel variant="raised" style={styles.card}>
        <SettingRow
          title="Sound effects"
          subtitle="Countdown ticks, answer chimes, crowd cheer"
        >
          <Toggle
            value={prefs.soundEnabled}
            onValueChange={(v) => update({ soundEnabled: v })}
            accessibilityLabel="Sound effects"
          />
        </SettingRow>

        <View style={styles.rowDivider} />

        <SettingRow
          title="Reduce motion"
          subtitle="Calms confetti, pulses, and reveal animations"
        >
          <Toggle
            value={prefs.reduceMotion}
            onValueChange={(v) => update({ reduceMotion: v })}
            accessibilityLabel="Reduce motion"
          />
        </SettingRow>
      </Panel>

      <PrimaryButton
        label="How to play"
        variant="secondary"
        onPress={() => setHowToPlayVisible(true)}
        style={styles.howToButton}
      />

      {ENABLE_DEV_FIXTURES ? (
        <Panel variant="flat" borderColor={palette.danger} style={styles.devCard}>
          <Text style={styles.devKicker}>DEV TOOLS</Text>
          <Text style={styles.devBody}>
            Wipes the Ticket Vault, player profile, streaks, and onboarding flag on
            this device. Not shown in normal builds.
          </Text>
          <PrimaryButton
            label={resetDone ? 'Local data cleared' : 'Reset local data'}
            variant="danger"
            size="md"
            disabled={resetDone}
            onPress={handleReset}
          />
        </Panel>
      ) : null}

      <Text style={styles.footnote}>
        All progress is stored only on this device. Face Value has no accounts,
        no cloud sync, and no global leaderboards.
      </Text>

      <View style={styles.versionBlock} accessible accessibilityLabel={`Version ${VERSION_LABEL}`}>
        <Text style={styles.versionText}>{VERSION_LABEL}</Text>
        <Text style={styles.versionNote}>{BUILD_NOTE}</Text>
      </View>
    </ScreenShell>
  );
}

interface SettingRowProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function SettingRow({ title, subtitle, children }: SettingRowProps): React.JSX.Element {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: palette.textHi,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  rowSubtitle: {
    color: palette.textLow,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  rowDivider: {
    height: 1,
    backgroundColor: palette.hairline,
  },
  howToButton: {
    marginBottom: spacing.lg,
  },
  devCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(255, 77, 94, 0.05)',
  },
  devKicker: {
    color: palette.danger,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  devBody: {
    color: palette.textMed,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
  footnote: {
    color: palette.textLow,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  versionBlock: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: 2,
  },
  versionText: {
    color: palette.textMute,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    fontVariant: ['tabular-nums'],
  },
  versionNote: {
    color: palette.textMute,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
