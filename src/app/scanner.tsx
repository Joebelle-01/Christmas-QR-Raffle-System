// ============================================================
// GROUP 5 – Smart QR Attendance & Christmas Raffle System
// Screen: ScannerScreen (scanner.tsx)
// Features:
//   - Camera viewfinder + Universal Participant/Class QR Parser
//   - Evaluates Present vs Late (15-min cut-off) & Invalid QR codes
//   - Duplicate scan prevention per participant per event
//   - Automatically adds scanned participant to Raffle Wheel & Google Sheets
//   - Navigates to attendance-result.tsx on completion
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QRScanner } from '@/components/QRScanner';
import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAttendance } from '@/context/attendance-context';
import { AttendanceRecord } from '@/types/attendance';

// ── Smart QR Parser ──────────────────────────────────────────
interface ParsedQR {
  isValid: boolean;
  subject: string;
  studentName?: string;
  studentId?: string;
  course?: string;
  section?: string;
  status: 'present' | 'late' | 'invalid';
  formatType: string;
  details?: string;
  raw: string;
}

/**
 * Evaluates whether current time is >15 minutes past a session start time ("HH:MM").
 */
function evaluateLateCutoff(startTimeStr?: string): 'present' | 'late' {
  if (!startTimeStr) return 'present';
  const match = startTimeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 'present';

  const startHour = parseInt(match[1], 10);
  const startMin = parseInt(match[2], 10);
  if (isNaN(startHour) || isNaN(startMin)) return 'present';

  const now = new Date();
  const sessionStart = new Date(now);
  sessionStart.setHours(startHour, startMin, 0, 0);

  const diffMinutes = (now.getTime() - sessionStart.getTime()) / (1000 * 60);
  return diffMinutes > 15 ? 'late' : 'present';
}

function parseQRData(raw: string): ParsedQR {
  const trimmed = (raw || '').trim();

  // Reject empty, too-short, or explicit invalid payloads
  if (
    !trimmed ||
    trimmed.length < 2 ||
    trimmed.toUpperCase() === 'INVALID' ||
    trimmed.startsWith('INVALID|') ||
    /[\x00-\x08\x0E-\x1F]/.test(trimmed)
  ) {
    return {
      isValid: false,
      subject: 'Unrecognized QR',
      status: 'invalid',
      formatType: 'Invalid QR Code',
      raw,
    };
  }

  // 1. System Prefix format:
  // "SMART-QR-ATTEND|Christmas Party 2026|2024305392|Joebelle Dumapias|BSIT|IT-3A|08:00"
  // or "SMART-QR-ATTEND|CS101|IT-3A|late"
  if (
    trimmed.startsWith('SMART-QR-ATTEND|') ||
    trimmed.startsWith('ATTENDANCE|') ||
    trimmed.startsWith('QR-ATTEND|')
  ) {
    const parts = trimmed.split('|').map((s) => s.trim());
    const subject = parts[1] || 'Christmas Party 2026';
    const lastPart = (parts[parts.length - 1] || '').toLowerCase();

    let status: 'present' | 'late' = 'present';
    if (lastPart === 'late') {
      status = 'late';
    } else if (/^\d{1,2}:\d{2}$/.test(lastPart)) {
      status = evaluateLateCutoff(lastPart);
    }

    // Check if full participant info is encoded
    if (parts.length >= 5) {
      return {
        isValid: true,
        subject,
        studentId: parts[2] || undefined,
        studentName: parts[3] || undefined,
        course: parts[4] || undefined,
        section: parts[5] || undefined,
        status,
        formatType: 'System QR Pass',
        details: parts.slice(2, 5).filter(Boolean).join(' · '),
        raw: trimmed,
      };
    }

    return {
      isValid: true,
      subject,
      section: parts[2] || undefined,
      status,
      formatType: 'System QR Code',
      details: parts.slice(2).filter(Boolean).join(' · ') || undefined,
      raw: trimmed,
    };
  }

  // 2. JSON Format (from built-in QR Pass Generator or online generators)
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        if (parsed.status === 'invalid' || parsed.valid === false) {
          return {
            isValid: false,
            subject: 'Invalid QR Payload',
            status: 'invalid',
            formatType: 'JSON QR',
            raw: trimmed,
          };
        }

        const candidateSubject =
          parsed.subject ||
          parsed.event ||
          parsed.courseCode ||
          parsed.class ||
          parsed.title ||
          'Christmas Party 2026';

        let status: 'present' | 'late' = 'present';
        if (String(parsed.status).toLowerCase() === 'late') {
          status = 'late';
        } else if (parsed.startTime) {
          status = evaluateLateCutoff(String(parsed.startTime));
        }

        return {
          isValid: true,
          subject: String(candidateSubject).trim(),
          studentName: parsed.studentName || parsed.name || parsed.participant || undefined,
          studentId: parsed.studentId || parsed.id || undefined,
          course: parsed.course || parsed.department || undefined,
          section: parsed.section || parsed.group || undefined,
          status,
          formatType: 'Digital QR Pass',
          raw: trimmed,
        };
      }
    } catch {
      return {
        isValid: false,
        subject: 'Malformed JSON QR',
        status: 'invalid',
        formatType: 'Corrupted JSON',
        raw: trimmed,
      };
    }
  }

  // 3. Web URL QR Code
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('www.')
  ) {
    try {
      const fullUrl = trimmed.startsWith('www.') ? `https://${trimmed}` : trimmed;
      const urlObj = new URL(fullUrl);
      const params = urlObj.searchParams;

      const subjectParam =
        params.get('subject') ||
        params.get('event') ||
        params.get('course') ||
        params.get('class') ||
        'Christmas Party 2026';

      const nameParam = params.get('name') || params.get('studentName') || undefined;
      const idParam = params.get('id') || params.get('studentId') || undefined;
      const statusParam = params.get('status')?.toLowerCase();
      const startParam = params.get('start') || params.get('startTime') || undefined;

      const status: 'present' | 'late' =
        statusParam === 'late' ? 'late' : evaluateLateCutoff(startParam);

      return {
        isValid: true,
        subject: decodeURIComponent(subjectParam).trim(),
        studentName: nameParam ? decodeURIComponent(nameParam).trim() : undefined,
        studentId: idParam ? decodeURIComponent(idParam).trim() : undefined,
        status,
        formatType: 'Online Web QR',
        details: urlObj.hostname,
        raw: trimmed,
      };
    } catch {
      // continue
    }
  }

  // 4. Delimited text (e.g. "2024305392, Joebelle Dumapias, BSIT, IT-3A")
  if (trimmed.includes('|') || trimmed.includes(';') || trimmed.includes(',')) {
    const delimiter = trimmed.includes('|')
      ? '|'
      : trimmed.includes(';')
      ? ';'
      : ',';
    const segments = trimmed
      .split(delimiter)
      .map((s) => s.trim())
      .filter(Boolean);

    if (segments.length >= 2) {
      return {
        isValid: true,
        subject: 'Christmas Party 2026',
        studentId: segments[0],
        studentName: segments[1],
        course: segments[2] || undefined,
        section: segments[3] || undefined,
        status: 'present',
        formatType: 'Participant QR Badge',
        details: segments.join(' · '),
        raw: trimmed,
      };
    }
  }

  // 5. Plain Text (Participant Name or Event Code)
  const firstLine = trimmed.split(/[\r\n]+/)[0].trim();
  const cleanText =
    firstLine.length > 45 ? `${firstLine.substring(0, 42)}...` : firstLine;

  return {
    isValid: true,
    subject: 'Christmas Party 2026',
    studentName: cleanText,
    status: 'present',
    formatType: 'Guest QR Code',
    raw: trimmed,
  };
}

// ── Screen Component ─────────────────────────────────────────
export default function ScannerScreen() {
  const {
    studentName = 'Joebelle Dumapias',
    studentId = '2024305392',
    course = 'BS Information Technology',
    section = 'IT-3A',
  } = useLocalSearchParams<{
    studentName?: string;
    studentId?: string;
    course?: string;
    section?: string;
  }>();

  const { addRecord, records } = useAttendance();
  const [scanning, setScanning] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDuplicate, setShowDuplicate] = useState(false);

  const [scannedInfo, setScannedInfo] = useState<ParsedQR | null>(null);
  const [existingDuplicate, setExistingDuplicate] =
    useState<AttendanceRecord | null>(null);

  const isProcessingRef = useRef(false);

  // ── Handle a scanned QR ─────────────────────────────────
  const handleScanned = useCallback(
    async (rawCode: string) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      setScanning(false);

      const parsed = parseQRData(rawCode);
      setScannedInfo(parsed);

      // 1. Handle Invalid QR Code -> Navigate to Result Screen with 'invalid' status
      if (!parsed.isValid || parsed.status === 'invalid') {
        isProcessingRef.current = false;
        router.replace({
          pathname: '/attendance-result',
          params: {
            studentName: String(studentName),
            studentId: String(studentId),
            course: String(course),
            section: String(section),
            subject: parsed.subject,
            status: 'invalid',
          },
        });
        return;
      }

      // Resolve final participant details (use QR-encoded guest info if present, else active profile)
      const resolvedName = parsed.studentName || String(studentName || 'Party Guest');
      const resolvedId = parsed.studentId || String(studentId || '2024305392');
      const resolvedCourse = parsed.course || String(course || 'BS Information Technology');
      const resolvedSection = parsed.section || String(section || 'IT-3A');
      const currentSubject = parsed.subject.trim().toLowerCase();
      const todayDate = new Date().toISOString().split('T')[0];

      // 2. Duplicate Scan Prevention (Same participant + same event + today)
      const duplicateFound = records.find((rec) => {
        const isSamePerson =
          rec.studentId.trim().toLowerCase() === resolvedId.trim().toLowerCase() &&
          rec.studentName.trim().toLowerCase() === resolvedName.trim().toLowerCase();
        const isSameSubject =
          rec.subject.trim().toLowerCase() === currentSubject;
        const isSameDate = rec.date === todayDate;

        return isSamePerson && isSameSubject && isSameDate;
      });

      if (duplicateFound) {
        setExistingDuplicate(duplicateFound);
        setShowDuplicate(true);
        setErrorMsg(
          `Duplicate scan: "${resolvedName}" is already checked in today at ${duplicateFound.time}.`
        );
        isProcessingRef.current = false;
        return;
      }

      // 3. Save New Check-In Record, Enter into Raffle Pool & Sync to Google Sheets
      let createdRecord: AttendanceRecord | null = null;
      try {
        createdRecord = await addRecord({
          studentName: resolvedName,
          studentId: resolvedId,
          course: resolvedCourse,
          section: resolvedSection,
          status: parsed.status,
          subject: parsed.subject,
        });
      } catch (err) {
        console.warn('Failed to save record to storage:', err);
      }

      setErrorMsg('');
      isProcessingRef.current = false;

      // 4. Transition to Attendance Result Screen
      router.replace({
        pathname: '/attendance-result',
        params: {
          studentName: resolvedName,
          studentId: resolvedId,
          course: resolvedCourse,
          section: resolvedSection,
          subject: parsed.subject,
          status: parsed.status,
          time: createdRecord?.time,
          date: createdRecord?.date,
        },
      });
    },
    [studentName, studentId, course, section, records, addRecord]
  );

  function resetScan() {
    isProcessingRef.current = false;
    setShowDuplicate(false);
    setExistingDuplicate(null);
    setScannedInfo(null);
    setErrorMsg('');
    setScanning(true);
  }

  function goToDashboard() {
    router.back();
  }

  function goToHistory() {
    setShowDuplicate(false);
    router.push({
      pathname: '/history',
      params: {
        studentName: String(studentName),
        studentId: String(studentId),
      },
    });
  }

  // Quick simulation helper so users can test Present, Late, and Invalid QR flows on any device
  function simulateScan(type: 'present' | 'late' | 'invalid') {
    isProcessingRef.current = false;
    if (type === 'invalid') {
      handleScanned('INVALID|CORRUPTED_QR');
      return;
    }
    const randomNum = Math.floor(100 + Math.random() * 899);
    const sampleNames = [
      'Clarisse Villanueva',
      'Gabriel Tan',
      'Patricia Lim',
      'Joshua Bautista',
      'Katrina Ramos',
      'Miguel Soriano',
    ];
    const pickedName =
      sampleNames[Math.floor(Math.random() * sampleNames.length)];

    const payload = JSON.stringify({
      subject: 'Christmas Party 2026',
      studentId: `2024-99${randomNum}`,
      studentName: pickedName,
      course: String(course || 'BS Information Technology'),
      section: String(section || 'IT-3A'),
      status: type,
    });
    handleScanned(payload);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.darkGreen} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goToDashboard}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Scan Participant QR</Text>
          <Text style={styles.headerSubtitle}>
            Auto-syncs to Google Sheets & Raffle Wheel
          </Text>
        </View>

        <TouchableOpacity
          style={styles.historyShortcutBtn}
          onPress={() => router.push('/roulette')}
          activeOpacity={0.7}
        >
          <Ionicons name="gift" size={20} color={Colors.goldBright} />
        </TouchableOpacity>
      </View>

      {/* ── Camera viewfinder ── */}
      <View style={styles.cameraWrapper}>
        <QRScanner onScanned={handleScanned} active={scanning} />
      </View>

      {/* ── Bottom info & Quick Demo panel ── */}
      <View style={styles.bottomPanel}>
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Ionicons
              name={showDuplicate ? 'warning' : 'alert-circle'}
              size={20}
              color={showDuplicate ? Colors.late : Colors.absent}
            />
            <Text
              style={[
                styles.errorText,
                showDuplicate && { color: Colors.late },
              ]}
            >
              {errorMsg}
            </Text>
          </View>
        ) : (
          <View style={styles.hintBox}>
            <Ionicons
              name="qr-code-outline"
              size={18}
              color={Colors.leafGreen}
            />
            <Text style={styles.hintText}>
              Scan any participant QR pass to check in and add their name to the
              Christmas Raffle Roulette Wheel!
            </Text>
          </View>
        )}

        {/* Quick Simulator Bar for Instant Testing */}
        <View style={styles.simSection}>
          <Text style={styles.simTitle}>QUICK TEST SCANNER:</Text>
          <View style={styles.simChipRow}>
            <TouchableOpacity
              style={[styles.simChip, { borderColor: Colors.present }]}
              onPress={() => simulateScan('present')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={Colors.present}
              />
              <Text style={[styles.simChipText, { color: Colors.present }]}>
                + Guest QR
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simChip, { borderColor: Colors.late }]}
              onPress={() => simulateScan('late')}
              activeOpacity={0.8}
            >
              <Ionicons name="time" size={14} color={Colors.late} />
              <Text style={[styles.simChipText, { color: Colors.late }]}>
                Late QR
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simChip, { borderColor: Colors.absent }]}
              onPress={() => simulateScan('invalid')}
              activeOpacity={0.8}
            >
              <Ionicons name="warning" size={14} color={Colors.absent} />
              <Text style={[styles.simChipText, { color: Colors.absent }]}>
                Invalid QR
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {!scanning && (
          <TouchableOpacity
            style={styles.rescanButton}
            onPress={resetScan}
            activeOpacity={0.85}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color={Colors.darkGreen}
            />
            <Text style={styles.rescanText}>Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Duplicate Scan Alert Modal ── */}
      <Modal visible={showDuplicate} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.duplicateIconCircle}>
              <Ionicons name="alert" size={40} color={Colors.white} />
            </View>

            <Text style={styles.duplicateModalTitle}>Already Checked In</Text>
            <Text style={styles.duplicateModalSubtitle}>
              This Participant Is Already in the Raffle Pool
            </Text>

            <View style={styles.duplicateSubjectBox}>
              <Ionicons name="person-outline" size={18} color={Colors.late} />
              <Text style={styles.duplicateSubjectText}>
                {existingDuplicate?.studentName ||
                  scannedInfo?.studentName ||
                  'Participant'}
              </Text>
            </View>

            <View style={styles.duplicateInfoCard}>
              <View style={styles.duplicateInfoRow}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={Colors.olive}
                />
                <Text style={styles.duplicateInfoLabel}>Date Logged:</Text>
                <Text style={styles.duplicateInfoValue}>
                  {existingDuplicate?.date || 'Today'}
                </Text>
              </View>
              <View style={styles.duplicateInfoRow}>
                <Ionicons name="time-outline" size={14} color={Colors.olive} />
                <Text style={styles.duplicateInfoLabel}>Time Logged:</Text>
                <Text style={styles.duplicateInfoValue}>
                  {existingDuplicate?.time || 'Earlier'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.rescanDuplicateBtn}
              onPress={resetScan}
              activeOpacity={0.85}
            >
              <Ionicons name="scan-outline" size={18} color={Colors.white} />
              <Text style={styles.rescanDuplicateBtnText}>
                Scan Next Participant
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewHistoryBtn}
              onPress={goToHistory}
              activeOpacity={0.85}
            >
              <Ionicons
                name="list-outline"
                size={16}
                color={Colors.leafGreen}
              />
              <Text style={styles.viewHistoryBtnText}>View Check-In Logs</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkGreen,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.darkGreen,
    gap: Spacing.md,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyShortcutBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 1,
  },
  cameraWrapper: {
    flex: 1,
  },
  bottomPanel: {
    backgroundColor: Colors.beige,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.lightGreen,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  hintText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.absentBg,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.absent,
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.absent,
    lineHeight: 18,
    fontWeight: '600',
  },

  // Simulator Chips
  simSection: {
    gap: 6,
  },
  simTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.olive,
    letterSpacing: 0.8,
  },
  simChipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  simChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
  },
  simChipText: {
    fontSize: 11,
    fontWeight: '700',
  },

  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.darkGreen,
    backgroundColor: Colors.beige,
  },
  rescanText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.darkGreen,
  },

  // Modal Common
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
    alignItems: 'center',
    gap: Spacing.xs,
    ...Shadow.card,
  },
  duplicateIconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    backgroundColor: Colors.late,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  duplicateModalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  duplicateModalSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.olive,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  duplicateSubjectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.lateBg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.late,
    marginVertical: Spacing.xs,
  },
  duplicateSubjectText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.late,
  },
  duplicateInfoCard: {
    width: '100%',
    backgroundColor: Colors.creamWhite,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  duplicateInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  duplicateInfoLabel: {
    fontSize: FontSize.xs,
    color: Colors.olive,
    fontWeight: '600',
    width: 90,
  },
  duplicateInfoValue: {
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  rescanDuplicateBtn: {
    width: '100%',
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: Colors.leafGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    ...Shadow.button,
  },
  rescanDuplicateBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.white,
  },
  viewHistoryBtn: {
    width: '100%',
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.leafGreen,
    backgroundColor: Colors.lightGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  viewHistoryBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.leafGreen,
  },
});
