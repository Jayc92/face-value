import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { palette, type as typeTokens } from '../utils/theme';

interface WordmarkProps {
  /** Small variant for tucked-away placements (header bars, share cards). */
  size?: 'lg' | 'sm';
  /** Show the "TICKETS REIMAGINED" sub-line under the wordmark. */
  showByline?: boolean;
}

/**
 * The FACE VALUE logo treatment. The 'A' in VALUE picks up the yellow
 * accent so the mark always has the brand bicolor inside it, and a
 * thin scanner-line sits under the wordmark for a venue-marquee feel.
 */
export function Wordmark({ size = 'lg', showByline = false }: WordmarkProps): React.JSX.Element {
  const fontSize: number = size === 'lg' ? typeTokens.wordmark.fontSize : 22;
  const tracking: number = size === 'lg' ? 6 : 3;
  const lineWidth: number = size === 'lg' ? 220 : 120;
  const lineHeight: number = size === 'lg' ? 6 : 4;

  return (
    <View style={styles.container} accessibilityRole="header" accessibilityLabel="Face Value">
      <View style={styles.row}>
        <Text style={[styles.word, { fontSize, letterSpacing: tracking }]}>FACE</Text>
        <Text style={[styles.dot, { fontSize: fontSize * 0.55 }]}>·</Text>
        <Text style={[styles.word, { fontSize, letterSpacing: tracking }]}>
          V<Text style={styles.accent}>A</Text>LUE
        </Text>
      </View>

      <View style={[styles.scannerWrap, { width: lineWidth, height: lineHeight }]}>
        <Svg width={lineWidth} height={lineHeight}>
          <Defs>
            <LinearGradient id="wordmarkLine" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={palette.pink} stopOpacity="0" />
              <Stop offset="0.5" stopColor={palette.pink} stopOpacity="1" />
              <Stop offset="1" stopColor={palette.pink} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={lineWidth} height={lineHeight} fill="url(#wordmarkLine)" rx={lineHeight / 2} />
        </Svg>
      </View>

      {showByline ? <Text style={styles.byline}>TICKETS · REIMAGINED</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  word: {
    color: palette.textHi,
    fontWeight: '900',
  },
  accent: {
    color: palette.yellow,
  },
  dot: {
    color: palette.pink,
    marginHorizontal: 6,
    fontWeight: '900',
  },
  scannerWrap: {
    marginTop: 6,
  },
  byline: {
    color: palette.textLow,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: 8,
  },
});
