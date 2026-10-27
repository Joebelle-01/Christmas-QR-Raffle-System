// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Component: StudentCard.tsx (Participant / Scanner Operator Card)
// Shows: Name & Department only
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

export interface StudentCardProps {
  participantName?: string;
  department?: string;
  onEdit?: () => void;
}

export function StudentCard({
  participantName = 'Joebelle Dumapias',
  department = 'IT & Operations',
  onEdit,
}: StudentCardProps) {
  const initials = (participantName || 'EMP')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || 'EMP'}</Text>
        </View>

        <View style={styles.nameContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.participantName} numberOfLines={1}>
              {participantName}
            </Text>
            {onEdit && (
              <TouchableOpacity
                style={styles.editIconButton}
                onPress={onEdit}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="pencil" size={14} color={Colors.leafGreen} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.deptRow}>
            <Ionicons name="briefcase-outline" size={14} color={Colors.olive} />
            <Text style={styles.departmentText}>{department}</Text>
          </View>
        </View>

        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Scanner Ready</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: Colors.leafGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  nameContainer: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  participantName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  editIconButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  departmentText: {
    fontSize: FontSize.sm,
    color: Colors.olive,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.presentBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.present,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.present,
  },
});
