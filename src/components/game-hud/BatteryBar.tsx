/**
 * BatteryBar - 電池形狀進度條組件
 * 參考 iPhone 電池圖標設計
 * 
 * 設計特點：
 * - 電池外框（帶小凸起）
 * - 內部填充顯示百分比
 * - 圖標在左側
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface BatteryBarProps {
  percentage: number; // 0-100
  color: string; // 填充顏色
  icon?: React.ReactNode; // 圖標組件
  label: string; // 標籤文字
  height?: number; // 電池高度（預設 24）
}

export const BatteryBar: React.FC<BatteryBarProps> = ({
  percentage,
  color,
  icon,
  label,
  height = 24,
}) => {
  const fillWidth = useSharedValue(0);

  useEffect(() => {
    fillWidth.value = withSpring(percentage, {
      damping: 15,
      stiffness: 100,
    });
  }, [percentage]);

  const animatedFillStyle = useAnimatedStyle(() => {
    return {
      width: `${fillWidth.value}%`,
    };
  });

  const batteryWidth = height * 3; // 電池寬度是高度的 3 倍
  const batteryCornerRadius = height * 0.25; // 圓角
  const batteryTipWidth = height * 0.2; // 電池凸起寬度
  const batteryTipHeight = height * 0.6; // 電池凸起高度
  const innerPadding = height * 0.2; // 內部填充邊距
  const borderWidth = 2;

  return (
    <View style={styles.container}>
      {/* 圖標容器（左側） */}
      {icon && (
        <View style={[styles.iconContainer, { width: height + 4, height: height + 4 }]}>
          {icon}
        </View>
      )}

      {/* 電池容器 */}
      <View style={[styles.batteryContainer, { height: height + 4 }]}>
        {/* 電池主體 */}
        <View
          style={[
            styles.batteryBody,
            {
              width: batteryWidth - batteryTipWidth,
              height,
              borderRadius: batteryCornerRadius,
              borderWidth,
            },
          ]}
        >
          {/* 底槽（深色背景） */}
          <View
            style={[
              styles.track,
              {
                borderRadius: batteryCornerRadius - borderWidth / 2,
                left: innerPadding,
                right: innerPadding,
                top: innerPadding,
                bottom: innerPadding,
              },
            ]}
          />

          {/* 填充層（動畫） */}
          <Animated.View
            style={[
              styles.fill,
              {
                backgroundColor: color,
                borderRadius: batteryCornerRadius - borderWidth / 2,
                left: innerPadding,
                top: innerPadding,
                bottom: innerPadding,
              },
              animatedFillStyle,
            ]}
          />

          {/* 文字標籤（居中） */}
          <View style={styles.labelContainer}>
            <Text style={styles.labelText}>{label}</Text>
          </View>
        </View>

        {/* 電池凸起（右側） */}
        <View
          style={[
            styles.batteryTip,
            {
              width: batteryTipWidth,
              height: batteryTipHeight,
              borderRadius: batteryTipWidth / 2,
              borderWidth: borderWidth,
              borderColor: 'rgba(255, 255, 255, 0.6)',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  batteryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  batteryBody: {
    position: 'relative',
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  track: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  fill: {
    position: 'absolute',
    height: '100%',
  },
  labelContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  batteryTip: {
    marginLeft: -1, // 略微重疊
  },
});
