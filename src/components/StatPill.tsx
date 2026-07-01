import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { palette, radii, spacing } from '../utils/theme';

interface StatPillProps {
  label: string;
  value: string | number;
  /** Optional tiny prefix glyph (single character, e.g. ⚡). Kept text-only. */
  glyph?: string;
  tone?: 'default' | 'pink' | 'yellow' | 'success';
  /** Compact rendering for tight rows. */
  dense?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Numeric stat in a pill: label up top, value below. The value uses
 * tabular-nums so credit counts and fan scores don't jiggle as they grow.
 */
export function StatPill({
  label,
  value,
  glyph,
  tone = 'default',
  dense = false,
  style,
}: StatPillProps): React.JSX.Element {
  const valueColor: string =
    tone === 'pink'
      ? palette.pink
      : tone === 'yellow'
        ? palette.yellow
        : tone === 'success'
          ? palette.success
          : palette.textHi;

  return (
    <View style={[styles.pill, dense && styles.pillDense, style]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        {glyph ? <Text style={[styles.glyph, { color: valueColor }]}>{glyph}</Text> : null}
        <Text style={[styles.value, dense && styles.valueDense, { color: valueColor }]}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: palette.panel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.hairline,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flex: 1,
  },
  pillDense: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  label: {
    color: palette.textLow,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  glyph: {
    fontSize: 14,
    fontWeight: '900',
  },
  value: {
    fontSize: 22,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0,
  },
  valueDense: {
    fontSize: 16,
  },
});
