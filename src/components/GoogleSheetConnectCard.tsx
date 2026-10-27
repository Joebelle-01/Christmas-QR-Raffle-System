// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Component: GoogleSheetConnectCard
// Live Auto-Updating Check-In Sheet + 1-Click Open in Google Sheets & CSV Download
// Zero OAuth 401 errors — works immediately for every user!
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors } from '@/constants/theme';
import {
  copyTableForSheets,
  downloadOrShareCSV,
} from '@/services/google-sheets';
import { AttendanceRecord } from '@/types/attendance';

interface GoogleSheetConnectCardProps {
  records: AttendanceRecord[];
  onSynced?: () => void;
}

export default function GoogleSheetConnectCard({
  records,
}: GoogleSheetConnectCardProps) {
  const [statusMessage, setStatusMessage] = useState<string>('');

  const showQuickStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 4500);
  };

  // 1-Click: Auto-copies all rows in Google Sheets column format & opens Google Sheets (sheets.new)
  const handleOpenGoogleSheets = async () => {
    if (records.length > 0) {
      await copyTableForSheets(records);
      showQuickStatus(
        `Copied ${records.length} row(s)! Press Ctrl+V (Paste) inside your new Google Sheet.`
      );
    }
    try {
      await Linking.openURL('https://sheets.new');
    } catch {
      showQuickStatus('All rows copied! Open Google Sheets and press Paste.');
    }
  };

  // 1-Click: Downloads the .CSV spreadsheet file directly (opens in Google Sheets / Excel)
  const handleDownloadSheet = async () => {
    await downloadOrShareCSV(records);
    showQuickStatus(
      `Downloaded spreadsheet (${records.length} participant${
        records.length === 1 ? '' : 's'
      })!`
    );
  };

  const previewRows = records.slice(0, 5);

  return (
    <View style={styles.card}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.googleBadge}>
            <Ionicons name="grid" size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              Live Check-In Sheet ({records.length} Checked In)
            </Text>
            <Text style={styles.cardSub}>
              Every scanned QR automatically adds Name & Department below
            </Text>
          </View>
        </View>
        <View style={styles.autoPill}>
          <View style={styles.autoDot} />
          <Text style={styles.autoPillText}>AUTO</Text>
        </View>
      </View>

      {/* Live Spreadsheet Table Preview */}
      <View style={styles.tableWrap}>
        {/* Table Header */}
        <View style={[styles.tableRow, styles.tableHeaderRow]}>
          <Text style={[styles.cellNum, styles.headerText]}>#</Text>
          <Text style={[styles.cellName, styles.headerText]}>
            Participant Name
          </Text>
          <Text style={[styles.cellDept, styles.headerText]}>Department</Text>
          <Text style={[styles.cellTime, styles.headerText]}>Time</Text>
        </View>

        {/* Table Rows */}
        {previewRows.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>
              No QR codes scanned yet — scan a participant QR to auto-fill this
              sheet!
            </Text>
          </View>
        ) : (
          previewRows.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.tableRow,
                idx % 2 === 1 && styles.tableRowAlt,
              ]}
            >
              <Text style={styles.cellNum}>{records.length - idx}</Text>
              <Text style={styles.cellName} numberOfLines={1}>
                {item.participantName}
              </Text>
              <Text style={styles.cellDept} numberOfLines={1}>
                {item.department}
              </Text>
              <Text style={styles.cellTime} numberOfLines={1}>
                {item.time}
              </Text>
            </View>
          ))
        )}

        {records.length > 5 && (
          <View style={styles.moreFooter}>
            <Text style={styles.moreFooterText}>
              + {records.length - 5} more participant(s) recorded in sheet
            </Text>
          </View>
        )}
      </View>

      {statusMessage ? (
        <View style={styles.statusToast}>
          <Ionicons
            name="checkmark-circle"
            size={16}
            color={Colors.leafGreen}
          />
          <Text style={styles.statusToastText}>{statusMessage}</Text>
        </View>
      ) : null}

      {/* 1-Click Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.openSheetBtn}
          onPress={handleOpenGoogleSheets}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-google" size={16} color="#FFFFFF" />
          <Text style={styles.openSheetBtnText}>
            Open Google Sheets (Auto-Copies Rows)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={handleDownloadSheet}
          activeOpacity={0.85}
        >
          <Ionicons
            name="download-outline"
            size={16}
            color={Colors.leafGreen}
          />
          <Text style={styles.downloadBtnText}>Download .CSV</Text>
        </TouchableOpacity>
      </View>
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
  autoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 99,
  },
  autoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.leafGreen,
  },
  autoPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.darkGreen,
  },
  tableWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableRowAlt: {
    backgroundColor: '#F9FAFB',
  },
  tableHeaderRow: {
    backgroundColor: Colors.darkGreen,
    borderBottomWidth: 0,
  },
  headerText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  cellNum: {
    width: 26,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  cellName: {
    flex: 1.4,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingRight: 6,
  },
  cellDept: {
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
    paddingRight: 6,
  },
  cellTime: {
    width: 64,
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  emptyRow: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  moreFooter: {
    paddingVertical: 6,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
  },
  moreFooterText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.leafGreen,
  },
  statusToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusToastText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.darkGreen,
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
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  openSheetBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: Colors.leafGreen,
  },
  downloadBtnText: {
    color: Colors.leafGreen,
    fontSize: 12,
    fontWeight: '800',
  },
});
