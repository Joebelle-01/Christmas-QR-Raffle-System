// ============================================================
// Work Christmas Party – Smart QR Check-In Scanner
// Screen: Welcome Screen (index.tsx) — No Login Required
// Design: Festive Pine Green, Crimson Red, Gold & Warm Beige
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import {
  Animated,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';

SplashScreen.hideAsync();

function FestiveDecor({
  icon,
  color,
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  style?: object;
}) {
  return (
    <View style={[styles.leafDecor, style]}>
      <Ionicons name={icon} size={26} color={color} />
    </View>
  );
}

function AnimatedQRIcon() {
  const [scanAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanAnim]);

  const scanLineTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-55, 55],
  });

  return (
    <View style={styles.qrWrapper}>
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />

      <View style={styles.qrGrid}>
        <View style={styles.qrRow}>
          <View style={[styles.qrBlock, styles.qrBlockLg]} />
          <View style={styles.qrBlockSm} />
          <View style={[styles.qrBlock, styles.qrBlockLg]} />
        </View>
        <View style={styles.qrRow}>
          <View style={styles.qrBlockSm} />
          <View style={styles.qrGiftBadge}>
            <Ionicons name="qr-code" size={18} color={Colors.darkGreen} />
          </View>
          <View style={styles.qrBlockSm} />
        </View>
        <View style={styles.qrRow}>
          <View style={[styles.qrBlock, styles.qrBlockLg]} />
          <View style={styles.qrBlockSm} />
          <View style={styles.qrBlockMd} />
        </View>
      </View>

      <Animated.View
        style={[
          styles.scanLine,
          { transform: [{ translateY: scanLineTranslate }] },
        ]}
      />
    </View>
  );
}

export default function WelcomeScreen() {
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(40));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.darkGreen} />

      {/* ── Hero Card ── */}
      <View style={styles.heroCard}>
        <FestiveDecor
          icon="sparkles"
          color={Colors.goldBright}
          style={styles.leafTopLeft}
        />
        <FestiveDecor
          icon="star"
          color={Colors.white}
          style={[styles.leafTopLeft, styles.leafTopRight]}
        />

        <View style={styles.seasonPill}>
          <Ionicons name="sparkles" size={14} color={Colors.goldBright} />
          <Text style={styles.seasonPillText}>COMPANY CHRISTMAS PARTY</Text>
        </View>

        <AnimatedQRIcon />

        <FestiveDecor
          icon="leaf"
          color={Colors.white}
          style={[styles.leafTopLeft, styles.leafBottomLeft]}
        />
        <FestiveDecor
          icon="sparkles"
          color={Colors.goldBright}
          style={[styles.leafTopLeft, styles.leafBottomRight]}
        />
      </View>

      {/* ── Content Section ── */}
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.titleSection}>
          <Text style={styles.title}>Christmas Party{'\n'}QR Check-In</Text>
          <Text style={styles.tagline}>
            Scan Bulk QR Passes  ·  Auto-Save Name & Department to Google Sheets
          </Text>
        </View>

        {/* Feature Badges */}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons name="logo-google" size={14} color={Colors.leafGreen} />
            <Text style={styles.badgeText}>Google Sheets Live Sync</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons
              name="briefcase-outline"
              size={14}
              color={Colors.darkGreen}
            />
            <Text style={styles.badgeText}>Name & Department</Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => router.push('/scanner')}
            activeOpacity={0.85}
          >
            <Ionicons name="scan-outline" size={20} color={Colors.white} />
            <Text style={styles.btnPrimaryText}>Start Scanning QR Codes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => router.push('/dashboard')}
            activeOpacity={0.85}
          >
            <Ionicons name="grid-outline" size={18} color={Colors.darkGreen} />
            <Text style={styles.btnSecondaryText}>Open Event Dashboard</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.beige,
  },
  heroCard: {
    backgroundColor: Colors.darkGreen,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    flex: 0.46,
    gap: Spacing.md,
  },
  seasonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.45)',
  },
  seasonPillText: {
    color: Colors.goldLight,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  leafDecor: {
    position: 'absolute',
    opacity: 0.45,
  },
  leafTopLeft: { top: Spacing.md, left: Spacing.lg },
  leafTopRight: { left: undefined, right: Spacing.lg },
  leafBottomLeft: { top: undefined, bottom: Spacing.md },
  leafBottomRight: {
    top: undefined,
    left: undefined,
    bottom: Spacing.md,
    right: Spacing.lg,
  },
  qrWrapper: {
    width: 156,
    height: 156,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: Colors.goldBright,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  qrGrid: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  qrRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  qrBlock: { backgroundColor: Colors.white, borderRadius: 4 },
  qrBlockLg: { width: 34, height: 34 },
  qrBlockMd: {
    width: 22,
    height: 22,
    backgroundColor: Colors.white,
    borderRadius: 4,
  },
  qrBlockSm: {
    width: 10,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 2,
  },
  qrGiftBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    position: 'absolute',
    width: '82%',
    height: 3,
    backgroundColor: Colors.goldBright,
    borderRadius: 2,
    shadowColor: Colors.goldBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  content: {
    flex: 0.54,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  titleSection: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: FontSize.sm,
    color: Colors.olive,
    textAlign: 'center',
    letterSpacing: 0.2,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  buttonGroup: {
    width: '100%',
    gap: Spacing.md,
  },
  btnPrimary: {
    backgroundColor: Colors.leafGreen,
    height: 54,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadow.button,
  },
  btnPrimaryText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  btnSecondary: {
    height: 52,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.darkGreen,
    backgroundColor: Colors.white,
  },
  btnSecondaryText: {
    color: Colors.darkGreen,
    fontSize: FontSize.md,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
