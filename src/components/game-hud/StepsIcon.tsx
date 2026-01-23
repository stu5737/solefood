/**
 * StepsIcon - 步數圖標組件
 * 使用腳印圖標表示步數
 */

import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

interface StepsIconProps {
  size?: number; // 圖標大小（預設 36）
}

export const StepsIcon: React.FC<StepsIconProps> = ({ size = 36 }) => {
  const imageSource = require('../../../assets/images/steps_icon.png');
  
  return (
    <Image
      source={imageSource}
      style={[styles.icon, { width: size, height: size }]}
      resizeMode="contain"
      onError={(error) => {
        console.warn('[StepsIcon] 圖片加載失敗:', error);
      }}
    />
  );
};

const styles = StyleSheet.create({
  icon: {
    backgroundColor: 'transparent',
  },
});
