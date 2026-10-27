// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Screen: Checked-In Participants & Export (history.tsx)
// Features:
//   - Lists all checked-in participants (Name & Department)
//   - Copy Names for wheelofnames.com or Export CSV for Google Sheets
//   - Push any unsynced records to Google Sheets
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AttendanceCard } from '@/components/AttendanceCard';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAttendance } from '@/context/attendance-context';
import {
  formatForWheelOfNames,
  formatRecordsAsCSV,
} from '@/services/google-sheets';
import { AttendanceRecord } from '@/types/attendance';

export default function HistoryScreen() {
  const { records, stats, clearRecords, addRecord } = useAttendance();

  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMode, setExportMode] = useState<'wheel' | 'csv'>('wheel');

  // Unique departments for filter chips
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

  const exportText = useMemo(() => {
    return exportMode === 'wheel'
      ? formatForWheelOfNames(records)
      : formatRecordsAsCSV(records);
  }, [records, exportMode]);

  function handleClearAll() {
    if (records.length === 0) {
      Alert.alert('Empty List', 'There are no check-in records to clear.');
      return;
    }

    Alert.alert(
      'Clear Check-In List',
      'Are you sure you want to delete all local check-in records? This action cannot be undone.',
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
            {records.length === 1 ? 'Participant' : 'Participants'} Logged
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => setShowExportModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="share-outline"
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

      {/* ── Overview Summary Row (No Late Stat) ── */}
      <View style={styles.overviewCard}>
        <View style={styles.statCol}>
          <Text style={[styles.statNum, { color: Colors.present }]}>
            {stats.checkedIn}
          </Text>
          <Text style={styles.statLbl}>Checked In</Text>
        </View>
        <View style={styles.vertDivider} />
        <View style={styles.statCol}>
          <Text style={[styles.statNum, { color: Colors.leafGreen }]}>
            {stats.synced}
          </Text>
          <Text style={styles.statLbl}>In Google Sheet</Text>
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
          <Text style={styles.emptyTitle}>No Participants Checked In Yet</Text>
          <Text style={styles.emptySubtitle}>
            Scan employee QR codes to record their Name and Department and send
            them to Google Sheets.
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

      {/* ── Wheel of Names / CSV Export Modal ── */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Export for Wheel of Names / Sheets
              </Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modeSwitchRow}>
              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  exportMode === 'wheel' && styles.modeBtnActive,
                ]}
                onPress={() => setExportMode('wheel')}
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    exportMode === 'wheel' && styles.modeBtnTextActive,
                  ]}
                >
                  Wheel of Names List
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  exportMode === 'csv' && styles.modeBtnActive,
                ]}
                onPress={() => setExportMode('csv')}
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    exportMode === 'csv' && styles.modeBtnTextActive,
                  ]}
                >
                  Google Sheets CSV
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHint}>
              {exportMode === 'wheel'
                ? 'Select & copy these names to paste directly into https://wheelofnames.com/ (or import directly from your synced Google Sheet):'
                : 'Select & copy this CSV to paste into Google Sheets or Excel:'}
            </Text>

            <TextInput
              style={styles.csvBox}
              value={exportText || 'No participants checked in yet.'}
              multiline
              editable={false}
              selectTextOnFocus
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={styles.openWheelBtn}
                onPress={() => Linking.openURL('https://wheelofnames.com/')}
              >
                <Ionicons
                  name="open-outline"
                  size={16}
                  color={Colors.crimson}
                />
                <Text style={styles.openWheelBtnText}>
                  Open wheelofnames.com
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setShowExportModal(false)}
              >
                <Text style={styles.closeModalBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    ...Shadow.card,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modeSwitchRow: {
    flexDirection: 'row',
    backgroundColor: Colors.beige,
    borderRadius: Radius.pill,
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: Colors.leafGreen,
  },
  modeBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.olive,
  },
  modeBtnTextActive: {
    color: Colors.white,
  },
  modalHint: {
    fontSize: FontSize.xs,
    color: Colors.olive,
    lineHeight: 17,
  },
  csvBox: {
    backgroundColor: Colors.beige,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 11,
    fontFamily: 'monospace',
    color: Colors.textPrimary,
    maxHeight: 200,
  },
  openWheelBtn: {
    flex: 1.3,
    height: 46,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.crimson,
    backgroundColor: Colors.crimsonLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  openWheelBtnText: {
    color: Colors.crimson,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  closeModalBtn: {
    flex: 1,
    height: 46,
    borderRadius: Radius.pill,
    backgroundColor: Colors.leafGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalBtnText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
