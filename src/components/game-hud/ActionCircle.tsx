/**
 * ActionCircle - 底部大型圓形動作按鈕
 * 使用 Skia 繪製 3D 立體效果
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

// 嘗試導入 Skia，如果未安裝則使用 SVG 備用方案
let SkiaComponents: any = null;
let useSkia = false;
try {
  const skia = require('@shopify/react-native-skia');
  SkiaComponents = skia;
  useSkia = true;
} catch (e) {
}

// 如果 Skia 不可用，使用 react-native-svg 作為備用
import Svg, { Circle, Defs, RadialGradient as SvgRadialGradient, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

interface ActionCircleProps {
  state: 'idle' | 'active';
  onPress: () => void;
  size?: number;
  label?: string;
  icon?: React.ReactNode;
}

export const ActionCircle: React.FC<ActionCircleProps> = ({
  state,
  onPress,
  size = 100,
  label,
  icon,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 10, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const isActive = state === 'active';
  const buttonColor = isActive ? '#FFD700' : '#BBDEFB';
  const gradientColors = isActive 
    ? ['#FFD700', '#FFA500', '#FF8C00']
    : ['#BBDEFB', '#90CAF9', '#64B5F6'];

  // 如果 Skia 可用，使用 Skia 渲染
  if (useSkia && SkiaComponents) {
    const { Canvas, Circle, RadialGradient, LinearGradient, vec } = SkiaComponents;
    
    return (
      <Animated.View style={[styles.container, animatedStyle]}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
          style={[styles.button, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <Canvas style={[styles.canvas, { width: size, height: size }]}>
            {/* 外圈發光 */}
            <Circle cx={size / 2} cy={size / 2} r={size * 0.48}>
              <RadialGradient
                c={vec(size / 2, size / 2)}
                r={size * 0.48}
                colors={[`${buttonColor}80`, `${buttonColor}00`]}
              />
            </Circle>

            {/* 按鈕主體（3D 立體效果） */}
            <Circle cx={size / 2} cy={size / 2} r={size * 0.45}>
              <LinearGradient
                start={vec(size * 0.1, size * 0.1)}
                end={vec(size * 0.9, size * 0.9)}
                colors={gradientColors}
              />
            </Circle>

            {/* 頂部高光（3D 效果） */}
            <Circle cx={size / 2} cy={size * 0.3} r={size * 0.25}>
              <RadialGradient
                c={vec(size / 2, size * 0.3)}
                r={size * 0.25}
                colors={['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0)']}
              />
            </Circle>

            {/* 底部陰影（3D 效果） */}
            <Circle cx={size / 2} cy={size * 0.7} r={size * 0.25}>
              <RadialGradient
                c={vec(size / 2, size * 0.7)}
                r={size * 0.25}
                colors={['rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0)']}
              />
            </Circle>

            {/* 邊框（玻璃效果） */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={size * 0.45}
              color="rgba(255, 255, 255, 0.3)"
              style="stroke"
              strokeWidth={2}
            />
          </Canvas>

          {/* 圖標和標籤 */}
          {icon && (
            <View style={styles.iconContainer}>
              {icon}
            </View>
          )}

          {label && (
            <View style={styles.labelContainer}>
              <Text style={[styles.label, { color: buttonColor, fontSize: size * 0.18 }]}>
                {label}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // 使用 SVG 渲染（備用方案）
  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={[styles.button, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={[styles.canvas, { width: size, height: size }]}>
          <Defs>
            {/* 外圈發光 */}
            <SvgRadialGradient id={`glowGradient-${state}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={buttonColor} stopOpacity="0.5" />
              <Stop offset="100%" stopColor={buttonColor} stopOpacity="0" />
            </SvgRadialGradient>
            
            {/* 按鈕主體漸層 */}
            <SvgLinearGradient id={`buttonGradient-${state}`} x1="10%" y1="10%" x2="90%" y2="90%">
              <Stop offset="0%" stopColor={gradientColors[0]} stopOpacity="1" />
              <Stop offset="50%" stopColor={gradientColors[1]} stopOpacity="1" />
              <Stop offset="100%" stopColor={gradientColors[2]} stopOpacity="1" />
            </SvgLinearGradient>
            
            {/* 頂部高光 */}
            <SvgRadialGradient id={`topHighlight-${state}`} cx="50%" cy="30%" r="25%">
              <Stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)" stopOpacity="1" />
              <Stop offset="100%" stopColor="rgba(255, 255, 255, 0)" stopOpacity="0" />
            </SvgRadialGradient>
            
            {/* 底部陰影 */}
            <SvgRadialGradient id={`bottomShadow-${state}`} cx="50%" cy="70%" r="25%">
              <Stop offset="0%" stopColor="rgba(0, 0, 0, 0.3)" stopOpacity="1" />
              <Stop offset="100%" stopColor="rgba(0, 0, 0, 0)" stopOpacity="0" />
            </SvgRadialGradient>
          </Defs>

          {/* 外圈發光 */}
          <Circle cx={size / 2} cy={size / 2} r={size * 0.48} fill={`url(#glowGradient-${state})`} />

          {/* 按鈕主體（3D 立體效果） */}
          <Circle cx={size / 2} cy={size / 2} r={size * 0.45} fill={`url(#buttonGradient-${state})`} />

          {/* 頂部高光（3D 效果） */}
          <Circle cx={size / 2} cy={size * 0.3} r={size * 0.25} fill={`url(#topHighlight-${state})`} />

          {/* 底部陰影（3D 效果） */}
          <Circle cx={size / 2} cy={size * 0.7} r={size * 0.25} fill={`url(#bottomShadow-${state})`} />

          {/* 邊框（玻璃效果） */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size * 0.45}
            fill="none"
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth={2}
          />
        </Svg>

        {/* 圖標 */}
        {icon && (
          <View style={styles.iconContainer}>
            {icon}
          </View>
        )}

        {/* 標籤 */}
        {label && (
          <View style={styles.labelContainer}>
            <Text style={[styles.label, { color: buttonColor, fontSize: size * 0.18 }]}>
              {label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  labelContainer: {
    position: 'absolute',
    bottom: -28,
    alignItems: 'center',
    zIndex: 10,
  },
  label: {
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
