import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
  ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { layout, palette } from '../utils/theme';

interface ScreenShellProps {
  children: React.ReactNode;
  /** When true, renders children inside a ScrollView with consistent padding. */
  scroll?: boolean;
  scrollViewProps?: ScrollViewProps;
  /** Extra style applied to the inner content container. */
  contentStyle?: StyleProp<ViewStyle>;
  /** Skip the standard horizontal padding (rare — full-bleed screens only). */
  noPadding?: boolean;
}

/**
 * Standard page chrome: dark ink background, safe area, consistent
 * horizontal padding. Every screen wraps in this so spacing is uniform.
 */
export function ScreenShell({
  children,
  scroll = false,
  scrollViewProps,
  contentStyle,
  noPadding = false,
}: ScreenShellProps): React.JSX.Element {
  const padStyle: ViewStyle = noPadding
    ? { paddingHorizontal: 0 }
    : { paddingHorizontal: layout.screenPaddingX };

  if (scroll) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          {...scrollViewProps}
          contentContainerStyle={[
            styles.scroll,
            padStyle,
            { paddingTop: layout.screenPaddingTop, paddingBottom: layout.screenPaddingBottom },
            contentStyle,
          ]}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View
        style={[
          styles.fill,
          padStyle,
          { paddingTop: layout.screenPaddingTop, paddingBottom: layout.screenPaddingBottom },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.ink900,
  },
  fill: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
});
