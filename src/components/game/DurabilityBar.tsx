/**
 * DurabilityBar 組件
 * 顯示背包耐久度，工業風格設計
 * Solefood MVP v8.7
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DurabilityBarProps {
  value: number;  // 當前耐久度（0-100）
}

export const DurabilityBar: React.FC<DurabilityBarProps> = ({ value }) => {
  const percentage = Math.max(0, Math.min(100, value));

  // 根據耐久度決定顏色
  const getColor = () => {
    if (percentage > 70) return '#2196F3'; // 藍色
    if (percentage > 30) return '#FF9800'; // 橙色
    return '#F44336'; // 紅色
  };

  const barColor = getColor();
  const isBroken = percentage === 0;

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>耐久度 (Durability)</Text>
        <Text style={[styles.value, isBroken && styles.brokenText]}>
          {isBroken ? 'BROKEN' : `${Math.round(value)}%`}
        </Text>
      </View>
      <View style={styles.barContainer}>
        <View style={[styles.barBackground, isBroken && styles.brokenBackground]}>
          {!isBroken && (
            <View
              style={[
                styles.barFill,
                {
                  width: `${percentage}%`,
                  backgroundColor: barColor,
                },
              ]}
            />
          )}
          {isBroken && (
            <View style={styles.brokenOverlay}>
              <Text style={styles.brokenLabel}>COLLAPSED</Text>
              <Text style={styles.brokenSubtext}>背包已損壞</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  brokenText: {
    color: '#F44336',
    fontWeight: '700',
  },
  barContainer: {
    width: '100%',
  },
  barBackground: {
    width: '100%',
    height: 32,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#B0B0B0',
    // 工業風格：添加陰影和紋理效果
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  brokenBackground: {
    backgroundColor: '#424242',
    borderColor: '#F44336',
    borderWidth: 2,
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
    // 工業風格：添加漸變效果（使用線性漸變模擬）
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.2)',
  },
  brokenOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#424242',
  },
  brokenLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F44336',
    letterSpacing: 2,
    marginBottom: 2,
  },
  brokenSubtext: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
  },
});
