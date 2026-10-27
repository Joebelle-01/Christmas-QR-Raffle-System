// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Service: Google Sheets Live Check-In Sync
// Every scanned QR code appends [Timestamp, Name, Department, Status]
// to Google Sheets so you can load the sheet directly in wheelofnames.com
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

import { AttendanceRecord, GoogleSheetsConfig } from '@/types/attendance';

const SHEETS_CONFIG_KEY = '@google_sheets_config_v2';

export const DEFAULT_SHEETS_CONFIG: GoogleSheetsConfig = {
  sheetUrl: '',
  webhookUrl: '',
  autoSync: true,
};

/**
 * Ready-to-copy Google Apps Script for automatic Google Sheets check-in logging.
 * Paste into Extensions -> Apps Script -> Deploy as Web App ("Anyone").
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// Work Christmas Party QR Check-In -> Google Sheets
// 1. In your Google Sheet: Extensions -> Apps Script
// 2. Paste this code -> Click Deploy -> New deployment -> Web app
// 3. Set "Who has access" to "Anyone" -> Copy Web App URL into the App!

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Participants') || ss.getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Participant Name', 'Department', 'Status']);
  }
  var body = JSON.parse(e.postData.contents || '{}');
  var name = String(body.participantName || '').trim();
  var department = String(body.department || 'General').trim();
  var timestamp = (body.date && body.time) ? (body.date + ' ' + body.time) : new Date().toLocaleString();

  // Prevent duplicate entries in the sheet for the same Name + Department
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (
      String(data[i][1]).toLowerCase() === name.toLowerCase() &&
      String(data[i][2]).toLowerCase() === department.toLowerCase()
    ) {
      return ContentService.createTextOutput(JSON.stringify({ ok: true, duplicate: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  sheet.appendRow([timestamp, name, department, 'Checked In']);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

// ── Storage Helpers ─────────────────────────────────────────

export async function getSheetsConfig(): Promise<GoogleSheetsConfig> {
  try {
    const raw = await AsyncStorage.getItem(SHEETS_CONFIG_KEY);
    if (!raw) return DEFAULT_SHEETS_CONFIG;
    return {
      ...DEFAULT_SHEETS_CONFIG,
      ...(JSON.parse(raw) as Partial<GoogleSheetsConfig>),
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

// ── URL Validation ──────────────────────────────────────────

function isValidHttpsUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// ── Live Check-In POST to Google Sheets ─────────────────────

/**
 * Sends a scanned participant's Name & Department to the Google Apps Script Web App URL.
 * Appends a row in Google Sheets immediately after QR scan.
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
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('[GoogleSheets] Failed to post check-in (saved locally):', error);
    return false;
  }
}

/**
 * Exports all checked-in participants as a clean CSV string for Google Sheets.
 */
export function formatRecordsAsCSV(records: AttendanceRecord[]): string {
  const escapeCsv = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`;

  const lines: string[] = [
    'Date,Time,Participant Name,Department,Status,Synced To Google Sheet',
  ];

  records.forEach((r) => {
    lines.push(
      [
        escapeCsv(r.date),
        escapeCsv(r.time),
        escapeCsv(r.participantName),
        escapeCsv(r.department),
        escapeCsv('Checked In'),
        escapeCsv(r.syncedToSheet ? 'Yes' : 'Local'),
      ].join(',')
    );
  });

  return lines.join('\n');
}

/**
 * Formats checked-in participant names (one per line) so they can also be
 * pasted directly into https://wheelofnames.com/ at any time.
 */
export function formatForWheelOfNames(records: AttendanceRecord[]): string {
  return records
    .map((r) =>
      r.department
        ? `${r.participantName} (${r.department})`
        : r.participantName
    )
    .join('\n');
}
