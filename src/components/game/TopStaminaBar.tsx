/**
 * TopStaminaBar - 頂部極簡體力條 (Pokémon GO 風格)
 * 半透明、不搶眼、清晰
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePlayerStore } from '../../stores/playerStore';

interface TopStaminaBarProps {
  // 移除 onSettingsPress，設置按鈕已移至右上角
}

export const TopStaminaBar: React.FC<TopStaminaBarProps> = () => {
  const stamina = usePlayerStore((state) => state.stamina);
  const maxStamina = usePlayerStore((state) => state.maxStamina);

  // 體力百分比
  const staminaPercentage = (stamina / maxStamina) * 100;

  // 動態顏色
  const getStaminaColor = (percentage: number): string => {
    if (percentage <= 20) return '#F44336'; // 紅色：危險
    if (percentage <= 40) return '#FF9800'; // 橙色：警告
    if (percentage <= 60) return '#FFC107'; // 黃色：注意
    return '#4CAF50'; // 綠色：正常
  };

  const staminaColor = getStaminaColor(staminaPercentage);

  return (
    <View style={styles.container}>
      {/* 左側：體力顯示 */}
      <View style={styles.staminaGroup}>
        <Text style={styles.staminaIcon}>⚡</Text>
        <View style={styles.staminaMeter}>
          <View
            style={[
              styles.staminaFill,
              {
                width: `${staminaPercentage}%`,
                backgroundColor: staminaColor,
              },
            ]}
          />
        </View>
        <Text style={styles.staminaValue}>
          {Math.floor(stamina)}/{maxStamina}
        </Text>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  staminaGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  staminaIcon: {
    fontSize: 18,
  },
  staminaMeter: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  staminaFill: {
    height: '100%',
    borderRadius: 5,
  },
  staminaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
    fontFamily: 'monospace',
    minWidth: 55,
  },
});
