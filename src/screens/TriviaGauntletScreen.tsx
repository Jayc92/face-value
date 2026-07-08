import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AnswerChoice } from '../components/AnswerChoice';
import { CountdownRing } from '../components/CountdownRing';
import { LeagueBadge } from '../components/LeagueBadge';
import { Panel } from '../components/Panel';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenShell } from '../components/ScreenShell';
import { StreakBadge } from '../components/StreakBadge';
import { LEAGUE_LABELS } from '../game/events';
import { ScreenProps } from '../game/navigation';
import { drawGauntletQuestions } from '../game/questionBank';
import { creditsForAnswer, QUESTION_TIME_SECONDS, QUESTIONS_PER_ROUND } from '../game/scoring';
import { AnsweredQuestion, TriviaQuestion } from '../game/types';
import { LEAGUE_VISUALS } from '../utils/leagueVisuals';
import { playSound } from '../utils/sounds';
import { palette, radii, spacing } from '../utils/theme';

type Phase = 'answering' | 'revealed';

export function TriviaGauntletScreen({
  navigation,
  route,
}: ScreenProps<'TriviaGauntlet'>): React.JSX.Element {
  const { league, tierLevel, liveEventId, liveEventName, liveBonusActive } = route.params;
  const leagueVisual = LEAGUE_VISUALS[league];

  const questions = useMemo<TriviaQuestion[]>(
    () => drawGauntletQuestions(league, tierLevel),
    [league, tierLevel],
  );

  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [phase, setPhase] = useState<Phase>('answering');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(QUESTION_TIME_SECONDS);
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [totalCredits, setTotalCredits] = useState<number>(0);
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([]);

  const currentQuestion: TriviaQuestion = questions[questionIndex];
  const phaseRef = useRef<Phase>('answering');
  phaseRef.current = phase;

  // Wall-clock start of the round, captured once on mount, carried to the
  // session summary. Observational only — no gameplay effect.
  const roundStartedAtRef = useRef<number>(Date.now());

  const creditBump = useSharedValue(0);
  const creditScale = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + creditBump.value * 0.18 }],
  }));

  useEffect(() => {
    if (phase !== 'answering') {
      return;
    }
    const interval = setInterval(() => {
      setSecondsRemaining((previous) => {
        const next: number = previous - 1;
        if (next <= 5 && next > 0) {
          playSound('tick');
        }
        if (next <= 0) {
          clearInterval(interval);
          setTimeout(() => {
            if (phaseRef.current === 'answering') {
              lockInAnswer(null, 0);
            }
          }, 0);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIndex, phase]);

  const lockInAnswer = (choice: number | null, secondsLeft: number): void => {
    const wasCorrect: boolean = choice !== null && choice === currentQuestion.correctIndex;
    const nextStreak: number = wasCorrect ? streak + 1 : 0;
    const { creditsEarned, multiplierApplied } = creditsForAnswer(
      wasCorrect,
      currentQuestion.difficulty,
      secondsLeft,
      nextStreak,
      liveBonusActive,
    );

    playSound(wasCorrect ? 'correct' : 'wrong');
    setChosenIndex(choice);
    setStreak(nextStreak);
    setTotalCredits((previous) => previous + creditsEarned);
    if (creditsEarned > 0) {
      creditBump.value = withSequence(
        withSpring(1, { damping: 7, stiffness: 240 }),
        withTiming(0, { duration: 220 }),
      );
    }
    setAnswered((previous) => [
      ...previous,
      {
        question: currentQuestion,
        chosenIndex: choice,
        wasCorrect,
        creditsEarned,
        multiplierApplied,
      },
    ]);
    setPhase('revealed');
  };

  const advance = (): void => {
    const isLastQuestion: boolean = questionIndex + 1 >= questions.length;
    if (isLastQuestion) {
      navigation.replace('BiddingFloor', {
        league,
        tierLevel,
        creditsEarned: totalCredits,
        answeredQuestions: answered,
        liveEventId,
        liveEventName,
        liveBonusActive,
        roundStartedAtMs: roundStartedAtRef.current,
      });
      return;
    }
    setQuestionIndex((previous) => previous + 1);
    setChosenIndex(null);
    setSecondsRemaining(QUESTION_TIME_SECONDS);
    setPhase('answering');
  };

  const lastAnswer: AnsweredQuestion | undefined = answered[answered.length - 1];
  const isLastQuestion: boolean = questionIndex + 1 >= questions.length;

  const stateForChoice = (index: number): React.ComponentProps<typeof AnswerChoice>['state'] => {
    if (phase !== 'revealed') {
      return 'answering';
    }
    if (index === currentQuestion.correctIndex) {
      return 'revealedCorrect';
    }
    if (index === chosenIndex) {
      return 'revealedWrong';
    }
    return 'revealedNeutral';
  };

  return (
    <ScreenShell scroll>
      {/* Top bar: progress segments + credits */}
      <View style={styles.topBar}>
        <View style={styles.leagueChip}>
          <LeagueBadge league={league} size={20} outline />
          <Text style={styles.leagueChipText}>{LEAGUE_LABELS[league]}</Text>
        </View>

        <Pressable
          hitSlop={8}
          onPress={() => navigation.popToTop()}
          style={styles.exitButton}
          accessibilityLabel="Exit gauntlet"
        >
          <Text style={styles.exitText}>Exit</Text>
        </Pressable>
      </View>

      <View style={styles.progressRow}>
        {Array.from({ length: QUESTIONS_PER_ROUND }).map((_, index) => {
          const state =
            index < questionIndex
              ? answered[index]?.wasCorrect
                ? 'correct'
                : 'wrong'
              : index === questionIndex
                ? 'current'
                : 'pending';
          const bg: string =
            state === 'correct'
              ? palette.success
              : state === 'wrong'
                ? palette.danger
                : state === 'current'
                  ? palette.pink
                  : palette.panelRaised;
          return <View key={index} style={[styles.progressSeg, { backgroundColor: bg }]} />;
        })}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaCount}>
          Question {questionIndex + 1}<Text style={styles.metaCountDim}> / {QUESTIONS_PER_ROUND}</Text>
        </Text>
        <Animated.View style={creditScale}>
          <View style={styles.creditPill}>
            <Text style={styles.creditPillBolt}>⚡</Text>
            <Text style={styles.creditPillValue}>{totalCredits.toLocaleString()}</Text>
          </View>
        </Animated.View>
      </View>

      {liveBonusActive ? (
        <View style={styles.liveBonusStrip}>
          <View style={styles.liveBonusDot} />
          <Text style={styles.liveBonusText}>LIVE EVENT · ALL CREDITS ×2</Text>
        </View>
      ) : null}

      {/* Countdown ring + streak */}
      <View style={styles.ringRow}>
        <CountdownRing
          totalSeconds={QUESTION_TIME_SECONDS}
          secondsRemaining={secondsRemaining}
          resetKey={questionIndex}
          paused={phase === 'revealed'}
          size={132}
        />
        <View style={styles.streakColumn}>
          <Text style={styles.difficultyKicker}>
            {currentQuestion.difficulty.toUpperCase()}
          </Text>
          <View style={[styles.difficultyChip, { borderColor: leagueVisual.accent }]}>
            <Text style={[styles.difficultyChipText, { color: leagueVisual.accent }]}>
              {currentQuestion.difficulty === 'hard'
                ? '★★★'
                : currentQuestion.difficulty === 'medium'
                  ? '★★'
                  : '★'}
            </Text>
          </View>
          <View style={{ marginTop: spacing.sm }}>
            <StreakBadge streak={streak} />
          </View>
        </View>
      </View>

      <Text style={styles.question}>{currentQuestion.question}</Text>

      <View style={styles.choices}>
        {currentQuestion.choices.map((choice: string, index: number) => (
          <AnswerChoice
            key={`${questionIndex}-${index}`}
            letter={String.fromCharCode(65 + index)}
            text={choice}
            state={stateForChoice(index)}
            disabled={phase === 'revealed'}
            index={index}
            onPress={() => lockInAnswer(index, secondsRemaining)}
          />
        ))}
      </View>

      {phase === 'revealed' && lastAnswer ? (
        <Panel
          variant="raised"
          borderColor={
            lastAnswer.wasCorrect
              ? palette.success
              : lastAnswer.chosenIndex === null
                ? palette.warning
                : palette.danger
          }
          borderWidth={1.5}
          style={styles.revealPanel}
        >
          <View style={styles.revealHeader}>
            <Text
              style={[
                styles.revealKicker,
                {
                  color: lastAnswer.wasCorrect
                    ? palette.success
                    : lastAnswer.chosenIndex === null
                      ? palette.warning
                      : palette.danger,
                },
              ]}
            >
              {lastAnswer.wasCorrect
                ? 'CORRECT'
                : lastAnswer.chosenIndex === null
                  ? 'TIME UP'
                  : 'INCORRECT'}
            </Text>
            {lastAnswer.wasCorrect ? (
              <Text style={styles.revealCredits}>
                +{lastAnswer.creditsEarned.toLocaleString()}
                {lastAnswer.multiplierApplied > 1 ? (
                  <Text style={styles.revealMultiplier}> ·  ×{lastAnswer.multiplierApplied}</Text>
                ) : null}
              </Text>
            ) : null}
          </View>

          <View style={styles.factDivider} />

          <View>
            <Text style={styles.factKicker}>DID YOU KNOW</Text>
            <Text style={styles.factText}>{currentQuestion.funFact}</Text>
          </View>

          <PrimaryButton
            label={isLastQuestion ? 'TO THE BIDDING FLOOR' : 'NEXT QUESTION'}
            trailing="→"
            onPress={advance}
          />
        </Panel>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  leagueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: palette.panel,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  leagueChipText: {
    color: palette.textMed,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  exitButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  exitText: {
    color: palette.textLow,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: spacing.md,
  },
  progressSeg: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaCount: {
    color: palette.textHi,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  metaCountDim: {
    color: palette.textLow,
  },
  creditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.panel,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  creditPillBolt: {
    color: palette.yellow,
    fontSize: 14,
    fontWeight: '900',
  },
  creditPillValue: {
    color: palette.yellow,
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  liveBonusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
  liveBonusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.danger,
  },
  liveBonusText: {
    color: palette.danger,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  streakColumn: {
    alignItems: 'flex-start',
    gap: 4,
    flex: 1,
  },
  difficultyKicker: {
    color: palette.textLow,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  difficultyChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  difficultyChipText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  question: {
    color: palette.textHi,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.2,
    lineHeight: 28,
    marginBottom: spacing.lg,
    minHeight: 64,
  },
  choices: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  revealPanel: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  revealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revealKicker: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  revealCredits: {
    color: palette.yellow,
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  revealMultiplier: {
    color: palette.pink,
    fontSize: 14,
    fontWeight: '900',
  },
  factDivider: {
    height: 1,
    backgroundColor: palette.hairline,
  },
  factKicker: {
    color: palette.pink,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  factText: {
    color: palette.textMed,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
});
