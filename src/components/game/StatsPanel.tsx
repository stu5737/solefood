/**
 * StatsPanel 組件
 * 顯示會話統計數據，連接到 Store
 * Solefood MVP v8.7
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePlayerStore } from '../../stores/playerStore';
import { useSessionStore } from '../../stores/sessionStore';

export const StatsPanel: React.FC = () => {
  // 從 Store 獲取狀態
  const playerState = usePlayerStore();
  const sessionState = useSessionStore();

  // 計算當前速度（從 sessionStore 獲取）
  // 如果 sessionStore 沒有 currentSpeed，則顯示 0
  const currentSpeed = 'currentSpeed' in sessionState ? (sessionState as any).currentSpeed : 0;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>統計數據</Text>
      
      <View style={styles.grid}>
        {/* 距離 */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>距離</Text>
          <Text style={styles.statValue}>{sessionState.totalDistance.toFixed(2)}</Text>
          <Text style={styles.statUnit}>km</Text>
        </View>

        {/* 速度 */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>速度</Text>
          <Text style={styles.statValue}>{currentSpeed.toFixed(1)}</Text>
          <Text style={styles.statUnit}>km/h</Text>
        </View>

        {/* 負重 */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>負重</Text>
          <Text style={styles.statValue}>
            {playerState.currentWeight.toFixed(1)} / {playerState.maxWeight.toFixed(1)}
          </Text>
          <Text style={styles.statUnit}>kg</Text>
        </View>

        {/* 估算價值 - 白皮書 v8.7 關鍵指標 */}
        <View style={[styles.statCard, styles.valueCard]}>
          <Text style={styles.statLabel}>估算價值</Text>
          <Text style={[styles.statValue, styles.valueText]}>
            ${sessionState.estimatedValue.toFixed(2)}
          </Text>
          <Text style={styles.statUnit}>USD</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  valueCard: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  valueText: {
    color: '#2E7D32',
  },
  statUnit: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
  },
});
