// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Service: User-Friendly Google Sheets & Wheel of Names Export
// Features:
//   - Zero-setup 1-Tap Copy for Wheel of Names (wheelofnames.com)
//   - Zero-setup 1-Tap Copy Table (TSV) & Share CSV for Google Sheets
//   - Optional silent background sync if organizer sets a Sheet URL
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';

import { AttendanceRecord, GoogleSheetsConfig } from '@/types/attendance';

const SHEETS_CONFIG_KEY = '@google_sheets_config_v2';

// Optional pre-configured webhook URL (if set by the developer in .env)
const ENV_WEBHOOK_URL = process.env.EXPO_PUBLIC_SHEET_WEBHOOK_URL || '';
const ENV_SHEET_URL = process.env.EXPO_PUBLIC_GOOGLE_SHEET_URL || '';

export const DEFAULT_SHEETS_CONFIG: GoogleSheetsConfig = {
  sheetUrl: ENV_SHEET_URL,
  webhookUrl: ENV_WEBHOOK_URL,
  autoSync: true,
};

// ── Storage Helpers ─────────────────────────────────────────

export async function getSheetsConfig(): Promise<GoogleSheetsConfig> {
  try {
    const raw = await AsyncStorage.getItem(SHEETS_CONFIG_KEY);
    if (!raw) return DEFAULT_SHEETS_CONFIG;
    const saved = JSON.parse(raw) as Partial<GoogleSheetsConfig>;
    return {
      ...DEFAULT_SHEETS_CONFIG,
      ...saved,
      webhookUrl: saved.webhookUrl || ENV_WEBHOOK_URL,
      sheetUrl: saved.sheetUrl || ENV_SHEET_URL,
    };
  } catch (error) {
    console.error('[GoogleSheets] Failed to load config:', error);
    return DEFAULT_SHEETS_CONFIG;
  }
}

export async function saveSheetsConfig(
  updates: Partial<GoogleSheetsConfig>
): Promise<GoogleSheetsConfig> {
  const current = await getSheetsConfig();
  const updated: GoogleSheetsConfig = { ...current, ...updates };
  await AsyncStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify(updated));
  return updated;
}

function isValidHttpsUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Silent background sync if a webhook URL is configured.
 * Normal users never have to set this up — 1-tap copy/share works automatically!
 */
export async function postCheckInToGoogleSheet(
  record: AttendanceRecord,
  configOverride?: GoogleSheetsConfig
): Promise<boolean> {
  const config = configOverride || (await getSheetsConfig());
  if (!config.webhookUrl || !isValidHttpsUrl(config.webhookUrl)) {
    return false;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(config.webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'checkin',
        id: record.id,
        participantName: record.participantName,
        department: record.department,
        date: record.date,
        time: record.time,
        status: 'Checked In',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      await saveSheetsConfig({ lastSyncedAt: new Date().toISOString() });
      return true;
    }
    return false;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

// ── User-Friendly 1-Tap Formatters & Clipboard Helpers ──────

/**
 * Formats checked-in participant names (one per line) ready to paste
 * directly into https://wheelofnames.com/
 */
export function formatForWheelOfNames(records: AttendanceRecord[]): string {
  return records
    .map((r) =>
      r.department
        ? `${r.participantName} - ${r.department}`
        : r.participantName
    )
    .join('\n');
}

/**
 * Formats records as Tab-Separated Values (TSV).
 * When pasted into Google Sheets or Excel (cell A1), it automatically
 * splits into separate columns (Participant Name | Department | Time | Date)!
 */
export function formatRecordsAsTSV(records: AttendanceRecord[]): string {
  const lines: string[] = [
    ['Participant Name', 'Department', 'Time Checked In', 'Date'].join('\t'),
  ];

  records.forEach((r) => {
    lines.push(
      [r.participantName, r.department, r.time, r.date]
        .map((val) => String(val || '').replace(/[\t\r\n]+/g, ' '))
        .join('\t')
    );
  });

  return lines.join('\n');
}

/**
 * Exports all checked-in participants as a standard CSV string.
 */
export function formatRecordsAsCSV(records: AttendanceRecord[]): string {
  const escapeCsv = (val: string) =>
    `"${String(val || '').replace(/"/g, '""')}"`;

  const lines: string[] = [
    'Participant Name,Department,Time Checked In,Date,Status',
  ];

  records.forEach((r) => {
    lines.push(
      [
        escapeCsv(r.participantName),
        escapeCsv(r.department),
        escapeCsv(r.time),
        escapeCsv(r.date),
        escapeCsv('Checked In'),
      ].join(',')
    );
  });

  return lines.join('\n');
}

/**
 * 1-Tap: Copies all participant names to clipboard for wheelofnames.com
 */
export async function copyNamesToClipboard(
  records: AttendanceRecord[]
): Promise<boolean> {
  const text = formatForWheelOfNames(records);
  if (!text) return false;
  await Clipboard.setStringAsync(text);
  return true;
}

/**
 * 1-Tap: Copies all rows in Google Sheets / Excel column format (TSV)
 */
export async function copyTableForSheets(
  records: AttendanceRecord[]
): Promise<boolean> {
  const text = formatRecordsAsTSV(records);
  if (!text) return false;
  await Clipboard.setStringAsync(text);
  return true;
}
