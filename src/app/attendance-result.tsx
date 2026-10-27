// ============================================================
// GROUP 5 – Smart QR Attendance & Christmas Raffle System
// Screen: Attendance Result Screen (attendance-result.tsx)
// Shows: Status, Raffle Entry Confirmation, Participant Card,
//        Scan Next Guest / Open Raffle Wheel / Back to Dashboard
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AttendanceCard } from '@/components/AttendanceCard';
import { AttendanceStatus, StatusMessage } from '@/components/StatusMessage';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

function validateStatus(raw: string | string[] | undefined): AttendanceStatus {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (
    value === 'present' ||
    value === 'late' ||
    value === 'absent' ||
    value === 'invalid'
  ) {
    return value;
  }
  return 'invalid';
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const STATUS_BG: Record<AttendanceStatus, string> = {
  present: '#F0FAF3',
  late: '#FFFBEB',
  absent: '#FFF5F5',
  invalid: Colors.beige,
};

export default function AttendanceResultScreen() {
  const params = useLocalSearchParams<{
    studentName?: string;
    studentId?: string;
    course?: string;
    section?: string;
    subject?: string;
    status?: string;
    time?: string;
    timestamp?: string;
    date?: string;
  }>();

  const status = useMemo(() => validateStatus(params.status), [params.status]);

  const scannedAt = useMemo(() => new Date(), []);
  const defaultTime = formatTime(scannedAt);
  const defaultDate = formatDate(scannedAt);

  const timestamp = params.timestamp || params.time || defaultTime;
  const date = params.date || defaultDate;

  const bgColor = STATUS_BG[status];
  const isRaffleEligible = status === 'present' || status === 'late';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle="dark-content" backgroundColor={bgColor} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/dashboard')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.darkGreen} />
        </TouchableOpacity>

        {/* Page Title */}
        <Text style={styles.pageTitle}>Check-In Result</Text>

        {/* Status Message — animated icon + text */}
        <StatusMessage status={status} />

        {/* Raffle Entry Confirmed Banner */}
        {isRaffleEligible && (
          <View style={styles.raffleTicketBanner}>
            <View style={styles.raffleTicketIcon}>
              <Ionicons name="gift" size={22} color={Colors.crimson} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.raffleTicketTitle}>
                Raffle Entry Confirmed!
              </Text>
              <Text style={styles.raffleTicketSub}>
                Added to the Christmas Roulette Wheel & synced with Google
                Sheets
              </Text>
            </View>
            <Ionicons name="sparkles" size={18} color={Colors.goldBright} />
          </View>
        )}

        {/* Attendance Card — participant info + event + time + date */}
        <AttendanceCard
          studentName={params.studentName || 'Joebelle Dumapias'}
          studentId={params.studentId || '2024305392'}
          course={params.course || 'BS Information Technology'}
          section={params.section || 'IT-3A'}
          subject={params.subject || 'Christmas Party 2026'}
          status={status}
          timestamp={timestamp}
          date={date}
        />

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={styles.scanAgainBtn}
            onPress={() =>
              router.replace({
                pathname: '/scanner',
                params: {
                  studentName: params.studentName,
                  studentId: params.studentId,
                  course: params.course,
                  section: params.section,
                },
              })
            }
            activeOpacity={0.85}
          >
            <Ionicons name="scan-outline" size={20} color={Colors.white} />
            <Text style={styles.scanAgainBtnText}>Scan Next Participant</Text>
          </TouchableOpacity>

          {isRaffleEligible && (
            <TouchableOpacity
              style={styles.rouletteBtn}
              onPress={() => router.replace('/roulette')}
              activeOpacity={0.85}
            >
              <Ionicons name="gift-outline" size={20} color={Colors.crimson} />
              <Text style={styles.rouletteBtnText}>
                Go to Christmas Raffle Wheel
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() =>
              router.replace({
                pathname: '/dashboard',
                params: {
                  studentName: params.studentName,
                  studentId: params.studentId,
                  course: params.course,
                  section: params.section,
                },
              })
            }
            activeOpacity={0.85}
          >
            <Ionicons
              name="home-outline"
              size={18}
              color={Colors.darkGreen}
            />
            <Text style={styles.doneBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadow.card,
  },
  pageTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: Spacing.lg,
  },
  raffleTicketBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.goldLight,
    borderWidth: 1.5,
    borderColor: Colors.goldBright,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  raffleTicketIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  raffleTicketTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.crimson,
  },
  raffleTicketSub: {
    fontSize: 11,
    color: Colors.textPrimary,
    marginTop: 1,
  },
  actionGroup: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  scanAgainBtn: {
    backgroundColor: Colors.leafGreen,
    height: 54,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadow.button,
  },
  scanAgainBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  rouletteBtn: {
    backgroundColor: Colors.crimsonLight,
    height: 50,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.crimson,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  rouletteBtnText: {
    color: Colors.crimson,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  doneBtn: {
    height: 48,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  doneBtnText: {
    color: Colors.darkGreen,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
