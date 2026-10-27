// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Screen: Check-In Result Screen (attendance-result.tsx)
// IMPORTANT:
//   - If status === 'invalid', ONLY shows "Invalid QR Code"
//     (NEVER displays any participant name or card).
//   - If status === 'present', shows Participant Name & Department
//     and confirms Google Sheets sync for wheelofnames.com.
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
  if (value === 'present') {
    return 'present';
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
  invalid: '#FFF5F5',
};

export default function AttendanceResultScreen() {
  const params = useLocalSearchParams<{
    participantName?: string;
    department?: string;
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
  const isValidCheckIn = status === 'present' && Boolean(params.participantName);

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

        {/* Animated Status Message (Checked In vs Invalid QR Code) */}
        <StatusMessage status={isValidCheckIn ? 'present' : 'invalid'} />

        {/* ONLY show Participant Card & Google Sheets banner when QR is VALID */}
        {isValidCheckIn ? (
          <>
            <View style={styles.sheetSyncBanner}>
              <View style={styles.sheetSyncIcon}>
                <Ionicons
                  name="logo-google"
                  size={20}
                  color={Colors.leafGreen}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetSyncTitle}>
                  Added to Google Sheets Raffle List
                </Text>
                <Text style={styles.sheetSyncSub}>
                  Ready to import into wheelofnames.com for the Christmas party
                  raffle
                </Text>
              </View>
            </View>

            <AttendanceCard
              participantName={params.participantName!}
              department={params.department || 'General'}
              timestamp={timestamp}
              date={date}
            />
          </>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={styles.scanAgainBtn}
            onPress={() => router.replace('/scanner')}
            activeOpacity={0.85}
          >
            <Ionicons name="scan-outline" size={20} color={Colors.white} />
            <Text style={styles.scanAgainBtnText}>Scan Next QR Code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.replace('/dashboard')}
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
  sheetSyncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.lightGreen,
    borderWidth: 1.5,
    borderColor: Colors.leafGreen,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sheetSyncIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSyncTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.darkGreen,
  },
  sheetSyncSub: {
    fontSize: 11,
    color: Colors.olive,
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
