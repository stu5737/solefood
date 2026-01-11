/**
 * 開發者控制台 (Dev Dashboard)
 * 用於測試遊戲邏輯和真實 GPS 行為
 * 
 * 功能：
 * - 實時監控 GPS 數據（速度、精度）
 * - 背包狀態顯示（物品數量、負重）
 * - 上帝模式控制（調整 streak、擴容、添加物品）
 * - 消耗品測試（正常吃和強制吃）
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { usePlayerStore } from '../../stores/playerStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { locationService } from '../../services/location';
import type { LocationData } from '../../services/location';

interface DevDashboardProps {
  visible?: boolean;
}

export const DevDashboard: React.FC<DevDashboardProps> = ({ visible = true }) => {
  const playerState = usePlayerStore();
  const sessionState = useSessionStore();
  const inventoryState = useInventoryStore();

  // GPS 實時數據
  const [gpsData, setGpsData] = useState<{
    speed: number | null;
    accuracy: number | null;
    lastUpdate: number | null;
  }>({
    speed: null,
    accuracy: null,
    lastUpdate: null,
  });

  // 訂閱 GPS 更新
  useEffect(() => {
    if (!visible) return;

    const subscription = locationService.subscribeToLocationUpdates((location: LocationData, distance: number) => {
      setGpsData({
        speed: location.speed ? location.speed * 3.6 : null, // m/s 轉換為 km/h
        accuracy: location.accuracy || null,
        lastUpdate: location.timestamp,
      });
    });

    return () => {
      subscription.remove();
    };
  }, [visible]);

  // 獲取有效最大容量
  const effectiveMaxWeight = playerState.getEffectiveMaxWeight(sessionState.isTempExpanded);
  const currentWeight = inventoryState.totalWeight;
  const isBackpackNearFull = currentWeight >= effectiveMaxWeight * 0.9;

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

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
      >
        {/* 區塊 A：即時數據監控 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 即時數據監控</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>GPS 速度:</Text>
            <Text style={[styles.value, { color: gpsData.speed && gpsData.speed > 50 ? '#FF5252' : '#4CAF50' }]}>
              {gpsData.speed !== null ? `${gpsData.speed.toFixed(1)} km/h` : '無數據'}
            </Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>GPS 精度:</Text>
            <Text style={[styles.value, { color: gpsData.accuracy && gpsData.accuracy > 100 ? '#FF9800' : '#4CAF50' }]}>
              {gpsData.accuracy !== null ? `${gpsData.accuracy.toFixed(1)} m` : '無數據'}
            </Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>背包物品:</Text>
            <Text style={styles.value}>
              {inventoryState.items.length} 個
            </Text>
          </View>
          
          <View style={styles.row}>
            <Text style={styles.label}>負重:</Text>
            <Text style={[styles.value, { color: isBackpackNearFull ? '#FF5252' : '#2196F3' }]}>
              {currentWeight.toFixed(1)} / {effectiveMaxWeight.toFixed(1)} kg
            </Text>
          </View>
          
          {isBackpackNearFull && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>⚠️ 背包即將爆滿！(擴容救援)</Text>
            </View>
          )}
        </View>

        {/* 區塊 B：上帝模式控制 */}
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
  container: {
    position: 'absolute',
    top: 100, // 調整位置，確保不擋住頂部按鈕（modeSwitch 約 80px 高 + margin）
    left: 16,
    right: 16,
    maxHeight: '65%', // 稍微減少高度，避免佔用過多空間
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 1000, // 低於頂部按鈕的 zIndex (2000)
  },
  scrollView: {
    maxHeight: '100%',
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
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#B0B0B0',
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  warningBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF5252',
  },
  warningText: {
    fontSize: 14,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonSmall: {
    width: 32,
    height: 32,
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  expandButton: {
    backgroundColor: '#FF9800',
  },
  addItemButton: {
    backgroundColor: '#9C27B0',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 70,
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
    fontSize: 12,
    fontWeight: '600',
  },
});