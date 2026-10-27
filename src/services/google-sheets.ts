// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Service: Sign in with Google + Auto-Create & Auto-Sync Google Sheets (API v4)
// Features:
//   - Sign in with Google (OAuth 2.0) — Zero Google Apps Script required!
//   - Auto-creates "Christmas Party QR Check-In" spreadsheet in user's Drive
//   - Automatically appends every scanned QR (Name + Department) in real time
//   - Keeps 1-Tap Copy for Wheel of Names (wheelofnames.com) & TSV/CSV Export
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';

import {
  AttendanceRecord,
  ConnectedSpreadsheet,
  GoogleSheetsConfig,
  GoogleUserSession,
} from '@/types/attendance';

const SHEETS_CONFIG_KEY = '@google_sheets_config_v2';
const GOOGLE_SESSION_KEY = '@google_oauth_session_v1';
const CONNECTED_SHEET_KEY = '@google_connected_sheet_v1';
const CUSTOM_CLIENT_ID_KEY = '@google_custom_client_id_v1';

const ENV_WEBHOOK_URL = process.env.EXPO_PUBLIC_SHEET_WEBHOOK_URL || '';
const ENV_SHEET_URL = process.env.EXPO_PUBLIC_GOOGLE_SHEET_URL || '';

export const GOOGLE_SHEETS_SCOPES = [
  'openid',
  'profile',
  'email',
  // Non-sensitive narrow scope: creates & updates spreadsheets created by this app
  'https://www.googleapis.com/auth/drive.file',
];

export const DEFAULT_SHEETS_CONFIG: GoogleSheetsConfig = {
  sheetUrl: ENV_SHEET_URL,
  webhookUrl: ENV_WEBHOOK_URL,
  autoSync: true,
};

// ── OAuth Client ID Helpers ─────────────────────────────────

export async function getCustomGoogleClientId(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(CUSTOM_CLIENT_ID_KEY);
    return (
      saved?.trim() ||
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      ''
    );
  } catch {
    return (
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      ''
    );
  }
}

export async function saveCustomGoogleClientId(clientId: string): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_CLIENT_ID_KEY, clientId.trim());
}

// ── Google Session & Connected Sheet Storage ────────────────

export async function getGoogleSession(): Promise<GoogleUserSession | null> {
  try {
    const raw = await AsyncStorage.getItem(GOOGLE_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as GoogleUserSession;
    if (session.expiresAt && Date.now() > session.expiresAt) {
      await AsyncStorage.removeItem(GOOGLE_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function saveGoogleSession(
  session: GoogleUserSession
): Promise<void> {
  await AsyncStorage.setItem(GOOGLE_SESSION_KEY, JSON.stringify(session));
}

export async function clearGoogleSession(): Promise<void> {
  await AsyncStorage.multiRemove([GOOGLE_SESSION_KEY, CONNECTED_SHEET_KEY]);
}

export async function getConnectedSpreadsheet(): Promise<ConnectedSpreadsheet | null> {
  try {
    const raw = await AsyncStorage.getItem(CONNECTED_SHEET_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConnectedSpreadsheet;
  } catch {
    return null;
  }
}

export async function saveConnectedSpreadsheet(
  sheet: ConnectedSpreadsheet
): Promise<void> {
  await AsyncStorage.setItem(CONNECTED_SHEET_KEY, JSON.stringify(sheet));
  await saveSheetsConfig({ sheetUrl: sheet.spreadsheetUrl });
}

// ── Google OAuth User Profile & Sheets REST API v4 ──────────

/**
 * Fetches the signed-in user's Google profile (email, name, picture).
 */
export async function fetchGoogleUserProfile(
  accessToken: string
): Promise<GoogleUserSession> {
  const response = await fetch(
    'https://www.googleapis.com/oauth2/v3/userinfo',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to verify Google Account session.');
  }

  const data = (await response.json()) as {
    email?: string;
    name?: string;
    picture?: string;
  };

  const session: GoogleUserSession = {
    accessToken,
    email: data.email || 'Connected Google Account',
    name: data.name || 'Event Organizer',
    picture: data.picture,
    // Standard 1-hour OAuth access token lifetime
    expiresAt: Date.now() + 55 * 60 * 1000,
  };

  await saveGoogleSession(session);
  return session;
}

/**
 * Automatically creates a brand-new Google Sheet in the signed-in user's
 * Google Drive with a styled Christmas green header row:
 * [Participant Name | Department | Time Checked In | Date | Status]
 */
export async function createEventSpreadsheet(
  accessToken: string,
  customTitle?: string
): Promise<ConnectedSpreadsheet> {
  const today = new Date().toISOString().split('T')[0];
  const title = customTitle || `Christmas Party QR Check-In (${today})`;

  const body = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'CheckIns',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: [
                  'Participant Name',
                  'Department',
                  'Time Checked In',
                  'Date',
                  'Status',
                ].map((headerText) => ({
                  userEnteredValue: { stringValue: headerText },
                  userEnteredFormat: {
                    backgroundColor: {
                      red: 0.106,
                      green: 0.369,
                      blue: 0.125,
                    },
                    textFormat: {
                      bold: true,
                      foregroundColor: { red: 1, green: 1, blue: 1 },
                    },
                  },
                })),
              },
            ],
          },
        ],
      },
    ],
  };

  const response = await fetch(
    'https://sheets.googleapis.com/v4/spreadsheets',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Could not create Google Sheet (${response.status}): ${errText.slice(0, 120)}`
    );
  }

  const created = (await response.json()) as {
    spreadsheetId: string;
    spreadsheetUrl?: string;
    properties?: { title?: string };
  };

  const sheet: ConnectedSpreadsheet = {
    spreadsheetId: created.spreadsheetId,
    spreadsheetTitle: created.properties?.title || title,
    spreadsheetUrl:
      created.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}/edit`,
    createdAt: new Date().toISOString(),
  };

  await saveConnectedSpreadsheet(sheet);
  return sheet;
}

/**
 * Ensures the signed-in Google user has a ConnectedSpreadsheet,
 * creating one automatically if none exists yet.
 */
export async function ensureConnectedSpreadsheet(
  accessToken: string
): Promise<ConnectedSpreadsheet> {
  const existing = await getConnectedSpreadsheet();
  if (existing?.spreadsheetId) {
    return existing;
  }
  return createEventSpreadsheet(accessToken);
}

/**
 * Appends a single scanned participant row directly to the user's connected
 * Google Sheet via the official Google Sheets REST API v4 (zero Apps Script!).
 */
export async function appendRecordViaSheetsAPI(
  record: AttendanceRecord,
  sessionOverride?: GoogleUserSession
): Promise<boolean> {
  const session = sessionOverride || (await getGoogleSession());
  if (!session?.accessToken) {
    return false;
  }

  try {
    const sheet = await ensureConnectedSpreadsheet(session.accessToken);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      sheet.spreadsheetId
    )}/values/CheckIns!A:E:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [
          [
            record.participantName,
            record.department,
            record.time,
            record.date,
            'Checked In',
          ],
        ],
      }),
    });

    if (response.ok) {
      await saveSheetsConfig({ lastSyncedAt: new Date().toISOString() });
      return true;
    }
    return false;
  } catch (error) {
    console.warn('[GoogleSheets API] Failed to append row:', error);
    return false;
  }
}

/**
 * Syncs all local checked-in participants to the connected Google Sheet,
 * automatically avoiding duplicates already present in CheckIns!A2:B1000.
 */
export async function syncAllRecordsToGoogleSheet(
  records: AttendanceRecord[]
): Promise<{ syncedCount: number; sheet: ConnectedSpreadsheet }> {
  const session = await getGoogleSession();
  if (!session?.accessToken) {
    throw new Error('Please sign in with Google first.');
  }

  const sheet = await ensureConnectedSpreadsheet(session.accessToken);

  // Read existing rows so we don't insert duplicates
  const existingKeys = new Set<string>();
  try {
    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      sheet.spreadsheetId
    )}/values/CheckIns!A2:B1000`;
    const getRes = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    if (getRes.ok) {
      const data = (await getRes.json()) as { values?: string[][] };
      (data.values || []).forEach((row) => {
        const name = (row[0] || '').trim().toLowerCase();
        const dept = (row[1] || '').trim().toLowerCase();
        if (name) existingKeys.add(`${name}|${dept}`);
      });
    }
  } catch {
    // Proceed with append if sheet read fails
  }

  const rowsToAppend = records
    .filter((r) => {
      const key = `${r.participantName.trim().toLowerCase()}|${r.department
        .trim()
        .toLowerCase()}`;
      return !existingKeys.has(key);
    })
    .map((r) => [
      r.participantName,
      r.department,
      r.time,
      r.date,
      'Checked In',
    ]);

  if (rowsToAppend.length > 0) {
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      sheet.spreadsheetId
    )}/values/CheckIns!A:E:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const appendRes = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rowsToAppend }),
    });

    if (!appendRes.ok) {
      throw new Error('Failed to sync rows to Google Sheet.');
    }
  }

  await saveSheetsConfig({ lastSyncedAt: new Date().toISOString() });
  return { syncedCount: rowsToAppend.length, sheet };
}

// ── Config Storage & Automatic Check-In Router ──────────────

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
 * Automatically sends a scanned participant to Google Sheets:
 * 1. First uses the signed-in Google Account (Google Sheets API v4) if connected.
 * 2. Falls back to webhookUrl if configured in .env.
 */
export async function postCheckInToGoogleSheet(
  record: AttendanceRecord,
  configOverride?: GoogleSheetsConfig
): Promise<boolean> {
  // 1. Try direct Google OAuth Sheets API v4 first
  const syncedViaOAuth = await appendRecordViaSheetsAPI(record);
  if (syncedViaOAuth) {
    return true;
  }

  // 2. Fallback to optional webhook URL if set
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
