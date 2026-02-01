/**
 * IdleTopHUD - 待機狀態頂部 HUD
 * 顯示：右上角 - 代幣餘額（左）+ 簡短體力條（右，bar 內顯示百分比）
 * 設計：簡潔、不擋地圖
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StaminaIcon } from './StaminaIcon';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface IdleTopHUDProps {
  stamina: number;
  maxStamina: number;
  /** $SOIL 餘額 */
  balance?: number;
  /** 嵌入模式：不佔位，由外層與 UserProfileHUD 同一列排版 */
  embedded?: boolean;
}

export const IdleTopHUD: React.FC<IdleTopHUDProps> = ({
  stamina,
  maxStamina,
  balance = 1250.0,
  embedded = false,
}) => {
  const insets = useSafeAreaInsets();
  const staminaPercentage = (stamina / maxStamina) * 100;
  const fillWidth = useSharedValue(0);

  useEffect(() => {
    fillWidth.value = withSpring(staminaPercentage, {
      damping: 15,
      stiffness: 100,
      mass: 0.8,
    });
  }, [staminaPercentage]);

  const animatedFillStyle = useAnimatedStyle(() => {
    return {
      width: `${fillWidth.value}%`,
    };
  });

  // 格式化餘額顯示：>= 1,000,000 用 M，>= 1,000 用 k，否則顯示原數字
  const formatBalance = (value: number) => {
    const n = Math.round(value);
    if (n >= 1_000_000) {
      const m = n / 1_000_000;
      return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
    }
    if (n >= 1_000) {
      const k = n / 1_000;
      return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
    }
    return String(n);
  };

  const hudRow = (
    <View style={styles.hudRow}>
      {/* 代幣餘額（左側，數字外框與體力條呼應） */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceIconContainer}>
          <Image
            source={require('../../../assets/images/soil_token_icon.png')}
            style={styles.tokenIcon}
            resizeMode="contain"
            onError={(error) => {
              console.warn('[IdleTopHUD] $SOIL 圖標加載失敗:', error);
            }}
          />
        </View>
        <View style={styles.balanceTrack}>
          <Text style={styles.balanceText}>{formatBalance(balance)}</Text>
        </View>
      </View>

      {/* 體力條（簡短版，bar 內顯示百分比，無底色，右側） */}
      <View style={styles.staminaCard}>
        <View style={styles.staminaIconContainer}>
          <StaminaIcon size={48} />
        </View>
        <View style={styles.staminaBarContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { backgroundColor: '#FF6B35' },
                animatedFillStyle,
              ]}
            />
            <Text style={styles.percentageText}>{Math.round(staminaPercentage)}%</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (embedded) {
    return hudRow;
  }
  return (
    <View style={[styles.container, { top: insets.top + 16, right: 16 }]} pointerEvents="box-none">
      {hudRow}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 2001,
    pointerEvents: 'box-none',
  },
  hudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // 體力條和代幣之間的間距
    alignSelf: 'flex-end', // 靠右對齊
  },
  staminaCard: {
    flexDirection: 'row',
    alignItems: 'center', // 垂直居中對齊
    // 無底色、無邊框、無陰影，保持透明
    gap: 8,
  },
  staminaIconContainer: {
    width: 48, // 火焰圖標大小
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staminaBarContainer: {
    width: 60, // 固定寬度，只夠顯示 100%
  },
  progressTrack: {
    height: 20, // 簡短的 bar 高度
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    height: '100%',
    borderRadius: 10,
  },
  percentageText: {
    fontSize: 13, // 增大體力百分比字體（從 11 到 13），與資產數字協調
    fontWeight: '700',
    color: '#FFF',
    fontFamily: 'monospace',
    textAlign: 'center',
    zIndex: 1, // 確保文字在 fill 之上
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceTrack: {
    width: 60,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceIconContainer: {
    width: 56, // 放大資產圖標（從 48 到 56）
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenIcon: {
    width: 56, // 放大資產圖標（從 48 到 56）
    height: 56,
  },
  balanceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
    fontFamily: 'monospace',
    letterSpacing: 0.3,
  },
});
