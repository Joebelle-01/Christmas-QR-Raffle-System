// ============================================================
// GROUP 5 – Smart QR Attendance System
// Component: QRScanner.tsx
// Props: onScanned, active
// Design: Leaf Green (#4A7C59) + Warm Beige (#F5F0E8)
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

// ── Props ───────────────────────────────────────────────────
interface QRScannerProps {
  /** Called with the raw QR data string when a code is detected */
  onScanned: (data: string) => void;
  /** Pause scanning when false (e.g. after a successful scan) */
  active: boolean;
}

// ── Component ───────────────────────────────────────────────
export function QRScanner({ onScanned, active }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanLineAnim] = useState(() => new Animated.Value(0));

  // Animate the scan line up and down while active
  useEffect(() => {
    if (!active) {
      scanLineAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, scanLineAnim]);

  // ── Still loading permissions ────────────────────────────
  if (!permission) {
    return <View style={styles.centered} />;
  }

  // ── Permission denied — show prompt ─────────────────────
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionIconCircle}>
          <Ionicons name="camera-outline" size={48} color={Colors.leafGreen} />
        </View>

        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionSubtitle}>
          Smart QR Attendance needs camera access to scan QR codes and mark your
          attendance.
        </Text>

        <TouchableOpacity
          style={styles.grantButton}
          onPress={requestPermission}
          activeOpacity={0.85}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={18}
            color={Colors.white}
          />
          <Text style={styles.grantButtonText}>Allow Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Scan line translate range (viewfinder is ~240px tall) ─
  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 220],
  });

  // ── Camera viewfinder ────────────────────────────────────
  return (
    <View style={styles.cameraContainer}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={
          active
            ? (result: BarcodeScanningResult) => onScanned(result.data)
            : undefined
        }
      />

      {/* Dark overlay around the viewfinder */}
      <View style={styles.overlayTop} />
      <View style={styles.overlayRow}>
        <View style={styles.overlaySide} />

        {/* Viewfinder box */}
        <View style={styles.viewfinder}>
          {/* Corner brackets */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Animated scan line */}
          {active && (
            <Animated.View
              style={[
                styles.scanLine,
                { transform: [{ translateY: scanLineTranslateY }] },
              ]}
            />
          )}
        </View>

        <View style={styles.overlaySide} />
      </View>
      <View style={styles.overlayBottom} />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────
const VIEWFINDER_SIZE = 240;
const OVERLAY_COLOR = 'rgba(0, 0, 0, 0.55)';
const CORNER_SIZE = 28;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  // ── Permission screen
  centered: {
    flex: 1,
    backgroundColor: Colors.beige,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.beige,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  permissionIconCircle: {
    width: 100,
    height: 100,
    borderRadius: Radius.pill,
    backgroundColor: Colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  permissionTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  permissionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.olive,
    textAlign: 'center',
    lineHeight: 22,
  },
  grantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.leafGreen,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    marginTop: Spacing.sm,
    ...Shadow.button,
  },
  grantButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '600',
  },

  // ── Camera + overlay
  cameraContainer: {
    flex: 1,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  overlayRow: {
    flexDirection: 'row',
    height: VIEWFINDER_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },

  // ── Viewfinder box
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    overflow: 'hidden',
  },

  // ── Corner brackets
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.white,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },

  // ── Animated scan line
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.leafGreen,
    shadowColor: Colors.leafGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
});
