/**
 * StackedResourceBar - 堆疊式資源條組件
 * 垂直佈局：圖標和數字在上，進度條在下
 * 設計風格：可愛且極簡，數字大而清晰
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface StackedResourceBarProps {
  percentage: number; // 0-100
  color: string; // 主色調（例如 '#FF9F43'）
  icon?: React.ReactNode; // 3D 圖標組件
  label: string; // 標籤文字（例如 "100/100" 或 "80%"）
  width?: number; // 組件寬度（預設 120px）
}

export const StackedResourceBar: React.FC<StackedResourceBarProps> = ({
  percentage,
  color,
  icon,
  label,
  width = 120,
}) => {
  const fillWidth = useSharedValue(0);

  useEffect(() => {
    // 使用 withSpring 讓動畫更有彈性感
    fillWidth.value = withSpring(percentage, {
      damping: 15,
      stiffness: 100,
      mass: 0.8,
    });
  }, [percentage]);

  const animatedFillStyle = useAnimatedStyle(() => {
    return {
      width: `${fillWidth.value}%`,
    };
  });

  return (
    <View style={[styles.container, { width }]}>
      {/* 左側：圖標 */}
      {icon && (
        <View style={styles.iconContainer}>
          {icon}
        </View>
      )}
      
      {/* 右側：數字和進度條（分兩排） */}
      <View style={styles.rightSection}>
        {/* 第一排：數字（與下方 bar 同寬，不超出） */}
        <Text style={styles.labelText} numberOfLines={1} ellipsizeMode="tail">{label}</Text>
        
        {/* 第二排：進度條 */}
        <View style={styles.progressTrack}>
          {/* 填充層（動畫） */}
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: color,
              },
              animatedFillStyle,
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', // 橫向佈局：圖標在左，內容在右
    alignItems: 'center', // 垂直居中對齊
  },
  iconContainer: {
    // 圖標容器大小會根據傳入的 icon size 動態調整
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2, // 更緊密的間距
    backgroundColor: 'transparent', // 確保容器背景透明
  },
  rightSection: {
    flex: 1, // 佔據剩餘空間
    minWidth: 0, // 允許在 flex 中正確縮小
    flexDirection: 'column', // 縱向佈局：數字在上，進度條在下
    justifyContent: 'center', // 垂直居中
    alignItems: 'stretch', // 讓數字和進度條同寬，對齊左右邊界
    overflow: 'hidden', // 防止數字超出
  },
  labelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: 'monospace',
    letterSpacing: 0.2,
    marginBottom: 6, // 數字和進度條之間的均勻間距
    textAlign: 'left', // 文字靠左對齊
    alignSelf: 'stretch', // 與下方 bar 同寬
    width: '100%', // 不超出下方 bar 的寬度
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    height: '100%',
    borderRadius: 999,
    // width 會通過動畫動態設置
  },
});
