/**
 * 模擬器模式組件
 * 用於測試拾取邏輯，模擬行走並觸發掉落
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Alert,
} from 'react-native';
import { entropyEngine } from '../../core/entropy/engine';
import { usePlayerStore } from '../../stores/playerStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { calculateItemDropRate } from '../../core/math/luck';
import { ITEM_DISTRIBUTION } from '../../utils/constants';
import type { MovementInput } from '../../core/entropy/events';

interface SimulatorModeProps {
  isCollecting: boolean;
  onStartCollection: () => void;
  onEndCollection: (type: 'picnic' | 'unload') => void;
}

export const SimulatorMode: React.FC<SimulatorModeProps> = ({
  isCollecting,
  onStartCollection,
  onEndCollection,
}) => {
  const playerState = usePlayerStore();
  const sessionState = useSessionStore();
  const inventoryState = useInventoryStore();
  
  // 獲取有效最大容量（考慮臨時擴容和耐久度階層）
  const effectiveMaxWeight = playerState.getEffectiveMaxWeight(sessionState.isTempExpanded);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationInterval, setSimulationInterval] = useState<NodeJS.Timeout | null>(null);

  // 模擬行走（觸發拾取）
  const simulateWalk = useCallback((distanceKm: number = 0.1) => {
    if (!isCollecting) {
      Alert.alert('提示', '請先點擊「開始採集」按鈕');
      return;
    }

    const input: MovementInput = {
      distance: distanceKm, // 0.1km = 100m，觸發一次拾取
      speed: 5, // 模擬步行速度 5 km/h
      timestamp: Date.now(),
      // 可以添加強制掉落階層來測試：forceLootTier: 2
    };

    try {
      const result = entropyEngine.processMovement(input);
      console.log('[SimulatorMode] Simulated walk result:', result);

      // 顯示拾取結果（如果有）
      if (result.events && result.events.length > 0) {
        const lootEvents = result.events.filter(e => 
          e.type === 'loot_success' || e.type === 'loot_converted' || e.type === 'loot_failed'
        );
        
        if (lootEvents.length > 0) {
          const lastEvent = lootEvents[lootEvents.length - 1];
          if (lastEvent.type === 'loot_success' && 'item' in lastEvent.data) {
            const item = lastEvent.data.item;
            Alert.alert(
              '🎉 拾取成功！',
              `獲得 T${item.tier} 物品\n價值: $${item.value} SOLE\n重量: ${item.weight} kg`,
              [{ text: '確定' }]
            );
          } else if (lastEvent.type === 'loot_converted' && 'netAmount' in lastEvent.data) {
            const netAmount = lastEvent.data.netAmount || 0;
            const tier = lastEvent.data.tier || 1;
            Alert.alert(
              '🍽️ 自動消耗',
              `背包已滿，T${tier} 物品已轉化為體力\n淨收益: +${netAmount.toFixed(1)} 體力`,
              [{ text: '確定' }]
            );
          } else if (lastEvent.type === 'loot_failed') {
            Alert.alert('❌ 拾取失敗', '背包已滿或體力不足', [{ text: '確定' }]);
          }
        }
      }
    } catch (error) {
      console.error('[SimulatorMode] Error simulating walk:', error);
      Alert.alert('錯誤', `模擬行走失敗: ${error}`, [{ text: '確定' }]);
    }
  }, [isCollecting]);

  // 開始/停止自動模擬
  const toggleAutoSimulation = useCallback(() => {
    if (isSimulating) {
      // 停止模擬
      if (simulationInterval) {
        clearInterval(simulationInterval);
        setSimulationInterval(null);
      }
      setIsSimulating(false);
    } else {
      // 開始模擬
      if (!isCollecting) {
        Alert.alert('提示', '請先點擊「開始採集」按鈕');
        return;
      }

      const interval = setInterval(() => {
        simulateWalk(0.1); // 每 2 秒模擬行走 0.1km
      }, 2000);

      setSimulationInterval(interval);
      setIsSimulating(true);
    }
  }, [isSimulating, simulationInterval, isCollecting, simulateWalk]);

  // 模擬快速移動（測試長距離）
  const simulateFastWalk = useCallback(() => {
    simulateWalk(0.5); // 模擬 0.5km 快速移動
  }, [simulateWalk]);

  // 模擬慢速移動（測試短距離累積）
  const simulateSlowWalk = useCallback(() => {
    simulateWalk(0.05); // 模擬 0.05km 慢速移動
  }, [simulateWalk]);

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 狀態顯示卡片 */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>📊 當前狀態</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>體力:</Text>
            <Text style={[styles.statusValue, { color: playerState.stamina < 30 ? '#FF5252' : '#4CAF50' }]}>
              {playerState.stamina.toFixed(1)} / {playerState.maxStamina}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>負重:</Text>
            <Text style={[styles.statusValue, { color: (inventoryState.totalWeight || 0) >= effectiveMaxWeight * 0.9 ? '#FF9800' : '#2196F3' }]}>
              {(inventoryState.totalWeight ?? 0).toFixed(1)} / {effectiveMaxWeight.toFixed(1)} kg
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>耐久度:</Text>
            <Text style={[styles.statusValue, { color: playerState.durability < 50 ? '#FF5252' : '#4CAF50' }]}>
              {playerState.durability.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>衛生度:</Text>
            <Text style={[styles.statusValue, { color: playerState.hygiene < 50 ? '#FF5252' : '#4CAF50' }]}>
              {playerState.hygiene.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>物品數量:</Text>
            <Text style={styles.statusValue}>{inventoryState.items.length} 個</Text>
          </View>
        </View>

        {/* 模擬控制按鈕 */}
        <View style={styles.buttonGroup}>
          <Text style={styles.sectionTitle}>🎮 模擬行走</Text>
          
          {/* 單次模擬按鈕 */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.simButton, styles.slowButton]}
              onPress={simulateSlowWalk}
              disabled={!isCollecting}
            >
              <Text style={styles.simButtonText}>🐢 慢速 (0.05km)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.simButton, styles.normalButton]}
              onPress={() => simulateWalk(0.1)}
              disabled={!isCollecting}
            >
              <Text style={styles.simButtonText}>🚶 正常 (0.1km)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.simButton, styles.fastButton]}
              onPress={simulateFastWalk}
              disabled={!isCollecting}
            >
              <Text style={styles.simButtonText}>🏃 快速 (0.5km)</Text>
            </TouchableOpacity>
          </View>

          {/* 自動模擬切換 */}
          <TouchableOpacity
            style={[styles.autoButton, isSimulating && styles.autoButtonActive]}
            onPress={toggleAutoSimulation}
            disabled={!isCollecting}
          >
            <Text style={styles.autoButtonText}>
              {isSimulating ? '⏸️ 停止自動模擬' : '▶️ 開始自動模擬 (每2秒)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 掉落機率顯示 */}
        <View style={styles.probabilityCard}>
          <Text style={styles.sectionTitle}>🎲 當前掉落機率</Text>
          {(() => {
            // 計算當前掉落機率（使用 luckGradient.currentT2Chance 考慮衰減）
            const t1Rate = calculateItemDropRate(1, sessionState.luckGradient.streak, sessionState.pathfinder.isPathfinder, sessionState.deepZone.isInDeepZone, sessionState.luckGradient.currentT2Chance);
            const t2Rate = calculateItemDropRate(2, sessionState.luckGradient.streak, sessionState.pathfinder.isPathfinder, sessionState.deepZone.isInDeepZone, sessionState.luckGradient.currentT2Chance);
            const t3Rate = calculateItemDropRate(3, sessionState.luckGradient.streak, sessionState.pathfinder.isPathfinder, sessionState.deepZone.isInDeepZone, sessionState.luckGradient.currentT2Chance);
            
            return (
              <>
                <View style={styles.probabilityRow}>
                  <Text style={styles.probabilityLabel}>T1 掉落率:</Text>
                  <Text style={styles.probabilityValue}>
                    {t1Rate.toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.probabilityRow}>
                  <Text style={styles.probabilityLabel}>T2 掉落率:</Text>
                  <Text style={[styles.probabilityValue, { color: '#4CAF50' }]}>
                    {t2Rate.toFixed(1)}%
                  </Text>
                </View>
                <View style={styles.probabilityRow}>
                  <Text style={styles.probabilityLabel}>T3 掉落率:</Text>
                  <Text style={[styles.probabilityValue, { color: '#FF9800' }]}>
                    {t3Rate.toFixed(2)}%
                  </Text>
                </View>
                <View style={styles.probabilityRow}>
                  <Text style={styles.probabilityLabel}>連登天數:</Text>
                  <Text style={styles.probabilityValue}>
                    {sessionState.luckGradient.streak} 天
                  </Text>
                </View>
                {sessionState.pathfinder.isPathfinder && (
                  <View style={[styles.probabilityRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.1)' }]}>
                    <Text style={[styles.probabilityValue, { color: '#9C27B0' }]}>
                      ✨ 開拓者模式激活 (T2 +10%)
                    </Text>
                  </View>
                )}
                {sessionState.deepZone.isInDeepZone && (
                  <View style={[styles.probabilityRow, { marginTop: 8 }]}>
                    <Text style={[styles.probabilityValue, { color: '#FF9800' }]}>
                      ⚡ 深層領域 (T3 x2)
                    </Text>
                  </View>
                )}
              </>
            );
          })()}
        </View>

        {/* 物品列表 */}
        {inventoryState.items.length > 0 && (
          <View style={styles.inventoryCard}>
            <Text style={styles.sectionTitle}>📦 背包物品 ({inventoryState.items.length})</Text>
            <ScrollView style={styles.inventoryList} nestedScrollEnabled>
              {inventoryState.items.map((item, index) => (
                <View key={index} style={styles.inventoryItem}>
                  <Text style={styles.inventoryItemText}>
                    T{item.tier} · {item.weight.toFixed(1)}kg · ${item.value} SOLE
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // 為底部按鈕留出空間
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  buttonGroup: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  simButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  slowButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderColor: '#2196F3',
  },
  normalButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: '#4CAF50',
  },
  fastButton: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    borderColor: '#FF9800',
  },
  simButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  autoButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(156, 39, 176, 0.2)',
    borderWidth: 1,
    borderColor: '#9C27B0',
  },
  autoButtonActive: {
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
    borderColor: '#F44336',
  },
  autoButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  probabilityCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  probabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  probabilityLabel: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  probabilityValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  inventoryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: 300,
  },
  inventoryList: {
    maxHeight: 200,
  },
  inventoryItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  inventoryItemText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
});
