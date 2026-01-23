/**
 * GameOverlay - 遊戲 HUD 覆蓋層
 * 整合所有 UI 元素，使用 SafeArea 確保適配各種設備
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusCapsule } from './StatusCapsule';
import { StatusRing } from './StatusRing';
import { ActionCircle } from './ActionCircle';
import { ForageButton } from './ForageButton';
import { SolefoodButton } from './SolefoodButton';

interface GameOverlayProps {
  // 狀態數據
  stamina: number;
  maxStamina: number;
  currentWeight: number;
  maxWeight: number;
  
  // 動作狀態
  actionState: 'idle' | 'active';
  onActionPress: () => void;
  
  // 可選：自定義圖標
  burnIcon?: React.ReactNode;
  basketIcon?: React.ReactNode;
  actionIcon?: React.ReactNode;
}

export const GameOverlay: React.FC<GameOverlayProps> = ({
  stamina,
  maxStamina,
  currentWeight,
  maxWeight,
  actionState,
  onActionPress,
  burnIcon,
  basketIcon,
  actionIcon,
}) => {
  const insets = useSafeAreaInsets();
  
  const staminaPercentage = (stamina / maxStamina) * 100;
  const weightPercentage = (currentWeight / maxWeight) * 100;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* 底部動作按鈕區域 - 更靠近底部 */}
      {/* 當 actionState 為 'active' 時，按鈕消失 */}
      {actionState !== 'active' && (
        <View style={[styles.bottomSection, { bottom: insets.bottom + 8 }]} pointerEvents="box-none">
          {/* 使用透明 PNG 圖片按鈕（再放大 120%，保持原始比例） */}
          <SolefoodButton
            onPress={onActionPress}
            imageSource={require('../../../assets/images/forage_button.png')}
            style={{ width: 568, height: 162 }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  topSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  leftRing: {
    // 左上角
  },
  rightRing: {
    // 右上角
  },
  bottomSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 20,
  },
  cartEmoji: {
    fontSize: 40,
  },
});
