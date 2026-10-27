// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Context: Participant Check-In & Google Sheets Live Sync
// ============================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  addRecord as storageAdd,
  clearAllRecords,
  computeStats,
  createRecord,
  getAllRecords,
  saveAllRecords,
} from '@/services/attendance-storage';
import {
  DEFAULT_SHEETS_CONFIG,
  getSheetsConfig,
  postCheckInToGoogleSheet,
  saveSheetsConfig,
} from '@/services/google-sheets';
import {
  AttendanceRecord,
  AttendanceStats,
  GoogleSheetsConfig,
} from '@/types/attendance';

interface AttendanceContextValue {
  /** All checked-in participants (newest first) */
  records: AttendanceRecord[];
  /** Computed stats: checkedIn, synced, departments */
  stats: AttendanceStats;
  /** Current Google Sheets connection settings */
  sheetsConfig: GoogleSheetsConfig;
  /** True while loading initial data from AsyncStorage */
  isLoading: boolean;
  /** True while pushing records to Google Sheets */
  isSyncing: boolean;
  /**
   * Add a new participant check-in (Name & Department) and
   * automatically send it to Google Sheets.
   */
  addRecord: (data: {
    participantName: string;
    department: string;
  }) => Promise<AttendanceRecord>;
  /** Wipe all check-in records */
  clearRecords: () => Promise<void>;
  /** Update Google Sheets Webhook / Sheet URL configuration */
  updateSheetsConfig: (
    updates: Partial<GoogleSheetsConfig>
  ) => Promise<GoogleSheetsConfig>;
  /** Push any unsynced local check-in records to Google Sheets */
  syncPendingToGoogleSheets: (
    configOverride?: GoogleSheetsConfig
  ) => Promise<{ syncedCount: number; message: string }>;
}

const AttendanceContext = createContext<AttendanceContextValue | null>(null);

export function AttendanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [sheetsConfig, setSheetsConfig] =
    useState<GoogleSheetsConfig>(DEFAULT_SHEETS_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const stats = computeStats(records);

  useEffect(() => {
    Promise.all([getAllRecords(), getSheetsConfig()])
      .then(([loadedRecords, loadedConfig]) => {
        setRecords(loadedRecords);
        setSheetsConfig(loadedConfig);
      })
      .finally(() => setIsLoading(false));
  }, []);

  /** Add a check-in record and immediately send Name & Department to Google Sheets */
  const addRecord = useCallback(
    async (data: {
      participantName: string;
      department: string;
    }): Promise<AttendanceRecord> => {
      const record = createRecord(data);
      await storageAdd(record);
      setRecords((prev) => [record, ...prev]);

      // Send to Google Sheets immediately in background
      postCheckInToGoogleSheet(record)
        .then(async (synced) => {
          if (synced) {
            const refreshedConfig = await getSheetsConfig();
            setSheetsConfig(refreshedConfig);
            setRecords((prev) => {
              const updated = prev.map((r) =>
                r.id === record.id ? { ...r, syncedToSheet: true } : r
              );
              saveAllRecords(updated).catch(console.warn);
              return updated;
            });
          }
        })
        .catch(console.warn);

      return record;
    },
    []
  );

  const clearRecords = useCallback(async () => {
    await clearAllRecords();
    setRecords([]);
  }, []);

  const updateSheetsConfig = useCallback(
    async (updates: Partial<GoogleSheetsConfig>): Promise<GoogleSheetsConfig> => {
      const updated = await saveSheetsConfig(updates);
      setSheetsConfig(updated);
      return updated;
    },
    []
  );

  /** Push any unsynced check-ins to Google Sheets */
  const syncPendingToGoogleSheets = useCallback(
    async (
      configOverride?: GoogleSheetsConfig
    ): Promise<{ syncedCount: number; message: string }> => {
      const activeConfig = configOverride || sheetsConfig;
      if (!activeConfig.webhookUrl.trim()) {
        return {
          syncedCount: 0,
          message:
            'Please paste your Google Apps Script Web App URL to sync participant names automatically to Google Sheets.',
        };
      }

      setIsSyncing(true);
      try {
        const unsynced = records.filter((r) => !r.syncedToSheet);
        if (unsynced.length === 0) {
          return {
            syncedCount: 0,
            message: `All ${records.length} checked-in participants are already synced to Google Sheets!`,
          };
        }

        let successCount = 0;
        const syncedIds = new Set<string>();

        for (const rec of unsynced) {
          const ok = await postCheckInToGoogleSheet(rec, activeConfig);
          if (ok) {
            successCount++;
            syncedIds.add(rec.id);
          }
        }

        if (syncedIds.size > 0) {
          const refreshedConfig = await getSheetsConfig();
          setSheetsConfig(refreshedConfig);
          setRecords((prev) => {
            const updated = prev.map((r) =>
              syncedIds.has(r.id) ? { ...r, syncedToSheet: true } : r
            );
            saveAllRecords(updated).catch(console.warn);
            return updated;
          });
        }

        return {
          syncedCount: successCount,
          message:
            successCount > 0
              ? `Synced ${successCount} participant${successCount === 1 ? '' : 's'} to Google Sheets!`
              : 'Could not reach Google Sheets Web App URL. Check your URL and internet connection.',
        };
      } finally {
        setIsSyncing(false);
      }
    },
    [records, sheetsConfig]
  );

  return (
    <AttendanceContext.Provider
      value={{
        records,
        stats,
        sheetsConfig,
        isLoading,
        isSyncing,
        addRecord,
        clearRecords,
        updateSheetsConfig,
        syncPendingToGoogleSheets,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance(): AttendanceContextValue {
  const ctx = useContext(AttendanceContext);
  if (!ctx) {
    throw new Error('useAttendance must be used inside <AttendanceProvider>');
  }
  return ctx;
}
