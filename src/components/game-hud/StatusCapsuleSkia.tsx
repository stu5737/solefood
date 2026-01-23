/**
 * StatusCapsule - 可複用的果凍膠囊組件（Skia 版本）
 * 使用 React Native Skia 繪製 2.5D Q 版果凍風格
 * 
 * 特性：
 * - 玻璃質感容器
 * - 液體漸層填充（流暢動畫）
 * - 光澤高光效果
 * - 平滑動畫
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ImageSourcePropType } from 'react-native';
import { Canvas, Path, RoundedRect, LinearGradient, RadialGradient, vec, useComputedValue } from '@shopify/react-native-skia';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';

interface StatusCapsuleProps {
  icon?: ImageSourcePropType | React.ReactNode;
  color: string;
  percentage: number;
  label: string;
  valueText: string;
  width?: number;
  height?: number;
}

/**
 * 生成顏色漸層
 */
const generateGradientColors = (baseColor: string): [string, string, string] => {
  if (baseColor.includes('FF6B35') || baseColor.includes('FF8C42')) {
    return ['#FF6B35', '#FF8C42', '#FFA500'];
  } else if (baseColor.includes('4CAF50') || baseColor.includes('66BB6A')) {
    return ['#4CAF50', '#66BB6A', '#81C784'];
  }
  return [baseColor, baseColor, baseColor];
};

export const StatusCapsuleSkia: React.FC<StatusCapsuleProps> = ({
  icon,
  color,
  percentage,
  label,
  valueText,
  width = 180,
  height = 40,
}) => {
  // 動畫值
  const fillProgress = useSharedValue(0);
  const scale = useSharedValue(1);

  // 更新填充動畫
  useEffect(() => {
    fillProgress.value = withSpring(percentage, {
      damping: 15,
      stiffness: 100,
    });
  }, [percentage]);

  // 計算填充寬度（使用 Skia 的 useComputedValue）
  const fillWidth = useComputedValue(() => {
    return (width - height) * (fillProgress.value / 100);
  }, [fillProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const gradientColors = generateGradientColors(color);
  const capsulePath = `M ${height / 2},0 L ${width - height / 2},0 A ${height / 2},${height / 2} 0 0 1 ${width - height / 2},${height} L ${height / 2},${height} A ${height / 2},${height / 2} 0 0 1 ${height / 2},0 Z`;

  return (
    <Animated.View style={[styles.container, animatedStyle, { width, height }]}>
      <Canvas style={styles.canvas}>
        {/* 膠囊外框（玻璃效果） */}
        <RoundedRect
          x={0}
          y={0}
          width={width}
          height={height}
          r={height / 2}
        >
          <LinearGradient
            start={vec(0, 0)}
            end={vec(width, height)}
            colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.05)']}
          />
        </RoundedRect>

        {/* 外框邊緣（紅色邊框） */}
        <Path
          path={capsulePath}
          color="rgba(255, 0, 0, 0.3)"
          style="stroke"
          strokeWidth={2}
        />

        {/* 液體填充（使用動畫值） */}
        <RoundedRect
          x={height / 2}
          y={height * 0.1}
          width={fillWidth}
          height={height * 0.8}
          r={height * 0.4}
        >
          <LinearGradient
            start={vec(height / 2, height * 0.1)}
            end={vec(height / 2 + fillWidth.value, height * 0.9)}
            colors={gradientColors}
          />
        </RoundedRect>

        {/* 光澤高光（頂部） */}
        <RoundedRect
          x={height / 2}
          y={height * 0.1}
          width={fillWidth}
          height={height * 0.3}
          r={height * 0.4}
        >
          <LinearGradient
            start={vec(0, height * 0.1)}
            end={vec(0, height * 0.4)}
            colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0)']}
          />
        </RoundedRect>

        {/* 左側圓頭 - 圖標區域背景 */}
        <RoundedRect
          x={0}
          y={0}
          width={height}
          height={height}
          r={height / 2}
          color="rgba(0, 0, 0, 0.2)"
        />
      </Canvas>

      {/* 圖標 */}
      {icon && (
        <View style={styles.iconContainer}>
          {typeof icon === 'object' && 'uri' in icon ? (
            <Text style={styles.iconPlaceholder}>🔥</Text>
          ) : (
            icon
          )}
        </View>
      )}

      {/* 數值文字 */}
      <View style={styles.valueTextContainer}>
        <Text style={[styles.valueText, { color: '#FFFFFF' }]}>
          {valueText}
        </Text>
      </View>

      {/* 標籤文字 */}
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color }]}>
            {label}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  iconContainer: {
    position: 'absolute',
    left: 8,
    top: 0,
    bottom: 0,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconPlaceholder: {
    fontSize: 20,
  },
  valueTextContainer: {
    position: 'absolute',
    left: 50,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 10,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  labelContainer: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
