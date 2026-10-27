// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Screen: Checked-In Participants & 1-Tap Export (history.tsx)
// Features:
//   - Lists all checked-in participants (Name & Department)
//   - 1-Tap Copy Names for wheelofnames.com
//   - 1-Tap Copy Table for Google Sheets (splits into columns!)
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AttendanceCard } from '@/components/AttendanceCard';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAttendance } from '@/context/attendance-context';
import {
  copyNamesToClipboard,
  copyTableForSheets,
  formatRecordsAsCSV,
} from '@/services/google-sheets';
import { AttendanceRecord } from '@/types/attendance';

export default function HistoryScreen() {
  const { records, stats, clearRecords, addRecord } = useAttendance();

  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [copiedNotice, setCopiedNotice] = useState('');

  const departmentFilters = useMemo(() => {
    const depts = Array.from(
      new Set(records.map((r) => r.department.trim()).filter(Boolean))
    );
    return ['All', ...depts];
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (selectedDept === 'All') return records;
    return records.filter(
      (item) => item.department.toLowerCase() === selectedDept.toLowerCase()
    );
  }, [records, selectedDept]);

  function showCopiedToast(msg: string) {
    setCopiedNotice(msg);
    setTimeout(() => setCopiedNotice(''), 4000);
  }

  async function handleCopyAndOpenWheel() {
    if (records.length === 0) {
      Alert.alert('Empty List', 'Scan participant QR codes first.');
      return;
    }
    await copyNamesToClipboard(records);
    showCopiedToast(
      `Copied ${records.length} names! Just press Paste on wheelofnames.com`
    );
    Linking.openURL('https://wheelofnames.com/').catch(() => {});
  }

  async function handleCopyForSheets() {
    if (records.length === 0) {
      Alert.alert('Empty List', 'Scan participant QR codes first.');
      return;
    }
    await copyTableForSheets(records);
    showCopiedToast(
      `Copied ${records.length} rows! Open Google Sheets and press Paste (Ctrl+V)`
    );
  }

  async function handleShareCSV() {
    if (records.length === 0) {
      Alert.alert('Empty List', 'Scan participant QR codes first.');
      return;
    }
    const csv = formatRecordsAsCSV(records);
    try {
      await Share.share({
        title: 'Christmas Party Check-In List',
        message: csv,
      });
    } catch {
      await copyTableForSheets(records);
      showCopiedToast('Copied check-in table to clipboard!');
    }
  }

  function handleClearAll() {
    if (records.length === 0) {
      Alert.alert('Empty List', 'There are no check-in records to clear.');
      return;
    }

    Alert.alert(
      'Clear Check-In List',
      'Are you sure you want to delete all check-in records? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearRecords();
            } catch {
              Alert.alert('Error', 'Failed to clear records.');
            }
          },
        },
      ]
    );
  }

  function handleAddSampleEmployee() {
    const samples = [
      { name: 'Clarisse Villanueva', dept: 'HR & Admin' },
      { name: 'Gabriel Tan', dept: 'Engineering' },
      { name: 'Patricia Lim', dept: 'Finance & Accounting' },
      { name: 'Joshua Bautista', dept: 'IT & Operations' },
    ];
    const picked = samples[Math.floor(Math.random() * samples.length)];
    addRecord({
      participantName: picked.name,
      department: picked.dept,
    });
  }

  const renderItem = ({ item }: { item: AttendanceRecord }) => {
    return (
      <AttendanceCard
        participantName={item.participantName}
        department={item.department}
        timestamp={item.time}
        date={item.date}
        syncedToSheet={item.syncedToSheet}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.beige} />

      {/* ── Top Navigation Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.darkGreen} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Checked-In List</Text>
          <Text style={styles.headerSubtitle}>
            {records.length}{' '}
            {records.length === 1 ? 'Participant' : 'Participants'} Scanned
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={handleShareCSV}
            activeOpacity={0.7}
          >
            <Ionicons
              name="share-social-outline"
              size={20}
              color={Colors.leafGreen}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.circleBtn}
            onPress={handleClearAll}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.absent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 1-Tap Action Buttons (Wheel of Names & Google Sheets) ── */}
      <View style={styles.quickActionRow}>
        <TouchableOpacity
          style={styles.wheelBtn}
          onPress={handleCopyAndOpenWheel}
          activeOpacity={0.85}
        >
          <Ionicons name="copy-outline" size={15} color={Colors.white} />
          <Text style={styles.wheelBtnText}>
            Copy & Open wheelofnames.com
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sheetsBtn}
          onPress={handleCopyForSheets}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-google" size={15} color={Colors.leafGreen} />
          <Text style={styles.sheetsBtnText}>Copy for Sheets</Text>
        </TouchableOpacity>
      </View>

      {copiedNotice ? (
        <View style={styles.copiedBanner}>
          <Ionicons
            name="checkmark-circle"
            size={16}
            color={Colors.leafGreen}
          />
          <Text style={styles.copiedBannerText}>{copiedNotice}</Text>
        </View>
      ) : null}

      {/* ── Overview Summary Row ── */}
      <View style={styles.overviewCard}>
        <View style={styles.statCol}>
          <Text style={[styles.statNum, { color: Colors.present }]}>
            {stats.checkedIn}
          </Text>
          <Text style={styles.statLbl}>Checked In</Text>
        </View>
        <View style={styles.vertDivider} />
        <View style={styles.statCol}>
          <Text style={[styles.statNum, { color: Colors.gold }]}>
            {stats.departments}
          </Text>
          <Text style={styles.statLbl}>Departments</Text>
        </View>
      </View>

      {/* ── Department Filter Chips ── */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          {departmentFilters.map((dept) => (
            <TouchableOpacity
              key={dept}
              style={[
                styles.chip,
                selectedDept === dept && styles.chipActive,
              ]}
              onPress={() => setSelectedDept(dept)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedDept === dept && styles.chipTextActive,
                ]}
              >
                {dept}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Records List or Empty State ── */}
      {filteredRecords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="people-outline" size={48} color={Colors.olive} />
          </View>
          <Text style={styles.emptyTitle}>No Participants Scanned Yet</Text>
          <Text style={styles.emptySubtitle}>
            Scan employee QR codes to record their Name and Department, then tap
            &quot;Copy & Open wheelofnames.com&quot; above!
          </Text>

          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleAddSampleEmployee}
            activeOpacity={0.8}
          >
            <Ionicons
              name="add-circle-outline"
              size={18}
              color={Colors.white}
            />
            <Text style={styles.testBtnText}>Simulate Employee Check-In</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.beige,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.olive,
    marginTop: 2,
  },
  quickActionRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  wheelBtn: {
    flex: 1.4,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: Colors.crimson,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...Shadow.button,
  },
  wheelBtnText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  sheetsBtn: {
    flex: 1,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.leafGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sheetsBtnText: {
    color: Colors.darkGreen,
    fontSize: 11,
    fontWeight: '700',
  },
  copiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    backgroundColor: Colors.lightGreen,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.leafGreen,
  },
  copiedBannerText: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  overviewCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  statLbl: {
    fontSize: FontSize.xs,
    color: Colors.olive,
    fontWeight: '600',
    marginTop: 2,
  },
  vertDivider: {
    width: 1,
    height: '60%',
    backgroundColor: Colors.creamWhite,
  },
  filterWrapper: {
    paddingVertical: Spacing.md,
  },
  filterBar: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  chip: {
    backgroundColor: Colors.creamWhite,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs + 3,
    borderRadius: Radius.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.leafGreen,
    borderColor: Colors.leafGreen,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.olive,
  },
  chipTextActive: {
    color: Colors.white,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    marginTop: Spacing.xxl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.olive,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.leafGreen,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    ...Shadow.button,
  },
  testBtnText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
