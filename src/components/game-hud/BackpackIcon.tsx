/**
 * BackpackIcon - 背包圖標組件
 * 背包圖標
 * 
 * 如果圖片文件存在，請將背包圖標 PNG 文件放在：
 * assets/images/backpack_icon.png
 * 
 * 目前使用 emoji 作為備用方案
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface BackpackIconProps {
  size?: number; // 圖標大小（預設 36）
}

export const BackpackIcon: React.FC<BackpackIconProps> = ({ size = 36 }) => {
  // React Native 的 require() 在編譯時解析，如果圖片不存在會在構建時失敗
  // 這裡直接使用 require，如果圖片路徑錯誤會在構建時報錯
  const imageSource = require('../../../assets/images/backpack_icon.png');
  
  return (
    <Image
      source={imageSource}
      style={[styles.icon, { width: size, height: size }]}
      resizeMode="contain"
      onError={(error) => {
        console.warn('[BackpackIcon] 圖片加載失敗:', error);
      }}
    />
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
  icon: {
    // 圖片樣式 - 確保透明背景
    backgroundColor: 'transparent',
  },
});
