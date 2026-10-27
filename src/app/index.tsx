// ============================================================
// GROUP 5 – Smart QR Attendance & Christmas Raffle System
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

// ── Festive sparkle / leaf decoration component ─────────────
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

// ── QR Icon with animated scan line ───────────────────────
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
      {/* Corner brackets */}
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />

      {/* QR grid dots */}
      <View style={styles.qrGrid}>
        <View style={styles.qrRow}>
          <View style={[styles.qrBlock, styles.qrBlockLg]} />
          <View style={styles.qrBlockSm} />
          <View style={[styles.qrBlock, styles.qrBlockLg]} />
        </View>
        <View style={styles.qrRow}>
          <View style={styles.qrBlockSm} />
          <View style={styles.qrGiftBadge}>
            <Ionicons name="gift" size={18} color={Colors.crimson} />
          </View>
          <View style={styles.qrBlockSm} />
        </View>
        <View style={styles.qrRow}>
          <View style={[styles.qrBlock, styles.qrBlockLg]} />
          <View style={styles.qrBlockSm} />
          <View style={styles.qrBlockMd} />
        </View>
      </View>

      {/* Animated scan line */}
      <Animated.View
        style={[
          styles.scanLine,
          { transform: [{ translateY: scanLineTranslate }] },
        ]}
      />
    </View>
  );
}

// ── Main Welcome Screen ─────────────────────────────────────
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

      {/* ── Hero Card (Festive Green Top Section) ── */}
      <View style={styles.heroCard}>
        <FestiveDecor
          icon="sparkles"
          color={Colors.goldBright}
          style={styles.leafTopLeft}
        />
        <FestiveDecor
          icon="gift-outline"
          color={Colors.white}
          style={[styles.leafTopLeft, styles.leafTopRight]}
        />

        <View style={styles.seasonPill}>
          <Ionicons name="sparkles" size={14} color={Colors.goldBright} />
          <Text style={styles.seasonPillText}>CHRISTMAS PARTY EDITION</Text>
        </View>

        <AnimatedQRIcon />

        <FestiveDecor
          icon="leaf"
          color={Colors.white}
          style={[styles.leafTopLeft, styles.leafBottomLeft]}
        />
        <FestiveDecor
          icon="star"
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
        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Smart QR Check-In{'\n'}& Raffle System</Text>
          <Text style={styles.tagline}>
            Scan Guest QR  ·  Sync Google Sheets  ·  Spin the Wheel
          </Text>
        </View>

        {/* Feature Badges */}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons name="logo-google" size={14} color={Colors.leafGreen} />
            <Text style={styles.badgeText}>Google Sheets Sync</Text>
          </View>
          <View style={[styles.badge, { borderColor: Colors.crimson }]}>
            <Ionicons name="gift" size={14} color={Colors.crimson} />
            <Text style={[styles.badgeText, { color: Colors.crimson }]}>
              Live Raffle Roulette
            </Text>
          </View>
        </View>

        {/* Buttons (No Login Required!) */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => router.push('/dashboard')}
            activeOpacity={0.85}
          >
            <Ionicons name="scan-outline" size={20} color={Colors.white} />
            <Text style={styles.btnPrimaryText}>Enter Event Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => router.push('/roulette')}
            activeOpacity={0.85}
          >
            <Ionicons name="gift-outline" size={20} color={Colors.crimson} />
            <Text style={styles.btnSecondaryText}>Open Christmas Raffle Wheel</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.beige,
  },

  // Hero Card
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

  // QR Icon
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

  // Content
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

  // Badges
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

  // Buttons
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
    borderColor: Colors.crimson,
    backgroundColor: Colors.crimsonLight,
  },
  btnSecondaryText: {
    color: Colors.crimson,
    fontSize: FontSize.md,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
