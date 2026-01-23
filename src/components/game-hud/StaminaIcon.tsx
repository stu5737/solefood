/**
 * StaminaIcon - 體力圖標組件
 * 3D 火焰圖標
 * 
 * 如果圖片文件存在，請將 3D 火焰圖標 PNG 文件放在：
 * assets/images/stamina_icon.png
 * 
 * 目前使用 emoji 作為備用方案
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StaminaIconProps {
  size?: number; // 圖標大小（預設 36）
  useImage?: boolean; // 是否使用圖片（預設 false，使用 emoji）
}

export const StaminaIcon: React.FC<StaminaIconProps> = ({ size = 36, useImage = false }) => {
  // 暫時使用 emoji，直到圖片文件被添加
  // 當圖片文件準備好後，可以取消註釋下面的代碼並註釋掉 emoji 部分
  
  // if (useImage) {
  //   try {
  //     return (
  //       <Image
  //         source={require('../../../assets/images/stamina_icon.png')}
  //         style={[styles.icon, { width: size, height: size }]}
  //         resizeMode="contain"
  //       />
  //     );
  //   } catch (error) {
  //     // 如果圖片加載失敗，回退到 emoji
  //   }
  // }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Text style={[styles.emoji, { fontSize: size * 0.8 }]}>🔥</Text>
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
  icon: {
    // 圖片樣式（當圖片文件準備好後使用）
  },
});
