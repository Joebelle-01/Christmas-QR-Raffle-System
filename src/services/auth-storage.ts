// ============================================================
// GROUP 5 – Smart QR Attendance & Christmas Raffle System
// Service: Local Student / Organizer Profile Storage (Passwordless)
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = '@active_student_profile';

/** Public-facing participant / organizer profile */
export interface StudentProfile {
  studentId: string;
  studentName: string;
  course: string;
  section: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_STUDENT_PROFILE: StudentProfile = {
  studentId: '2024305392',
  studentName: 'Joebelle Dumapias',
  course: 'BS Information Technology',
  section: 'IT-3A',
  createdAt: '2026-10-27T00:00:00.000Z',
  updatedAt: '2026-10-27T00:00:00.000Z',
};

/**
 * Load the saved Student / Participant profile from AsyncStorage.
 * Returns DEFAULT_STUDENT_PROFILE if none is stored yet.
 */
export async function getStudentProfile(): Promise<StudentProfile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_STUDENT_PROFILE;
    return {
      ...DEFAULT_STUDENT_PROFILE,
      ...(JSON.parse(raw) as Partial<StudentProfile>),
    };
  } catch (error) {
    console.error('[ProfileStorage] Failed to load profile:', error);
    return DEFAULT_STUDENT_PROFILE;
  }
}

/**
 * Persist updates to the Student / Participant profile in AsyncStorage.
 */
export async function saveStudentProfile(
  updates: Partial<Pick<StudentProfile, 'studentId' | 'studentName' | 'course' | 'section'>>
): Promise<StudentProfile> {
  const current = await getStudentProfile();
  const updated: StudentProfile = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
  return updated;
}
