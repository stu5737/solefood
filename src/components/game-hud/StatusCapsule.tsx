/**
 * StatusCapsule - 三明治疊圖法版本
 * 使用圖層疊加而非純代碼繪圖，達到真正的 3D 果凍質感
 * 
 * 架構：
 * 1. 底層：膠囊背景容器
 * 2. 中層：動態液體條（唯一需要動畫的部分）
 * 3. 頂層：預渲染的玻璃覆蓋圖（PNG 素材）
 */

import React, { useEffect, isValidElement } from 'react';
import { View, Text, StyleSheet, ImageSourcePropType, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';

interface StatusCapsuleProps {
  icon?: ImageSourcePropType | React.ReactNode;
  color: string; // 主題顏色（例如 '#FF6B35' 或 '#4CAF50'）
  percentage: number; // 填充百分比 (0-100)
  label: string; // 標籤文字（例如 "BURN" 或 "BASKET"）
  valueText: string; // 數值文字（例如 "100/100" 或 "2.5/10.0"）
  width?: number;
  height?: number;
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

export const StatusCapsule: React.FC<StatusCapsuleProps> = ({
  icon,
  color,
  percentage,
  label,
  valueText,
  width = 180,
  height = 40,
}) => {
  const gradientColors = generateGradientColors(color);
  
  // 計算填充寬度（包括左側圓頭）
  const middleWidth = width - height; // 中間矩形部分的寬度
  const fillMiddleWidth = middleWidth * (percentage / 100); // 中間部分填充寬度
  const leftRadius = height / 2; // 左側圓頭半徑
  
  // 動畫值
  const fillWidthAnimated = useSharedValue(0);
  
  useEffect(() => {
    fillWidthAnimated.value = withTiming(fillMiddleWidth, {
      duration: 500,
    });
  }, [fillMiddleWidth]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: fillWidthAnimated.value + leftRadius + (percentage >= 100 ? leftRadius : 0),
  }));

  // 玻璃覆蓋圖的路徑（需要用戶提供素材）
  // 如果素材不存在，組件仍可正常運行（只是沒有玻璃覆蓋效果）
  let glassOverlaySource: any = null;
  try {
    glassOverlaySource = require('../../../assets/images/capsule_glass_overlay.png');
  } catch (e) {
    console.warn('[StatusCapsule] ⚠️ Glass overlay image not found. Please add capsule_glass_overlay.png to assets/images/');
  }

  return (
    <View style={[styles.wrapper, { width, height: height + 28 }]}>
      {/* ========== 層級 1：底層 - 膠囊背景容器 ========== */}
      <View style={[styles.container, { width, height }]}>
        <View style={styles.backgroundContainer}>
          {/* 深色半透明背景，讓地圖透不過去 */}
        </View>

        {/* ========== 層級 2：中層 - 動態液體條（唯一需要動畫的部分） ========== */}
        <Animated.View 
          style={[
            styles.liquidBar,
            animatedFillStyle,
            { height },
          ]}
        >
          {/* 使用 SVG LinearGradient 繪製漸層 */}
          <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgLinearGradient id={`liquidGrad-${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={gradientColors[0]} stopOpacity="1" />
                <Stop offset="50%" stopColor={gradientColors[1]} stopOpacity="1" />
                <Stop offset="100%" stopColor={gradientColors[2]} stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>
            
            {/* 左側圓頭 */}
            <Rect
              x={0}
              y={0}
              width={height}
              height={height}
              rx={height / 2}
              fill={gradientColors[0]}
            />
            
            {/* 中間部分 */}
            {fillMiddleWidth > 0 && (
              <Rect
                x={leftRadius}
                y={height * 0.1}
                width={fillMiddleWidth}
                height={height * 0.8}
                rx={height * 0.4}
                fill={`url(#liquidGrad-${color})`}
              />
            )}
            
            {/* 右側圓頭（當填滿時） */}
            {percentage >= 100 && (
              <Rect
                x={width - height}
                y={0}
                width={height}
                height={height}
                rx={height / 2}
                fill={gradientColors[2]}
              />
            )}
          </Svg>
        </Animated.View>

        {/* ========== 層級 3：頂層 - 玻璃覆蓋圖（預渲染的 PNG） ========== */}
        {/* 注意：需要用戶提供 capsule_glass_overlay.png 素材 */}
        {glassOverlaySource && (
          <Image
            source={glassOverlaySource}
            style={[styles.glassOverlay, { width, height }]}
            resizeMode="stretch"
          />
        )}

        {/* ========== 層級 4：內容層 - 圖標和文字（最上層） ========== */}
        {icon && (
          <View style={[styles.iconContainer, { width: height, height }]} pointerEvents="none">
            {typeof icon === 'object' && 'uri' in icon ? (
              <Text style={styles.iconEmoji}>🔥</Text>
            ) : isValidElement(icon) ? (
              icon as React.ReactElement
            ) : (
              <Text style={styles.iconEmoji}>🔥</Text>
            )}
          </View>
        )}

        <View style={[styles.valueTextContainer, { left: height + 8 }]} pointerEvents="none">
          <Text style={styles.valueText}>
            {valueText}
          </Text>
        </View>
      </View>

      {/* ========== 標籤層 - 獨立，在膠囊下方 ========== */}
      {label && (
        <View style={styles.labelContainer} pointerEvents="none">
          <View style={styles.labelBackground}>
            <Text style={styles.labelText}>
              {label}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: 20, // 圓角
    overflow: 'hidden', // 確保內容不超出邊界
  },
  // 層級 1：底層背景
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // 深色半透明，讓地圖透不過去
    borderRadius: 20,
    zIndex: 1,
  },
  // 層級 2：中層液體條
  liquidBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    zIndex: 2,
    overflow: 'hidden',
  },
  // 層級 3：頂層玻璃覆蓋圖
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 3,
    pointerEvents: 'none',
  },
  // 層級 4：內容層
  iconContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  iconEmoji: {
    fontSize: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  valueTextContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 8,
    justifyContent: 'center',
    zIndex: 4,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  labelContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  labelBackground: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    color: '#333333',
  },
});
