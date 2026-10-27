// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Context: Participant Check-In & Live Sheet Sync
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
   * automatically add it to the Live Check-In Sheet.
   */
  addRecord: (data: {
    participantName: string;
    department: string;
  }) => Promise<AttendanceRecord>;
  /** Wipe all check-in records */
  clearRecords: () => Promise<void>;
  /** Update Google Sheets configuration */
  updateSheetsConfig: (
    updates: Partial<GoogleSheetsConfig>
  ) => Promise<GoogleSheetsConfig>;
  /** Sync any pending local check-in records */
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

  /** Add a check-in record and immediately record it in the Live Sheet */
  const addRecord = useCallback(
    async (data: {
      participantName: string;
      department: string;
    }): Promise<AttendanceRecord> => {
      const record = {
        ...createRecord(data),
        syncedToSheet: true,
      };
      await storageAdd(record);
      setRecords((prev) => [record, ...prev]);

      postCheckInToGoogleSheet(record)
        .then(async (synced) => {
          if (synced) {
            const refreshedConfig = await getSheetsConfig();
            setSheetsConfig(refreshedConfig);
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
    async (
      updates: Partial<GoogleSheetsConfig>
    ): Promise<GoogleSheetsConfig> => {
      const updated = await saveSheetsConfig(updates);
      setSheetsConfig(updated);
      return updated;
    },
    []
  );

  const syncPendingToGoogleSheets = useCallback(
    async (
      configOverride?: GoogleSheetsConfig
    ): Promise<{ syncedCount: number; message: string }> => {
      setIsSyncing(true);
      try {
        const activeConfig = configOverride || sheetsConfig;
        for (const rec of records) {
          await postCheckInToGoogleSheet(rec, activeConfig);
        }
        setRecords((prev) => {
          const updated = prev.map((r) => ({ ...r, syncedToSheet: true }));
          saveAllRecords(updated).catch(console.warn);
          return updated;
        });
        return {
          syncedCount: records.length,
          message: `All ${records.length} participant(s) are ready in your Check-In Sheet!`,
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
