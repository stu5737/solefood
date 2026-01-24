/**
 * DistanceIcon - 距離圖標組件
 * 使用賽道/路程圖標表示總距離
 */

import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

interface DistanceIconProps {
  size?: number; // 圖標大小（預設 36）
}

export const DistanceIcon: React.FC<DistanceIconProps> = ({ size = 36 }) => {
  const imageSource = require('../../../assets/images/distance_icon.png');

  return (
    <Image
      source={imageSource}
      style={[styles.icon, { width: size, height: size }]}
      resizeMode="contain"
      onError={(error) => {
        console.warn('[DistanceIcon] 圖片加載失敗:', error);
      }}
    />
  );
};

const styles = StyleSheet.create({
  icon: {
    backgroundColor: 'transparent',
  },
});
