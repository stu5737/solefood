/**
 * MapStatsOverlay - 地圖統計覆蓋層
 * 在地圖上顯示：速度、步數、運動時間、總距離
 * 參考設計圖：大號數字顯示，簡潔清晰
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SpeedIcon } from './SpeedIcon';
import { TimeIcon } from './TimeIcon';
import { StepsIcon } from './StepsIcon';

interface MapStatsOverlayProps {
  // 速度（km/h）
  speed: number;
  
  // 步數
  steps: number;
  
  // 運動時間（秒）
  exerciseTime: number;
  
  // 總距離（公里）
  totalDistance: number;
}

export const MapStatsOverlay: React.FC<MapStatsOverlayProps> = ({
  speed,
  steps,
  exerciseTime,
  totalDistance,
}) => {
  const insets = useSafeAreaInsets();
  
  // 格式化運動時間：MM:SS
  const formatExerciseTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  
  // 格式化總距離：顯示米（m）
  // totalDistance 已經是米，直接使用
  
  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* 中間區域：運動時間、速度、步數 */}
      <View style={[styles.middleSection, { top: insets.top + 120 }]} pointerEvents="box-none">
        {/* 第一排：三個數字 */}
        <View style={styles.valuesRow}>
          {/* 運動時間 */}
          <View style={styles.metricItem}>
            <View style={styles.iconAbove}>
              <TimeIcon size={32} />
            </View>
            <Text style={styles.metricValue}>{formatExerciseTime(exerciseTime)}</Text>
          </View>
          
          {/* 速度 */}
          <View style={styles.metricItem}>
            <View style={styles.iconAbove}>
              <SpeedIcon size={32} />
            </View>
            <Text style={styles.metricValue}>
              {speed >= 100
                ? `${(speed / 1000).toFixed(1)}k`
                : speed >= 10
                ? `${speed.toFixed(0)}`
                : `${speed.toFixed(1)}`}
            </Text>
          </View>
          
          {/* 步數 */}
          <View style={styles.metricItem}>
            <View style={styles.iconAbove}>
              <StepsIcon size={32} />
            </View>
            <Text style={styles.metricValue}>
              {steps >= 10000
                ? `${(steps / 1000).toFixed(1)}k`
                : steps.toLocaleString()}
            </Text>
          </View>
        </View>
        
        {/* 第二排：單位 */}
        <View style={styles.unitsRow}>
          <View style={styles.unitItem} />
          <View style={styles.unitItem}>
            <Text style={styles.metricUnit}>km/h</Text>
          </View>
          <View style={styles.unitItem} />
        </View>
      </View>
      
      {/* 底部：總距離（超過1000米時顯示為公里） */}
      <View style={[styles.bottomSection, { bottom: insets.bottom + 100 }]} pointerEvents="box-none">
        <Text style={styles.distanceValue}>
          {(() => {
            const distanceInMeters = totalDistance * 1000;
            if (distanceInMeters >= 1000) {
              return (distanceInMeters / 1000).toFixed(2);
            }
            return distanceInMeters.toFixed(2);
          })()}
        </Text>
        <Text style={styles.distanceUnit}>
          {(totalDistance * 1000) >= 1000 ? 'Kilometers' : 'Meters'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1500,
  },
  middleSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  valuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end', // 對齊底部，讓數字在同一基線
    width: '100%',
  },
  unitsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  metricItem: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  unitItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: 20, // 固定高度，確保對齊
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    fontFamily: 'monospace',
  },
  metricUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  iconAbove: {
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', // 確保容器背景透明
  },
  iconEmoji: {
    fontSize: 20,
    opacity: 0.7,
  },
  bottomSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    fontFamily: 'monospace',
  },
  distanceUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: '#CCCCCC',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
