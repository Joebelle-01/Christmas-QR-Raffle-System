// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Screen: DashboardScreen (dashboard.tsx) — 100% User-Friendly
// Features:
//   - Zero technical setup required for normal users
//   - 1-Tap "Scan Participant QR Code" (for 200+ bulk QR passes)
//   - 1-Tap "Copy Names & Open WheelOfNames.com" (auto-copies list!)
//   - 1-Tap "Copy Table for Google Sheets" & Native Share export
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScanButton } from '@/components/ScanButton';
import { StudentCard } from '@/components/StudentCard';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAttendance } from '@/context/attendance-context';
import { getStaffProfile, saveStaffProfile } from '@/services/auth-storage';
import {
  copyNamesToClipboard,
  copyTableForSheets,
  formatRecordsAsCSV,
} from '@/services/google-sheets';

const WORK_DEPARTMENTS = [
  'IT & Operations',
  'HR & Admin',
  'Finance & Accounting',
  'Sales & Marketing',
  'Engineering',
  'Customer Support',
  'Management',
];

export default function DashboardScreen() {
  const [staffName, setStaffName] = useState('Joebelle Dumapias');
  const [defaultDepartment, setDefaultDepartment] =
    useState('IT & Operations');

  // ── Edit Staff / Default Department Modal ───────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(staffName);
  const [editDept, setEditDept] = useState(defaultDepartment);

  // ── Feedback Banner State ───────────────────────────────
  const [copiedBanner, setCopiedBanner] = useState('');

  const { records, stats } = useAttendance();

  useEffect(() => {
    getStaffProfile().then((saved) => {
      setStaffName(saved.participantName);
      setDefaultDepartment(saved.department);
    });
  }, []);

  // ── Live Clock ──────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // ── Handlers ─────────────────────────────────────────────
  function showTempBanner(msg: string) {
    setCopiedBanner(msg);
    setTimeout(() => {
      setCopiedBanner('');
    }, 4500);
  }

  function handleOpenEditProfile() {
    setEditName(staffName);
    setEditDept(defaultDepartment);
    setShowEditModal(true);
  }

  async function handleSaveProfile() {
    if (!editName.trim()) {
      Alert.alert('Validation', 'Please enter a valid name.');
      return;
    }
    const updated = await saveStaffProfile({
      participantName: editName.trim(),
      department: editDept.trim() || 'General',
    });
    setStaffName(updated.participantName);
    setDefaultDepartment(updated.department);
    setShowEditModal(false);
  }

  function handleScanPress() {
    router.push({
      pathname: '/scanner',
      params: {
        defaultDepartment,
      },
    });
  }

  // 1-Tap: Copy all scanned names to clipboard & open wheelofnames.com
  async function handleWheelOfNamesPress() {
    if (records.length === 0) {
      Alert.alert(
        'No Participants Scanned Yet',
        'Scan participant QR codes first! Once scanned, tapping this button will automatically copy all names and open wheelofnames.com.'
      );
      return;
    }

    await copyNamesToClipboard(records);
    showTempBanner(
      `Copied ${records.length} participant${
        records.length === 1 ? '' : 's'
      }! Just press Paste on wheelofnames.com`
    );

    Linking.openURL('https://wheelofnames.com/').catch(() => {
      Alert.alert(
        'Names Copied!',
        'All participant names have been copied to your clipboard. Open wheelofnames.com and paste them!'
      );
    });
  }

  // 1-Tap: Copy table for Google Sheets (splits into columns automatically on paste)
  async function handleCopyForGoogleSheets() {
    if (records.length === 0) {
      Alert.alert(
        'No Participants Scanned Yet',
        'Scan participant QR codes first, then tap here to copy or share to Google Sheets.'
      );
      return;
    }

    await copyTableForSheets(records);
    showTempBanner(
      `Copied ${records.length} rows! Open any Google Sheet and press Paste (Ctrl+V)`
    );
  }

  // 1-Tap: Share CSV to Google Drive / Sheets / Email / Messenger
  async function handleShareSheet() {
    if (records.length === 0) {
      Alert.alert(
        'No Participants Scanned Yet',
        'Scan participant QR codes first before exporting.'
      );
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
      showTempBanner('Copied check-in table to clipboard!');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.beige} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Bar ── */}
        <View style={styles.topBar}>
          <View>
            <View style={styles.titleBadgeRow}>
              <Ionicons name="sparkles" size={16} color={Colors.crimson} />
              <Text style={styles.greeting}>Christmas Party Check-In</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              Scan QR Passes · Export to Google Sheets & Wheel of Names
            </Text>
          </View>

          <View style={styles.topBarActions}>
            <TouchableOpacity
              style={styles.actionIconButton}
              onPress={() => router.push('/history')}
              activeOpacity={0.7}
            >
              <Ionicons name="list-outline" size={20} color={Colors.darkGreen} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionIconButton}
              onPress={() => router.replace('/')}
              activeOpacity={0.7}
            >
              <Ionicons name="home-outline" size={20} color={Colors.darkGreen} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Live Event Clock Card ── */}
        <View style={styles.clockCard}>
          <View style={styles.clockIconCircle}>
            <Ionicons name="time" size={22} color={Colors.goldBright} />
          </View>
          <View style={styles.clockTextContainer}>
            <Text style={styles.liveTimeText}>{formattedTime}</Text>
            <Text style={styles.liveDateText}>{formattedDate}</Text>
          </View>
          <View style={styles.livePill}>
            <View style={styles.pulsingDot} />
            <Text style={styles.livePillText}>READY</Text>
          </View>
        </View>

        {/* ── Primary Action: Scan Bulk QR Codes ── */}
        <View style={styles.scanSection}>
          <ScanButton
            onPress={handleScanPress}
            title="Scan Participant QR Code"
            subtitle="Automatically saves Name & Department to Check-In List"
          />
        </View>

        {/* ── Instant Feedback Toast Banner ── */}
        {copiedBanner ? (
          <View style={styles.copiedToast}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={Colors.leafGreen}
            />
            <Text style={styles.copiedToastText}>{copiedBanner}</Text>
          </View>
        ) : null}

        {/* ── 1-Tap Raffle & Google Sheets Card (Zero Technical Setup!) ── */}
        <View style={styles.easyExportCard}>
          <View style={styles.easyExportHeader}>
            <View style={styles.easyExportIconCircle}>
              <Ionicons name="gift" size={20} color={Colors.crimson} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.easyExportTitle}>
                Raffle & Google Sheets (1-Tap)
              </Text>
              <Text style={styles.easyExportSub}>
                {records.length} participant
                {records.length === 1 ? '' : 's'} ready — no coding or setup
                needed!
              </Text>
            </View>
          </View>

          {/* Button 1: Copy Names & Open wheelofnames.com */}
          <TouchableOpacity
            style={styles.wheelPrimaryBtn}
            onPress={handleWheelOfNamesPress}
            activeOpacity={0.85}
          >
            <Ionicons name="copy-outline" size={18} color={Colors.white} />
            <Text style={styles.wheelPrimaryBtnText}>
              Copy All Names & Open wheelofnames.com
            </Text>
            <Ionicons name="open-outline" size={16} color={Colors.goldLight} />
          </TouchableOpacity>

          {/* Button 2: Copy Table for Google Sheets + Share */}
          <View style={styles.sheetsBtnRow}>
            <TouchableOpacity
              style={styles.sheetsCopyBtn}
              onPress={handleCopyForGoogleSheets}
              activeOpacity={0.85}
            >
              <Ionicons
                name="logo-google"
                size={15}
                color={Colors.leafGreen}
              />
              <Text style={styles.sheetsCopyBtnText}>
                Copy for Google Sheets
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetsShareBtn}
              onPress={handleShareSheet}
              activeOpacity={0.85}
            >
              <Ionicons
                name="share-social-outline"
                size={15}
                color={Colors.darkGreen}
              />
              <Text style={styles.sheetsShareBtnText}>Share / Export CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Quick Check-In Overview (No Late Stat) ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Check-In Summary</Text>
          <TouchableOpacity
            onPress={() => router.push('/history')}
            activeOpacity={0.7}
          >
            <Text style={styles.viewHistoryLink}>
              View All Participants →
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { borderColor: Colors.present }]}>
            <Ionicons
              name="checkmark-done-circle"
              size={22}
              color={Colors.present}
            />
            <Text style={styles.statValue}>{stats.checkedIn}</Text>
            <Text style={styles.statLabel}>Checked In</Text>
          </View>

          <View style={[styles.statBox, { borderColor: Colors.gold }]}>
            <Ionicons name="briefcase" size={22} color={Colors.gold} />
            <Text style={styles.statValue}>{stats.departments}</Text>
            <Text style={styles.statLabel}>Departments</Text>
          </View>
        </View>

        {/* ── Default Department / Operator Card ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Scanner Operator / Department</Text>
          <TouchableOpacity
            onPress={handleOpenEditProfile}
            style={styles.editProfileChip}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil" size={12} color={Colors.leafGreen} />
            <Text style={styles.editProfileChipText}>Edit Info</Text>
          </TouchableOpacity>
        </View>

        <StudentCard
          participantName={staffName}
          department={defaultDepartment}
          onEdit={handleOpenEditProfile}
        />

        {/* ── Checked-In Participants List Card ── */}
        <TouchableOpacity
          style={styles.historyCardButton}
          onPress={() => router.push('/history')}
          activeOpacity={0.8}
        >
          <View style={styles.historyIconCircle}>
            <Ionicons
              name="people-outline"
              size={20}
              color={Colors.leafGreen}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.historyBtnTitle}>
              Checked-In Participants ({stats.checkedIn})
            </Text>
            <Text style={styles.historyBtnSubtitle}>
              View scanned Names & Departments
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.olive} />
        </TouchableOpacity>
      </ScrollView>

      {/* ── Edit Operator / Default Department Modal ── */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.editModalHeader}>
              <View style={styles.editAvatarMini}>
                <Ionicons name="briefcase" size={18} color={Colors.white} />
              </View>
              <Text style={styles.modalTitle}>Edit Operator & Department</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Operator / Staff Name</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter full name"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Default Department (used if a QR code only has a Name)
              </Text>
              <TextInput
                style={styles.textInput}
                value={editDept}
                onChangeText={setEditDept}
                placeholder="e.g. IT & Operations, HR, Finance"
                placeholderTextColor={Colors.textMuted}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {WORK_DEPARTMENTS.map((dept) => (
                    <TouchableOpacity
                      key={dept}
                      style={[
                        styles.modalChip,
                        editDept === dept && styles.modalChipSelected,
                      ]}
                      onPress={() => setEditDept(dept)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.modalChipText,
                          editDept === dept && styles.modalChipTextSelected,
                        ]}
                      >
                        {dept}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowEditModal(false)}
                activeOpacity={0.75}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveProfile}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSaveText}>Save Changes</Text>
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
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  greeting: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.olive,
    fontWeight: '500',
  },
  actionIconButton: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },

  // Clock Card
  clockCard: {
    backgroundColor: Colors.darkGreen,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.button,
  },
  clockIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockTextContainer: {
    flex: 1,
  },
  liveTimeText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.4,
  },
  liveDateText: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#00E676',
  },
  livePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.6,
  },

  scanSection: {
    marginTop: 2,
  },

  copiedToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.lightGreen,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.leafGreen,
  },
  copiedToastText: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  // 1-Tap Easy Export Card
  easyExportCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  easyExportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  easyExportIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.crimsonLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  easyExportTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  easyExportSub: {
    fontSize: FontSize.xs,
    color: Colors.olive,
    marginTop: 2,
  },
  wheelPrimaryBtn: {
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: Colors.crimson,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    ...Shadow.button,
  },
  wheelPrimaryBtnText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  sheetsBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  sheetsCopyBtn: {
    flex: 1,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: Colors.lightGreen,
    borderWidth: 1,
    borderColor: Colors.leafGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sheetsCopyBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.darkGreen,
  },
  sheetsShareBtn: {
    flex: 1,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: Colors.creamWhite,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sheetsShareBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.darkGreen,
  },

  // Section Header
  sectionHeaderRow: {
    marginTop: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  viewHistoryLink: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.leafGreen,
  },
  editProfileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.lightGreen,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  editProfileChipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.leafGreen,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    ...Shadow.card,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.olive,
    fontWeight: '600',
  },

  // History Card Button
  historyCardButton: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  historyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtnTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  historyBtnSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.olive,
    marginTop: 2,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
    ...Shadow.card,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  editAvatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.leafGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    width: '100%',
    marginBottom: Spacing.md,
    gap: 6,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginLeft: 2,
  },
  textInput: {
    backgroundColor: Colors.creamWhite,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  modalChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.creamWhite,
  },
  modalChipSelected: {
    backgroundColor: Colors.leafGreen,
    borderColor: Colors.leafGreen,
  },
  modalChipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.olive,
  },
  modalChipTextSelected: {
    color: Colors.white,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
    marginTop: Spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.creamWhite,
  },
  modalCancelText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.olive,
  },
  modalSaveBtn: {
    flex: 1.3,
    height: 46,
    borderRadius: Radius.pill,
    backgroundColor: Colors.leafGreen,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.button,
  },
  modalSaveText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
  },
});
