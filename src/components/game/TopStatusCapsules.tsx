/**
 * TopStatusCapsules - 頂部膠囊狀狀態條
 * 2.5D Q 版風格，像裝著液體的玻璃膠囊
 * 主題：美食家尋味之旅
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Ellipse, G, Defs, LinearGradient, Stop, RadialGradient } from 'react-native-svg';

interface TopStatusCapsulesProps {
  stamina: number;
  maxStamina: number;
  currentWeight: number;
  maxWeight: number;
}

/**
 * 能量膠囊 - 左上角（BURN）
 */
const EnergyCapsule: React.FC<{ 
  stamina: number; 
  maxStamina: number;
  width: number;
  height: number;
}> = ({ stamina, maxStamina, width, height }) => {
  const progress = (stamina / maxStamina) * 100;
  const fillWidth = (width - height) * (progress / 100); // 減去圓頭寬度

  return (
    <View style={[styles.capsuleContainer, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#FF6B35" stopOpacity="1" />
            <Stop offset="50%" stopColor="#FF8C42" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FFA500" stopOpacity="1" />
          </LinearGradient>
          <RadialGradient id="energyGlow" cx="50%" cy="50%">
            <Stop offset="0%" stopColor="#FF6B35" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#FF6B35" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* 膠囊外框（玻璃效果） */}
        <Path
          d={`M ${height / 2},0 
              L ${width - height / 2},0 
              A ${height / 2},${height / 2} 0 0 1 ${width - height / 2},${height}
              L ${height / 2},${height}
              A ${height / 2},${height / 2} 0 0 1 ${height / 2},0 Z`}
          fill="rgba(255, 255, 255, 0.1)"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth={2}
        />

        {/* 液體填充 */}
        {fillWidth > 0 && (
          <Path
            d={`M ${height / 2},${height * 0.1} 
                L ${height / 2 + fillWidth},${height * 0.1}
                L ${height / 2 + fillWidth},${height * 0.9}
                L ${height / 2},${height * 0.9}
                A ${height * 0.4},${height * 0.4} 0 0 1 ${height / 2},${height * 0.1} Z`}
            fill="url(#energyGradient)"
            opacity={0.8}
          />
        )}

        {/* 左側圓頭 - 火焰圖標 */}
        <G transform={`translate(${height / 2}, ${height / 2})`}>
          {/* 火焰外圈發光 */}
          <Circle
            cx={0}
            cy={0}
            r={height * 0.35}
            fill="url(#energyGlow)"
            opacity={0.4}
          />
          
          {/* 火焰主體 */}
          <Path
            d={`M 0,${height * 0.15} 
                Q -${height * 0.08},${height * 0.05} -${height * 0.06},-${height * 0.05}
                Q -${height * 0.04},-${height * 0.12} 0,-${height * 0.15}
                Q ${height * 0.04},-${height * 0.12} ${height * 0.06},-${height * 0.05}
                Q ${height * 0.08},${height * 0.05} 0,${height * 0.15} Z`}
            fill="url(#energyGradient)"
            opacity={0.9}
          />
          
          {/* 內層火焰 */}
          <Path
            d={`M 0,${height * 0.12} 
                Q -${height * 0.05},${height * 0.03} -${height * 0.04},-${height * 0.04}
                Q -${height * 0.02},-${height * 0.09} 0,-${height * 0.12}
                Q ${height * 0.02},-${height * 0.09} ${height * 0.04},-${height * 0.04}
                Q ${height * 0.05},${height * 0.03} 0,${height * 0.12} Z`}
            fill="#FFD700"
            opacity={0.8}
          />
          
          {/* 核心火焰 */}
          <Ellipse
            cx={0}
            cy={-height * 0.05}
            rx={height * 0.02}
            ry={height * 0.08}
            fill="#FFFFFF"
            opacity={0.9}
          />
        </G>

      </Svg>
      
      {/* 數值文字（React Native Text） */}
      <View style={styles.valueTextContainer}>
        <Text style={[styles.valueText, { color: '#FF6B35' }]}>
          {Math.floor(stamina)}/{maxStamina}
        </Text>
      </View>
    </View>
  );
};

/**
 * 負重膠囊 - 右上角（BASKET）
 */
const LoadCapsule: React.FC<{ 
  currentWeight: number; 
  maxWeight: number;
  width: number;
  height: number;
}> = ({ currentWeight, maxWeight, width, height }) => {
  const progress = (currentWeight / maxWeight) * 100;
  const fillWidth = (width - height) * (progress / 100);

  return (
    <View style={[styles.capsuleContainer, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id="loadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#4CAF50" stopOpacity="1" />
            <Stop offset="50%" stopColor="#66BB6A" stopOpacity="1" />
            <Stop offset="100%" stopColor="#81C784" stopOpacity="1" />
          </LinearGradient>
          <RadialGradient id="loadGlow" cx="50%" cy="50%">
            <Stop offset="0%" stopColor="#4CAF50" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#4CAF50" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* 膠囊外框（玻璃效果） */}
        <Path
          d={`M ${height / 2},0 
              L ${width - height / 2},0 
              A ${height / 2},${height / 2} 0 0 1 ${width - height / 2},${height}
              L ${height / 2},${height}
              A ${height / 2},${height / 2} 0 0 1 ${height / 2},0 Z`}
          fill="rgba(255, 255, 255, 0.1)"
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth={2}
        />

        {/* 液體填充 */}
        {fillWidth > 0 && (
          <Path
            d={`M ${height / 2},${height * 0.1} 
                L ${height / 2 + fillWidth},${height * 0.1}
                L ${height / 2 + fillWidth},${height * 0.9}
                L ${height / 2},${height * 0.9}
                A ${height * 0.4},${height * 0.4} 0 0 1 ${height / 2},${height * 0.1} Z`}
            fill="url(#loadGradient)"
            opacity={0.8}
          />
        )}

        {/* 右側圓頭 - 購物車圖標 */}
        <G transform={`translate(${width - height / 2}, ${height / 2})`}>
          {/* 購物車外圈發光 */}
          <Circle
            cx={0}
            cy={0}
            r={height * 0.35}
            fill="url(#loadGlow)"
            opacity={0.4}
          />
          
          {/* 購物車主體 */}
          <G>
            {/* 車身 */}
            <Path
              d={`M -${height * 0.12},-${height * 0.08} 
                  L ${height * 0.12},-${height * 0.08}
                  L ${height * 0.12},${height * 0.08}
                  L -${height * 0.12},${height * 0.08} Z`}
              fill="none"
              stroke="url(#loadGradient)"
              strokeWidth={height * 0.03}
              opacity={0.9}
            />
            
            {/* 車輪 */}
            <Circle
              cx={-height * 0.08}
              cy={height * 0.1}
              r={height * 0.04}
              fill="none"
              stroke="url(#loadGradient)"
              strokeWidth={height * 0.02}
              opacity={0.9}
            />
            <Circle
              cx={height * 0.08}
              cy={height * 0.1}
              r={height * 0.04}
              fill="none"
              stroke="url(#loadGradient)"
              strokeWidth={height * 0.02}
              opacity={0.9}
            />
            
            {/* 把手 */}
            <Path
              d={`M -${height * 0.12},-${height * 0.08} 
                  Q -${height * 0.15},-${height * 0.12} -${height * 0.12},-${height * 0.15}`}
              fill="none"
              stroke="url(#loadGradient)"
              strokeWidth={height * 0.03}
              strokeLinecap="round"
              opacity={0.9}
            />
          </G>
        </G>
      </Svg>
      
      {/* 數值文字 */}
      <View style={styles.valueTextContainer}>
        <Text style={[styles.valueText, { color: '#4CAF50' }]}>
          {currentWeight.toFixed(1)}/{maxWeight.toFixed(1)}kg
        </Text>
      </View>
    </View>
  );
};

/**
 * 主組件
 */
export const TopStatusCapsules: React.FC<TopStatusCapsulesProps> = ({
  stamina,
  maxStamina,
  currentWeight,
  maxWeight,
}) => {
  const capsuleWidth = 180;
  const capsuleHeight = 40;

  return (
    <View style={styles.container}>
      {/* 左上角：能量膠囊 */}
      <View style={styles.leftCapsule}>
        <EnergyCapsule
          stamina={stamina}
          maxStamina={maxStamina}
          width={capsuleWidth}
          height={capsuleHeight}
        />
      </View>

      {/* 右上角：負重膠囊 */}
      <View style={styles.rightCapsule}>
        <LoadCapsule
          currentWeight={currentWeight}
          maxWeight={maxWeight}
          width={capsuleWidth}
          height={capsuleHeight}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60, // ✅ 往下移，避免與系統狀態欄重疊
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    zIndex: 2000,
    pointerEvents: 'box-none',
  },
  leftCapsule: {
    // 左上角
  },
  rightCapsule: {
    // 右上角
  },
  capsuleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueTextContainer: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  valueText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
