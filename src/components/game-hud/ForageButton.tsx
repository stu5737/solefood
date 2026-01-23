/**
 * ForageButton - 大型水平圓角矩形按鈕
 * 設計風格：光澤半透明、淺綠色漸層、3D 文字效果
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Svg, { Rect, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

interface ForageButtonProps {
  onPress: () => void;
  label?: string;
  cartIcon?: React.ReactNode;
  width?: number;
  height?: number;
}

export const ForageButton: React.FC<ForageButtonProps> = ({
  onPress,
  label = 'FORAGE',
  cartIcon,
  width = 280,
  height = 70,
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 10, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const borderRadius = height / 2;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={[styles.button, { width, height, borderRadius }]}
      >
        {/* 背景層：淺綠色漸層（從左上角光源） */}
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            {/* 主體漸層：淺綠到白黃（模擬左上角光源） */}
            <SvgLinearGradient id="forageGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#A8E6CF" stopOpacity="0.9" />
              <Stop offset="30%" stopColor="#B8F0D8" stopOpacity="0.85" />
              <Stop offset="70%" stopColor="#D4F4E8" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#F0F8F4" stopOpacity="0.75" />
            </SvgLinearGradient>
            
            {/* 頂部高光（左上角光源反射） */}
            <SvgLinearGradient id="topHighlight" x1="0%" y1="0%" x2="0%" y2="50%">
              <Stop offset="0%" stopColor="rgba(255, 255, 255, 0.6)" stopOpacity="1" />
              <Stop offset="50%" stopColor="rgba(255, 255, 255, 0.3)" stopOpacity="1" />
              <Stop offset="100%" stopColor="rgba(255, 255, 255, 0)" stopOpacity="0" />
            </SvgLinearGradient>
            
            {/* 左側高光 */}
            <SvgLinearGradient id="leftHighlight" x1="0%" y1="0%" x2="20%" y2="0%">
              <Stop offset="0%" stopColor="rgba(255, 255, 255, 0.5)" stopOpacity="1" />
              <Stop offset="100%" stopColor="rgba(255, 255, 255, 0)" stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>

          {/* 主體（圓角矩形） */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            rx={borderRadius}
            ry={borderRadius}
            fill="url(#forageGradient)"
          />

          {/* 頂部高光 */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={height * 0.5}
            rx={borderRadius}
            ry={borderRadius}
            fill="url(#topHighlight)"
          />

          {/* 左側高光 */}
          <Rect
            x={0}
            y={0}
            width={width * 0.2}
            height={height}
            rx={borderRadius}
            ry={borderRadius}
            fill="url(#leftHighlight)"
          />

          {/* 邊框（玻璃效果） */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            rx={borderRadius}
            ry={borderRadius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth={2}
          />
        </Svg>

        {/* 內容層 */}
        <View style={styles.contentContainer}>
          {/* 文字：FORAGE */}
          <Text style={styles.label}>{label}</Text>

          {/* 購物車圖標（右側，部分重疊） */}
          {cartIcon && (
            <View style={styles.cartContainer}>
              {cartIcon}
            </View>
          )}
        </View>
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
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
    zIndex: 10,
    position: 'relative',
  },
  label: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 4,
    color: '#D4A574', // 溫暖的淺棕色
    textShadowColor: '#8B6F47', // 深棕色輪廓
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    // 3D 立體效果：多層陰影
    includeFontPadding: false,
  },
  cartContainer: {
    position: 'absolute',
    right: -15, // 部分重疊在按鈕右側
    top: '50%',
    marginTop: -20, // 居中（假設圖標高度約 40）
    zIndex: 15,
  },
});
