/**
 * TopHUD - 頂部 HUD 組件
 * 簡潔設計：只顯示背包容量和體力兩個狀態條
 * 參考設計圖：顯示當前值/最大值，帶變化指示器和進度條
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackedResourceBar } from './StackedResourceBar';
import { StaminaIcon } from './StaminaIcon';
import { BackpackIcon } from './BackpackIcon';

interface TopHUDProps {
  // 體力數據
  stamina: number;
  maxStamina: number;
  
  // 背包數據
  currentWeight: number;
  maxWeight: number;
  
  // 可選：自定義圖標
  staminaIcon?: React.ReactNode;
  weightIcon?: React.ReactNode;
  
  // 可選：變化值（用於顯示 +xxx 或 -xxx）
  weightChange?: number;
  staminaChange?: number;
}

export const TopHUD: React.FC<TopHUDProps> = ({
  stamina,
  maxStamina,
  currentWeight,
  maxWeight,
  staminaIcon,
  weightIcon,
  weightChange,
  staminaChange,
}) => {
  const insets = useSafeAreaInsets();
  
  const staminaPercentage = (stamina / maxStamina) * 100;
  const weightPercentage = (currentWeight / maxWeight) * 100;

  const iconSize = 44; // 增大圖標尺寸

  return (
    <View style={[styles.container, { top: insets.top + 8 }]} pointerEvents="box-none">
      {/* 兩個狀態條：背包容量（左）和體力（右） */}
      <View style={styles.twoBarsRow} pointerEvents="box-none">
        {/* 背包容量 - 垂直堆疊：圖標+數字在上，進度條在下 */}
        <View style={styles.barItem}>
          <StackedResourceBar
            percentage={weightPercentage}
            color="#FF4444" // 紅色系，匹配購物車圖標的紅色把手
            icon={weightIcon || <BackpackIcon size={iconSize} />}
            label={`${currentWeight.toFixed(2)}/${maxWeight.toFixed(2)}`}
            width={160}
          />
        </View>

        {/* 體力 - 垂直堆疊：圖標+數字在上，進度條在下 */}
        <View style={styles.barItem}>
          <StackedResourceBar
            percentage={staminaPercentage}
            color="#FF6B35" // 橙紅色系，匹配火焰圖標的黃橙紅漸變
            icon={staminaIcon || <StaminaIcon size={iconSize} />}
            label={`${stamina.toFixed(1)}/${maxStamina.toFixed(1)}`}
            width={160}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2000,
    paddingHorizontal: 12,
  },
  twoBarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  barItem: {
    flex: 1,
    minWidth: 0,
  },
});
