// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Component: GoogleSheetConnectCard
// Sign in with Google -> Auto-Creates & Auto-Updates Google Sheet (Zero Scripting!)
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import {
  clearGoogleSession,
  createEventSpreadsheet,
  ensureConnectedSpreadsheet,
  fetchGoogleUserProfile,
  getConnectedSpreadsheet,
  getCustomGoogleClientId,
  getGoogleSession,
  GOOGLE_SHEETS_SCOPES,
  saveCustomGoogleClientId,
  syncAllRecordsToGoogleSheet,
} from '@/services/google-sheets';
import {
  AttendanceRecord,
  ConnectedSpreadsheet,
  GoogleUserSession,
} from '@/types/attendance';

WebBrowser.maybeCompleteAuthSession();

interface GoogleSheetConnectCardProps {
  records: AttendanceRecord[];
  onSynced?: () => void;
}

export default function GoogleSheetConnectCard({
  records,
  onSynced,
}: GoogleSheetConnectCardProps) {
  const [session, setSession] = useState<GoogleUserSession | null>(null);
  const [sheet, setSheet] = useState<ConnectedSpreadsheet | null>(null);
  const [clientId, setClientId] = useState<string>(
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
      'placeholder-client-id.apps.googleusercontent.com'
  );
  const [hasRealClientId, setHasRealClientId] = useState<boolean>(
    Boolean(
      process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
    )
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [clientIdInput, setClientIdInput] = useState<string>('');

  const [request, , promptAsync] = Google.useAuthRequest({
    clientId,
    webClientId: clientId,
    androidClientId:
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || clientId,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || clientId,
    scopes: GOOGLE_SHEETS_SCOPES,
  });

  // Load saved session, connected sheet, and custom client ID on mount
  useEffect(() => {
    (async () => {
      const [savedSession, savedSheet, savedClientId] = await Promise.all([
        getGoogleSession(),
        getConnectedSpreadsheet(),
        getCustomGoogleClientId(),
      ]);
      if (savedSession) setSession(savedSession);
      if (savedSheet) setSheet(savedSheet);
      if (savedClientId) {
        setClientId(savedClientId);
        setClientIdInput(savedClientId);
        setHasRealClientId(true);
      }
    })();
  }, []);

  const handleCompleteGoogleSignIn = useCallback(
    async (accessToken: string) => {
      setIsLoading(true);
      try {
        const userProfile = await fetchGoogleUserProfile(accessToken);
        setSession(userProfile);

        // Automatically create (or connect) the event Google Sheet in their Drive!
        const connectedSheet = await ensureConnectedSpreadsheet(accessToken);
        setSheet(connectedSheet);

        // Sync any already-scanned participants into the new Google Sheet
        if (records.length > 0) {
          await syncAllRecordsToGoogleSheet(records);
          onSynced?.();
        }

        Alert.alert(
          'Connected to Google Sheets!',
          `Signed in as ${userProfile.email}.\n\nYour live sheet "${connectedSheet.spreadsheetTitle}" was created automatically. Every QR scan will now be added to your Google Sheet in real time!`
        );
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : 'Could not auto-create Google Sheet.';
        Alert.alert('Google Connection Error', msg);
      } finally {
        setIsLoading(false);
      }
    },
    [records, onSynced]
  );

  const handlePressSignIn = async () => {
    if (!hasRealClientId) {
      setShowSetupModal(true);
      return;
    }
    try {
      const result = await promptAsync();
      if (result.type === 'success') {
        const accessToken = result.authentication?.accessToken;
        if (accessToken) {
          await handleCompleteGoogleSignIn(accessToken);
        }
      } else if (result.type === 'error') {
        Alert.alert(
          'Google Sign-In Error',
          result.error?.message || 'Could not complete Google Sign-In.'
        );
      }
    } catch {
      Alert.alert(
        'Sign-In Failed',
        'Could not launch Google Sign-In browser window.'
      );
    }
  };

  const handleSaveClientId = async () => {
    const trimmed = clientIdInput.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please paste your Google OAuth Client ID.');
      return;
    }
    await saveCustomGoogleClientId(trimmed);
    setClientId(trimmed);
    setHasRealClientId(true);
    setShowSetupModal(false);
    Alert.alert(
      'Google Client ID Saved!',
      'Tap "Continue with Google" again to sign in and auto-create your Google Sheet.'
    );
  };

  const handleOpenSheet = async () => {
    if (!sheet?.spreadsheetUrl) return;
    try {
      await Linking.openURL(sheet.spreadsheetUrl);
    } catch {
      Alert.alert('Error', 'Could not open Google Sheet link.');
    }
  };

  const handleSyncNow = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const result = await syncAllRecordsToGoogleSheet(records);
      setSheet(result.sheet);
      onSynced?.();
      Alert.alert(
        'Google Sheet Synced!',
        result.syncedCount > 0
          ? `Added ${result.syncedCount} new participant(s) to "${result.sheet.spreadsheetTitle}".`
          : `All ${records.length} checked-in participant(s) are already up to date in your Google Sheet!`
      );
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Could not sync to sheet.';
      Alert.alert('Sync Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const newSheet = await createEventSpreadsheet(session.accessToken);
      setSheet(newSheet);
      if (records.length > 0) {
        await syncAllRecordsToGoogleSheet(records);
        onSynced?.();
      }
      Alert.alert(
        'New Google Sheet Created!',
        `Created "${newSheet.spreadsheetTitle}" and synced ${records.length} participant(s).`
      );
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : 'Could not create a new Google Sheet.';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Disconnect Google Account',
      'Stop auto-syncing to this Google account? (Your existing Google Sheet in Google Drive will not be deleted.)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await clearGoogleSession();
            setSession(null);
            setSheet(null);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.googleBadge}>
            <Ionicons name="logo-google" size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              {session
                ? 'Google Sheets Auto-Sync Active'
                : 'Auto-Connect Google Sheets'}
            </Text>
            <Text style={styles.cardSub}>
              {session
                ? `Signed in as ${session.email}`
                : 'Sign in with Google — auto-creates your sheet with zero scripting!'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.gearBtn}
          onPress={() => setShowSetupModal(true)}
          accessibilityLabel="Configure Google OAuth Client ID"
        >
          <Ionicons
            name="settings-outline"
            size={18}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Signed Out State: Continue with Google Button */}
      {!session ? (
        <TouchableOpacity
          style={styles.googleSignInBtn}
          onPress={handlePressSignIn}
          disabled={isLoading || (!request && hasRealClientId)}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="logo-google" size={18} color="#FFFFFF" />
              <Text style={styles.googleSignInText}>
                Continue with Google (Auto-Create Sheet)
              </Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        /* Signed In State: Active Sheet & Quick Actions */
        <View style={styles.connectedWrap}>
          {sheet && (
            <View style={styles.sheetInfoBox}>
              <Ionicons
                name="document-text"
                size={18}
                color={Colors.leafGreen}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitleText} numberOfLines={1}>
                  {sheet.spreadsheetTitle}
                </Text>
                <Text style={styles.sheetHintText}>
                  Every scanned QR is automatically added to this Google Sheet
                </Text>
              </View>
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.openSheetBtn}
              onPress={handleOpenSheet}
              activeOpacity={0.85}
            >
              <Ionicons name="open-outline" size={16} color="#FFFFFF" />
              <Text style={styles.openSheetBtnText}>Open My Google Sheet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleSyncNow}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.leafGreen} />
              ) : (
                <>
                  <Ionicons
                    name="sync-outline"
                    size={16}
                    color={Colors.leafGreen}
                  />
                  <Text style={styles.secondaryBtnText}>Sync All</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <TouchableOpacity
              onPress={handleCreateNewSheet}
              disabled={isLoading}
            >
              <Text style={styles.footerLinkText}>+ Create New Sheet</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSignOut}>
              <Text style={styles.signOutText}>Disconnect Google</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* One-Time OAuth Client ID Setup Modal (if not in .env) */}
      <Modal
        visible={showSetupModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSetupModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Google Sign-In Configuration</Text>
            <Text style={styles.modalDesc}>
              To enable 1-click &ldquo;Continue with Google&rdquo;, paste your
              Google Cloud OAuth 2.0 Client ID (or set{' '}
              <Text style={{ fontWeight: '700' }}>
                EXPO_PUBLIC_GOOGLE_CLIENT_ID
              </Text>{' '}
              in your <Text style={{ fontWeight: '700' }}>.env</Text> file).
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="123456789-abc.apps.googleusercontent.com"
              placeholderTextColor={Colors.textMuted}
              value={clientIdInput}
              onChangeText={setClientIdInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowSetupModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveClientId}
              >
                <Text style={styles.modalSaveText}>Save Client ID</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  googleBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.leafGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.darkGreen,
  },
  cardSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  gearBtn: {
    padding: 6,
  },
  googleSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.leafGreen,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  googleSignInText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  connectedWrap: {
    gap: 10,
  },
  sheetInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    padding: 11,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  sheetTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.darkGreen,
  },
  sheetHintText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  openSheetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.leafGreen,
    borderRadius: 11,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  openSheetBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: Colors.leafGreen,
  },
  secondaryBtnText: {
    color: Colors.leafGreen,
    fontSize: 13,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  footerLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.leafGreen,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.crimson,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.textPrimary,
    backgroundColor: '#FAFAFA',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.beige,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  modalSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.leafGreen,
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
