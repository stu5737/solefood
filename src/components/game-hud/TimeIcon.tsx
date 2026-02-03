/**
 * TimeIcon - 時鐘圖標組件
 * 使用時鐘圖標表示時間
 */

import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

interface TimeIconProps {
  size?: number; // 圖標大小（預設 36）
}

export const TimeIcon: React.FC<TimeIconProps> = React.memo(({ size = 36 }) => {
  const imageSource = require('../../../assets/images/time_icon.png');
  
  return (
    <Image
      source={imageSource}
      style={[styles.icon, { width: size, height: size }]}
      resizeMode="contain"
      onError={(error) => {
        console.warn('[TimeIcon] 圖片加載失敗:', error);
      }}
    />
  );
});

const styles = StyleSheet.create({
  icon: {
    backgroundColor: 'transparent',
  },
});
