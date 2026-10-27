// ============================================================
// GROUP 5 – Smart QR Attendance & Christmas Raffle System
// Service: Attendance & Raffle AsyncStorage Layer
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  AttendanceRecord,
  AttendanceStats,
  RaffleParticipant,
  RaffleWinner,
} from '@/types/attendance';

const STORAGE_KEY = '@attendance_records';
const RAFFLE_POOL_KEY = '@raffle_participants_pool';
const RAFFLE_WINNERS_KEY = '@raffle_winners_list';

// ── Default event / subject ──
const DEFAULT_SUBJECT = 'Christmas Party 2026';

/**
 * Default festive participants so the Roulette Wheel works out-of-the-box
 * and updates dynamically as QR codes are scanned or Google Sheets are synced.
 */
export const SAMPLE_CHRISTMAS_PARTICIPANTS: RaffleParticipant[] = [
  {
    id: 'default-1',
    name: 'Joebelle Dumapias',
    studentId: '2024305392',
    department: 'BS Information Technology',
    section: 'IT-3A',
    source: 'qr',
  },
  {
    id: 'default-2',
    name: 'Janine Reyes',
    studentId: '2024301104',
    department: 'BS Information Technology',
    section: 'IT-3A',
    source: 'qr',
  },
  {
    id: 'default-3',
    name: 'Zinoel Santos',
    studentId: '2024302218',
    department: 'BS Computer Science',
    section: 'CS-3A',
    source: 'qr',
  },
  {
    id: 'default-4',
    name: 'Angela Mendoza',
    studentId: '2024304491',
    department: 'BS Information Systems',
    section: 'IT-3B',
    source: 'sheets',
  },
  {
    id: 'default-5',
    name: 'Marco Villanueva',
    studentId: '2024305812',
    department: 'BS Computer Engineering',
    section: 'CS-3B',
    source: 'sheets',
  },
  {
    id: 'default-6',
    name: 'Sofia Cruz',
    studentId: '2024306190',
    department: 'BS Information Technology',
    section: 'IT-3A',
    source: 'sheets',
  },
];

/**
 * Fetch all saved attendance records from AsyncStorage.
 * Returns an empty array if nothing is stored yet.
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
 * Fetch attendance records for a specific student only.
 */
export async function getRecordsByStudentId(
  studentId: string
): Promise<AttendanceRecord[]> {
  const all = await getAllRecords();
  if (!studentId) return all;
  return all.filter((r) => r.studentId === studentId);
}

/**
 * Save a new attendance record to AsyncStorage.
 * Prepends it to the list so newest records appear first.
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
 * Update the entire attendance records list in AsyncStorage.
 */
export async function saveAllRecords(records: AttendanceRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/**
 * Delete all attendance records from AsyncStorage.
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
 * Helper: builds a formatted AttendanceRecord from raw input.
 */
export function createRecord(
  data: Omit<AttendanceRecord, 'id' | 'date' | 'time' | 'timestamp' | 'subject'> &
    Partial<Pick<AttendanceRecord, 'subject'>>
): AttendanceRecord {
  const now = new Date();
  const { subject = DEFAULT_SUBJECT, ...rest } = data;
  return {
    ...rest,
    subject,
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: now.getTime(),
    date: now.toISOString().split('T')[0], // "YYYY-MM-DD"
    time: now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };
}

/**
 * Compute attendance statistics from a list of records.
 */
export function computeStats(records: AttendanceRecord[]): AttendanceStats {
  const present = records.filter((r) => r.status === 'present').length;
  const late = records.filter((r) => r.status === 'late').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const total = records.length;

  const attended = present + late;
  const rate = total > 0 ? Math.round((attended / total) * 100) + '%' : '0%';

  return { present, late, absent, total, rate };
}

// ── Raffle Participant Pool & Winners Storage ───────────────

export async function getRafflePool(): Promise<RaffleParticipant[]> {
  try {
    const raw = await AsyncStorage.getItem(RAFFLE_POOL_KEY);
    if (!raw) {
      await AsyncStorage.setItem(
        RAFFLE_POOL_KEY,
        JSON.stringify(SAMPLE_CHRISTMAS_PARTICIPANTS)
      );
      return SAMPLE_CHRISTMAS_PARTICIPANTS;
    }
    return JSON.parse(raw) as RaffleParticipant[];
  } catch (error) {
    console.error('[AttendanceStorage] Failed to load raffle pool:', error);
    return SAMPLE_CHRISTMAS_PARTICIPANTS;
  }
}

export async function saveRafflePool(pool: RaffleParticipant[]): Promise<void> {
  await AsyncStorage.setItem(RAFFLE_POOL_KEY, JSON.stringify(pool));
}

export async function getRaffleWinners(): Promise<RaffleWinner[]> {
  try {
    const raw = await AsyncStorage.getItem(RAFFLE_WINNERS_KEY);
    return raw ? (JSON.parse(raw) as RaffleWinner[]) : [];
  } catch (error) {
    console.error('[AttendanceStorage] Failed to load raffle winners:', error);
    return [];
  }
}

export async function saveRaffleWinners(winners: RaffleWinner[]): Promise<void> {
  await AsyncStorage.setItem(RAFFLE_WINNERS_KEY, JSON.stringify(winners));
}
