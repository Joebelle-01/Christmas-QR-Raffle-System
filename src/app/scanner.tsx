// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Screen: ScannerScreen (scanner.tsx)
// Features:
//   - Scans 200+ bulk-generated third-party participant QR codes
//   - Parses Participant Name & Department (JSON, CSV, pipe, hyphen,
//     key-value, URL params, or multi-line text)
//   - Duplicate check-in prevention per participant
//   - Sends Name & Department directly to Google Sheets
//   - Invalid QR codes navigate to attendance-result with status='invalid'
//     (and NEVER display a participant name)
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

// ── Bulk Employee QR Parser (Name & Department) ─────────────
interface ParsedParticipantQR {
  isValid: boolean;
  participantName: string;
  department: string;
  raw: string;
}

function parseParticipantQR(
  raw: string,
  fallbackDept = 'General'
): ParsedParticipantQR {
  const trimmed = (raw || '').trim();

  // Reject empty, too-short, or explicit INVALID markers
  if (
    !trimmed ||
    trimmed.length < 2 ||
    trimmed.toUpperCase() === 'INVALID' ||
    trimmed.toUpperCase().startsWith('INVALID|') ||
    /[\x00-\x08\x0E-\x1F]/.test(trimmed)
  ) {
    return {
      isValid: false,
      participantName: '',
      department: '',
      raw,
    };
  }

  // 1. JSON Format e.g. {"name": "Juan Dela Cruz", "department": "Finance"}
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        if (parsed.status === 'invalid' || parsed.valid === false) {
          return { isValid: false, participantName: '', department: '', raw };
        }
        const name = String(
          parsed.participantName ||
            parsed.name ||
            parsed.fullName ||
            parsed.employee ||
            parsed.studentName ||
            ''
        ).trim();
        const dept = String(
          parsed.department ||
            parsed.dept ||
            parsed.team ||
            parsed.division ||
            parsed.course ||
            fallbackDept
        ).trim();

        if (!name) {
          return { isValid: false, participantName: '', department: '', raw };
        }
        return {
          isValid: true,
          participantName: name,
          department: dept || fallbackDept,
          raw: trimmed,
        };
      }
    } catch {
      return { isValid: false, participantName: '', department: '', raw };
    }
  }

  // 2. URL Format with query params (?name=Juan+Dela+Cruz&department=HR)
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('www.')
  ) {
    try {
      const fullUrl = trimmed.startsWith('www.')
        ? `https://${trimmed}`
        : trimmed;
      const urlObj = new URL(fullUrl);
      const params = urlObj.searchParams;
      const nameParam =
        params.get('name') ||
        params.get('participant') ||
        params.get('employee') ||
        params.get('fullname');
      const deptParam =
        params.get('department') ||
        params.get('dept') ||
        params.get('team') ||
        params.get('division');

      if (nameParam && nameParam.trim()) {
        return {
          isValid: true,
          participantName: decodeURIComponent(nameParam).trim(),
          department: deptParam
            ? decodeURIComponent(deptParam).trim()
            : fallbackDept,
          raw: trimmed,
        };
      }
      // Random URL without participant parameters is treated as an invalid QR for check-in
      return { isValid: false, participantName: '', department: '', raw };
    } catch {
      return { isValid: false, participantName: '', department: '', raw };
    }
  }

  // 3. Key-Value text e.g. "Name: Juan Dela Cruz\nDepartment: Engineering"
  const nameKv = trimmed.match(
    /(?:name|participant|employee)\s*[:=]\s*([^\n\r|;,]+)/i
  );
  const deptKv = trimmed.match(
    /(?:department|dept|team|division)\s*[:=]\s*([^\n\r|;,]+)/i
  );
  if (nameKv && nameKv[1]?.trim()) {
    return {
      isValid: true,
      participantName: nameKv[1].trim(),
      department: deptKv?.[1]?.trim() || fallbackDept,
      raw: trimmed,
    };
  }

  // 4. Multi-line text (Line 1 = Name, Line 2 = Department)
  const lines = trimmed
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length >= 2) {
    return {
      isValid: true,
      participantName: lines[0],
      department: lines[1],
      raw: trimmed,
    };
  }

  // 5. Delimited single-line text from bulk QR generators:
  //    "Juan Dela Cruz | Engineering", "Juan Dela Cruz - HR", "Juan Dela Cruz, Finance"
  if (
    trimmed.includes('|') ||
    trimmed.includes(';') ||
    trimmed.includes(',') ||
    trimmed.includes(' - ')
  ) {
    const delimiter = trimmed.includes('|')
      ? '|'
      : trimmed.includes(';')
      ? ';'
      : trimmed.includes(' - ')
      ? ' - '
      : ',';
    const parts = trimmed
      .split(delimiter)
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      return {
        isValid: true,
        participantName: parts[0],
        department: parts[1],
        raw: trimmed,
      };
    }
  }

  // 6. Plain Participant Name (e.g. "Juan Dela Cruz")
  return {
    isValid: true,
    participantName: trimmed.slice(0, 60),
    department: fallbackDept,
    raw: trimmed,
  };
}

// ── Screen Component ─────────────────────────────────────────
export default function ScannerScreen() {
  const { defaultDepartment = 'IT & Operations' } = useLocalSearchParams<{
    defaultDepartment?: string;
  }>();

  const { addRecord, records } = useAttendance();
  const [scanning, setScanning] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [existingDuplicate, setExistingDuplicate] =
    useState<AttendanceRecord | null>(null);

  const isProcessingRef = useRef(false);

  // ── Handle a scanned QR ─────────────────────────────────
  const handleScanned = useCallback(
    async (rawCode: string) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      setScanning(false);

      const parsed = parseParticipantQR(rawCode, String(defaultDepartment));

      // 1. Invalid QR Code -> Navigate to Result Screen with ONLY 'invalid' status (no participant name!)
      if (!parsed.isValid || !parsed.participantName) {
        isProcessingRef.current = false;
        router.replace({
          pathname: '/attendance-result',
          params: {
            status: 'invalid',
          },
        });
        return;
      }

      const cleanName = parsed.participantName.trim();
      const cleanDept = parsed.department.trim() || 'General';
      const todayDate = new Date().toISOString().split('T')[0];

      // 2. Duplicate Scan Prevention (Same Name + Department today)
      const duplicateFound = records.find((rec) => {
        const isSameName =
          rec.participantName.trim().toLowerCase() === cleanName.toLowerCase();
        const isSameDept =
          rec.department.trim().toLowerCase() === cleanDept.toLowerCase();
        const isSameDate = rec.date === todayDate;
        return isSameName && isSameDept && isSameDate;
      });

      if (duplicateFound) {
        setExistingDuplicate(duplicateFound);
        setShowDuplicate(true);
        setErrorMsg(
          `Already Checked In: "${cleanName}" (${cleanDept}) was already recorded at ${duplicateFound.time}.`
        );
        isProcessingRef.current = false;
        return;
      }

      // 3. Save New Check-In & Auto-Send to Google Sheets
      let createdRecord: AttendanceRecord | null = null;
      try {
        createdRecord = await addRecord({
          participantName: cleanName,
          department: cleanDept,
        });
      } catch (err) {
        console.warn('Failed to save record:', err);
      }

      setErrorMsg('');
      isProcessingRef.current = false;

      // 4. Navigate to Check-In Result Screen with Participant Name & Department
      router.replace({
        pathname: '/attendance-result',
        params: {
          participantName: cleanName,
          department: cleanDept,
          status: 'present',
          time: createdRecord?.time,
          date: createdRecord?.date,
        },
      });
    },
    [defaultDepartment, records, addRecord]
  );

  function resetScan() {
    isProcessingRef.current = false;
    setShowDuplicate(false);
    setExistingDuplicate(null);
    setErrorMsg('');
    setScanning(true);
  }

  // Quick Simulator for Testing Valid vs Invalid QR (No Late QR)
  function simulateScan(type: 'valid' | 'invalid') {
    isProcessingRef.current = false;
    if (type === 'invalid') {
      handleScanned('INVALID|UNREADABLE_CODE');
      return;
    }

    const sampleEmployees = [
      { name: 'Clarisse Villanueva', dept: 'HR & Admin' },
      { name: 'Gabriel Tan', dept: 'Engineering' },
      { name: 'Patricia Lim', dept: 'Finance & Accounting' },
      { name: 'Joshua Bautista', dept: 'IT & Operations' },
      { name: 'Katrina Ramos', dept: 'Sales & Marketing' },
      { name: 'Miguel Soriano', dept: 'Customer Support' },
    ];
    const picked =
      sampleEmployees[Math.floor(Math.random() * sampleEmployees.length)];
    handleScanned(`${picked.name} | ${picked.dept}`);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.darkGreen} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Scan Participant QR</Text>
          <Text style={styles.headerSubtitle}>
            Name & Department → Google Sheets
          </Text>
        </View>

        <TouchableOpacity
          style={styles.historyShortcutBtn}
          onPress={() => router.push('/history')}
          activeOpacity={0.7}
        >
          <Ionicons name="list-outline" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* ── Camera viewfinder ── */}
      <View style={styles.cameraWrapper}>
        <QRScanner onScanned={handleScanned} active={scanning} />
      </View>

      {/* ── Bottom info & Quick Test panel ── */}
      <View style={styles.bottomPanel}>
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Ionicons name="warning" size={20} color={Colors.late} />
            <Text style={[styles.errorText, { color: Colors.late }]}>
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
              Point camera at any employee QR pass (supports &quot;Name -
              Department&quot;, CSV, or JSON from any bulk QR generator)
            </Text>
          </View>
        )}

        {/* Quick Simulator Bar (Valid Participant vs Invalid Only) */}
        <View style={styles.simSection}>
          <Text style={styles.simTitle}>QUICK TEST SCANNER:</Text>
          <View style={styles.simChipRow}>
            <TouchableOpacity
              style={[styles.simChip, { borderColor: Colors.present }]}
              onPress={() => simulateScan('valid')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="checkmark-circle"
                size={15}
                color={Colors.present}
              />
              <Text style={[styles.simChipText, { color: Colors.present }]}>
                Simulate Valid Employee QR
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.simChip, { borderColor: Colors.absent }]}
              onPress={() => simulateScan('invalid')}
              activeOpacity={0.8}
            >
              <Ionicons name="warning" size={15} color={Colors.absent} />
              <Text style={[styles.simChipText, { color: Colors.absent }]}>
                Simulate Invalid QR
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
              This participant is already on the Google Sheet check-in list
            </Text>

            <View style={styles.duplicateSubjectBox}>
              <Ionicons name="person-outline" size={18} color={Colors.late} />
              <Text style={styles.duplicateSubjectText}>
                {existingDuplicate?.participantName || 'Participant'}
              </Text>
            </View>

            <View style={styles.duplicateInfoCard}>
              <View style={styles.duplicateInfoRow}>
                <Ionicons
                  name="briefcase-outline"
                  size={14}
                  color={Colors.olive}
                />
                <Text style={styles.duplicateInfoLabel}>Department:</Text>
                <Text style={styles.duplicateInfoValue}>
                  {existingDuplicate?.department || 'General'}
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
              onPress={() => {
                setShowDuplicate(false);
                router.push('/history');
              }}
              activeOpacity={0.85}
            >
              <Ionicons
                name="list-outline"
                size={16}
                color={Colors.leafGreen}
              />
              <Text style={styles.viewHistoryBtnText}>
                View Checked-In List
              </Text>
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
    gap: 5,
    paddingVertical: 9,
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
    textAlign: 'center',
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
