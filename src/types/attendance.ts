// ============================================================
// GROUP 5 – Smart QR Attendance & Christmas Raffle System
// Types: Attendance Record, Raffle Participant, Winner & Google Sheets
// ============================================================

export type AttendanceStatus = 'present' | 'late' | 'absent';

export interface AttendanceRecord {
  /** Unique ID — generated via Date.now().toString() */
  id: string;
  /** Participant / Student full name */
  studentName: string;
  /** Participant / Student ID number e.g. "2024305392" */
  studentId: string;
  /** Department / Course e.g. "BS Information Technology" */
  course: string;
  /** Group / Section e.g. "IT-3A" */
  section: string;
  /** Event / Subject — defaults to "Christmas Party 2026" */
  subject: string;
  /** Attendance status */
  status: AttendanceStatus;
  /** Unix timestamp (ms) — Date.now() */
  timestamp: number;
  /** Human-readable date string e.g. "2026-12-20" */
  date: string;
  /** Human-readable time string e.g. "06:30 PM" */
  time: string;
  /** Whether this record was synced to Google Sheets */
  syncedToSheet?: boolean;
}

/** Computed attendance stats derived from a list of records */
export interface AttendanceStats {
  present: number;
  late: number;
  absent: number;
  total: number;
  /** Attendance rate as a percentage string e.g. "90%" */
  rate: string;
}

/** Participant entry in the Christmas Raffle Roulette Wheel */
export interface RaffleParticipant {
  id: string;
  name: string;
  studentId: string;
  department: string;
  section: string;
  source: 'qr' | 'sheets' | 'manual';
  checkedInAt?: string;
}

/** Winner drawn from the Christmas Raffle Roulette Wheel */
export interface RaffleWinner {
  id: string;
  participantId: string;
  name: string;
  studentId: string;
  department: string;
  section: string;
  prize: string;
  wonAt: string;
  date: string;
  syncedToSheet?: boolean;
}

/** Hybrid Google Sheets Connection Configuration */
export interface GoogleSheetsConfig {
  /** Public Google Sheet sharing URL or Spreadsheet ID (for instant CSV/JSON import) */
  sheetUrl: string;
  /** Google Apps Script Web App URL (for live 2-way POST check-in & winners + GET roster) */
  webhookUrl: string;
  /** Automatically sync QR check-ins and raffle winners to Google Sheets */
  autoSync: boolean;
  /** ISO timestamp of the last successful Google Sheets sync */
  lastSyncedAt?: string;
}
