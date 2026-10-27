// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Component: StatusMessage
// Shows: Checked In (present) ✅ or Invalid QR Code (invalid) ⚠️
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

export type AttendanceStatus = 'present' | 'invalid';

const STATUS_CONFIG: Record<
  AttendanceStatus,
  {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bg: string;
    label: string;
    sub: string;
  }
> = {
  present: {
    icon: 'checkmark-circle',
    color: Colors.present,
    bg: Colors.presentBg,
    label: 'Participant Checked In!',
    sub: 'Participant name and department have been recorded to the check-in list and Google Sheets.',
  },
  invalid: {
    icon: 'warning',
    color: Colors.absent,
    bg: Colors.absentBg,
    label: 'Invalid QR Code',
    sub: 'This QR code is unreadable or not a valid participant pass. No participant was recorded.',
  },
};

type Props = {
  status: AttendanceStatus;
};

export function StatusMessage({ status }: Props) {
  const [scaleAnim] = useState(() => new Animated.Value(0.4));
  const [fadeAnim] = useState(() => new Animated.Value(0));

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.invalid;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 7,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      {/* Icon Badge */}
      <View style={[styles.iconBadge, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon} size={64} color={config.color} />
      </View>

      {/* Label */}
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
      <Text style={styles.sub}>{config.sub}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  iconBadge: {
    width: 120,
    height: 120,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: FontSize.sm,
    color: Colors.olive,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
  },
});
