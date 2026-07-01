import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, radii, spacing } from '../utils/theme';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Minimal top-level error boundary so a rendering exception shows a
 * premium fallback instead of a blank screen during playtests.
 *
 * "Restart shift" resets the boundary, which re-mounts the child tree
 * (navigation returns to the initial Home route). On web we also reload
 * the page. It NEVER clears AsyncStorage — the Ticket Vault and Player
 * Profile are untouched, so recovery is non-destructive.
 *
 * Kept dependency-light on purpose: it renders with plain primitives
 * (no Reanimated / SVG) so the fallback works even if a fancy component
 * is what crashed.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Log for development; there is no crash-reporting backend in v1.
    console.error('Face Value crashed inside the app tree', error, info);
  }

  private handleRestart = (): void => {
    // Re-mount the child tree (nav resets to Home). No data is cleared.
    this.setState({ hasError: false });
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container} accessibilityRole="alert">
        <View style={styles.card}>
          <Text style={styles.kicker}>SET INTERRUPTED</Text>
          <Text style={styles.title}>The gate jammed.</Text>
          <Text style={styles.body}>
            Something backstage hit a snag. Your tickets, streak, and records are
            safe — restart the shift to head back to the lobby.
          </Text>

          <Pressable
            onPress={this.handleRestart}
            accessibilityRole="button"
            accessibilityLabel="Restart shift"
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Restart shift</Text>
          </Pressable>

          <Pressable
            onPress={this.handleRestart}
            accessibilityRole="button"
            accessibilityLabel="Return home"
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>Return home</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.ink900,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.panel,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.hairline,
    padding: spacing.xl,
    gap: spacing.md,
  },
  kicker: {
    color: palette.pink,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  title: {
    color: palette.textHi,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0,
  },
  body: {
    color: palette.textMed,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
    marginBottom: spacing.sm,
  },
  primary: {
    backgroundColor: palette.pink,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: palette.textHi,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.hairlineStrong,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: palette.textMed,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
});
