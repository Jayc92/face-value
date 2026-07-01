import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { League } from '../game/types';
import { LEAGUE_VISUALS } from '../utils/leagueVisuals';
import { palette, radii } from '../utils/theme';

interface LeagueBadgeProps {
  league: League;
  size?: number;
  /** Show the league mark hollowed (outlined) instead of filled. */
  outline?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Brand mark for a league: a square panel with a typographic glyph and a
 * single-color hairline border. Designed to look like an event seal.
 * No emoji.
 */
export function LeagueBadge({
  league,
  size = 48,
  outline = false,
  style,
}: LeagueBadgeProps): React.JSX.Element {
  const visual = LEAGUE_VISUALS[league];
  return (
    <View
      style={[
        styles.square,
        {
          width: size,
          height: size,
          borderColor: visual.accent,
          backgroundColor: outline ? 'transparent' : visual.accentSoft,
          borderRadius: Math.max(8, size / 5),
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.mark,
          { color: visual.accent, fontSize: Math.max(12, size * 0.42) },
        ]}
      >
        {visual.mark}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  square: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.panel,
    borderRadius: radii.sm,
  },
  mark: {
    fontWeight: '900',
    letterSpacing: 1,
  },
});
