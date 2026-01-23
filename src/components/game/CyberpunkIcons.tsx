/**
 * Gourmet Forager Icons - 美食家尋味之旅圖標組件
 * 將「冷冰冰的科技數據」轉化為「美食家的尋味之旅」
 * 主題：城市尋味者 (The Urban Forager)
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Path, Circle, Polygon, G, Defs, LinearGradient, Stop, RadialGradient, Ellipse } from 'react-native-svg';

interface GourmetIconProps {
  type: 'burn' | 'basket' | 'scout' | 'capture';
  progress?: number; // 0-100
  size?: number;
  active?: boolean; // 用於 SCOUT/CAPTURE 切換
}

/**
 * BURN Icon - 霓虹橙色火焰（燃燒/食慾）
 * 隱喻：既代表烹飪的爐火，也代表玩家燃燒卡路里、渴望美食的熱情
 */
const BurnIcon: React.FC<{ size: number; progress: number }> = ({ size, progress }) => {
  const center = size / 2;
  const radius = size * 0.35;
  const strokeWidth = size * 0.08;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient id="burnGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FF6B35" stopOpacity="1" />
          <Stop offset="50%" stopColor="#FF8C42" stopOpacity="1" />
          <Stop offset="100%" stopColor="#FFA500" stopOpacity="1" />
        </LinearGradient>
        <RadialGradient id="burnGlow" cx="50%" cy="50%">
          <Stop offset="0%" stopColor="#FF6B35" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#FF6B35" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      
      {/* 外圈發光 */}
      <Circle
        cx={center}
        cy={center}
        r={radius + strokeWidth}
        fill="url(#burnGlow)"
        opacity={0.4}
      />
      
      {/* 進度環背景 */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="rgba(255, 107, 53, 0.2)"
        strokeWidth={strokeWidth}
      />
      
      {/* 進度環 */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="url(#burnGradient)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        opacity={0.9}
      />
      
      {/* 火焰主體 */}
      <G transform={`translate(${center}, ${center + size * 0.05})`}>
        {/* 外層火焰 */}
        <Path
          d={`M 0,${size * 0.15} 
              Q -${size * 0.08},${size * 0.05} -${size * 0.06},-${size * 0.05}
              Q -${size * 0.04},-${size * 0.12} 0,-${size * 0.15}
              Q ${size * 0.04},-${size * 0.12} ${size * 0.06},-${size * 0.05}
              Q ${size * 0.08},${size * 0.05} 0,${size * 0.15} Z`}
          fill="url(#burnGradient)"
          opacity={0.9}
        />
        
        {/* 內層火焰（更亮） */}
        <Path
          d={`M 0,${size * 0.12} 
              Q -${size * 0.05},${size * 0.03} -${size * 0.04},-${size * 0.04}
              Q -${size * 0.02},-${size * 0.09} 0,-${size * 0.12}
              Q ${size * 0.02},-${size * 0.09} ${size * 0.04},-${size * 0.04}
              Q ${size * 0.05},${size * 0.03} 0,${size * 0.12} Z`}
          fill="#FFD700"
          opacity={0.8}
        />
        
        {/* 核心火焰（最亮） */}
        <Ellipse
          cx={0}
          cy={-size * 0.05}
          rx={size * 0.02}
          ry={size * 0.08}
          fill="#FFFFFF"
          opacity={0.9}
        />
      </G>
    </Svg>
  );
};

/**
 * BASKET Icon - 霓虹綠色採集籃（食材籃）
 * 隱喻：精緻的編織籃或現代托特包，用來裝在城市中「採集」到的美味
 */
const BasketIcon: React.FC<{ size: number; progress: number }> = ({ size, progress }) => {
  const center = size / 2;
  const radius = size * 0.35;
  const strokeWidth = size * 0.08;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient id="basketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#4CAF50" stopOpacity="1" />
          <Stop offset="50%" stopColor="#66BB6A" stopOpacity="1" />
          <Stop offset="100%" stopColor="#81C784" stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="basketWheatGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#D4AF37" stopOpacity="1" />
          <Stop offset="100%" stopColor="#F4D03F" stopOpacity="1" />
        </LinearGradient>
        <RadialGradient id="basketGlow" cx="50%" cy="50%">
          <Stop offset="0%" stopColor="#4CAF50" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#4CAF50" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      
      {/* 外圈發光 */}
      <Circle
        cx={center}
        cy={center}
        r={radius + strokeWidth}
        fill="url(#basketGlow)"
        opacity={0.3}
      />
      
      {/* 進度環背景 */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="rgba(76, 175, 80, 0.2)"
        strokeWidth={strokeWidth}
      />
      
      {/* 進度環 */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="url(#basketGradient)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        opacity={0.9}
      />
      
      {/* 採集籃 */}
      <G transform={`translate(${center}, ${center})`}>
        {/* 籃子主體（橢圓形） */}
        <Ellipse
          cx={0}
          cy={size * 0.05}
          rx={size * 0.2}
          ry={size * 0.15}
          fill="none"
          stroke="url(#basketGradient)"
          strokeWidth={strokeWidth * 0.8}
          opacity={0.8}
        />
        
        {/* 編織紋理（橫向線條） */}
        {[-size * 0.08, -size * 0.03, size * 0.02, size * 0.07].map((y, i) => (
          <Path
            key={i}
            d={`M -${size * 0.18},${y + size * 0.05} Q 0,${y + size * 0.05 + size * 0.02} ${size * 0.18},${y + size * 0.05}`}
            fill="none"
            stroke="url(#basketGradient)"
            strokeWidth={strokeWidth * 0.3}
            opacity={0.5}
          />
        ))}
        
        {/* 提手 */}
        <Path
          d={`M -${size * 0.12},-${size * 0.08} 
              Q -${size * 0.15},-${size * 0.15} -${size * 0.12},-${size * 0.12}
              Q -${size * 0.09},-${size * 0.15} -${size * 0.06},-${size * 0.12}
              M ${size * 0.06},-${size * 0.12}
              Q ${size * 0.09},-${size * 0.15} ${size * 0.12},-${size * 0.12}
              Q ${size * 0.15},-${size * 0.15} ${size * 0.12},-${size * 0.08}`}
          fill="none"
          stroke="url(#basketGradient)"
          strokeWidth={strokeWidth * 0.6}
          strokeLinecap="round"
          opacity={0.9}
        />
        
        {/* 數位顯示器（顯示重量） */}
        <Path
          d={`M -${size * 0.08},${size * 0.12} L ${size * 0.08},${size * 0.12} L ${size * 0.08},${size * 0.18} L -${size * 0.08},${size * 0.18} Z`}
          fill="rgba(0, 0, 0, 0.6)"
          stroke="url(#basketGradient)"
          strokeWidth={strokeWidth * 0.3}
          opacity={0.7}
        />
      </G>
    </Svg>
  );
};

/**
 * SCOUT Icon - 透明藍白色雷達，指針像刀叉（搜尋美味）
 * 隱喻：尋找隱藏的美味
 */
const ScoutIcon: React.FC<{ size: number }> = ({ size }) => {
  const center = size / 2;
  const radius = size * 0.35;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id="scoutGlow" cx="50%" cy="50%">
          <Stop offset="0%" stopColor="#E3F2FD" stopOpacity="0.4" />
          <Stop offset="100%" stopColor="#BBDEFB" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      
      {/* 背景發光 */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        fill="url(#scoutGlow)"
        opacity={0.3}
      />
      
      {/* 同心圓（雷達環） */}
      <Circle
        cx={center}
        cy={center}
        r={radius * 0.6}
        fill="none"
        stroke="rgba(187, 222, 251, 0.4)"
        strokeWidth={size * 0.02}
        opacity={0.6}
      />
      <Circle
        cx={center}
        cy={center}
        r={radius * 0.4}
        fill="none"
        stroke="rgba(187, 222, 251, 0.4)"
        strokeWidth={size * 0.02}
        opacity={0.6}
      />
      <Circle
        cx={center}
        cy={center}
        r={radius * 0.2}
        fill="none"
        stroke="rgba(187, 222, 251, 0.4)"
        strokeWidth={size * 0.02}
        opacity={0.6}
      />
      
      {/* 掃描指針（刀叉造型，45度角） */}
      <G transform={`translate(${center}, ${center}) rotate(45)`}>
        {/* 叉子 */}
        <Path
          d={`M 0,0 L ${radius * 0.7},0`}
          stroke="rgba(187, 222, 251, 0.8)"
          strokeWidth={size * 0.04}
          strokeLinecap="round"
          opacity={0.8}
        />
        {/* 叉子齒 */}
        <Path
          d={`M ${radius * 0.7},0 L ${radius * 0.75},-${size * 0.02} M ${radius * 0.7},0 L ${radius * 0.75},0 M ${radius * 0.7},0 L ${radius * 0.75},${size * 0.02}`}
          stroke="rgba(187, 222, 251, 0.8)"
          strokeWidth={size * 0.02}
          strokeLinecap="round"
          opacity={0.8}
        />
        
        {/* 刀子 */}
        <G transform={`rotate(180 ${radius * 0.35} 0)`}>
          <Path
            d={`M 0,0 L ${radius * 0.5},0`}
            stroke="rgba(187, 222, 251, 0.8)"
            strokeWidth={size * 0.03}
            strokeLinecap="round"
            opacity={0.8}
          />
          <Path
            d={`M ${radius * 0.5},0 L ${radius * 0.55},-${size * 0.015} L ${radius * 0.5},${size * 0.015} Z`}
            fill="rgba(187, 222, 251, 0.6)"
            opacity={0.8}
          />
        </G>
      </G>
      
      {/* 美味信號點 */}
      <Circle
        cx={center + radius * 0.5}
        cy={center - radius * 0.3}
        r={size * 0.04}
        fill="#FFD700"
        opacity={0.8}
      />
      <Circle
        cx={center - radius * 0.4}
        cy={center + radius * 0.4}
        r={size * 0.04}
        fill="#FFD700"
        opacity={0.8}
      />
    </Svg>
  );
};

/**
 * CAPTURE Icon - 亮金色相機快門，像餐盤或切開的柑橘（捕捉/賞味）
 * 隱喻：將美味收入囊中
 */
const CaptureIcon: React.FC<{ size: number }> = ({ size }) => {
  const center = size / 2;
  const radius = size * 0.35;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient id="captureGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
          <Stop offset="50%" stopColor="#FFA500" stopOpacity="1" />
          <Stop offset="100%" stopColor="#FF8C00" stopOpacity="1" />
        </LinearGradient>
        <RadialGradient id="captureGlow" cx="50%" cy="50%">
          <Stop offset="0%" stopColor="#FFD700" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      
      {/* 強烈發光 */}
      <Circle
        cx={center}
        cy={center}
        r={radius + size * 0.1}
        fill="url(#captureGlow)"
        opacity={0.6}
      />
      
      {/* 餐盤/快門外圈 */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="url(#captureGradient)"
        strokeWidth={size * 0.06}
        opacity={0.9}
      />
      
      {/* 快門葉片（像餐盤邊緣或柑橘切片，8片） */}
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
            fill="url(#captureGradient)"
            opacity={0.85}
            transform={`rotate(${angle})`}
          />
        ))}
      </G>
      
      {/* 中心圓（對焦框/餐盤中心） */}
      <Circle
        cx={center}
        cy={center}
        r={radius * 0.4}
        fill="rgba(0, 0, 0, 0.7)"
        stroke="url(#captureGradient)"
        strokeWidth={size * 0.04}
      />
      
      {/* 對焦框（十字線） */}
      <G transform={`translate(${center}, ${center})`}>
        <Path
          d={`M -${size * 0.08},0 L ${size * 0.08},0`}
          stroke="url(#captureGradient)"
          strokeWidth={size * 0.02}
          opacity={0.8}
        />
        <Path
          d={`M 0,-${size * 0.08} L 0,${size * 0.08}`}
          stroke="url(#captureGradient)"
          strokeWidth={size * 0.02}
          opacity={0.8}
        />
        
        {/* 中心點（閃光） */}
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
 * 主組件 - 美食家尋味之旅圖標
 */
export const GourmetIcon: React.FC<GourmetIconProps> = ({
  type,
  progress = 0,
  size = 80,
  active = false,
}) => {
  const renderIcon = () => {
    switch (type) {
      case 'burn':
        return <BurnIcon size={size} progress={progress} />;
      case 'basket':
        return <BasketIcon size={size} progress={progress} />;
      case 'scout':
        return <ScoutIcon size={size} />;
      case 'capture':
        return <CaptureIcon size={size} />;
      default:
        return null;
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'burn':
        return 'BURN';
      case 'basket':
        return 'BASKET';
      case 'scout':
        return 'SCOUT';
      case 'capture':
        return 'CAPTURE';
      default:
        return '';
    }
  };

  const getLabelColor = () => {
    switch (type) {
      case 'burn':
        return '#FF6B35';
      case 'basket':
        return '#4CAF50';
      case 'scout':
        return '#BBDEFB';
      case 'capture':
        return '#FFD700';
      default:
        return '#FFFFFF';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { width: size, height: size }]}>
        {renderIcon()}
      </View>
      <Text style={[styles.label, { color: getLabelColor(), fontSize: size * 0.15 }]}>
        {getLabel()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 4,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
