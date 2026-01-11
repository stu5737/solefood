/**
 * Solefood 全知監控中心 (Omni-Dashboard)
 * MVP v9.0 Plus - 開發者儀表板
 * 
 * 功能：
 * - 實時監控所有核心邏輯運算
 * - 公式驗證（容量、體力、價值）
 * - 6 大監控模組（容量、體力、衛生、地圖、機率、系統）
 * - 可折疊設計（Mini/Expanded 模式）
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import { usePlayerStore } from '../../stores/playerStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { locationService } from '../../services/location';
import { gpsHistoryService } from '../../services/gpsHistory';
import { bgTrackingNotification } from '../../services/backgroundTrackingNotification';
import { getTieredMultiplier, getTierStatus } from '../../core/math/tiered';
import { calculateItemDropRate } from '../../core/math/luck';
import { calculateFinalPayout } from '../../core/math/unloading';
import { latLngToH3, H3_RESOLUTION } from '../../core/math/h3';
import { CAPACITY, HYGIENE, STAMINA, ITEM_DISTRIBUTION, RESCUE_ADS, HEAVY_DUTY_TAX } from '../../utils/constants';
import type { LocationData } from '../../services/location';

interface DevDashboardProps {
  visible?: boolean;
}

export const DevDashboard: React.FC<DevDashboardProps> = ({ visible = true }) => {
  const playerState = usePlayerStore();
  const sessionState = useSessionStore();
  const inventoryState = useInventoryStore();

  // ⭐ 可折疊模式
  const [isExpanded, setIsExpanded] = useState(false);

  // GPS 實時數據
  const [gpsData, setGpsData] = useState<{
    speed: number | null;
    accuracy: number | null;
    lastUpdate: number | null;
    currentLocation: { latitude: number; longitude: number } | null;
  }>({
    speed: null,
    accuracy: null,
    lastUpdate: null,
    currentLocation: null,
  });

  // ⭐ 追蹤最後一次體力變化（用於 Module B）
  const lastStaminaRef = useRef<number>(playerState.stamina);
  const [lastStaminaChange, setLastStaminaChange] = useState<string>('None');

  // 監聽體力變化
  useEffect(() => {
    const currentStamina = playerState.stamina;
    const diff = currentStamina - lastStaminaRef.current;
    
    if (Math.abs(diff) > 0.1) {
      const action = diff > 0 
        ? `+${diff.toFixed(1)} (恢復)`
        : `${diff.toFixed(1)} (消耗)`;
      setLastStaminaChange(action);
      lastStaminaRef.current = currentStamina;
    }
  }, [playerState.stamina]);

  // 訂閱 GPS 更新
  useEffect(() => {
    if (!visible) return;

    const subscription = locationService.subscribeToLocationUpdates((location: LocationData, distance: number) => {
      setGpsData({
        speed: location.speed ? location.speed * 3.6 : null, // m/s 轉換為 km/h
        accuracy: location.accuracy || null,
        lastUpdate: location.timestamp,
        currentLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      });
    });

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [visible]);

  // ⭐ Module A: 容量與耐久核心 - 計算所有需要的數值
  const expansionMult = sessionState.isTempExpanded ? 1.5 : 1.0;
  const durabilityTierMult = getTieredMultiplier(playerState.durability);
  const calculatedCap = CAPACITY.BASE_MAX_WEIGHT * expansionMult * durabilityTierMult;
  const effectiveMaxWeight = playerState.getEffectiveMaxWeight(sessionState.isTempExpanded);
  const currentWeight = inventoryState.totalWeight;
  const loadPercentage = effectiveMaxWeight > 0 ? (currentWeight / effectiveMaxWeight) * 100 : 0;
  const isBackpackNearFull = currentWeight >= effectiveMaxWeight * 0.9;
  const collapseRisk = playerState.durability <= 0 || playerState.isImmobilized;

  // ⭐ Module B: 體力與消耗物理學
  const loadPenalty = 1.0 + (currentWeight / effectiveMaxWeight);
  const burnRate = STAMINA.BURN_PER_KM * loadPenalty;

  // ⭐ Module C: 衛生與價值經濟
  const hygieneTierMult = getTieredMultiplier(playerState.hygiene);
  const totalSoleValue = inventoryState.items.reduce((sum, item) => sum + item.value, 0);
  const estPayout = totalSoleValue * hygieneTierMult;
  const repairCost = (100 - playerState.durability) * HEAVY_DUTY_TAX.BASE_COST_PER_POINT * 10; // 每 1% = 50 $SOLE
  const cleanCost = (100 - playerState.hygiene) * HYGIENE.CLEAN_COST_PER_PERCENT;

  // ⭐ Module D: 地圖與開拓者
  const currentH3Index = gpsData.currentLocation 
    ? latLngToH3(gpsData.currentLocation.latitude, gpsData.currentLocation.longitude, H3_RESOLUTION)
    : null;
  const isExplored = currentH3Index ? sessionState.exploredHexes.has(currentH3Index) : false;
  const isPathfinder = sessionState.pathfinder.isPathfinder;
  const isInDeepZone = sessionState.deepZone.isInDeepZone;

  // ⭐ Module E: 機率矩陣與物品
  const streak = sessionState.luckGradient.streak;
  const streakBonus = Math.min(streak * 0.5, 15); // min(streak * 0.5%, 15%)
  const finalT1Rate = calculateItemDropRate(1, streak, isPathfinder, isInDeepZone, sessionState.luckGradient.currentT2Chance);
  const finalT2Rate = calculateItemDropRate(2, streak, isPathfinder, isInDeepZone, sessionState.luckGradient.currentT2Chance);
  const finalT3Rate = calculateItemDropRate(3, streak, isPathfinder, isInDeepZone);

  // 計算各階層物品數量
  const tierCounts = {
    t1: inventoryState.items.filter(item => item.tier === 1).length,
    t2: inventoryState.items.filter(item => item.tier === 2).length,
    t3: inventoryState.items.filter(item => item.tier === 3).length,
  };

  // 調整連續簽到天數
  const adjustStreak = (delta: number) => {
    const newStreak = Math.max(0, sessionState.luckGradient.streak + delta);
    sessionState.setLoginDays(newStreak);
  };

  // 擴容測試
  const expandCapacity = () => {
    if (!sessionState.isTempExpanded) {
      sessionState.setTempExpanded(true);
      Alert.alert('擴容成功', '背包容量已擴充 50%');
    } else {
      Alert.alert('已擴容', '背包已經擴容，需要先卸貨或結束會話');
    }
  };

  // 添加隨機物品
  const handleAddRandomItem = () => {
    const item = inventoryState.addRandomItem();
    if (item) {
      Alert.alert('物品添加成功', `獲得 T${item.tier} 物品\n重量: ${item.weight}kg\n價值: $${item.value} SOLE`);
    } else {
      Alert.alert('添加失敗', '背包已滿或體力不足');
    }
  };

  // 正常吃物品
  const handleEatItem = (tier: 1 | 2 | 3) => {
    const success = inventoryState.consumeItemByTier(tier);
    if (success) {
      Alert.alert('食用成功', `T${tier} 物品已消耗`);
    } else {
      Alert.alert('無法食用', `背包中沒有 T${tier} 物品`);
    }
  };

  // 強制吃物品
  const handleForceEatItem = (tier: 1 | 2 | 3) => {
    const success = inventoryState.forceConsumeItemByTier(tier);
    if (success) {
      Alert.alert('強制食用成功', `T${tier} 物品已消耗（體力可能溢出）`);
    } else {
      Alert.alert('無法食用', `背包中沒有 T${tier} 物品`);
    }
  };

  if (!visible) return null;

  // ⭐ Mini Mode: 只顯示關鍵指標
  if (!isExpanded) {
    return (
      <TouchableOpacity 
        style={styles.miniContainer}
        onPress={() => setIsExpanded(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.miniTitle}>DEV: v9.0+</Text>
        <Text style={styles.miniText}>
          Speed: {gpsData.speed !== null ? `${gpsData.speed.toFixed(1)} km/h` : 'N/A'} | 
          Load: {loadPercentage.toFixed(0)}%
        </Text>
      </TouchableOpacity>
    );
  }

  // ⭐ Expanded Mode: 顯示所有 6 個模組
  return (
    <View style={styles.expandedContainer}>
      {/* 標題欄 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Solefood Omni-Dashboard</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setIsExpanded(false)}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={true}
      >
        {/* ⭐ Module A: 容量與耐久核心 */}
        <View style={styles.module}>
          <Text style={styles.moduleTitle}>🟢 [A] CAPACITY & DURABILITY</Text>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Base Cap:</Text>
            <Text style={styles.formulaValue}>{CAPACITY.BASE_MAX_WEIGHT.toFixed(1)} kg</Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Expansion:</Text>
            <Text style={[styles.formulaValue, { color: sessionState.isTempExpanded ? '#4CAF50' : '#B0B0B0' }]}>
              {sessionState.isTempExpanded ? `Active (x${expansionMult})` : 'Inactive'}
            </Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Durability:</Text>
            <Text style={[styles.formulaValue, { color: playerState.durability >= 80 ? '#4CAF50' : playerState.durability >= 50 ? '#FFA500' : '#FF5252' }]}>
              {playerState.durability.toFixed(1)}%
            </Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Tier Status:</Text>
            <Text style={styles.formulaValue}>{getTierStatus(playerState.durability)}</Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Tier Multiplier:</Text>
            <Text style={styles.formulaValue}>x{durabilityTierMult.toFixed(2)}</Text>
          </View>
          
          {/* ⭐ 公式驗證 */}
          <View style={styles.formulaBox}>
            <Text style={styles.formulaText}>
              {CAPACITY.BASE_MAX_WEIGHT} × {expansionMult} × {durabilityTierMult.toFixed(2)} = {calculatedCap.toFixed(2)} kg
            </Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Eff. Capacity:</Text>
            <Text style={[styles.formulaValue, { color: '#4CAF50', fontWeight: '700' }]}>
              {effectiveMaxWeight.toFixed(2)} kg
            </Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Current Load:</Text>
            <Text style={[styles.formulaValue, { color: isBackpackNearFull ? '#FF5252' : '#4CAF50' }]}>
              {currentWeight.toFixed(1)} / {effectiveMaxWeight.toFixed(1)} ({loadPercentage.toFixed(1)}%)
            </Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Collapse Risk:</Text>
            <Text style={[styles.formulaValue, { color: collapseRisk ? '#FF5252' : '#4CAF50' }]}>
              {collapseRisk ? '🚨 TRAPPED' : 'FALSE'}
            </Text>
          </View>
        </View>

        {/* ⭐ Module B: 體力與消耗物理學 */}
        <View style={styles.module}>
          <Text style={styles.moduleTitle}>⚡ [B] STAMINA & PHYSICS</Text>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Stamina:</Text>
            <Text style={[styles.formulaValue, { color: playerState.stamina >= 50 ? '#4CAF50' : '#FFA500' }]}>
              {playerState.stamina.toFixed(1)} / {playerState.maxStamina}
            </Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Load Penalty:</Text>
            <Text style={styles.formulaValue}>
              x{loadPenalty.toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Burn Rate:</Text>
            <Text style={styles.formulaValue}>
              {burnRate.toFixed(1)} pts/km
            </Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Last Action:</Text>
            <Text style={styles.formulaValue}>{lastStaminaChange}</Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Speed (GPS):</Text>
            <Text style={[styles.formulaValue, { color: gpsData.speed && gpsData.speed > 50 ? '#FF5252' : '#4CAF50' }]}>
              {gpsData.speed !== null ? `${gpsData.speed.toFixed(1)} km/h` : 'N/A'}
            </Text>
          </View>
        </View>

        {/* ⭐ Module C: 衛生與價值經濟 */}
        <View style={styles.module}>
          <Text style={styles.moduleTitle}>🦠 [C] HYGIENE & VALUE</Text>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Hygiene:</Text>
            <Text style={[styles.formulaValue, { color: playerState.hygiene >= 90 ? '#4CAF50' : '#FFA500' }]}>
              {playerState.hygiene.toFixed(1)}%
            </Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Hyg. Tier:</Text>
            <Text style={styles.formulaValue}>
              x{hygieneTierMult.toFixed(2)} {hygieneTierMult >= 1.0 ? '(Perfect)' : '(Degraded)'}
            </Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Bag Value:</Text>
            <Text style={styles.formulaValue}>{totalSoleValue.toFixed(0)} $SOLE</Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Est. Payout:</Text>
            <Text style={[styles.formulaValue, { color: '#4CAF50', fontWeight: '700' }]}>
              {estPayout.toFixed(0)} $SOLE
            </Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Repair Cost:</Text>
            <Text style={styles.formulaValue}>{repairCost.toFixed(0)} $SOLE</Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Clean Cost:</Text>
            <Text style={styles.formulaValue}>{cleanCost.toFixed(0)} $SOLE</Text>
          </View>
        </View>

        {/* ⭐ Module D: 地圖與開拓者 */}
        <View style={styles.module}>
          <Text style={styles.moduleTitle}>🗺️ [D] MAP & H3</Text>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>H3 Index:</Text>
            <Text style={[styles.formulaValue, styles.monoText]}>
              {currentH3Index ? `${currentH3Index.substring(0, 12)}...` : 'N/A'}
            </Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Zone State:</Text>
            <Text style={[styles.formulaValue, { color: isExplored ? '#4CAF50' : '#B0B0B0' }]}>
              {isExplored ? '🟢 Explored' : '🌫️ Gray'}
            </Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Pathfinder:</Text>
            <Text style={[styles.formulaValue, { color: isPathfinder ? '#4CAF50' : '#B0B0B0' }]}>
              {isPathfinder ? '✨ BONUS ACTIVE' : 'Inactive'}
            </Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Distance:</Text>
            <Text style={styles.formulaValue}>{sessionState.sessionDistance.toFixed(2)} km</Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Deep Zone:</Text>
            <Text style={[styles.formulaValue, { color: isInDeepZone ? '#4CAF50' : '#B0B0B0' }]}>
              {isInDeepZone ? 'YES (T3 x2)' : 'NO'}
            </Text>
          </View>
        </View>

        {/* ⭐ Module E: 機率矩陣與物品 */}
        <View style={styles.module}>
          <Text style={styles.moduleTitle}>🎲 [E] RNG & DROP MATRIX</Text>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Streak:</Text>
            <Text style={styles.formulaValue}>{streak} Days</Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Streak Bonus:</Text>
            <Text style={styles.formulaValue}>+{streakBonus.toFixed(1)}%</Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Base Rates:</Text>
            <Text style={styles.formulaValue}>
              T1: {ITEM_DISTRIBUTION.T1_PERCENTAGE}% / T2: {ITEM_DISTRIBUTION.T2_PERCENTAGE}% / T3: {ITEM_DISTRIBUTION.T3_PERCENTAGE}%
            </Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Final Rates:</Text>
            <Text style={[styles.formulaValue, { color: '#4CAF50' }]}>
              T1: {finalT1Rate.toFixed(1)}% / T2: {finalT2Rate.toFixed(1)}% / T3: {finalT3Rate.toFixed(1)}%
            </Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Inventory:</Text>
            <Text style={styles.formulaValue}>
              T1: {tierCounts.t1} / T2: {tierCounts.t2} / T3: {tierCounts.t3}
            </Text>
          </View>
        </View>

        {/* ⭐ Module F: 系統日誌與廣告 */}
        <View style={styles.module}>
          <Text style={styles.moduleTitle}>🛠️ [F] SYSTEM & AD</Text>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Ad: Expand:</Text>
            <Text style={styles.formulaValue}>
              {sessionState.adCaps.capacity.used} / {sessionState.adCaps.capacity.cap}
            </Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Ad: Stamina:</Text>
            <Text style={styles.formulaValue}>
              {sessionState.adCaps.stamina.used} / {sessionState.adCaps.stamina.cap}
            </Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>GPS Accuracy:</Text>
            <Text style={[styles.formulaValue, { color: gpsData.accuracy && gpsData.accuracy <= 20 ? '#4CAF50' : '#FFA500' }]}>
              {gpsData.accuracy !== null ? `${gpsData.accuracy <= 20 ? 'High' : 'Low'} (${gpsData.accuracy.toFixed(1)}m)` : 'N/A'}
            </Text>
          </View>
          
          <View style={styles.formulaRow}>
            <Text style={styles.formulaLabel}>Last Error:</Text>
            <Text style={styles.formulaValue}>None</Text>
          </View>
        </View>

        {/* 原有的上帝模式控制和消耗品測試 */}
        {/* 區塊：上帝模式控制 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎮 上帝模式控制</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>連續簽到天數:</Text>
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={[styles.controlButton, styles.controlButtonSmall]}
                onPress={() => adjustStreak(-1)}
              >
                <Text style={styles.controlButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.value}>{sessionState.luckGradient.streak} 天</Text>
              <TouchableOpacity
                style={[styles.controlButton, styles.controlButtonSmall]}
                onPress={() => adjustStreak(1)}
              >
                <Text style={styles.controlButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.expandButton]}
            onPress={expandCapacity}
          >
            <Text style={styles.actionButtonText}>📦 擴充背包 (+50%)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.addItemButton]}
            onPress={handleAddRandomItem}
          >
            <Text style={styles.actionButtonText}>➕ 添加隨機物品</Text>
          </TouchableOpacity>
        </View>

        {/* 區塊 C：消耗品測試 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍽️ 消耗品測試</Text>
          
          {/* T1 */}
          <View style={styles.consumableRow}>
            <View style={styles.consumableInfo}>
              <Text style={styles.label}>T1 物品:</Text>
              <Text style={styles.value}>{tierCounts.t1} 個</Text>
            </View>
            <View style={styles.consumableButtons}>
              <TouchableOpacity
                style={[styles.consumableButton, styles.eatButton]}
                onPress={() => handleEatItem(1)}
                disabled={tierCounts.t1 === 0}
              >
                <Text style={styles.consumableButtonText}>Eat T1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.consumableButton, styles.forceButton]}
                onPress={() => handleForceEatItem(1)}
                disabled={tierCounts.t1 === 0}
              >
                <Text style={styles.consumableButtonText}>Force T1</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* T2 */}
          <View style={styles.consumableRow}>
            <View style={styles.consumableInfo}>
              <Text style={styles.label}>T2 物品:</Text>
              <Text style={styles.value}>{tierCounts.t2} 個</Text>
            </View>
            <View style={styles.consumableButtons}>
              <TouchableOpacity
                style={[styles.consumableButton, styles.eatButton]}
                onPress={() => handleEatItem(2)}
                disabled={tierCounts.t2 === 0}
              >
                <Text style={styles.consumableButtonText}>Eat T2</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.consumableButton, styles.forceButton]}
                onPress={() => handleForceEatItem(2)}
                disabled={tierCounts.t2 === 0}
              >
                <Text style={styles.consumableButtonText}>Force T2</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* T3 */}
          <View style={styles.consumableRow}>
            <View style={styles.consumableInfo}>
              <Text style={styles.label}>T3 物品:</Text>
              <Text style={styles.value}>{tierCounts.t3} 個</Text>
            </View>
            <View style={styles.consumableButtons}>
              <TouchableOpacity
                style={[styles.consumableButton, styles.eatButton]}
                onPress={() => handleEatItem(3)}
                disabled={tierCounts.t3 === 0}
              >
                <Text style={styles.consumableButtonText}>Eat T3</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.consumableButton, styles.forceButton]}
                onPress={() => handleForceEatItem(3)}
                disabled={tierCounts.t3 === 0}
              >
                <Text style={styles.consumableButtonText}>Force T3</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // ⭐ Mini Mode 樣式
  miniContainer: {
    position: 'absolute',
    top: 120,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
    zIndex: 1000,
  },
  miniTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4CAF50',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  miniText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  // ⭐ Expanded Mode 樣式
  expandedContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 9999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 175, 80, 0.3)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
    fontFamily: 'monospace',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  // ⭐ Module 樣式
  module: {
    marginBottom: 24,
    padding: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  formulaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  formulaLabel: {
    fontSize: 11,
    color: '#B0B0B0',
    fontFamily: 'monospace',
    flex: 1,
  },
  formulaValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    textAlign: 'right',
    flex: 2,
  },
  monoText: {
    fontFamily: 'monospace',
  },
  formulaBox: {
    marginVertical: 8,
    padding: 8,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  formulaText: {
    fontSize: 11,
    color: '#FFC107',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  // 原有樣式保留
  container: {
    position: 'absolute',
    top: 120,
    left: 8,
    width: 160,
    maxHeight: '70%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 1000,
  },
  section: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.5)',
  },
  debugLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFA500',
    flex: 1,
  },
  debugValue: {
    fontSize: 11,
    color: '#FFFFFF',
    textAlign: 'right',
    flex: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,  // 減少間距
  },
  label: {
    fontSize: 10,  // 縮小字體
    color: '#B0B0B0',
    flex: 1,
  },
  value: {
    fontSize: 10,  // 縮小字體
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  warningBox: {
    marginTop: 8,  // 減少間距
    padding: 8,  // 減少 padding
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF5252',
  },
  warningText: {
    fontSize: 10,  // 縮小字體
    fontWeight: '700',
    color: '#FF5252',
    textAlign: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlButton: {
    backgroundColor: '#2196F3',
    width: 24,  // 縮小按鈕
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonSmall: {
    width: 24,  // 縮小按鈕
    height: 24,
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 14,  // 縮小字體
    fontWeight: '700',
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 6,  // 減少 padding
    paddingHorizontal: 10,  // 減少 padding
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 6,  // 減少間距
  },
  expandButton: {
    backgroundColor: '#FF9800',
  },
  addItemButton: {
    backgroundColor: '#9C27B0',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 10,  // 縮小字體
    fontWeight: '600',
  },
  consumableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  consumableInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  consumableButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  consumableButton: {
    paddingVertical: 4,  // 減少 padding
    paddingHorizontal: 8,  // 減少 padding
    borderRadius: 4,
    minWidth: 55,  // 縮小最小寬度
    alignItems: 'center',
  },
  eatButton: {
    backgroundColor: '#4CAF50',
  },
  forceButton: {
    backgroundColor: '#F44336',
  },
  consumableButtonText: {
    color: '#FFFFFF',
    fontSize: 9,  // 縮小字體
    fontWeight: '600',
  },
});