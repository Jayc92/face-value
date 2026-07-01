import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { palette, spacing } from '../utils/theme';

interface SectionHeaderProps {
  /** Tiny micro-caps label, e.g. "TONIGHT". */
  kicker?: string;
  /** Main bold label, e.g. "PICK A LEAGUE". */
  title: string;
  /** Optional right-aligned action. */
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}

/**
 * Consistent section divider used to break up long screens (Home, Vault,
 * Results). Keeps spacing and weight uniform so scrolling feels rhythmic.
 */
export function SectionHeader({
  kicker,
  title,
  action,
  style,
}: SectionHeaderProps): React.JSX.Element {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleColumn}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {action ? (
        <Pressable hitSlop={8} onPress={action.onPress}>
          <Text style={styles.action}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleColumn: {
    flexShrink: 1,
  },
  kicker: {
    color: palette.pink,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  title: {
    color: palette.textHi,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  action: {
    color: palette.textMed,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
