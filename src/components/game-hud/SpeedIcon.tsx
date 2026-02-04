/**
 * SpeedIcon - 速度圖標組件
 * 使用速度圖標表達速度感
 */

import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

interface SpeedIconProps {
  size?: number; // 圖標大小（預設 36）
}

export const SpeedIcon: React.FC<SpeedIconProps> = React.memo(({ size = 36 }) => {
  const imageSource = require('../../../assets/images/speed_icon.png');
  
  return (
    <Image
      source={imageSource}
      style={[styles.icon, { width: size, height: size }]}
      resizeMode="contain"
      onError={() => {}}
    />
  );
});

const styles = StyleSheet.create({
  icon: {
    backgroundColor: 'transparent',
  },
});
