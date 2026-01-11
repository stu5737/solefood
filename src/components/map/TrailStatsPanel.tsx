/**
 * 軌跡統計面板
 * 顯示歷史軌跡的統計數據（總距離、平均速度等）
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { calculateDistance, calculateSpeed } from '../../core/math/distance';
import type { GPSHistoryPoint } from '../../services/gpsHistory';

interface TrailStatsPanelProps {
  trail: GPSHistoryPoint[];
}

export const TrailStatsPanel: React.FC<TrailStatsPanelProps> = ({ trail }) => {
  if (trail.length === 0) {
    return null;
  }

  // 計算總距離（使用 Haversine 公式）
  let totalDistance = 0;
  for (let i = 1; i < trail.length; i++) {
    totalDistance += calculateDistance(
      { latitude: trail[i - 1].latitude, longitude: trail[i - 1].longitude },
      { latitude: trail[i].latitude, longitude: trail[i].longitude }
    );
  }

  // 計算總時間（毫秒）
  const startTime = trail[0].timestamp;
  const endTime = trail[trail.length - 1].timestamp;
  const totalTime = endTime - startTime;

  // 計算平均速度（km/h）
  const avgSpeed = calculateSpeed(totalDistance, totalTime);

  // 格式化時間（時:分:秒）
  const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>總距離:</Text>
        <Text style={styles.value}>{totalDistance.toFixed(2)} km</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>平均速度:</Text>
        <Text style={[styles.value, avgSpeed > 100 ? styles.warningValue : null]}>
          {avgSpeed.toFixed(1)} km/h
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>總時間:</Text>
        <Text style={styles.value}>{formatDuration(totalTime)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>軌跡點數:</Text>
        <Text style={styles.value}>{trail.length} 點</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
  warningValue: {
    color: '#FF5252', // 如果速度異常高（可能是GPS飄移），顯示紅色警告
  },
});
