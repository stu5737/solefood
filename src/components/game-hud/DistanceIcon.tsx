/**
 * DistanceIcon - 距離圖標組件
 * 位置標記圖標
 * 
 * 如果圖片文件存在，請將位置標記圖標 PNG 文件放在：
 * assets/images/distance_icon.png
 * 
 * 目前使用 emoji 作為備用方案
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DistanceIconProps {
  size?: number; // 圖標大小（預設 36）
  useImage?: boolean; // 是否使用圖片（預設 false，使用 emoji）
}

export const DistanceIcon: React.FC<DistanceIconProps> = ({ size = 36, useImage = false }) => {
  // 暫時使用 emoji，直到圖片文件被添加
  // 使用位置標記 📍 來表示距離/位置，比腳印更明顯
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Text style={[styles.emoji, { fontSize: size * 0.8 }]}>📍</Text>
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
