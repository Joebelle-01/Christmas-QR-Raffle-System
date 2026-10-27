// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Service: Attendance AsyncStorage Layer (Name & Department)
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

import { AttendanceRecord, AttendanceStats } from '@/types/attendance';

const STORAGE_KEY = '@work_christmas_checkin_records';

/**
 * Fetch all saved participant check-in records from AsyncStorage.
 */
export async function getAllRecords(): Promise<AttendanceRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AttendanceRecord[]) : [];
  } catch (error) {
    console.error('[AttendanceStorage] Failed to load records:', error);
    return [];
  }
}

/**
 * Save a new participant check-in record to AsyncStorage.
 * Prepends it to the list so newest check-ins appear first.
 */
export async function addRecord(record: AttendanceRecord): Promise<void> {
  try {
    const existing = await getAllRecords();
    const updated = [record, ...existing];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[AttendanceStorage] Failed to add record:', error);
    throw error;
  }
}

/**
 * Overwrite the full records array in AsyncStorage (e.g. after updating syncedToSheet).
 */
export async function saveAllRecords(records: AttendanceRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/**
 * Delete all check-in records from AsyncStorage.
 */
export async function clearAllRecords(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[AttendanceStorage] Failed to clear records:', error);
    throw error;
  }
}

/**
 * Helper: builds a formatted AttendanceRecord from Name and Department.
 */
export function createRecord(data: {
  participantName: string;
  department: string;
}): AttendanceRecord {
  const now = new Date();
  return {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    participantName: data.participantName.trim(),
    department: data.department.trim() || 'General',
    status: 'present',
    timestamp: now.getTime(),
    date: now.toISOString().split('T')[0],
    time: now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
    syncedToSheet: false,
  };
}

/**
 * Compute check-in statistics (Total Checked In, Synced to Sheet, Unique Departments).
 */
export function computeStats(records: AttendanceRecord[]): AttendanceStats {
  const checkedIn = records.length;
  const synced = records.filter((r) => r.syncedToSheet).length;
  const deptSet = new Set(
    records.map((r) => r.department.trim().toLowerCase()).filter(Boolean)
  );

  return {
    checkedIn,
    synced,
    departments: deptSet.size,
  };
}
