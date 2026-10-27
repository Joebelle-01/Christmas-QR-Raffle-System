// ============================================================
// GROUP 5 – Smart QR Attendance & Christmas Raffle System
// Screen: Christmas Raffle Roulette Wheel (roulette.tsx)
// Features:
//   - Interactive SVG Roulette Wheel (react-native-svg + Animated)
//   - Pulls participant names from Google Sheets + QR Check-Ins
//   - Prize Tier selector (Grand, Major, Minor, Door Prize)
//   - Winner Celebration Modal + Auto-sync winner to Google Sheets
//   - Remove-after-win toggle & Winners History Modal
// ============================================================

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

import { Colors, FontSize, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAttendance } from '@/context/attendance-context';
import { RaffleParticipant, RaffleWinner } from '@/types/attendance';

const WHEEL_SIZE = 310;
const CENTER = WHEEL_SIZE / 2;
const OUTER_RADIUS = WHEEL_SIZE / 2 - 10;
const INNER_RADIUS = 34;

const PRIZE_TIERS = [
  'Grand Prize',
  'Major Prize',
  'Minor Prize',
  'Door Prize',
  'Special Award',
];

// ── Geometry Helpers (0 deg = 12 o'clock top, clockwise) ────
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.sin(angleRad),
    y: cy - r * Math.cos(angleRad),
  };
}

function createSlicePath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

function truncateLabel(name: string, maxLen = 13): string {
  const trimmed = name.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen - 1) + '…';
}

export default function RouletteScreen() {
  const {
    rafflePool,
    winners,
    sheetsConfig,
    isSyncing,
    syncWithGoogleSheets,
    addManualParticipant,
    removeParticipantFromPool,
    recordRaffleWinner,
    resetRafflePool,
    clearWinners,
  } = useAttendance();

  // ── Wheel Spin State ──────────────────────────────────────
  const [spinAnim] = useState(() => new Animated.Value(0));
  const currentRotationRef = useRef(0);
  const [isSpinning, setIsSpinning] = useState(false);

  // ── Prize & Options State ─────────────────────────────────
  const [selectedPrize, setSelectedPrize] = useState(PRIZE_TIERS[0]);
  const [removeAfterWin, setRemoveAfterWin] = useState(true);
  const [syncBannerMsg, setSyncBannerMsg] = useState('');

  // ── Winner Modal State ────────────────────────────────────
  const [currentWinner, setCurrentWinner] = useState<RaffleParticipant | null>(
    null
  );
  const [recordedWinnerObj, setRecordedWinnerObj] =
    useState<RaffleWinner | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  // ── Pool Manager & Winners History Modals ─────────────────
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [showWinnersModal, setShowWinnersModal] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestId, setNewGuestId] = useState('');
  const [newGuestDept] = useState('BS Information Technology');

  // Interpolate rotation in degrees
  const rotateInterpolation = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  // Rim decorative lights around the wheel
  const rimDots = useMemo(() => {
    const count = 16;
    return Array.from({ length: count }, (_, idx) => {
      const angle = (idx * 360) / count;
      return polarToCartesian(CENTER, CENTER, OUTER_RADIUS + 4, angle);
    });
  }, []);

  // ── Spin the Wheel Handler ────────────────────────────────
  function handleSpinWheel() {
    if (isSpinning) return;
    if (rafflePool.length === 0) {
      Alert.alert(
        'No Participants in Wheel',
        'Add participants by scanning QR codes, syncing from Google Sheets, or restoring the participant pool.'
      );
      return;
    }

    setIsSpinning(true);
    setSyncBannerMsg('');

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    const count = rafflePool.length;
    const sliceAngle = 360 / count;

    // Pick a fair random winner index
    const winnerIndex = Math.floor(Math.random() * count);
    const chosenParticipant = rafflePool[winnerIndex];

    // Calculate exact angle so chosenParticipant lands under the 12 o'clock pointer (0 deg)
    const sliceMidAngle = (winnerIndex + 0.5) * sliceAngle;
    const jitter = (Math.random() - 0.5) * (sliceAngle * 0.45);
    const targetMod = (360 - ((sliceMidAngle + jitter) % 360) + 360) % 360;

    const currentMod = ((currentRotationRef.current % 360) + 360) % 360;
    let deltaToTarget = targetMod - currentMod;
    if (deltaToTarget <= 0) {
      deltaToTarget += 360;
    }

    const extraFullSpins = (6 + Math.floor(Math.random() * 3)) * 360;
    const nextRotation =
      currentRotationRef.current + extraFullSpins + deltaToTarget;

    Animated.timing(spinAnim, {
      toValue: nextRotation,
      duration: 4400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(async () => {
      currentRotationRef.current = nextRotation;
      setIsSpinning(false);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        ).catch(() => {});
      }

      setCurrentWinner(chosenParticipant);
      const savedWinner = await recordRaffleWinner(
        chosenParticipant,
        selectedPrize,
        removeAfterWin
      );
      setRecordedWinnerObj(savedWinner);
      setShowWinnerModal(true);
    });
  }

  // ── Sync Names from Google Sheets ─────────────────────────
  async function handleSyncFromSheets() {
    setSyncBannerMsg('');
    const result = await syncWithGoogleSheets();
    setSyncBannerMsg(result.message);
  }

  // ── Add Manual Participant ────────────────────────────────
  async function handleAddGuest() {
    if (!newGuestName.trim()) {
      Alert.alert('Required', 'Please enter the participant name.');
      return;
    }
    await addManualParticipant({
      name: newGuestName.trim(),
      studentId: newGuestId.trim() || undefined,
      department: newGuestDept.trim() || 'Christmas Party Guest',
      section: 'Party Guest',
    });
    setNewGuestName('');
    setNewGuestId('');
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.darkGreen} />

      {/* ── Festive Top Bar ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="sparkles" size={16} color={Colors.goldBright} />
            <Text style={styles.headerTitle}>Christmas Raffle Wheel</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            {rafflePool.length} Eligible{' '}
            {rafflePool.length === 1 ? 'Participant' : 'Participants'} ·{' '}
            {winners.length} Drawn
          </Text>
        </View>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowWinnersModal(true)}
          activeOpacity={0.75}
        >
          <Ionicons name="trophy" size={19} color={Colors.goldBright} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Google Sheets Sync & Pool Bar ── */}
        <View style={styles.syncBar}>
          <TouchableOpacity
            style={styles.syncSheetBtn}
            onPress={handleSyncFromSheets}
            disabled={isSyncing}
            activeOpacity={0.85}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons
                name="cloud-download-outline"
                size={16}
                color={Colors.white}
              />
            )}
            <Text style={styles.syncSheetBtnText}>
              {isSyncing ? 'Syncing Sheet...' : 'Pull Names from Google Sheet'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.managePoolBtn}
            onPress={() => setShowPoolModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="people" size={16} color={Colors.darkGreen} />
            <Text style={styles.managePoolBtnText}>
              Pool ({rafflePool.length})
            </Text>
          </TouchableOpacity>
        </View>

        {syncBannerMsg ? (
          <View style={styles.syncStatusBanner}>
            <Ionicons
              name="information-circle"
              size={16}
              color={Colors.leafGreen}
            />
            <Text style={styles.syncStatusText}>{syncBannerMsg}</Text>
          </View>
        ) : null}

        {/* ── Prize Tier Selector ── */}
        <View style={styles.prizeSection}>
          <Text style={styles.sectionLabel}>DRAWING FOR PRIZE:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.prizeChipRow}>
              {PRIZE_TIERS.map((tier) => {
                const active = selectedPrize === tier;
                return (
                  <TouchableOpacity
                    key={tier}
                    style={[
                      styles.prizeChip,
                      active && styles.prizeChipActive,
                    ]}
                    onPress={() => setSelectedPrize(tier)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={active ? 'gift' : 'gift-outline'}
                      size={14}
                      color={active ? Colors.white : Colors.crimson}
                    />
                    <Text
                      style={[
                        styles.prizeChipText,
                        active && styles.prizeChipTextActive,
                      ]}
                    >
                      {tier}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* ── Interactive SVG Roulette Wheel ── */}
        <View style={styles.wheelStage}>
          {/* Top Golden Pointer Arrow */}
          <View style={styles.pointerContainer}>
            <View style={styles.pointerTriangle} />
          </View>

          <View style={styles.wheelOuterFrame}>
            <Animated.View
              style={[
                styles.wheelAnimatedBox,
                { transform: [{ rotate: rotateInterpolation }] },
              ]}
            >
              <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
                {/* Outer festive gold rim */}
                <Circle
                  cx={CENTER}
                  cy={CENTER}
                  r={OUTER_RADIUS + 8}
                  fill={Colors.darkGreen}
                  stroke={Colors.goldBright}
                  strokeWidth={3}
                />

                {rafflePool.length === 0 ? (
                  <Circle
                    cx={CENTER}
                    cy={CENTER}
                    r={OUTER_RADIUS}
                    fill={Colors.olive}
                  />
                ) : rafflePool.length === 1 ? (
                  <G>
                    <Circle
                      cx={CENTER}
                      cy={CENTER}
                      r={OUTER_RADIUS}
                      fill={Colors.crimson}
                    />
                    <SvgText
                      x={CENTER}
                      y={CENTER - OUTER_RADIUS * 0.45}
                      fill={Colors.white}
                      fontSize="14"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {truncateLabel(rafflePool[0].name, 18)}
                    </SvgText>
                  </G>
                ) : (
                  rafflePool.map((participant, index) => {
                    const sliceAngle = 360 / rafflePool.length;
                    const startAngle = index * sliceAngle;
                    const endAngle = (index + 1) * sliceAngle;
                    const midAngle = startAngle + sliceAngle / 2;
                    const pathData = createSlicePath(
                      CENTER,
                      CENTER,
                      OUTER_RADIUS,
                      startAngle,
                      endAngle
                    );
                    const sliceColor =
                      Colors.wheelSlices[index % Colors.wheelSlices.length];

                    // Position label along the slice radius
                    const labelPos = polarToCartesian(
                      CENTER,
                      CENTER,
                      OUTER_RADIUS * 0.63,
                      midAngle
                    );
                    // Rotate label so it reads radially from center outward
                    const textRotation = midAngle - 90;
                    const fontSize =
                      rafflePool.length > 16
                        ? 9
                        : rafflePool.length > 10
                        ? 10.5
                        : 12;

                    return (
                      <G key={participant.id}>
                        <Path
                          d={pathData}
                          fill={sliceColor}
                          stroke={Colors.white}
                          strokeWidth={1.5}
                        />
                        <SvgText
                          x={labelPos.x}
                          y={labelPos.y}
                          fill={Colors.white}
                          fontSize={fontSize}
                          fontWeight="bold"
                          textAnchor="middle"
                          alignmentBaseline="middle"
                          transform={`rotate(${textRotation}, ${labelPos.x}, ${labelPos.y})`}
                        >
                          {truncateLabel(
                            participant.name,
                            rafflePool.length > 14 ? 10 : 13
                          )}
                        </SvgText>
                      </G>
                    );
                  })
                )}

                {/* Rim decorative lights */}
                {rimDots.map((dot, idx) => (
                  <Circle
                    key={idx}
                    cx={dot.x}
                    cy={dot.y}
                    r={3}
                    fill={idx % 2 === 0 ? Colors.goldBright : Colors.white}
                  />
                ))}

                {/* Center Hub Circle */}
                <Circle
                  cx={CENTER}
                  cy={CENTER}
                  r={INNER_RADIUS}
                  fill={Colors.goldBright}
                  stroke={Colors.white}
                  strokeWidth={3}
                />
              </Svg>
            </Animated.View>

            {/* Center Pressable Spin Hub */}
            <TouchableOpacity
              style={styles.centerSpinHub}
              onPress={handleSpinWheel}
              disabled={isSpinning || rafflePool.length === 0}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={18} color={Colors.darkGreen} />
              <Text style={styles.centerSpinHubText}>
                {isSpinning ? '...' : 'SPIN'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Remove Winner Toggle & Main Spin Button ── */}
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setRemoveAfterWin(!removeAfterWin)}
          activeOpacity={0.75}
        >
          <Ionicons
            name={removeAfterWin ? 'checkbox' : 'square-outline'}
            size={20}
            color={Colors.leafGreen}
          />
          <Text style={styles.toggleText}>
            Remove winner from wheel after spin (no repeat winners)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.spinPrimaryBtn,
            (isSpinning || rafflePool.length === 0) && { opacity: 0.6 },
          ]}
          onPress={handleSpinWheel}
          disabled={isSpinning || rafflePool.length === 0}
          activeOpacity={0.85}
        >
          <Ionicons name="gift" size={22} color={Colors.white} />
          <Text style={styles.spinPrimaryBtnText}>
            {isSpinning
              ? 'Spinning the Christmas Wheel...'
              : `SPIN FOR ${selectedPrize.toUpperCase()}`}
          </Text>
        </TouchableOpacity>

        {/* ── Recent Winners Preview Card ── */}
        <View style={styles.winnersCard}>
          <View style={styles.winnersCardHeader}>
            <View style={styles.winnersTitleRow}>
              <Ionicons name="trophy" size={18} color={Colors.gold} />
              <Text style={styles.winnersCardTitle}>
                Recent Raffle Winners ({winners.length})
              </Text>
            </View>
            {winners.length > 0 && (
              <TouchableOpacity onPress={() => setShowWinnersModal(true)}>
                <Text style={styles.viewAllLink}>View All →</Text>
              </TouchableOpacity>
            )}
          </View>

          {winners.length === 0 ? (
            <Text style={styles.emptyWinnersText}>
              No winners drawn yet. Spin the wheel to draw your first Christmas
              raffle winner!
            </Text>
          ) : (
            winners.slice(0, 3).map((w, idx) => (
              <View key={w.id} style={styles.winnerRowItem}>
                <View style={styles.winnerRankBadge}>
                  <Text style={styles.winnerRankText}>#{winners.length - idx}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.winnerItemName}>{w.name}</Text>
                  <Text style={styles.winnerItemMeta}>
                    {w.department} · {w.section}
                  </Text>
                </View>
                <View style={styles.winnerPrizeTag}>
                  <Text style={styles.winnerPrizeTagText}>{w.prize}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Winner Celebration Modal ── */}
      <Modal
        visible={showWinnerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWinnerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.winnerModalCard}>
            <View style={styles.winnerCrownCircle}>
              <Ionicons name="trophy" size={44} color={Colors.goldBright} />
            </View>

            <View style={styles.winnerPrizeBanner}>
              <Ionicons name="sparkles" size={14} color={Colors.crimson} />
              <Text style={styles.winnerPrizeBannerText}>
                {recordedWinnerObj?.prize || selectedPrize}
              </Text>
            </View>

            <Text style={styles.winnerModalSubtitle}>CONGRATULATIONS!</Text>
            <Text style={styles.winnerModalName}>
              {currentWinner?.name || 'Lucky Winner'}
            </Text>

            <View style={styles.winnerDetailsBox}>
              <View style={styles.winnerDetailRow}>
                <Ionicons name="id-card-outline" size={15} color={Colors.olive} />
                <Text style={styles.winnerDetailText}>
                  ID: {currentWinner?.studentId || 'VIP'}
                </Text>
              </View>
              <View style={styles.winnerDetailRow}>
                <Ionicons name="school-outline" size={15} color={Colors.olive} />
                <Text style={styles.winnerDetailText}>
                  {currentWinner?.department} · {currentWinner?.section}
                </Text>
              </View>
              {sheetsConfig.webhookUrl ? (
                <View style={styles.winnerDetailRow}>
                  <Ionicons
                    name="logo-google"
                    size={15}
                    color={Colors.leafGreen}
                  />
                  <Text
                    style={[
                      styles.winnerDetailText,
                      { color: Colors.leafGreen, fontWeight: '700' },
                    ]}
                  >
                    Logged to Google Sheets RaffleWinners Tab
                  </Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.winnerModalCloseBtn}
              onPress={() => setShowWinnerModal(false)}
              activeOpacity={0.85}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Colors.white}
              />
              <Text style={styles.winnerModalCloseText}>
                Awesome! Continue Raffle
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Participant Pool Manager Modal ── */}
      <Modal
        visible={showPoolModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPoolModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.poolModalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                Raffle Participants ({rafflePool.length})
              </Text>
              <TouchableOpacity onPress={() => setShowPoolModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Quick Add Participant Form */}
            <View style={styles.addGuestBox}>
              <Text style={styles.addGuestLabel}>Add Participant to Wheel:</Text>
              <View style={styles.addGuestRow}>
                <TextInput
                  style={[styles.guestInput, { flex: 1.4 }]}
                  value={newGuestName}
                  onChangeText={setNewGuestName}
                  placeholder="Full Name"
                  placeholderTextColor={Colors.textMuted}
                />
                <TextInput
                  style={[styles.guestInput, { flex: 0.9 }]}
                  value={newGuestId}
                  onChangeText={setNewGuestId}
                  placeholder="ID (Optional)"
                  placeholderTextColor={Colors.textMuted}
                />
                <TouchableOpacity
                  style={styles.addGuestBtn}
                  onPress={handleAddGuest}
                >
                  <Ionicons name="add" size={22} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>

            <FlatList
              data={rafflePool}
              keyExtractor={(item) => item.id}
              style={{ width: '100%' }}
              renderItem={({ item }) => (
                <View style={styles.poolItemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.poolItemName}>{item.name}</Text>
                    <Text style={styles.poolItemSub}>
                      {item.studentId} · {item.section} ({item.source.toUpperCase()})
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeParticipantFromPool(item.id)}
                    style={styles.removePoolItemBtn}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={Colors.crimson}
                    />
                  </TouchableOpacity>
                </View>
              )}
            />

            <View style={styles.poolFooterRow}>
              <TouchableOpacity
                style={styles.restorePoolBtn}
                onPress={() => {
                  resetRafflePool();
                }}
              >
                <Ionicons
                  name="refresh-outline"
                  size={16}
                  color={Colors.darkGreen}
                />
                <Text style={styles.restorePoolBtnText}>Restore All Guests</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.donePoolBtn}
                onPress={() => setShowPoolModal(false)}
              >
                <Text style={styles.donePoolBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Winners History Modal ── */}
      <Modal
        visible={showWinnersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWinnersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.poolModalCard, { maxHeight: '80%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                Christmas Raffle Winners ({winners.length})
              </Text>
              <TouchableOpacity onPress={() => setShowWinnersModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {winners.length === 0 ? (
              <Text style={styles.emptyWinnersText}>
                No winners have been drawn yet.
              </Text>
            ) : (
              <FlatList
                data={winners}
                keyExtractor={(item) => item.id}
                style={{ width: '100%' }}
                renderItem={({ item, index }) => (
                  <View style={styles.poolItemRow}>
                    <View style={styles.winnerRankBadge}>
                      <Text style={styles.winnerRankText}>
                        #{winners.length - index}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.poolItemName}>{item.name}</Text>
                      <Text style={styles.poolItemSub}>
                        {item.prize} · {item.wonAt}
                      </Text>
                    </View>
                  </View>
                )}
              />
            )}

            <View style={styles.poolFooterRow}>
              {winners.length > 0 && (
                <TouchableOpacity
                  style={styles.restorePoolBtn}
                  onPress={() => clearWinners()}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={Colors.crimson}
                  />
                  <Text
                    style={[styles.restorePoolBtnText, { color: Colors.crimson }]}
                  >
                    Clear Winners
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.donePoolBtn}
                onPress={() => setShowWinnersModal(false)}
              >
                <Text style={styles.donePoolBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.beige,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.darkGreen,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
    alignItems: 'center',
    gap: Spacing.md,
  },

  // Sync & Pool Bar
  syncBar: {
    flexDirection: 'row',
    width: '100%',
    gap: Spacing.sm,
  },
  syncSheetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.leafGreen,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    ...Shadow.card,
  },
  syncSheetBtnText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  managePoolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  managePoolBtnText: {
    color: Colors.darkGreen,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  syncStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    backgroundColor: Colors.lightGreen,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.leafGreen,
  },
  syncStatusText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    fontWeight: '600',
  },

  // Prize Selector
  prizeSection: {
    width: '100%',
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.olive,
    letterSpacing: 0.8,
  },
  prizeChipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  prizeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.crimson,
  },
  prizeChipActive: {
    backgroundColor: Colors.crimson,
  },
  prizeChipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.crimson,
  },
  prizeChipTextActive: {
    color: Colors.white,
  },

  // Wheel Stage
  wheelStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xs,
  },
  pointerContainer: {
    zIndex: 20,
    marginBottom: -14,
    alignItems: 'center',
  },
  pointerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 26,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.goldBright,
  },
  wheelOuterFrame: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelAnimatedBox: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSpinHub: {
    position: 'absolute',
    width: INNER_RADIUS * 2,
    height: INNER_RADIUS * 2,
    borderRadius: INNER_RADIUS,
    backgroundColor: Colors.goldBright,
    borderWidth: 3,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.button,
  },
  centerSpinHubText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.darkGreen,
    letterSpacing: 0.5,
  },

  // Controls
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
  },
  toggleText: {
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  spinPrimaryBtn: {
    width: '100%',
    height: 54,
    borderRadius: Radius.pill,
    backgroundColor: Colors.crimson,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadow.button,
  },
  spinPrimaryBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  // Winners Card
  winnersCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  winnersCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  winnersTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  winnersCardTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  viewAllLink: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.leafGreen,
  },
  emptyWinnersText: {
    fontSize: FontSize.xs,
    color: Colors.olive,
    lineHeight: 18,
    paddingVertical: Spacing.xs,
  },
  winnerRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.beige,
  },
  winnerRankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerRankText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.gold,
  },
  winnerItemName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  winnerItemMeta: {
    fontSize: 11,
    color: Colors.olive,
  },
  winnerPrizeTag: {
    backgroundColor: Colors.crimsonLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  winnerPrizeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.crimson,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  winnerModalCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.goldBright,
    ...Shadow.card,
  },
  winnerCrownCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.goldBright,
  },
  winnerPrizeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.crimsonLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  winnerPrizeBannerText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.crimson,
    textTransform: 'uppercase',
  },
  winnerModalSubtitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: Colors.gold,
    letterSpacing: 1.2,
  },
  winnerModalName: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  winnerDetailsBox: {
    width: '100%',
    backgroundColor: Colors.beige,
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: 6,
    marginVertical: Spacing.xs,
  },
  winnerDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  winnerDetailText: {
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  winnerModalCloseBtn: {
    width: '100%',
    height: 50,
    borderRadius: Radius.pill,
    backgroundColor: Colors.leafGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.xs,
  },
  winnerModalCloseText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },

  // Pool Modal
  poolModalCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    ...Shadow.card,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addGuestBox: {
    backgroundColor: Colors.beige,
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: 6,
  },
  addGuestLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addGuestRow: {
    flexDirection: 'row',
    gap: 6,
  },
  guestInput: {
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    height: 40,
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addGuestBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.leafGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poolItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.beige,
    gap: Spacing.sm,
  },
  poolItemName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  poolItemSub: {
    fontSize: 11,
    color: Colors.olive,
  },
  removePoolItemBtn: {
    padding: 6,
  },
  poolFooterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  restorePoolBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  restorePoolBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.darkGreen,
  },
  donePoolBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.leafGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donePoolBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
  },
});
