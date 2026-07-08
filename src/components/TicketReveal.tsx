import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { RARITY_COLORS, RARITY_LABELS, ticketRarity } from '../game/rarity';
import { Ticket } from '../game/types';
import { getPreferences } from '../utils/preferences';
import { playSound } from '../utils/sounds';
import { palette, radii, spacing } from '../utils/theme';
import { TicketCard } from './TicketCard';

interface TicketRevealProps {
  ticket: Ticket;
  /** Fires once the reveal reaches the vault-confirmation stage. */
  onRevealed?: () => void;
}

/**
 * Staged ticket reveal for the Results screen:
 *   1. Light sweep across a covered stub
 *   2. Ticket slides in
 *   3. Rarity banner reveals (with a shimmer sound)
 *   4. Seat coordinates settle (the TicketCard itself)
 *   5. "Secured in your Vault" confirmation
 *
 * Reduced motion (Settings) collapses all of this to the final state
 * shown instantly — no sweep, no slide, no sound-driven timing.
 */
export function TicketReveal({ ticket, onRevealed }: TicketRevealProps): React.JSX.Element {
  const rarity = ticketRarity(ticket);
  const rarityColor = RARITY_COLORS[rarity].line;
  const reduceMotion: boolean = getPreferences().reduceMotion;

  const [showRarity, setShowRarity] = useState<boolean>(reduceMotion);
  const [confirmed, setConfirmed] = useState<boolean>(reduceMotion);

  // Card entrance
  const cardOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const cardTranslate = useSharedValue(reduceMotion ? 0 : 28);
  // Light sweep (0 → 1 travels a highlight bar across the card)
  const sweep = useSharedValue(0);
  // Rarity banner
  const rarityOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const rarityTranslate = useSharedValue(reduceMotion ? 0 : -10);

  useEffect(() => {
    if (reduceMotion) {
      onRevealed?.();
      return;
    }

    // 1–2: sweep + slide-in
    sweep.value = withTiming(1, { duration: 520, easing: Easing.inOut(Easing.quad) });
    cardOpacity.value = withTiming(1, { duration: 320 });
    cardTranslate.value = withTiming(0, { duration: 460, easing: Easing.out(Easing.cubic) });

    // 3: rarity banner + shimmer, after the card has landed
    rarityOpacity.value = withDelay(
      560,
      withTiming(1, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(setShowRarity)(true);
          runOnJS(playSound)('reveal');
        }
      }),
    );
    rarityTranslate.value = withDelay(560, withTiming(0, { duration: 300 }));

    // 5: vault confirmation
    const confirmTimer = setTimeout(() => {
      setConfirmed(true);
      onRevealed?.();
    }, 1050);
    return () => clearTimeout(confirmTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslate.value }],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    opacity: (1 - sweep.value) * 0.9,
    transform: [{ translateX: -120 + sweep.value * 320 }, { rotate: '18deg' }],
  }));

  const rarityStyle = useAnimatedStyle(() => ({
    opacity: rarityOpacity.value,
    transform: [{ translateY: rarityTranslate.value }],
  }));

  return (
    <View style={styles.wrap}>
      {/* Rarity banner above the card */}
      <Animated.View
        style={[styles.rarityBanner, { borderColor: rarityColor }, rarityStyle]}
        accessibilityRole="text"
        accessibilityLabel={`Rarity: ${RARITY_LABELS[rarity]}`}
      >
        <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
        <Text style={[styles.rarityText, { color: rarityColor }]}>
          {(showRarity ? RARITY_LABELS[rarity] : 'Revealing…').toUpperCase()}
        </Text>
      </Animated.View>

      <Animated.View style={cardStyle}>
        <View style={styles.cardClip}>
          <TicketCard ticket={ticket} variant="featured" />
          {!reduceMotion ? (
            <Animated.View pointerEvents="none" style={[styles.sweep, sweepStyle]} />
          ) : null}
        </View>
      </Animated.View>

      <View style={styles.confirmRow}>
        <Text style={[styles.confirmText, confirmed && { color: palette.success }]}>
          {confirmed ? '✓ Secured in your Vault' : 'Adding to your Vault…'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  rarityBanner: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    backgroundColor: palette.panelGlass,
  },
  rarityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  rarityText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  cardClip: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  sweep: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  confirmRow: {
    alignItems: 'center',
  },
  confirmText: {
    color: palette.textMed,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
