// ============================================================
// GROUP 5 – Smart QR Attendance System
// Component: StatusMessage
// Shows: Present ✅ / Absent ❌ / Invalid ⚠️
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'invalid';

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
    label: 'Attendance Marked!',
    sub: 'Your attendance has been recorded successfully.',
  },
  late: {
    icon: 'time',
    color: Colors.late,
    bg: Colors.lateBg,
    label: 'Marked as Late',
    sub: 'Your attendance was recorded after session start.',
  },
  absent: {
    icon: 'close-circle',
    color: Colors.absent,
    bg: Colors.absentBg,
    label: 'Marked as Absent',
    sub: 'You were not able to scan in time.',
  },
  invalid: {
    icon: 'warning',
    color: Colors.olive,
    bg: Colors.beige,
    label: 'Invalid QR Code',
    sub: 'The QR code could not be verified. Please try again.',
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
