import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CountdownRing } from '../components/CountdownRing';
import { GlowButton } from '../components/GlowButton';
import { StreakBadge } from '../components/StreakBadge';
import { LEAGUE_LABELS } from '../game/events';
import { ScreenProps } from '../game/navigation';
import { drawGauntletQuestions } from '../game/questionBank';
import { creditsForAnswer, QUESTION_TIME_SECONDS, QUESTIONS_PER_ROUND } from '../game/scoring';
import { AnsweredQuestion, TriviaQuestion } from '../game/types';
import { playSound } from '../utils/sounds';
import { colors, radii, spacing, typography } from '../utils/theme';

type Phase = 'answering' | 'revealed';

export function TriviaGauntletScreen({
  navigation,
  route,
}: ScreenProps<'TriviaGauntlet'>): React.JSX.Element {
  const { league, tierLevel, liveEventId, liveEventName, liveBonusActive } = route.params;

  // Draw the round once; re-renders must not reshuffle.
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

  // Per-question countdown. Ticks the clock, plays the urgency tick under
  // 6s, and locks in a timeout (null answer) at zero.
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
          // Defer so the state updater stays pure.
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
      });
      return;
    }
    setQuestionIndex((previous) => previous + 1);
    setChosenIndex(null);
    setSecondsRemaining(QUESTION_TIME_SECONDS);
    setPhase('answering');
  };

  const lastAnswer: AnsweredQuestion | undefined = answered[answered.length - 1];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <Text style={styles.progress}>
          Q{questionIndex + 1}/{QUESTIONS_PER_ROUND} · {LEAGUE_LABELS[league]}
        </Text>
        <StreakBadge streak={streak} />
        <Text style={styles.credits}>⚡ {totalCredits.toLocaleString()}</Text>
      </View>

      {liveBonusActive && (
        <Text style={styles.liveBonus}>🔴 LIVE — all credits doubled</Text>
      )}

      <View style={styles.ringRow}>
        <CountdownRing
          totalSeconds={QUESTION_TIME_SECONDS}
          secondsRemaining={secondsRemaining}
          resetKey={questionIndex}
          paused={phase === 'revealed'}
        />
      </View>

      <Text style={styles.question}>{currentQuestion.question}</Text>

      <View style={styles.choices}>
        {currentQuestion.choices.map((choice: string, index: number) => {
          const isCorrectChoice: boolean = index === currentQuestion.correctIndex;
          const isChosen: boolean = index === chosenIndex;
          const revealed: boolean = phase === 'revealed';
          return (
            <Pressable
              key={index}
              disabled={revealed}
              onPress={() => lockInAnswer(index, secondsRemaining)}
              style={[
                styles.choiceCard,
                revealed && isCorrectChoice && styles.choiceCorrect,
                revealed && isChosen && !isCorrectChoice && styles.choiceWrong,
              ]}
            >
              <Text style={styles.choiceLetter}>{String.fromCharCode(65 + index)}</Text>
              <Text style={styles.choiceText}>{choice}</Text>
            </Pressable>
          );
        })}
      </View>

      {phase === 'revealed' && lastAnswer && (
        <View style={styles.revealPanel}>
          <Text style={styles.revealHeadline}>
            {lastAnswer.wasCorrect
              ? `✅ +${lastAnswer.creditsEarned.toLocaleString()} credits${
                  lastAnswer.multiplierApplied > 1 ? ` (x${lastAnswer.multiplierApplied} hype)` : ''
                }`
              : lastAnswer.chosenIndex === null
                ? '⏰ Time! No credits.'
                : '❌ Wrong — streak broken.'}
          </Text>
          <Text style={styles.funFact}>💡 {currentQuestion.funFact}</Text>
          <GlowButton
            label={questionIndex + 1 >= questions.length ? 'TO THE BIDDING FLOOR →' : 'NEXT QUESTION'}
            onPress={advance}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progress: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '800',
  },
  credits: {
    color: colors.yellow,
    fontSize: 15,
    fontWeight: '900',
  },
  liveBonus: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  ringRow: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  question: {
    ...typography.title,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.md,
    minHeight: 64,
  },
  choices: {
    gap: spacing.sm,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.surfaceLight,
    padding: spacing.md,
    gap: spacing.md,
  },
  choiceCorrect: {
    borderColor: colors.success,
    backgroundColor: '#10331F',
  },
  choiceWrong: {
    borderColor: colors.danger,
    backgroundColor: '#3A1118',
  },
  choiceLetter: {
    color: colors.pink,
    fontSize: 16,
    fontWeight: '900',
    width: 22,
  },
  choiceText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  revealPanel: {
    marginTop: 'auto',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.md,
    gap: spacing.sm,
  },
  revealHeadline: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  funFact: {
    color: colors.textDim,
    fontSize: 13,
    lineHeight: 19,
  },
});
