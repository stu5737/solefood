/**
 * ResourceBar - 通用資源條組件
 * Supercell / Nintendo 風格：粗邊框圓角膠囊
 * 
 * 設計特點：
 * - 完全圓角膠囊形狀
 * - 粗邊框（2-3px）讓它看起來立體可愛
 * - 平滑動畫填充
 * - 圖標在左側，略微重疊
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface ResourceBarProps {
  percentage: number; // 0-100
  color: string; // 填充顏色（例如 '#FF9F43' 或 '#44CC00'）
  icon?: React.ReactNode; // 3D 圖標組件
  label: string; // 標籤文字（例如 "100/100" 或 "2.5/5"）
  height?: number; // 條的高度（預設 28）
  showIcon?: boolean; // 是否顯示圖標（預設 true）
}

export const ResourceBar: React.FC<ResourceBarProps> = ({
  percentage,
  color,
  icon,
  label,
  height = 28,
  showIcon = true,
}) => {
  const fillWidth = useSharedValue(0);

  useEffect(() => {
    fillWidth.value = withSpring(percentage, {
      damping: 15,
      stiffness: 100,
    });
  }, [percentage]);

  const animatedFillStyle = useAnimatedStyle(() => {
    // 填充層從左邊開始，包含圖標區域，不排除圖標空間
    return {
      width: `${fillWidth.value}%`,
    };
  });

  const borderRadius = height / 2;
  const hasIcon = showIcon && icon;

  return (
    <View style={styles.container}>
      {/* 膠囊條容器 */}
      <View 
        style={[
          styles.barContainer, 
          { 
            height, 
            borderRadius, 
            flex: 1,
            // 不設置 paddingLeft，讓填充層從左邊開始包含圖標
          }
        ]}
      >
        {/* 圖標容器（整合到柱狀條頭部，絕對定位在左側） */}
        {hasIcon && (
          <View style={[styles.iconContainer, { width: height, height: height }]}>
            {icon}
          </View>
        )}
        
        {/* 底槽（深色背景） */}
        <View style={[styles.track, { borderRadius }]} />

        {/* 填充層（動畫） - 從左邊開始，包含圖標區域 */}
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              borderRadius,
              left: 0, // 從左邊開始，不排除圖標空間
            },
            animatedFillStyle,
          ]}
        />

        {/* 文字標籤（靠左對齊，但離圖標更遠） */}
        <View 
          style={[
            styles.labelContainer,
            {
              left: hasIcon ? height + 10 : 2, // 從圖標右側開始，增加間距讓文字更靠右（約兩個字元）
              right: 0, // 延伸到右邊緣
              alignItems: 'flex-start', // 靠左對齊
            }
          ]}
        >
          <Text style={styles.labelText} numberOfLines={1} ellipsizeMode="tail">
            {label}
          </Text>
        </View>

        {/* 外框（更細邊框，更柔和） */}
        <View
          style={[
            styles.border,
            {
              borderRadius,
              borderWidth: 1.5, // 進一步減小邊框寬度，讓視覺更舒適
              borderColor: 'rgba(255, 255, 255, 0.25)', // 進一步降低邊框透明度，更柔和
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
    position: 'absolute',
    left: 0, // 圖標盡可能靠左
    top: 0,
    zIndex: 20, // 確保圖標在填充層和文字之上
  },
  barContainer: {
    position: 'relative',
    overflow: 'hidden', // 保持 hidden，圖標在內部
  },
  track: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 30, 35, 0.6)', // 日式風格 - 柔和的深灰色背景
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    height: '100%',
    zIndex: 1, // 填充層在底槽之上，但在圖標和文字之下
    // left 和 width 會在組件中動態設置
  },
  labelContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    // left 會在組件中動態設置，從圖標右側開始
    justifyContent: 'center', // 垂直居中
    zIndex: 10, // 文字在填充層之上，但在圖標之下
    // alignItems 會在組件中動態設置
  },
  labelText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.2, // 減少字距，節省空間
    // 確保文字不會溢出
    flexShrink: 1,
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
});