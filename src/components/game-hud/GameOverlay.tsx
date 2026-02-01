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
  /** 321 倒數是否已完成（採集中且完成後才顯示推車） */
  countdownComplete?: boolean;
  
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

  // 僅 IDLE 顯示 GO 按鈕；開始採集後消失
  const showBottomButton = actionState !== 'active';

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* 底部 GO 按鈕（去採集）- 僅 IDLE 顯示，開始採集後消失 */}
      {showBottomButton && (
        <View style={[styles.bottomSection, { bottom: insets.bottom + 18 }]} pointerEvents="box-none">
          <SolefoodButton
            onPress={onActionPress}
            imageSource={require('../../../assets/images/forage_button.png')}
            style={{ width: 382, height: 109 }}
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
  /** GO 按鈕包裝器：半透明效果，不擋地圖 */
  goButtonWrapper: {
    opacity: 0.75, // 75% 不透明度，讓地圖更清晰可見
  },
  iconEmoji: {
    fontSize: 20,
  },
  cartEmoji: {
    fontSize: 40,
  },
});
