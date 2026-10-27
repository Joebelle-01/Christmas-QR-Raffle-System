// ============================================================
// GROUP 5 – Smart QR Attendance & Christmas Raffle System
// Service: Hybrid Google Sheets Integration
// Supports:
//   1. Direct Public Google Sheet Link (gviz CSV fetch)
//   2. Google Apps Script Web App URL (2-way POST check-in/winner & GET roster)
//   3. Offline-first fallback & 1-click CSV export
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  AttendanceRecord,
  GoogleSheetsConfig,
  RaffleParticipant,
  RaffleWinner,
} from '@/types/attendance';

const SHEETS_CONFIG_KEY = '@google_sheets_config';

export const DEFAULT_SHEETS_CONFIG: GoogleSheetsConfig = {
  sheetUrl: '',
  webhookUrl: '',
  autoSync: true,
};

/**
 * Ready-to-copy Google Apps Script for 2-way Google Sheets integration.
 * Users can paste this into Extensions -> Apps Script -> Deploy as Web App.
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// Christmas Party QR Check-In & Raffle Sync (Google Apps Script)
// 1. In your Google Sheet: Extensions -> Apps Script
// 2. Paste this code -> Click Deploy -> New deployment -> Web app
// 3. Set "Who has access" to "Anyone" -> Copy Web App URL into the App!

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('CheckIns') || ss.getSheets()[0];
  var rows = sheet.getDataRange().getValues();
  var participants = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!row[0] && !row[1]) continue;
    participants.push({
      studentId: String(row[1] || ('GUEST-' + i)),
      name: String(row[2] || row[0] || ('Participant ' + i)),
      department: String(row[3] || 'Christmas Party'),
      section: String(row[4] || 'VIP'),
      checkedInAt: String(row[0] || '')
    });
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true, participants: participants }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var body = JSON.parse(e.postData.contents || '{}');
  if (body.action === 'winner') {
    var winSheet = ss.getSheetByName('RaffleWinners') || ss.insertSheet('RaffleWinners');
    if (winSheet.getLastRow() === 0) {
      winSheet.appendRow(['Timestamp', 'Participant ID', 'Winner Name', 'Department', 'Section', 'Prize']);
    }
    winSheet.appendRow([body.wonAt || new Date().toISOString(), body.studentId, body.name, body.department, body.section, body.prize]);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  }
  var attSheet = ss.getSheetByName('CheckIns') || ss.insertSheet('CheckIns');
  if (attSheet.getLastRow() === 0) {
    attSheet.appendRow(['Timestamp', 'Participant ID', 'Full Name', 'Department/Course', 'Group/Section', 'Event', 'Status']);
  }
  attSheet.appendRow([body.date + ' ' + body.time, body.studentId, body.studentName, body.course, body.section, body.subject, body.status]);
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}`;

// ── Storage Helpers ─────────────────────────────────────────

export async function getSheetsConfig(): Promise<GoogleSheetsConfig> {
  try {
    const raw = await AsyncStorage.getItem(SHEETS_CONFIG_KEY);
    if (!raw) return DEFAULT_SHEETS_CONFIG;
    return { ...DEFAULT_SHEETS_CONFIG, ...(JSON.parse(raw) as Partial<GoogleSheetsConfig>) };
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

// ── URL & Security Validation ───────────────────────────────

function isValidHttpsUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extracts the Spreadsheet ID from a Google Sheets URL or returns the raw ID if valid.
 */
export function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Match /spreadsheets/d/<ID>
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // If the user pasted just the raw alphanumeric Spreadsheet ID (usually 25-60 chars)
  if (/^[a-zA-Z0-9-_]{20,80}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

// ── CSV Parser for Direct Google Sheet Import ───────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseParticipantsFromCsv(csvText: string): RaffleParticipant[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const firstRow = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const hasHeader = firstRow.some(
    (col) =>
      col.includes('name') ||
      col.includes('student') ||
      col.includes('participant') ||
      col.includes('id') ||
      col.includes('course') ||
      col.includes('department')
  );

  // Detect column indices dynamically
  let nameIdx = firstRow.findIndex(
    (c) => c.includes('name') || c.includes('participant') || c.includes('guest')
  );
  let idIdx = firstRow.findIndex((c) => c === 'id' || c.includes('student id') || c.includes('id #') || c.includes('code'));
  let deptIdx = firstRow.findIndex(
    (c) => c.includes('course') || c.includes('department') || c.includes('dept')
  );
  let secIdx = firstRow.findIndex(
    (c) => c.includes('section') || c.includes('group') || c.includes('table')
  );

  // Default fallback if simple 1-column or standard layout
  if (nameIdx === -1) {
    nameIdx = firstRow.length >= 3 ? 2 : 0;
  }
  if (idIdx === -1) {
    idIdx = nameIdx === 0 && firstRow.length > 1 ? 1 : 0;
  }
  if (deptIdx === -1) deptIdx = 3;
  if (secIdx === -1) secIdx = 4;

  const startIndex = hasHeader ? 1 : 0;
  const participants: RaffleParticipant[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const rawName = cols[nameIdx] || cols[0] || '';
    const cleanName = rawName.trim();
    if (!cleanName || cleanName.toLowerCase() === 'name') continue;

    const studentId =
      (idIdx !== nameIdx && cols[idIdx] ? cols[idIdx].trim() : '') ||
      `SHEET-${1000 + i}`;
    const department = cols[deptIdx]?.trim() || 'Christmas Party Guest';
    const section = cols[secIdx]?.trim() || 'General';

    participants.push({
      id: `sheet-${studentId}-${cleanName.toLowerCase().replace(/\s+/g, '-')}`,
      name: cleanName,
      studentId,
      department,
      section,
      source: 'sheets',
    });
  }

  return participants;
}

// ── Public Sync API ─────────────────────────────────────────

export interface SyncResult {
  success: boolean;
  participants: RaffleParticipant[];
  message: string;
}

/**
 * Fetch participant names from Google Sheets (supports both Apps Script Webhook URL
 * and standard public Google Sheets URL via gviz CSV feed).
 */
export async function fetchParticipantsFromGoogleSheet(
  configOverride?: GoogleSheetsConfig
): Promise<SyncResult> {
  const config = configOverride || (await getSheetsConfig());
  const collected: RaffleParticipant[] = [];

  try {
    // 1. Try Apps Script Webhook URL first if provided
    if (config.webhookUrl && isValidHttpsUrl(config.webhookUrl)) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const sep = config.webhookUrl.includes('?') ? '&' : '?';
        const response = await fetch(`${config.webhookUrl.trim()}${sep}action=participants`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const text = await response.text();
          try {
            const json = JSON.parse(text);
            const list = Array.isArray(json) ? json : json.participants || json.data || [];
            if (Array.isArray(list)) {
              list.forEach((item: Record<string, unknown>, idx: number) => {
                const name = String(
                  item.name || item.studentName || item.fullName || item.participant || ''
                ).trim();
                if (!name) return;
                const studentId = String(item.studentId || item.id || `GS-${100 + idx}`).trim();
                collected.push({
                  id: `gs-${studentId}-${name.toLowerCase().replace(/\s+/g, '-')}`,
                  name,
                  studentId,
                  department: String(item.department || item.course || 'Christmas Party').trim(),
                  section: String(item.section || item.group || 'VIP').trim(),
                  source: 'sheets',
                  checkedInAt: item.checkedInAt ? String(item.checkedInAt) : undefined,
                });
              });
            }
          } catch {
            // If webhook returned CSV instead of JSON, parse as CSV
            collected.push(...parseParticipantsFromCsv(text));
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn('[GoogleSheets] Webhook fetch warning:', err);
      }
    }

    // 2. Also try Public Google Sheet URL (gviz CSV export) if provided
    if (config.sheetUrl) {
      const sheetId = extractSpreadsheetId(config.sheetUrl);
      if (sheetId) {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
          const response = await fetch(csvUrl, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (response.ok) {
            const csvText = await response.text();
            const parsed = parseParticipantsFromCsv(csvText);
            parsed.forEach((p) => {
              const exists = collected.some(
                (existing) => existing.name.toLowerCase() === p.name.toLowerCase()
              );
              if (!exists) {
                collected.push(p);
              }
            });
          } else {
            return {
              success: false,
              participants: collected,
              message:
                'Could not read Google Sheet. Make sure sharing is set to "Anyone with the link can view".',
            };
          }
        } catch {
          clearTimeout(timeoutId);
          return {
            success: collected.length > 0,
            participants: collected,
            message:
              collected.length > 0
                ? `Synced ${collected.length} participants from Webhook.`
                : 'Network error reaching Google Sheets. Using offline cache.',
          };
        }
      } else if (!config.webhookUrl) {
        return {
          success: false,
          participants: [],
          message: 'Invalid Google Sheet URL. Paste a valid docs.google.com/spreadsheets/d/... link.',
        };
      }
    }

    if (!config.sheetUrl && !config.webhookUrl) {
      return {
        success: false,
        participants: [],
        message: 'No Google Sheet URL or Webhook configured yet. Add one in Google Sheets Settings.',
      };
    }

    await saveSheetsConfig({ lastSyncedAt: new Date().toISOString() });

    return {
      success: true,
      participants: collected,
      message:
        collected.length > 0
          ? `Successfully loaded ${collected.length} participant${collected.length === 1 ? '' : 's'} from Google Sheets!`
          : 'Connected to Google Sheets (0 rows found in sheet).',
    };
  } catch (error) {
    console.error('[GoogleSheets] Sync error:', error);
    return {
      success: false,
      participants: collected,
      message: 'Failed to sync with Google Sheets. Offline records are still active.',
    };
  }
}

/**
 * Send a newly scanned QR check-in record to the Google Apps Script Web App URL.
 */
export async function postCheckInToGoogleSheet(
  record: AttendanceRecord
): Promise<boolean> {
  const config = await getSheetsConfig();
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
        ...record,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('[GoogleSheets] Failed to post check-in (saved offline):', error);
    return false;
  }
}

/**
 * Send a Raffle Roulette Winner to the Google Apps Script Web App URL.
 */
export async function postWinnerToGoogleSheet(
  winner: RaffleWinner
): Promise<boolean> {
  const config = await getSheetsConfig();
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
        action: 'winner',
        ...winner,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('[GoogleSheets] Failed to post winner (saved offline):', error);
    return false;
  }
}

/**
 * Exports all check-ins and raffle winners as a clean CSV string for Google Sheets.
 */
export function formatRecordsAsCSV(
  records: AttendanceRecord[],
  winners: RaffleWinner[]
): string {
  const escapeCsv = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`;

  const lines: string[] = [
    'Date,Time,Participant ID,Full Name,Department/Course,Group/Section,Event,Status,Synced To Sheet',
  ];

  records.forEach((r) => {
    lines.push(
      [
        escapeCsv(r.date),
        escapeCsv(r.time),
        escapeCsv(r.studentId),
        escapeCsv(r.studentName),
        escapeCsv(r.course),
        escapeCsv(r.section),
        escapeCsv(r.subject),
        escapeCsv(r.status),
        escapeCsv(r.syncedToSheet ? 'Yes' : 'Local'),
      ].join(',')
    );
  });

  if (winners.length > 0) {
    lines.push('');
    lines.push('--- CHRISTMAS RAFFLE WINNERS ---');
    lines.push('Date,Time Won,Participant ID,Winner Name,Department,Section,Prize');
    winners.forEach((w) => {
      lines.push(
        [
          escapeCsv(w.date),
          escapeCsv(w.wonAt),
          escapeCsv(w.studentId),
          escapeCsv(w.name),
          escapeCsv(w.department),
          escapeCsv(w.section),
          escapeCsv(w.prize),
        ].join(',')
      );
    });
  }

  return lines.join('\n');
}
