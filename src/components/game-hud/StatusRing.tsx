/**
 * StatusRing - 圓環儀表板組件
 * 使用三明治疊圖法實現 3D 果凍質感
 * 
 * 架構：
 * 1. 底層：深色圓形底盤（靜態圖片）
 * 2. 中層：動態填充圓弧（SVG Arc，唯一需要動畫的部分）
 * 3. 頂層：玻璃覆蓋圖（靜態圖片，包含高光和邊框）
 * 4. 內容層：圖標和文字（浮在最上層）
 */

import React, { useEffect, isValidElement } from 'react';
import { View, Text, StyleSheet, ImageSourcePropType, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedProps, useDerivedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface StatusRingProps {
  icon?: ImageSourcePropType | React.ReactNode;
  color: string; // 主題顏色（例如 '#FF6B35' 或 '#4CAF50'）
  percentage: number; // 填充百分比 (0-100)
  label: string; // 標籤文字（例如 "BURN" 或 "BASKET"）
  valueText: string; // 數值文字（例如 "80%" 或 "2.5kg"）
  size?: number; // 圓環直徑（預設 80）
  strokeWidth?: number; // 圓環線寬（預設 8）
}

/**
 * 生成顏色漸層
 */
const generateGradientColors = (baseColor: string): [string, string, string] => {
  if (baseColor.includes('FF6B35') || baseColor.includes('FF8C42')) {
    // 橙色系：從深橘到亮黃
    return ['#FF6B35', '#FF8C42', '#FFA500'];
  } else if (baseColor.includes('4CAF50') || baseColor.includes('66BB6A')) {
    // 綠色系
    return ['#4CAF50', '#66BB6A', '#81C784'];
  }
  return [baseColor, baseColor, baseColor];
};

/**
 * 極座標轉換為笛卡爾座標（Worklet 函數）
 */
const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) => {
  'worklet';
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

/**
 * 計算圓弧路徑（Worklet 函數，可在 UI 線程執行）
 * @param centerX 圓心 X
 * @param centerY 圓心 Y
 * @param radius 半徑
 * @param startAngle 起始角度（度）
 * @param endAngle 結束角度（度）
 */
const createArcPath = (
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string => {
  'worklet';
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  
  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(' ');
};

export const StatusRing: React.FC<StatusRingProps> = ({
  icon,
  color,
  percentage,
  label,
  valueText,
  size = 80,
  strokeWidth = 8,
}) => {
  const gradientColors = generateGradientColors(color);
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  
  // 動畫值：從 -90 度（頂部）開始，順時針填充
  const endAngle = useSharedValue(-90);
  
  useEffect(() => {
    // 計算結束角度：-90 度（頂部）到 270 度（一圈）
    const targetAngle = -90 + (percentage / 100) * 360;
    endAngle.value = withTiming(targetAngle, {
      duration: 500,
    });
  }, [percentage]);

  // 計算圓弧路徑
  const startAngle = -90;
  const currentEndAngle = endAngle.value;
  
  // 圓環底盤圖片（可選）
  let ringBaseSource: any = null;
  try {
    ringBaseSource = require('../../../assets/images/ring_base.png');
  } catch (e) {
    // 如果沒有素材，使用純色背景
  }

  // 圓環玻璃覆蓋圖（可選）
  let ringGlassSource: any = null;
  try {
    ringGlassSource = require('../../../assets/images/ring_glass_overlay.png');
  } catch {
    // 可選素材不存在時靜默忽略
  }

  // 動態計算圓弧路徑字符串（使用 useDerivedValue）
  const arcPath = useDerivedValue(() => {
    'worklet';
    const angle = endAngle.value;
    return createArcPath(center, center, radius, startAngle, angle);
  });

  // 使用 useAnimatedProps 將路徑字符串傳遞給 SVG Path
  const animatedProps = useAnimatedProps(() => {
    'worklet';
    return { d: arcPath.value } as any;
  });

  return (
    <View style={[styles.wrapper, { width: size, height: size + 24 }]}>
      {/* ========== 層級 1：底層 - 圓形底盤 ========== */}
      <View style={[styles.container, { width: size, height: size }]}>
        {ringBaseSource ? (
          <Image
            source={ringBaseSource}
            style={[styles.baseImage, { width: size, height: size }]}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.baseFallback, { width: size, height: size, borderRadius: size / 2 }]} />
        )}

        {/* ========== 層級 2：中層 - 動態填充圓弧（唯一需要動畫的部分） ========== */}
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgLinearGradient id={`ringGrad-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradientColors[0]} stopOpacity="1" />
              <Stop offset="50%" stopColor={gradientColors[1]} stopOpacity="1" />
              <Stop offset="100%" stopColor={gradientColors[2]} stopOpacity="1" />
            </SvgLinearGradient>
          </Defs>
          
          {/* 動態圓弧 */}
          <AnimatedPath
            animatedProps={animatedProps}
            fill="none"
            stroke={`url(#ringGrad-${color})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>

        {/* ========== 層級 3：頂層 - 玻璃覆蓋圖（預渲染的 PNG） ========== */}
        {ringGlassSource && (
          <Image
            source={ringGlassSource}
            style={[styles.glassOverlay, { width: size, height: size }]}
            resizeMode="contain"
          />
        )}

        {/* ========== 層級 4：內容層 - 圖標和文字（最上層） ========== */}
        <View style={styles.contentContainer} pointerEvents="none">
          {icon && (
            <View style={styles.iconContainer}>
              {typeof icon === 'object' && 'uri' in icon ? (
                <Text style={styles.iconEmoji}>🔥</Text>
              ) : isValidElement(icon) ? (
                icon as React.ReactElement
              ) : (
                <Text style={styles.iconEmoji}>🔥</Text>
              )}
            </View>
          )}
          
          {valueText && (
            <Text style={styles.valueText}>
              {valueText}
            </Text>
          )}
        </View>
      </View>

      {/* ========== 標籤層 - 獨立，在圓環下方 ========== */}
      {label && (
        <View style={styles.labelContainer} pointerEvents="none">
          <Text style={[styles.label, { color }]}>
            {label}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 層級 1：底層
  baseImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  baseFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 1,
  },
  // 層級 3：頂層玻璃覆蓋
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 3,
    pointerEvents: 'none',
  },
  // 層級 4：內容層
  contentContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconEmoji: {
    fontSize: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  valueText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  labelContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
