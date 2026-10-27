// ============================================================
// GROUP 5 – Smart QR Attendance & Christmas Raffle System
// Screen: DashboardScreen (dashboard.tsx) — Event Control Hub
// Features:
//   - Live Clock & Persistent Organizer/Participant Profile
//   - Christmas Raffle Roulette Card (live pool & winners count)
//   - Google Sheets Hybrid Connection Card & Setup Modal
//   - Built-in Participant QR Pass Generator (react-native-qrcode-svg)
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScanButton } from '@/components/ScanButton';
import { StudentCard } from '@/components/StudentCard';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAttendance } from '@/context/attendance-context';
import { getStudentProfile, saveStudentProfile } from '@/services/auth-storage';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '@/services/google-sheets';

const COURSES = [
  'BS Information Technology',
  'BS Computer Science',
  'BS Information Systems',
  'BS Computer Engineering',
];

const SECTIONS = ['IT-3A', 'IT-3B', 'CS-3A', 'CS-3B'];

export default function DashboardScreen() {
  const params = useLocalSearchParams<{
    studentName?: string;
    studentId?: string;
    course?: string;
    section?: string;
  }>();

  // ── Profile State (Persisted in AsyncStorage) ───────────
  const [currentId, setCurrentId] = useState(params.studentId || '2024305392');
  const [currentName, setCurrentName] = useState(
    params.studentName || 'Joebelle Dumapias'
  );
  const [currentCourse, setCurrentCourse] = useState(
    params.course || COURSES[0]
  );
  const [currentSection, setCurrentSection] = useState(
    params.section || SECTIONS[0]
  );

  // ── Edit Profile Modal State ────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState(currentId);
  const [editName, setEditName] = useState(currentName);
  const [editCourse, setEditCourse] = useState(currentCourse);
  const [editSection, setEditSection] = useState(currentSection);

  // ── QR Pass Generator Modal State ───────────────────────
  const [showQRPassModal, setShowQRPassModal] = useState(false);
  const [passName, setPassName] = useState(currentName);
  const [passId, setPassId] = useState(currentId);
  const [passCourse, setPassCourse] = useState(currentCourse);
  const [passSection, setPassSection] = useState(currentSection);

  // ── Google Sheets Setup Modal State ─────────────────────
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [showScriptCode, setShowScriptCode] = useState(false);
  const [syncNotice, setSyncNotice] = useState('');

  // ── Attendance & Raffle Context ─────────────────────────
  const {
    stats,
    rafflePool,
    winners,
    sheetsConfig,
    isSyncing,
    updateSheetsConfig,
    syncWithGoogleSheets,
  } = useAttendance();

  // Load saved profile on mount
  useEffect(() => {
    getStudentProfile().then((saved) => {
      setCurrentId(params.studentId || saved.studentId);
      setCurrentName(params.studentName || saved.studentName);
      setCurrentCourse(params.course || saved.course);
      setCurrentSection(params.section || saved.section);
    });
  }, [params.studentId, params.studentName, params.course, params.section]);

  // ── Live Date & Time State ──────────────────────────────
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
    setEditId(currentId);
    setEditName(currentName);
    setEditCourse(currentCourse);
    setEditSection(currentSection);
    setShowEditModal(true);
  }

  async function handleSaveProfile() {
    if (!editName.trim() || !editId.trim()) {
      Alert.alert('Validation', 'Please enter both Name and ID.');
      return;
    }
    const updated = await saveStudentProfile({
      studentId: editId.trim(),
      studentName: editName.trim(),
      course: editCourse,
      section: editSection,
    });
    setCurrentId(updated.studentId);
    setCurrentName(updated.studentName);
    setCurrentCourse(updated.course);
    setCurrentSection(updated.section);
    setShowEditModal(false);
  }

  function handleOpenQRPass() {
    setPassName(currentName);
    setPassId(currentId);
    setPassCourse(currentCourse);
    setPassSection(currentSection);
    setShowQRPassModal(true);
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
    const result = await syncWithGoogleSheets(updated);
    setSyncNotice(result.message);
  }

  function handleScanPress() {
    router.push({
      pathname: '/scanner',
      params: {
        studentName: currentName,
        studentId: currentId,
        course: currentCourse,
        section: currentSection,
      },
    });
  }

  // Encoded QR payload for the built-in QR Pass Generator
  const generatedQRValue = JSON.stringify({
    subject: 'Christmas Party 2026',
    studentId: passId.trim() || '2024305392',
    studentName: passName.trim() || 'Party Guest',
    course: passCourse,
    section: passSection,
    status: 'present',
  });

  const isSheetsConnected = Boolean(
    sheetsConfig.sheetUrl.trim() || sheetsConfig.webhookUrl.trim()
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.beige} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Bar / Header ── */}
        <View style={styles.topBar}>
          <View>
            <View style={styles.titleBadgeRow}>
              <Ionicons name="sparkles" size={16} color={Colors.crimson} />
              <Text style={styles.greeting}>Christmas QR & Raffle</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              Smart Check-In · Google Sheets · Roulette Draw
            </Text>
          </View>

          <View style={styles.topBarActions}>
            <TouchableOpacity
              style={styles.actionIconButton}
              onPress={() =>
                router.push({
                  pathname: '/history',
                  params: { studentName: currentName, studentId: currentId },
                })
              }
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={20} color={Colors.darkGreen} />
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

        {/* ── Date & Time Card ── */}
        <View style={styles.clockCard}>
          <View style={styles.clockIconCircle}>
            <Ionicons name="time" size={22} color={Colors.goldBright} />
          </View>
          <View style={styles.clockTextContainer}>
            <Text style={styles.liveTimeText}>{formattedTime}</Text>
            <Text style={styles.liveDateText}>{formattedDate}</Text>
          </View>
          <TouchableOpacity
            style={styles.qrPassMiniBtn}
            onPress={handleOpenQRPass}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code" size={16} color={Colors.darkGreen} />
            <Text style={styles.qrPassMiniBtnText}>My QR Pass</Text>
          </TouchableOpacity>
        </View>

        {/* ── Christmas Raffle Roulette Banner Card ── */}
        <TouchableOpacity
          style={styles.raffleHeroCard}
          onPress={() => router.push('/roulette')}
          activeOpacity={0.88}
        >
          <View style={styles.raffleHeroIconCircle}>
            <Ionicons name="gift" size={28} color={Colors.goldBright} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <View style={styles.raffleHeroTagRow}>
              <Text style={styles.raffleHeroBadgeText}>CHRISTMAS RAFFLE</Text>
            </View>
            <Text style={styles.raffleHeroTitle}>Spin the Roulette Wheel</Text>
            <Text style={styles.raffleHeroSubtitle}>
              {rafflePool.length} Eligible in Pool · {winners.length} Winners
              Drawn
            </Text>
          </View>
          <View style={styles.raffleHeroArrow}>
            <Ionicons name="play" size={18} color={Colors.crimson} />
          </View>
        </TouchableOpacity>

        {/* ── Action Scan Button ── */}
        <View style={styles.scanSection}>
          <ScanButton
            onPress={handleScanPress}
            title="Scan Participant QR Code"
            subtitle="Logs check-in to Google Sheets & enters Raffle Wheel"
          />
        </View>

        {/* ── Google Sheets Hybrid Connection Card ── */}
        <View style={styles.sheetsCard}>
          <View style={styles.sheetsCardTop}>
            <View style={styles.sheetsIconCircle}>
              <Ionicons name="logo-google" size={20} color={Colors.leafGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.sheetsStatusRow}>
                <Text style={styles.sheetsCardTitle}>Google Sheets Sync</Text>
                <View
                  style={[
                    styles.statusDotPill,
                    {
                      backgroundColor: isSheetsConnected
                        ? Colors.presentBg
                        : Colors.goldLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusDotPillText,
                      {
                        color: isSheetsConnected ? Colors.present : Colors.gold,
                      },
                    ]}
                  >
                    {isSheetsConnected ? 'Connected' : 'Local + Ready'}
                  </Text>
                </View>
              </View>
              <Text style={styles.sheetsCardSub}>
                {isSheetsConnected
                  ? 'Syncing check-ins & participant names with Google Sheets'
                  : 'Connect a Google Sheet URL or Apps Script to sync live names'}
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
                if (!isSheetsConnected) {
                  handleOpenSheetsModal();
                  return;
                }
                const res = await syncWithGoogleSheets();
                Alert.alert('Google Sheets Sync', res.message);
              }}
              disabled={isSyncing}
              activeOpacity={0.8}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="sync-outline" size={15} color={Colors.white} />
              )}
              <Text style={styles.sheetsSyncNowText}>
                {isSyncing ? 'Syncing...' : 'Sync Roster'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Quick Stats Summary ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Check-In Overview</Text>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/history',
                params: { studentName: currentName, studentId: currentId },
              })
            }
            activeOpacity={0.7}
          >
            <Text style={styles.viewHistoryLink}>View Logs & CSV →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { borderColor: Colors.present }]}>
            <Ionicons
              name="checkmark-done-circle"
              size={22}
              color={Colors.present}
            />
            <Text style={styles.statValue}>{stats.present}</Text>
            <Text style={styles.statLabel}>Checked In</Text>
          </View>

          <View style={[styles.statBox, { borderColor: Colors.late }]}>
            <Ionicons name="people" size={22} color={Colors.gold} />
            <Text style={styles.statValue}>{rafflePool.length}</Text>
            <Text style={styles.statLabel}>Raffle Pool</Text>
          </View>

          <View style={[styles.statBox, { borderColor: Colors.crimson }]}>
            <Ionicons name="trophy" size={22} color={Colors.crimson} />
            <Text style={styles.statValue}>{winners.length}</Text>
            <Text style={styles.statLabel}>Winners</Text>
          </View>
        </View>

        {/* ── Participant Profile Card (With Edit & QR Pass) ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Active Participant Profile</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={handleOpenQRPass}
              style={[
                styles.editProfileChip,
                { backgroundColor: Colors.goldLight },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons name="qr-code-outline" size={12} color={Colors.gold} />
              <Text style={[styles.editProfileChipText, { color: Colors.gold }]}>
                Generate QR
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenEditProfile}
              style={styles.editProfileChip}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil" size={12} color={Colors.leafGreen} />
              <Text style={styles.editProfileChipText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        <StudentCard
          studentName={currentName}
          studentId={currentId}
          course={currentCourse}
          section={currentSection}
          onEdit={handleOpenEditProfile}
        />

        {/* ── Attendance History Quick Card ── */}
        <TouchableOpacity
          style={styles.historyCardButton}
          onPress={() =>
            router.push({
              pathname: '/history',
              params: { studentName: currentName, studentId: currentId },
            })
          }
          activeOpacity={0.8}
        >
          <View style={styles.historyIconCircle}>
            <Ionicons
              name="receipt-outline"
              size={20}
              color={Colors.leafGreen}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.historyBtnTitle}>
              Check-In Logs & CSV Export
            </Text>
            <Text style={styles.historyBtnSubtitle}>
              View scanned participants and export to Google Sheets
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
                <Text style={styles.modalTitle}>Google Sheets Connection</Text>
              </View>

              <Text style={styles.modalSubtitleLeft}>
                Connect your Google Sheet so QR check-ins and Roulette Wheel
                participants sync automatically.
              </Text>

              {/* Option 1: Direct Public Google Sheet Link */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  1. Google Sheet Sharing Link (Reads Participant Names)
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={sheetUrlInput}
                  onChangeText={setSheetUrlInput}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                />
                <Text style={styles.fieldHint}>
                  Set your Google Sheet to &quot;Anyone with the link can
                  view&quot;. Columns: Name, ID, Department, Section.
                </Text>
              </View>

              {/* Option 2: Google Apps Script Webhook URL */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  2. Apps Script Web App URL (Live 2-Way Check-In & Winners)
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={webhookUrlInput}
                  onChangeText={setWebhookUrlInput}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                />
              </View>

              {/* Toggle to view ready-to-copy Google Apps Script */}
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
                    ? 'Hide Google Apps Script Template'
                    : 'Show Ready-to-Paste Google Apps Script (2-Way Sync)'}
                </Text>
              </TouchableOpacity>

              {showScriptCode && (
                <View style={styles.scriptCodeBox}>
                  <Text style={styles.scriptCodeHint}>
                    Select & copy this into Extensions → Apps Script in your
                    Google Sheet:
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
                    {isSyncing ? 'Syncing...' : 'Save & Sync Sheet'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Built-In Participant QR Pass Generator Modal ── */}
      <Modal
        visible={showQRPassModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQRPassModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.editModalHeader}>
              <View
                style={[
                  styles.editAvatarMini,
                  { backgroundColor: Colors.crimson },
                ]}
              >
                <Ionicons name="qr-code" size={18} color={Colors.white} />
              </View>
              <Text style={styles.modalTitle}>Christmas Party QR Pass</Text>
            </View>

            <View style={styles.qrPreviewBox}>
              <QRCode
                value={generatedQRValue}
                size={180}
                color={Colors.darkGreen}
                backgroundColor={Colors.white}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Participant Name</Text>
              <TextInput
                style={styles.textInput}
                value={passName}
                onChangeText={setPassName}
                placeholder="Enter participant name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Participant / Student ID</Text>
              <TextInput
                style={styles.textInput}
                value={passId}
                onChangeText={setPassId}
                placeholder="e.g. 2024305392"
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSaveBtn, { width: '100%', marginTop: 4 }]}
              onPress={() => setShowQRPassModal(false)}
            >
              <Text style={styles.modalSaveText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Edit Profile Modal ── */}
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
                <Ionicons name="person" size={20} color={Colors.white} />
              </View>
              <Text style={styles.modalTitle}>Edit Participant Profile</Text>
            </View>

            {/* Student / Participant ID Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Participant / Student ID</Text>
              <TextInput
                style={styles.textInput}
                value={editId}
                onChangeText={setEditId}
                placeholder="Enter ID #"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Full Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter full name"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Course Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Department / Course</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {COURSES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.modalChip,
                        editCourse === c && styles.modalChipSelected,
                      ]}
                      onPress={() => setEditCourse(c)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.modalChipText,
                          editCourse === c && styles.modalChipTextSelected,
                        ]}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Section Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Section / Group</Text>
              <View style={styles.chipRow}>
                {SECTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.modalChip,
                      editSection === s && styles.modalChipSelected,
                    ]}
                    onPress={() => setEditSection(s)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.modalChipText,
                        editSection === s && styles.modalChipTextSelected,
                      ]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Action Buttons */}
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
                <Text style={styles.modalSaveText}>Save Profile</Text>
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

  // Top Bar
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

  // Live Clock Card
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
  qrPassMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.goldBright,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  qrPassMiniBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.darkGreen,
  },

  // Raffle Hero Card
  raffleHeroCard: {
    backgroundColor: Colors.crimson,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.button,
  },
  raffleHeroIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  raffleHeroTagRow: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  raffleHeroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.goldLight,
    letterSpacing: 0.8,
  },
  raffleHeroTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.white,
  },
  raffleHeroSubtitle: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  raffleHeroArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.goldBright,
    alignItems: 'center',
    justifyContent: 'center',
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

  // Scan Section
  scanSection: {
    marginTop: 2,
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

  // Modals Common Styles
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
  qrPreviewBox: {
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.goldBright,
    marginVertical: Spacing.md,
    ...Shadow.card,
  },
  inputGroup: {
    width: '100%',
    marginBottom: Spacing.md,
    gap: 4,
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
    maxHeight: 110,
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
