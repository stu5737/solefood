/**
 * DurabilityBar 組件
 * 顯示背包耐久度，工業風格設計
 * Solefood MVP v8.7
 * 
 * 強調「耐久度意識」：當背包滿且會話活躍時，顯示警告動畫
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface DurabilityBarProps {
  value: number;  // 當前耐久度（0-100）
  isFull?: boolean;  // 背包是否已滿（用於觸發警告動畫）
  isActive?: boolean; // 會話是否活躍（用於觸發警告動畫）
}

export const DurabilityBar: React.FC<DurabilityBarProps> = ({ value, isFull = false, isActive = false }) => {
  const percentage = Math.max(0, Math.min(100, value));

  // 根據耐久度決定顏色
  const getColor = () => {
    if (percentage > 70) return '#2196F3'; // 藍色
    if (percentage > 30) return '#FF9800'; // 橙色
    return '#F44336'; // 紅色
  };

  const barColor = getColor();
  const isBroken = percentage === 0;
  
  // 警告動畫：當背包滿且會話活躍時，顯示脈衝動畫
  const warningAnimation = useRef(new Animated.Value(1)).current;
  const shouldWarn = isFull && isActive && !isBroken;
  
  useEffect(() => {
    if (shouldWarn) {
      // 脈衝動畫：1.0 → 1.1 → 1.0，持續循環
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(warningAnimation, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(warningAnimation, {
            toValue: 1.0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      // 停止動畫並重置
      warningAnimation.setValue(1);
    }
  }, [shouldWarn, warningAnimation]);

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>耐久度 (Durability)</Text>
        <Text style={[styles.value, isBroken && styles.brokenText]}>
          {isBroken ? 'BROKEN' : `${Math.round(value)}%`}
        </Text>
        {shouldWarn && (
          <Text style={styles.warningLabel}>⚠️ 磨損中</Text>
        )}
      </View>
      <Animated.View 
        style={[
          styles.barContainer,
          shouldWarn && {
            transform: [{ scale: warningAnimation }],
          },
        ]}
      >
        <View style={[
          styles.barBackground, 
          isBroken && styles.brokenBackground,
          shouldWarn && styles.warningBackground,
        ]}>
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
      </Animated.View>
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
  warningBackground: {
    // 警告狀態：橙色邊框，表示正在磨損
    borderColor: '#FF9800',
    borderWidth: 2,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  warningLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 8,
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
