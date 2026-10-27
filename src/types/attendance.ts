// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Types: Participant Check-In Record & Google Sheets Sync
// ============================================================

export type AttendanceStatus = 'present' | 'invalid';

export interface AttendanceRecord {
  /** Unique ID — generated via Date.now().toString() */
  id: string;
  /** Employee / Participant full name */
  participantName: string;
  /** Work Department e.g. "Engineering", "HR", "Finance", "Operations" */
  department: string;
  /** Check-in status ('present' for all valid check-ins) */
  status: 'present';
  /** Unix timestamp (ms) — Date.now() */
  timestamp: number;
  /** Human-readable date string e.g. "2026-12-20" */
  date: string;
  /** Human-readable time string e.g. "06:30 PM" */
  time: string;
  /** Whether this participant was synced to Google Sheets */
  syncedToSheet?: boolean;
}

/** Computed check-in stats derived from the list of records */
export interface AttendanceStats {
  /** Total participants checked in */
  checkedIn: number;
  /** Total records confirmed synced to Google Sheets */
  synced: number;
  /** Number of unique departments represented */
  departments: number;
}

/** Google Sheets Connection Configuration */
export interface GoogleSheetsConfig {
  /** Optional Google Sheet link (to open or view the live sheet) */
  sheetUrl: string;
  /** Google Apps Script Web App URL (receives POST on every QR scan to append Name & Department) */
  webhookUrl: string;
  /** Automatically send every scanned participant to Google Sheets */
  autoSync: boolean;
  /** ISO timestamp of the last successful Google Sheets sync */
  lastSyncedAt?: string;
}
