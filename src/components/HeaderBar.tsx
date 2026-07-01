import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, spacing } from '../utils/theme';

interface HeaderBarProps {
  title?: string;
  /** Tiny label above the title, in micro-caps. */
  kicker?: string;
  /** Show a chevron-style back affordance. */
  onBack?: () => void;
  backLabel?: string;
  /** Optional right-side adornment (link, icon-button). */
  trailing?: React.ReactNode;
}

/**
 * Standard top bar for non-home screens. Uses a chevron-style "Back"
 * link instead of a full button — the chrome stays minimal so the
 * screen content can take the spotlight.
 */
export function HeaderBar({
  title,
  kicker,
  onBack,
  backLabel = 'Back',
  trailing,
}: HeaderBarProps): React.JSX.Element {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable hitSlop={12} onPress={onBack} accessibilityRole="button">
            <Text style={styles.back}>‹  {backLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.center}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        {title ? <Text style={styles.title}>{title}</Text> : null}
      </View>
      <View style={[styles.side, styles.sideRight]}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
    marginBottom: spacing.md,
  },
  side: {
    minWidth: 72,
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  center: {
    alignItems: 'center',
    flexShrink: 1,
  },
  back: {
    color: palette.textMed,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  kicker: {
    color: palette.pink,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
  },
  title: {
    color: palette.textHi,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginTop: 2,
  },
});
