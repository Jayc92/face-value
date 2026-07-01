import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, radii, spacing } from '../utils/theme';

interface AnswerChoiceProps {
  letter: string;
  text: string;
  /** answering | revealedCorrect | revealedWrong | revealedNeutral */
  state: 'answering' | 'revealedCorrect' | 'revealedWrong' | 'revealedNeutral';
  onPress: () => void;
  disabled: boolean;
  /** Reserved — kept for future stagger work; currently unused so cards mount instantly. */
  index?: number;
}

/**
 * Single trivia answer card. Big tap target, distinct letter pill,
 * state-aware reveal coloring. Press feedback comes from the Pressable
 * itself so we don't depend on Reanimated entrance ordering.
 */
export function AnswerChoice({
  letter,
  text,
  state,
  onPress,
  disabled,
}: AnswerChoiceProps): React.JSX.Element {
  const palettePerState = {
    answering: {
      bg: palette.panel,
      border: palette.hairlineStrong,
      letterBg: palette.panelRaised,
      letterColor: palette.textHi,
      text: palette.textHi,
    },
    revealedCorrect: {
      bg: '#0C2A1B',
      border: palette.success,
      letterBg: palette.success,
      letterColor: palette.ink900,
      text: palette.textHi,
    },
    revealedWrong: {
      bg: '#2A0E14',
      border: palette.danger,
      letterBg: palette.danger,
      letterColor: palette.ink900,
      text: palette.textHi,
    },
    revealedNeutral: {
      bg: palette.panel,
      border: palette.hairline,
      letterBg: palette.panelRaised,
      letterColor: palette.textLow,
      text: palette.textLow,
    },
  } as const;

  const cs = palettePerState[state];

  // Non-color reveal cue: a check / cross glyph so correctness never
  // relies on color alone (colorblind + screen-reader friendly).
  const revealGlyph: string | null =
    state === 'revealedCorrect' ? '✓' : state === 'revealedWrong' ? '✗' : null;

  // Screen-reader label announces the choice and, once revealed, whether
  // it was the correct answer or the player's wrong pick.
  const stateWord: string =
    state === 'revealedCorrect'
      ? ', correct answer'
      : state === 'revealedWrong'
        ? ', your answer, incorrect'
        : '';
  const accessibilityLabel = `Answer ${letter}: ${text}${stateWord}`;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cs.bg, borderColor: cs.border },
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={[styles.letterPill, { backgroundColor: cs.letterBg }]}>
        <Text style={[styles.letter, { color: cs.letterColor }]}>{letter}</Text>
      </View>
      <Text style={[styles.text, { color: cs.text }]}>{text}</Text>
      {revealGlyph ? (
        <Text
          style={[
            styles.revealGlyph,
            { color: state === 'revealedCorrect' ? palette.success : palette.danger },
          ]}
        >
          {revealGlyph}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1.5,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    minHeight: 60,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  letterPill: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  text: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  revealGlyph: {
    fontSize: 18,
    fontWeight: '900',
    marginLeft: spacing.sm,
  },
});

