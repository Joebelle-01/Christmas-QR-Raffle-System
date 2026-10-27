// ============================================================
// GROUP 5 – Smart QR Attendance & Christmas Raffle System
// Context: Attendance, Raffle Roulette & Google Sheets State
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
  getRafflePool,
  getRaffleWinners,
  SAMPLE_CHRISTMAS_PARTICIPANTS,
  saveAllRecords,
  saveRafflePool,
  saveRaffleWinners,
} from '@/services/attendance-storage';
import {
  DEFAULT_SHEETS_CONFIG,
  fetchParticipantsFromGoogleSheet,
  getSheetsConfig,
  postCheckInToGoogleSheet,
  postWinnerToGoogleSheet,
  saveSheetsConfig,
  SyncResult,
} from '@/services/google-sheets';
import {
  AttendanceRecord,
  AttendanceStats,
  GoogleSheetsConfig,
  RaffleParticipant,
  RaffleWinner,
} from '@/types/attendance';

// ── Context value shape ─────────────────────────────────────
interface AttendanceContextValue {
  /** All check-in records (newest first) */
  records: AttendanceRecord[];
  /** Computed stats: present, late, absent, total, rate */
  stats: AttendanceStats;
  /** Active participants eligible on the Christmas Raffle Roulette Wheel */
  rafflePool: RaffleParticipant[];
  /** List of winners drawn from the Roulette Wheel */
  winners: RaffleWinner[];
  /** Current Google Sheets connection settings */
  sheetsConfig: GoogleSheetsConfig;
  /** True while loading initial data from AsyncStorage */
  isLoading: boolean;
  /** True while syncing with Google Sheets */
  isSyncing: boolean;
  /**
   * Add a new attendance record, automatically enter participant into
   * the Raffle Roulette pool, and sync to Google Sheets if configured.
   */
  addRecord: (
    data: Omit<AttendanceRecord, 'id' | 'date' | 'time' | 'timestamp' | 'subject'> &
      Partial<Pick<AttendanceRecord, 'subject'>>
  ) => Promise<AttendanceRecord>;
  /** Wipe all attendance records */
  clearRecords: () => Promise<void>;
  /** Kept for backwards compatibility — loads all check-in records */
  loadRecordsForStudent: (studentId?: string) => Promise<void>;
  /** Update Google Sheets URL / Webhook configuration */
  updateSheetsConfig: (
    updates: Partial<GoogleSheetsConfig>
  ) => Promise<GoogleSheetsConfig>;
  /** Pull participant names from Google Sheets and merge into Raffle Pool */
  syncWithGoogleSheets: (configOverride?: GoogleSheetsConfig) => Promise<SyncResult>;
  /** Add a participant manually to the Raffle Roulette Wheel */
  addManualParticipant: (participant: {
    name: string;
    studentId?: string;
    department?: string;
    section?: string;
  }) => Promise<void>;
  /** Remove a specific participant from the Raffle Roulette Wheel */
  removeParticipantFromPool: (participantId: string) => Promise<void>;
  /** Record a Raffle Winner, sync to Google Sheets, and optionally remove from wheel */
  recordRaffleWinner: (
    participant: RaffleParticipant,
    prize: string,
    removeFromWheel: boolean
  ) => Promise<RaffleWinner>;
  /** Restore checked-in & default participants to the Raffle Wheel */
  resetRafflePool: () => Promise<void>;
  /** Clear Raffle Winners history */
  clearWinners: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextValue | null>(null);

export function AttendanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [rafflePool, setRafflePool] = useState<RaffleParticipant[]>([]);
  const [winners, setWinners] = useState<RaffleWinner[]>([]);
  const [sheetsConfig, setSheetsConfig] =
    useState<GoogleSheetsConfig>(DEFAULT_SHEETS_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const stats = computeStats(records);

  // Load initial state on mount
  useEffect(() => {
    Promise.all([
      getAllRecords(),
      getRafflePool(),
      getRaffleWinners(),
      getSheetsConfig(),
    ])
      .then(([loadedRecords, loadedPool, loadedWinners, loadedConfig]) => {
        setRecords(loadedRecords);
        setRafflePool(loadedPool);
        setWinners(loadedWinners);
        setSheetsConfig(loadedConfig);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const loadRecordsForStudent = useCallback(async (_studentId?: string) => {
    setIsLoading(true);
    const all = await getAllRecords();
    setRecords(all);
    setIsLoading(false);
  }, []);

  /** Add a check-in record, add participant to Raffle Pool, and sync to Google Sheets */
  const addRecord = useCallback(
    async (
      data: Omit<AttendanceRecord, 'id' | 'date' | 'time' | 'timestamp' | 'subject'> &
        Partial<Pick<AttendanceRecord, 'subject'>>
    ): Promise<AttendanceRecord> => {
      const record = createRecord(data);
      await storageAdd(record);
      setRecords((prev) => [record, ...prev]);

      // Automatically add checked-in guest to the Raffle Roulette Pool if not already present
      const cleanName = record.studentName.trim();
      if (cleanName) {
        setRafflePool((prevPool) => {
          const alreadyExists = prevPool.some(
            (p) =>
              p.name.toLowerCase() === cleanName.toLowerCase() ||
              (record.studentId &&
                p.studentId.toLowerCase() === record.studentId.trim().toLowerCase())
          );
          if (alreadyExists) return prevPool;

          const newParticipant: RaffleParticipant = {
            id: `qr-${record.id}`,
            name: cleanName,
            studentId: record.studentId,
            department: record.course,
            section: record.section,
            source: 'qr',
            checkedInAt: `${record.date} ${record.time}`,
          };
          const updatedPool = [newParticipant, ...prevPool];
          saveRafflePool(updatedPool).catch(console.warn);
          return updatedPool;
        });
      }

      // Sync to Google Sheets in background if webhook is configured
      postCheckInToGoogleSheet(record)
        .then((synced) => {
          if (synced) {
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

  const syncWithGoogleSheets = useCallback(
    async (configOverride?: GoogleSheetsConfig): Promise<SyncResult> => {
      setIsSyncing(true);
      try {
        const result = await fetchParticipantsFromGoogleSheet(configOverride);
        const refreshedConfig = await getSheetsConfig();
        setSheetsConfig(refreshedConfig);

        if (result.participants.length > 0) {
          setRafflePool((prevPool) => {
            const merged = [...prevPool];
            result.participants.forEach((incoming) => {
              const existsInPool = merged.some(
                (p) => p.name.toLowerCase() === incoming.name.toLowerCase()
              );
              const alreadyWon = winners.some(
                (w) => w.name.toLowerCase() === incoming.name.toLowerCase()
              );
              if (!existsInPool && !alreadyWon) {
                merged.push(incoming);
              }
            });
            saveRafflePool(merged).catch(console.warn);
            return merged;
          });
        }
        return result;
      } finally {
        setIsSyncing(false);
      }
    },
    [winners]
  );

  const addManualParticipant = useCallback(
    async (participant: {
      name: string;
      studentId?: string;
      department?: string;
      section?: string;
    }) => {
      const cleanName = participant.name.trim();
      if (!cleanName) return;

      const newEntry: RaffleParticipant = {
        id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: cleanName,
        studentId: participant.studentId?.trim() || `GUEST-${Math.floor(1000 + Math.random() * 9000)}`,
        department: participant.department?.trim() || 'Christmas Party Guest',
        section: participant.section?.trim() || 'VIP',
        source: 'manual',
      };

      setRafflePool((prev) => {
        const updated = [newEntry, ...prev];
        saveRafflePool(updated).catch(console.warn);
        return updated;
      });
    },
    []
  );

  const removeParticipantFromPool = useCallback(async (participantId: string) => {
    setRafflePool((prev) => {
      const updated = prev.filter((p) => p.id !== participantId);
      saveRafflePool(updated).catch(console.warn);
      return updated;
    });
  }, []);

  const recordRaffleWinner = useCallback(
    async (
      participant: RaffleParticipant,
      prize: string,
      removeFromWheel: boolean
    ): Promise<RaffleWinner> => {
      const now = new Date();
      const winner: RaffleWinner = {
        id: `win-${now.getTime()}`,
        participantId: participant.id,
        name: participant.name,
        studentId: participant.studentId,
        department: participant.department,
        section: participant.section,
        prize: prize.trim() || 'Christmas Raffle Prize',
        wonAt: now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        date: now.toISOString().split('T')[0],
        syncedToSheet: false,
      };

      setWinners((prev) => {
        const updated = [winner, ...prev];
        saveRaffleWinners(updated).catch(console.warn);
        return updated;
      });

      if (removeFromWheel) {
        setRafflePool((prev) => {
          const updated = prev.filter((p) => p.id !== participant.id);
          saveRafflePool(updated).catch(console.warn);
          return updated;
        });
      }

      // Sync winner to Google Sheets in background
      postWinnerToGoogleSheet(winner)
        .then((synced) => {
          if (synced) {
            setWinners((prev) => {
              const updated = prev.map((w) =>
                w.id === winner.id ? { ...w, syncedToSheet: true } : w
              );
              saveRaffleWinners(updated).catch(console.warn);
              return updated;
            });
          }
        })
        .catch(console.warn);

      return winner;
    },
    []
  );

  const resetRafflePool = useCallback(async () => {
    // Rebuild pool from checked-in records + default sample participants
    const fromRecords: RaffleParticipant[] = records.map((r) => ({
      id: `qr-${r.id}`,
      name: r.studentName,
      studentId: r.studentId,
      department: r.course,
      section: r.section,
      source: 'qr',
      checkedInAt: `${r.date} ${r.time}`,
    }));

    const merged: RaffleParticipant[] = [...fromRecords];
    SAMPLE_CHRISTMAS_PARTICIPANTS.forEach((sample) => {
      if (!merged.some((m) => m.name.toLowerCase() === sample.name.toLowerCase())) {
        merged.push(sample);
      }
    });

    await saveRafflePool(merged);
    setRafflePool(merged);
  }, [records]);

  const clearWinners = useCallback(async () => {
    await saveRaffleWinners([]);
    setWinners([]);
  }, []);

  return (
    <AttendanceContext.Provider
      value={{
        records,
        stats,
        rafflePool,
        winners,
        sheetsConfig,
        isLoading,
        isSyncing,
        addRecord,
        clearRecords,
        loadRecordsForStudent,
        updateSheetsConfig,
        syncWithGoogleSheets,
        addManualParticipant,
        removeParticipantFromPool,
        recordRaffleWinner,
        resetRafflePool,
        clearWinners,
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
