/**
 * SpeedIcon - 速度圖標組件
 * 使用風/速度線條圖標表達速度感
 * 
 * 如果圖片文件存在，請將速度圖標 PNG 文件放在：
 * assets/images/speed_icon.png
 * 
 * 目前使用 emoji 作為備用方案
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SpeedIconProps {
  size?: number; // 圖標大小（預設 36）
  useImage?: boolean; // 是否使用圖片（預設 false，使用 emoji）
}

export const SpeedIcon: React.FC<SpeedIconProps> = ({ size = 36, useImage = false }) => {
  // 使用跑步圖標，更直觀地表達速度/運動
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Text style={[styles.emoji, { fontSize: size * 0.8 }]}>🏃</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    // Emoji 樣式
  },
});
