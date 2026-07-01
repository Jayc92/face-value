import Slider from '@react-native-community/slider';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SeatTier, SEAT_TIER_LABELS } from '../game/types';
import { palette, radii, seatAccents, spacing } from '../utils/theme';

interface BidAllocatorProps {
  tier: SeatTier;
  amount: number;
  /** Max the slider can reach (player's remaining budget for this tier). */
  maxValue: number;
  /** Player's total credits — used for the percentage label and step sizing. */
  totalCredits: number;
  /** Minimum winning bid this seat tier will accept. Surfaced as the "reserve". */
  reserve: number;
  onChange: (next: number) => void;
  /** Quick-bid shortcut amounts (e.g. 25/50/75/100%). */
  showQuickBids?: boolean;
}

const TIER_HINTS: Record<SeatTier, string> = {
  front: 'Best seat in the house. Closest to the stage.',
  mid: 'Sweet spot. Real sightlines, half the cost.',
  upper: 'Standing-room energy. Cheap, but valid.',
};

const QUICK_BID_PCTS: number[] = [0.25, 0.5, 0.75, 1];

/**
 * Tactile credit allocator for a single seat tier. Slider + numeric
 * readout + quick-bid percent buttons. Color-coded per tier so the
 * player builds muscle memory: front=gold, mid=pink, upper=steel.
 */
export function BidAllocator({
  tier,
  amount,
  maxValue,
  totalCredits,
  reserve,
  onChange,
  showQuickBids = true,
}: BidAllocatorProps): React.JSX.Element {
  const accent = seatAccents[tier];
  const pct: number = totalCredits > 0 ? amount / totalCredits : 0;
  const meetsReserve: boolean = amount >= reserve;
  // Kept short so the label doesn't wrap at 360px viewports.
  const reserveLabel: string =
    reserve > 0
      ? meetsReserve
        ? '✓ meets reserve'
        : `min ${reserve.toLocaleString()}`
      : '';

  const sliderStep: number =
    totalCredits > 0 ? Math.max(1, Math.round(totalCredits / 50)) : 1;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.tierBlock}>
          <View style={[styles.tierStripe, { backgroundColor: accent.line }]} />
          <View>
            <Text style={[styles.tierLabel, { color: accent.label }]}>
              {SEAT_TIER_LABELS[tier]}
            </Text>
            <Text style={styles.tierHint} numberOfLines={1}>
              {TIER_HINTS[tier]}
            </Text>
          </View>
        </View>
        <View style={styles.amountBlock}>
          <Text style={styles.amount}>{amount.toLocaleString()}</Text>
          <Text style={styles.amountSub}>
            cr · {Math.round(pct * 100)}%
          </Text>
        </View>
      </View>

      <Slider
        minimumValue={0}
        maximumValue={Math.max(1, maxValue)}
        step={sliderStep}
        value={Math.min(amount, maxValue)}
        onValueChange={(value: number) => onChange(Math.round(value))}
        minimumTrackTintColor={accent.line}
        maximumTrackTintColor={palette.panelRaised}
        thumbTintColor={accent.line}
        disabled={totalCredits === 0}
        accessibilityLabel={`${SEAT_TIER_LABELS[tier]} bid`}
        accessibilityValue={{
          min: 0,
          max: Math.max(1, maxValue),
          now: amount,
          text: `${amount.toLocaleString()} credits${
            reserve > 0
              ? meetsReserve
                ? ', meets reserve'
                : `, below the ${reserve.toLocaleString()} credit reserve`
              : ''
          }`,
        }}
      />

      {showQuickBids ? (
        <View style={styles.quickRow}>
          {reserveLabel ? (
            <Text
              numberOfLines={1}
              style={[
                styles.reserveLabel,
                meetsReserve ? { color: palette.success } : { color: palette.textLow },
              ]}
            >
              {reserveLabel}
            </Text>
          ) : <View />}
          <View style={styles.quickChipsGroup}>
            {QUICK_BID_PCTS.map((quickPct: number) => {
              const target: number = Math.min(maxValue, Math.round(totalCredits * quickPct));
              const active: boolean = amount === target && target > 0;
              return (
                <Pressable
                  key={quickPct}
                  onPress={() => onChange(target)}
                  disabled={totalCredits === 0}
                  accessibilityRole="button"
                  accessibilityLabel={`Bid ${Math.round(quickPct * 100)} percent of credits on ${SEAT_TIER_LABELS[tier]}`}
                  accessibilityState={{ selected: active, disabled: totalCredits === 0 }}
                  style={[
                    styles.quickChip,
                    active && { borderColor: accent.line, backgroundColor: 'rgba(255,255,255,0.04)' },
                  ]}
                >
                  <Text style={[styles.quickChipText, active && { color: accent.label }]}>
                    {Math.round(quickPct * 100)}%
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.panel,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  tierBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  tierStripe: {
    width: 3,
    height: 28,
    borderRadius: 2,
  },
  tierLabel: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  tierHint: {
    color: palette.textLow,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  amountBlock: {
    alignItems: 'flex-end',
  },
  amount: {
    color: palette.textHi,
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  amountSub: {
    color: palette.textLow,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    marginTop: -4,
  },
  quickChipsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  reserveLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.hairline,
  },
  quickChipText: {
    color: palette.textMed,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
