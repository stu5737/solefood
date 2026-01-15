/**
 * BackpackCard - 右下角背包卡片 (Pokémon GO 風格)
 * 極簡、緊湊、清晰
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { usePlayerStore } from '../../stores/playerStore';
import { useInventoryStore } from '../../stores/inventoryStore';

interface BackpackCardProps {
  onPress?: () => void;
}

export const BackpackCard: React.FC<BackpackCardProps> = ({ onPress }) => {
  const durability = usePlayerStore((state) => state.durability);
  const effectiveMaxWeight = usePlayerStore((state) => state.getEffectiveMaxWeight());
  const totalWeight = useInventoryStore((state) => state.totalWeight);

  // 計算負重百分比
  const loadPercentage = effectiveMaxWeight > 0 ? (totalWeight / effectiveMaxWeight) * 100 : 0;

  // 動態顏色
  const getLoadColor = (percentage: number): string => {
    if (percentage >= 95) return '#F44336'; // 紅色：幾乎滿了
    if (percentage >= 80) return '#FF9800'; // 橙色：接近滿了
    if (percentage >= 60) return '#FFC107'; // 黃色：有點重了
    return '#4CAF50'; // 綠色：正常
  };

  const loadColor = getLoadColor(loadPercentage);

  // 進度環參數
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - loadPercentage / 100);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* 背景圓環 */}
      <Svg style={styles.progressRing} width={80} height={80}>
        {/* 背景圓 */}
        <Circle
          cx={40}
          cy={40}
          r={radius}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={4}
          fill="none"
        />
        {/* 進度圓 */}
        <Circle
          cx={40}
          cy={40}
          r={radius}
          stroke={loadColor}
          strokeWidth={4}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 40 40)`}
        />
      </Svg>

      {/* 背包圖示 */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📦</Text>
      </View>

      {/* 負重顯示 */}
      <View style={styles.weightInfo}>
        <Text style={[styles.currentWeight, { color: loadColor }]}>
          {totalWeight.toFixed(1)}
        </Text>
        <Text style={styles.divider}>/</Text>
        <Text style={styles.maxWeight}>{effectiveMaxWeight.toFixed(1)}</Text>
        <Text style={styles.unit}>kg</Text>
      </View>

      {/* 警告標記（耐久度低於 90%） */}
      {durability < 90 && (
        <View style={styles.warningBadge}>
          <Text style={styles.warningIcon}>⚠️</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    position: 'absolute',
  },
  iconContainer: {
    position: 'absolute',
    top: 8,
  },
  icon: {
    fontSize: 20,
  },
  weightInfo: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 30,
  },
  currentWeight: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  divider: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 1,
  },
  maxWeight: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'monospace',
  },
  unit: {
    fontSize: 8,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 1,
  },
  warningBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F44336',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  warningIcon: {
    fontSize: 10,
  },
});
