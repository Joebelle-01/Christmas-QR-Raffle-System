// ============================================================
// GROUP 5 – Smart QR Attendance & Christmas Raffle System
// Screen: Attendance History & CSV Export (history.tsx)
// Features: List records, Filter by status, CSV Export for Google Sheets
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AttendanceCard } from '@/components/AttendanceCard';
import { StatusMessage } from '@/components/StatusMessage';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAttendance } from '@/context/attendance-context';
import { formatRecordsAsCSV } from '@/services/google-sheets';
import { AttendanceRecord, AttendanceStatus } from '@/types/attendance';

type FilterType = 'all' | AttendanceStatus;

export default function HistoryScreen() {
  const { records, winners, stats, clearRecords, addRecord } = useAttendance();
  const { studentName, studentId } = useLocalSearchParams<{
    studentName?: string;
    studentId?: string;
  }>();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showCsvModal, setShowCsvModal] = useState(false);

  const filteredRecords = useMemo(() => {
    if (activeFilter === 'all') return records;
    return records.filter((item) => item.status === activeFilter);
  }, [records, activeFilter]);

  const csvContent = useMemo(
    () => formatRecordsAsCSV(records, winners),
    [records, winners]
  );

  function handleClearAll() {
    if (records.length === 0) {
      Alert.alert('Empty History', 'There are no attendance records to clear.');
      return;
    }

    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all attendance records? This action cannot be undone.',
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

  function handleAddTestRecord() {
    const sampleStatuses: AttendanceStatus[] = [
      'present',
      'present',
      'late',
      'present',
    ];
    const randomStatus =
      sampleStatuses[Math.floor(Math.random() * sampleStatuses.length)];

    addRecord({
      studentName: studentName || 'Joebelle Dumapias',
      studentId: studentId || '2024305392',
      course: 'BS Information Technology',
      section: 'IT-3A',
      subject: 'Christmas Party 2026',
      status: randomStatus,
    });
  }

  const renderItem = ({ item }: { item: AttendanceRecord }) => {
    return (
      <AttendanceCard
        studentName={item.studentName}
        studentId={item.studentId}
        course={item.course}
        section={item.section}
        subject={item.subject || 'Christmas Party 2026'}
        status={item.status}
        timestamp={item.time}
        date={item.date}
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
          <Text style={styles.headerTitle}>Check-In Logs</Text>
          <Text style={styles.headerSubtitle}>
            {records.length} {records.length === 1 ? 'Participant' : 'Participants'} Checked In
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => setShowCsvModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="document-text-outline"
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

      {/* ── Overview Summary Row ── */}
      <View style={styles.overviewCard}>
        <View style={styles.statCol}>
          <Text style={[styles.statNum, { color: Colors.present }]}>
            {stats.present}
          </Text>
          <Text style={styles.statLbl}>Present</Text>
        </View>
        <View style={styles.vertDivider} />
        <View style={styles.statCol}>
          <Text style={[styles.statNum, { color: Colors.late }]}>
            {stats.late}
          </Text>
          <Text style={styles.statLbl}>Late</Text>
        </View>
        <View style={styles.vertDivider} />
        <View style={styles.statCol}>
          <Text style={[styles.statNum, { color: Colors.leafGreen }]}>
            {stats.rate}
          </Text>
          <Text style={styles.statLbl}>Attended</Text>
        </View>
      </View>

      {/* ── Filter Chips ── */}
      <View style={styles.filterBar}>
        {(['all', 'present', 'late', 'absent'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, activeFilter === f && styles.chipActive]}
            onPress={() => setActiveFilter(f)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                activeFilter === f && styles.chipTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Records List or Empty State ── */}
      {filteredRecords.length === 0 ? (
        <View style={styles.emptyContainer}>
          {activeFilter !== 'all' ? (
            <StatusMessage status={activeFilter} />
          ) : (
            <View style={styles.emptyIconCircle}>
              <Ionicons
                name="calendar-outline"
                size={48}
                color={Colors.olive}
              />
            </View>
          )}
          <Text style={styles.emptyTitle}>No Records Found</Text>
          <Text style={styles.emptySubtitle}>
            {activeFilter === 'all'
              ? 'No guests checked in yet. Scan a participant QR code to log check-in and enter them into the Raffle Wheel.'
              : `No attendance entries found with status "${activeFilter}".`}
          </Text>

          {activeFilter === 'all' && (
            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleAddTestRecord}
              activeOpacity={0.8}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={Colors.white}
              />
              <Text style={styles.testBtnText}>Simulate Check-In Log</Text>
            </TouchableOpacity>
          )}
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

      {/* ── CSV Export Modal for Google Sheets ── */}
      <Modal
        visible={showCsvModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCsvModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Google Sheets CSV Export</Text>
              <TouchableOpacity onPress={() => setShowCsvModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>
              Select and copy the CSV below to paste directly into Google Sheets
              or Excel:
            </Text>
            <TextInput
              style={styles.csvBox}
              value={csvContent}
              multiline
              editable={false}
              selectTextOnFocus
            />
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setShowCsvModal(false)}
            >
              <Text style={styles.closeModalBtnText}>Done</Text>
            </TouchableOpacity>
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
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  chip: {
    flex: 1,
    backgroundColor: Colors.creamWhite,
    paddingVertical: Spacing.xs + 2,
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
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalHint: {
    fontSize: FontSize.xs,
    color: Colors.olive,
  },
  csvBox: {
    backgroundColor: Colors.beige,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 11,
    fontFamily: 'monospace',
    color: Colors.textPrimary,
    maxHeight: 220,
  },
  closeModalBtn: {
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
