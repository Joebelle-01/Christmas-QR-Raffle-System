// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Screen: DashboardScreen (dashboard.tsx)
// Features:
//   - QR Scanner Launcher (for 200+ bulk third-party QR passes)
//   - Google Sheets Auto-Sync Setup (sends Name & Department on scan)
//   - External Link to https://wheelofnames.com/ for fair raffle draw
//   - Live Check-In Overview (Checked In, Synced, Departments — No Late)
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { ScanButton } from '@/components/ScanButton';
import { StudentCard } from '@/components/StudentCard';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAttendance } from '@/context/attendance-context';
import { getStaffProfile, saveStaffProfile } from '@/services/auth-storage';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '@/services/google-sheets';

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
  // ── Staff / Default Department State ────────────────────
  const [staffName, setStaffName] = useState('Joebelle Dumapias');
  const [defaultDepartment, setDefaultDepartment] =
    useState('IT & Operations');

  // ── Edit Staff / Default Department Modal ───────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(staffName);
  const [editDept, setEditDept] = useState(defaultDepartment);

  // ── Google Sheets Setup Modal State ─────────────────────
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [showScriptCode, setShowScriptCode] = useState(false);
  const [syncNotice, setSyncNotice] = useState('');

  // ── Attendance Context ──────────────────────────────────
  const {
    stats,
    sheetsConfig,
    isSyncing,
    updateSheetsConfig,
    syncPendingToGoogleSheets,
  } = useAttendance();

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

  function handleOpenSheetsModal() {
    setSheetUrlInput(sheetsConfig.sheetUrl || '');
    setWebhookUrlInput(sheetsConfig.webhookUrl || '');
    setSyncNotice('');
    setShowSheetsModal(true);
  }

  async function handleSaveAndSyncSheets() {
    const updated = await updateSheetsConfig({
      sheetUrl: sheetUrlInput.trim(),
      webhookUrl: webhookUrlInput.trim(),
      autoSync: true,
    });
    const result = await syncPendingToGoogleSheets(updated);
    setSyncNotice(result.message);
  }

  function handleScanPress() {
    router.push({
      pathname: '/scanner',
      params: {
        defaultDepartment,
      },
    });
  }

  function handleOpenWheelOfNames() {
    Linking.openURL('https://wheelofnames.com/').catch(() => {
      Alert.alert('Error', 'Could not open https://wheelofnames.com/');
    });
  }

  const isWebhookConfigured = Boolean(sheetsConfig.webhookUrl.trim());

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
              Bulk QR Scanner · Name & Department → Google Sheets
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
            <Text style={styles.livePillText}>LIVE</Text>
          </View>
        </View>

        {/* ── Primary Action: Scan Bulk QR Codes ── */}
        <View style={styles.scanSection}>
          <ScanButton
            onPress={handleScanPress}
            title="Scan Participant QR Code"
            subtitle="Reads Name & Department and sends to Google Sheets"
          />
        </View>

        {/* ── Google Sheets Live Connection Card ── */}
        <View style={styles.sheetsCard}>
          <View style={styles.sheetsCardTop}>
            <View style={styles.sheetsIconCircle}>
              <Ionicons name="logo-google" size={20} color={Colors.leafGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.sheetsStatusRow}>
                <Text style={styles.sheetsCardTitle}>
                  Google Sheets Auto-Sync
                </Text>
                <View
                  style={[
                    styles.statusDotPill,
                    {
                      backgroundColor: isWebhookConfigured
                        ? Colors.presentBg
                        : Colors.goldLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusDotPillText,
                      {
                        color: isWebhookConfigured
                          ? Colors.present
                          : Colors.gold,
                      },
                    ]}
                  >
                    {isWebhookConfigured ? 'Auto-Sync ON' : 'Setup Sheet URL'}
                  </Text>
                </View>
              </View>
              <Text style={styles.sheetsCardSub}>
                {isWebhookConfigured
                  ? 'Every scanned QR automatically adds Name & Department to your Google Sheet'
                  : 'Connect your Google Sheet Web App URL to auto-save scanned participants'}
              </Text>
            </View>
          </View>

          <View style={styles.sheetsButtonRow}>
            <TouchableOpacity
              style={styles.sheetsConfigBtn}
              onPress={handleOpenSheetsModal}
              activeOpacity={0.8}
            >
              <Ionicons
                name="settings-outline"
                size={15}
                color={Colors.darkGreen}
              />
              <Text style={styles.sheetsConfigBtnText}>
                Configure Google Sheet
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetsSyncNowBtn}
              onPress={async () => {
                if (!isWebhookConfigured) {
                  handleOpenSheetsModal();
                  return;
                }
                const res = await syncPendingToGoogleSheets();
                Alert.alert('Google Sheets Sync', res.message);
              }}
              disabled={isSyncing}
              activeOpacity={0.8}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons
                  name="cloud-upload-outline"
                  size={15}
                  color={Colors.white}
                />
              )}
              <Text style={styles.sheetsSyncNowText}>
                {isSyncing ? 'Syncing...' : 'Push Unsynced'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── WheelOfNames.com External Raffle Helper Card ── */}
        <TouchableOpacity
          style={styles.wheelExternalCard}
          onPress={handleOpenWheelOfNames}
          activeOpacity={0.85}
        >
          <View style={styles.wheelExternalIcon}>
            <Ionicons name="open-outline" size={22} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.wheelExternalTitle}>
              Open wheelofnames.com
            </Text>
            <Text style={styles.wheelExternalSub}>
              Import your Google Sheet directly on wheelofnames.com for the
              official raffle draw
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.crimson} />
        </TouchableOpacity>

        {/* ── Quick Check-In Overview (No Late Stat) ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Check-In Summary</Text>
          <TouchableOpacity
            onPress={() => router.push('/history')}
            activeOpacity={0.7}
          >
            <Text style={styles.viewHistoryLink}>
              View Participant List →
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

          <View style={[styles.statBox, { borderColor: Colors.leafGreen }]}>
            <Ionicons
              name="cloud-done"
              size={22}
              color={Colors.leafGreen}
            />
            <Text style={styles.statValue}>{stats.synced}</Text>
            <Text style={styles.statLabel}>In Google Sheet</Text>
          </View>

          <View style={[styles.statBox, { borderColor: Colors.gold }]}>
            <Ionicons name="briefcase" size={22} color={Colors.gold} />
            <Text style={styles.statValue}>{stats.departments}</Text>
            <Text style={styles.statLabel}>Departments</Text>
          </View>
        </View>

        {/* ── Scanner Operator / Default Department Card ── */}
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
              View scanned Names & Departments or copy for wheelofnames.com
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.olive} />
        </TouchableOpacity>
      </ScrollView>

      {/* ── Google Sheets Setup Modal ── */}
      <Modal
        visible={showSheetsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSheetsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={styles.modalScrollWrapper}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.modalCard}>
              <View style={styles.editModalHeader}>
                <View style={styles.editAvatarMini}>
                  <Ionicons name="logo-google" size={18} color={Colors.white} />
                </View>
                <Text style={styles.modalTitle}>Google Sheets Auto-Sync</Text>
              </View>

              <Text style={styles.modalSubtitleLeft}>
                Every time you scan one of your 200+ participant QR codes, the
                app immediately appends their Name and Department to your Google
                Sheet.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Google Apps Script Web App URL (Required for Auto-Write)
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={webhookUrlInput}
                  onChangeText={setWebhookUrlInput}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                />
                <Text style={styles.fieldHint}>
                  Paste the Web App URL from your Google Sheet&apos;s Apps
                  Script deployment.
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Google Sheet Link (Optional — for quick reference)
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={sheetUrlInput}
                  onChangeText={setSheetUrlInput}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={styles.scriptToggleBtn}
                onPress={() => setShowScriptCode(!showScriptCode)}
              >
                <Ionicons
                  name="code-slash-outline"
                  size={15}
                  color={Colors.leafGreen}
                />
                <Text style={styles.scriptToggleText}>
                  {showScriptCode
                    ? 'Hide Google Apps Script Code'
                    : 'Show Google Apps Script to Paste in Your Sheet'}
                </Text>
              </TouchableOpacity>

              {showScriptCode && (
                <View style={styles.scriptCodeBox}>
                  <Text style={styles.scriptCodeHint}>
                    In your Google Sheet, click Extensions → Apps Script, paste
                    this code, and click Deploy → New deployment → Web app
                    (Access: Anyone):
                  </Text>
                  <TextInput
                    style={styles.scriptCodeInput}
                    value={GOOGLE_APPS_SCRIPT_TEMPLATE}
                    multiline
                    editable={false}
                    selectTextOnFocus
                  />
                </View>
              )}

              {syncNotice ? (
                <View style={styles.syncFeedbackBox}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={Colors.leafGreen}
                  />
                  <Text style={styles.syncFeedbackText}>{syncNotice}</Text>
                </View>
              ) : null}

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowSheetsModal(false)}
                >
                  <Text style={styles.modalCancelText}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveAndSyncSheets}
                  disabled={isSyncing}
                >
                  <Text style={styles.modalSaveText}>
                    {isSyncing ? 'Syncing...' : 'Save & Sync'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

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
                Default Department (used if a QR code only contains a Name)
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

  // Google Sheets Card
  sheetsCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  sheetsCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  sheetsIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetsStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetsCardTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statusDotPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  statusDotPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sheetsCardSub: {
    fontSize: FontSize.xs,
    color: Colors.olive,
    marginTop: 2,
    lineHeight: 16,
  },
  sheetsButtonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  sheetsConfigBtn: {
    flex: 1.2,
    height: 40,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.creamWhite,
  },
  sheetsConfigBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.darkGreen,
  },
  sheetsSyncNowBtn: {
    flex: 1,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.leafGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sheetsSyncNowText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.white,
  },

  // Wheel of Names External Card
  wheelExternalCard: {
    backgroundColor: Colors.crimsonLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.crimson,
  },
  wheelExternalIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.crimson,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelExternalTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.crimson,
  },
  wheelExternalSub: {
    fontSize: 11,
    color: Colors.textPrimary,
    marginTop: 1,
    lineHeight: 15,
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
  modalScrollWrapper: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
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
  modalSubtitleLeft: {
    fontSize: FontSize.xs,
    color: Colors.olive,
    lineHeight: 18,
    marginBottom: Spacing.md,
    marginTop: 4,
    textAlign: 'left',
    width: '100%',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 8,
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
  fieldHint: {
    fontSize: 11,
    color: Colors.olive,
    lineHeight: 15,
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
  scriptToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  scriptToggleText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.leafGreen,
  },
  scriptCodeBox: {
    width: '100%',
    backgroundColor: Colors.beige,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    gap: 4,
  },
  scriptCodeHint: {
    fontSize: 11,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  scriptCodeInput: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: Colors.textPrimary,
    maxHeight: 120,
    backgroundColor: Colors.white,
    padding: 6,
    borderRadius: 6,
  },
  syncFeedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    backgroundColor: Colors.lightGreen,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.xs,
  },
  syncFeedbackText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    fontWeight: '600',
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
