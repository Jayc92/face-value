import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from './PrimaryButton';
import { SpotlightHalo } from './SpotlightHalo';
import { palette, radii, spacing } from '../utils/theme';

interface HowToPlayProps {
  visible: boolean;
  /** Fired when the player finishes the last step or taps Skip. */
  onClose: () => void;
  /** Label for the final CTA — "Enter" on first run, "Got it" on replay. */
  finishLabel?: string;
}

interface Step {
  index: string;
  accent: string;
  title: string;
  body: string;
}

/**
 * The "Opening Night Briefing" — a short 4-step first-run explainer that
 * doubles as the replayable How to Play sheet. Premium venue styling,
 * fully skippable, readable at 360×740. No fake tutorial round.
 */
const STEPS: Step[] = [
  {
    index: '01',
    accent: palette.pink,
    title: 'Answer fast. Build credits.',
    body: '10 questions. Faster correct answers earn more credits.',
  },
  {
    index: '02',
    accent: palette.yellow,
    title: 'Bid for a seat.',
    body: 'Spend credits to outbid rivals. Losing bids are refunded.',
  },
  {
    index: '03',
    accent: palette.pinkSoft,
    title: 'Win tickets. Chase medals.',
    body: 'Every seat you win joins your Vault and levels you up.',
  },
  {
    index: '04',
    accent: palette.success,
    title: 'Come back daily.',
    body: "Tonight's live event pays 2× and keeps your streak alive.",
  },
];

export function HowToPlay({
  visible,
  onClose,
  finishLabel = 'Enter',
}: HowToPlayProps): React.JSX.Element {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const isLast: boolean = stepIndex >= STEPS.length - 1;
  const step: Step = STEPS[stepIndex];

  const handleNext = (): void => {
    if (isLast) {
      onClose();
      // Reset for next open (replay).
      setStepIndex(0);
    } else {
      setStepIndex((current) => current + 1);
    }
  };

  const handleSkip = (): void => {
    onClose();
    setStepIndex(0);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={handleSkip}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <SpotlightHalo color={step.accent} intensity={0.6} />

        <View style={styles.topBar}>
          <Text style={styles.kicker}>OPENING NIGHT BRIEFING</Text>
          <Pressable
            hitSlop={12}
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip the how to play briefing"
          >
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.stepBadge, { borderColor: step.accent }]}>
            <Text style={[styles.stepBadgeText, { color: step.accent }]}>{step.index}</Text>
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {step.title}
          </Text>
          <Text style={styles.stepBody}>{step.body}</Text>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dots} accessibilityRole="progressbar">
            {STEPS.map((s, index) => (
              <View
                key={s.index}
                style={[
                  styles.dot,
                  index === stepIndex && { backgroundColor: step.accent, width: 20 },
                ]}
              />
            ))}
          </View>
          <PrimaryButton
            label={isLast ? finishLabel : 'Next'}
            trailing="→"
            onPress={handleNext}
            accessibilityLabel={isLast ? finishLabel : `Next step, ${stepIndex + 2} of ${STEPS.length}`}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.ink900,
    paddingHorizontal: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  kicker: {
    color: palette.textLow,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  skip: {
    color: palette.textMed,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  stepBadge: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.panelGlass,
  },
  stepBadgeText: {
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  title: {
    color: palette.textHi,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 33,
  },
  stepBody: {
    color: palette.textMed,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 23,
  },
  footer: {
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.panelRaised,
  },
});
