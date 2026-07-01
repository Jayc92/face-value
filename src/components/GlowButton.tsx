import React from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import { PrimaryButton } from './PrimaryButton';

interface GlowButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Back-compat shim. New code should import PrimaryButton directly; this
 * is kept so any unmigrated screens still render with the new look.
 */
export function GlowButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: GlowButtonProps): React.JSX.Element {
  return (
    <PrimaryButton
      label={label}
      onPress={onPress}
      variant={variant}
      disabled={disabled}
      style={style}
    />
  );
}
