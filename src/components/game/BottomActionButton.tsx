/**
 * BottomActionButton - 底部大型動作按鈕
 * 2.5D Q 版風格，大型圓形按鈕
 * 主題：美食家尋味之旅
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop, RadialGradient } from 'react-native-svg';

interface BottomActionButtonProps {
  type: 'scout' | 'capture';
  onPress: () => void;
  size?: number;
}

/**
 * 放大鏡圖標（SCOUT）
 */
const MagnifyingGlassIcon: React.FC<{ size: number }> = ({ size }) => {
  const center = size / 2;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient id="scoutButtonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#BBDEFB" stopOpacity="1" />
          <Stop offset="100%" stopColor="#90CAF9" stopOpacity="1" />
        </LinearGradient>
        <RadialGradient id="scoutButtonGlow" cx="50%" cy="50%">
          <Stop offset="0%" stopColor="#BBDEFB" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#BBDEFB" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* 外圈發光 */}
      <Circle
        cx={center}
        cy={center}
        r={size * 0.45}
        fill="url(#scoutButtonGlow)"
        opacity={0.4}
      />

      {/* 放大鏡圓圈 */}
      <Circle
        cx={center - size * 0.1}
        cy={center - size * 0.1}
        r={size * 0.25}
        fill="none"
        stroke="url(#scoutButtonGradient)"
        strokeWidth={size * 0.08}
        opacity={0.9}
      />

      {/* 放大鏡把手 */}
      <G transform={`translate(${center + size * 0.1}, ${center + size * 0.1}) rotate(45)`}>
        <Path
          d={`M 0,0 L ${size * 0.2},0`}
          stroke="url(#scoutButtonGradient)"
          strokeWidth={size * 0.08}
          strokeLinecap="round"
          opacity={0.9}
        />
        <Path
          d={`M ${size * 0.2},0 L ${size * 0.25},-${size * 0.05}`}
          stroke="url(#scoutButtonGradient)"
          strokeWidth={size * 0.08}
          strokeLinecap="round"
          opacity={0.9}
        />
      </G>
    </Svg>
  );
};

/**
 * 相機圖標（CAPTURE）
 */
const CameraIcon: React.FC<{ size: number }> = ({ size }) => {
  const center = size / 2;
  const radius = size * 0.3;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient id="captureButtonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
          <Stop offset="50%" stopColor="#FFA500" stopOpacity="1" />
          <Stop offset="100%" stopColor="#FF8C00" stopOpacity="1" />
        </LinearGradient>
        <RadialGradient id="captureButtonGlow" cx="50%" cy="50%">
          <Stop offset="0%" stopColor="#FFD700" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* 強烈發光 */}
      <Circle
        cx={center}
        cy={center}
        r={size * 0.45}
        fill="url(#captureButtonGlow)"
        opacity={0.6}
      />

      {/* 快門外圈 */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="url(#captureButtonGradient)"
        strokeWidth={size * 0.06}
        opacity={0.9}
      />

      {/* 快門葉片（8片，像餐盤） */}
      <G transform={`translate(${center}, ${center})`}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <Path
            key={i}
            d={`M 0,0 
                L ${radius * 0.6},0 
                Q ${radius * 0.75},-${radius * 0.1} ${radius * 0.8},-${radius * 0.15}
                Q ${radius * 0.85},-${radius * 0.2} ${radius * 0.9},-${radius * 0.25}
                L ${radius * 0.85},-${radius * 0.2}
                Q ${radius * 0.8},-${radius * 0.15} ${radius * 0.7},-${radius * 0.1}
                Z`}
            fill="url(#captureButtonGradient)"
            opacity={0.85}
            transform={`rotate(${angle})`}
          />
        ))}
      </G>

      {/* 中心圓（對焦框） */}
      <Circle
        cx={center}
        cy={center}
        r={radius * 0.4}
        fill="rgba(0, 0, 0, 0.7)"
        stroke="url(#captureButtonGradient)"
        strokeWidth={size * 0.04}
      />

      {/* 對焦十字線 */}
      <G transform={`translate(${center}, ${center})`}>
        <Path
          d={`M -${size * 0.08},0 L ${size * 0.08},0`}
          stroke="url(#captureButtonGradient)"
          strokeWidth={size * 0.02}
          opacity={0.8}
        />
        <Path
          d={`M 0,-${size * 0.08} L 0,${size * 0.08}`}
          stroke="url(#captureButtonGradient)"
          strokeWidth={size * 0.02}
          opacity={0.8}
        />
        <Circle
          cx={0}
          cy={0}
          r={size * 0.03}
          fill="#FFD700"
          opacity={1}
        />
      </G>
    </Svg>
  );
};

/**
 * 主組件
 */
export const BottomActionButton: React.FC<BottomActionButtonProps> = ({
  type,
  onPress,
  size = 100,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, { width: size, height: size, borderRadius: size / 2 }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {/* 按鈕背景（玻璃效果） */}
        <View style={[styles.buttonBackground, { 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          shadowRadius: size * 0.2,
        }]} />

        {/* 圖標 */}
        <View style={styles.iconContainer}>
          {type === 'scout' ? (
            <MagnifyingGlassIcon size={size * 0.6} />
          ) : (
            <CameraIcon size={size * 0.6} />
          )}
        </View>

        {/* 標籤 */}
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { 
            color: type === 'scout' ? '#BBDEFB' : '#FFD700',
            fontSize: size * 0.2,
          }]}>
            {type === 'scout' ? 'SCOUT' : 'CAPTURE'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  buttonBackground: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    elevation: 10,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  labelContainer: {
    position: 'absolute',
    bottom: -24,
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
