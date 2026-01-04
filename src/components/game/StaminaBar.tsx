/**
 * StaminaBar 組件
 * 顯示玩家體力值，帶有平滑動畫效果
 * Solefood MVP v8.7
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface StaminaBarProps {
  value: number;      // 當前體力值（0-100）
  maxValue: number;  // 最大體力值（預設 100）
}

export const StaminaBar: React.FC<StaminaBarProps> = ({ value, maxValue = 100 }) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const percentage = Math.max(0, Math.min(100, (value / maxValue) * 100));

  // 動畫效果：平滑過渡寬度變化
  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: percentage,
      duration: 300,
      useNativeDriver: false, // width 動畫不支持原生驅動
    }).start();
  }, [percentage, animatedWidth]);

  // 根據體力值決定顏色
  const getColor = () => {
    if (percentage > 50) return '#4CAF50'; // 綠色
    if (percentage > 20) return '#FF9800'; // 橙色
    return '#F44336'; // 紅色
  };

  const barColor = getColor();

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>體力 (Stamina)</Text>
        <Text style={styles.value}>
          {Math.round(value)} / {maxValue}
        </Text>
      </View>
      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          <Animated.View
            style={[
              styles.barFill,
              {
                width: animatedWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: barColor,
              },
            ]}
          />
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
  barContainer: {
    width: '100%',
  },
  barBackground: {
    width: '100%',
    height: 28,
    backgroundColor: '#E0E0E0',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  barFill: {
    height: '100%',
    borderRadius: 14,
  },
});
