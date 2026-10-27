// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Service: Local Organizer / Default Staff Profile Storage
// (Name & Department only — no login, no school fields)
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = '@work_staff_profile';

export interface StaffProfile {
  participantName: string;
  department: string;
  updatedAt: string;
}

export const DEFAULT_STAFF_PROFILE: StaffProfile = {
  participantName: 'Joebelle Dumapias',
  department: 'IT & Operations',
  updatedAt: '2026-10-27T00:00:00.000Z',
};

export async function getStaffProfile(): Promise<StaffProfile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_STAFF_PROFILE;
    return {
      ...DEFAULT_STAFF_PROFILE,
      ...(JSON.parse(raw) as Partial<StaffProfile>),
    };
  } catch (error) {
    console.error('[ProfileStorage] Failed to load profile:', error);
    return DEFAULT_STAFF_PROFILE;
  }
}

export async function saveStaffProfile(
  updates: Partial<Pick<StaffProfile, 'participantName' | 'department'>>
): Promise<StaffProfile> {
  const current = await getStaffProfile();
  const updated: StaffProfile = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
  return updated;
}
