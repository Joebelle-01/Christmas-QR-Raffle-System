// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Component: AttendanceCard
// Shows: Participant Name, Department, Time, Date, Sheet Sync
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

type Props = {
  participantName: string;
  department: string;
  timestamp: string; // e.g. "06:45 PM"
  date: string;      // e.g. "December 20, 2026"
  syncedToSheet?: boolean;
};

export function AttendanceCard({
  participantName,
  department,
  timestamp,
  date,
  syncedToSheet,
}: Props) {
  return (
    <View style={[styles.card, { borderLeftColor: Colors.present }]}>
      {/* Participant Info */}
      <View style={styles.participantRow}>
        <View style={[styles.avatarCircle, { backgroundColor: Colors.present }]}>
          <Ionicons name="person" size={22} color={Colors.white} />
        </View>
        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>{participantName}</Text>
          <View style={styles.deptRow}>
            <Ionicons name="briefcase-outline" size={14} color={Colors.olive} />
            <Text style={styles.departmentText}>{department}</Text>
          </View>
        </View>
        {/* Status pill */}
        <View style={[styles.statusPill, { backgroundColor: Colors.presentBg }]}>
          <Text style={[styles.statusPillText, { color: Colors.present }]}>
            Checked In
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Time, Date & Google Sheets Status */}
      <View style={styles.metaGrid}>
        <View style={styles.row}>
          <Ionicons name="time-outline" size={16} color={Colors.olive} />
          <Text style={styles.timeText}>{timestamp}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="calendar-outline" size={16} color={Colors.olive} />
          <Text style={styles.metaText}>{date}</Text>
        </View>
      </View>

      {syncedToSheet !== undefined && (
        <View style={styles.sheetBadgeRow}>
          <Ionicons
            name={syncedToSheet ? 'cloud-done-outline' : 'checkmark-circle-outline'}
            size={14}
            color={syncedToSheet ? Colors.leafGreen : Colors.olive}
          />
          <Text
            style={[
              styles.sheetBadgeText,
              syncedToSheet && { color: Colors.leafGreen, fontWeight: '700' },
            ]}
          >
            {syncedToSheet
              ? 'Synced to Google Sheets'
              : 'Saved to Device Check-In List'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderLeftWidth: 5,
    gap: Spacing.sm,
    ...Shadow.card,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantInfo: {
    flex: 1,
    gap: 3,
  },
  participantName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
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
  statusPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  statusPillText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: FontSize.xs,
    color: Colors.olive,
    fontWeight: '500',
  },
  timeText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sheetBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  sheetBadgeText: {
    fontSize: 11,
    color: Colors.olive,
  },
});
