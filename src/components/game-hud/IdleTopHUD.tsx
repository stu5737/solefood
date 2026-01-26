/**
 * IdleTopHUD - 待機狀態頂部 HUD
 * 顯示：右上角 - 簡短體力條（bar 內顯示百分比，無底色）+ 代幣餘額（同一排）
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
}

export const IdleTopHUD: React.FC<IdleTopHUDProps> = ({
  stamina,
  maxStamina,
  balance = 1250.0,
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

  // 格式化餘額顯示（千分位，無小數點）
  const formatBalance = (value: number) => {
    return Math.round(value).toLocaleString('en-US');
  };

  return (
    <View style={[styles.container, { top: insets.top + 16, right: 16 }]} pointerEvents="box-none">
      {/* 體力條和代幣（同一排，靠在一起） */}
      <View style={styles.hudRow}>
        {/* 體力條（簡短版，bar 內顯示百分比，無底色） */}
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
              {/* 百分比文字（覆蓋在 bar 上） */}
              <Text style={styles.percentageText}>{Math.round(staminaPercentage)}%</Text>
            </View>
          </View>
        </View>

        {/* 代幣餘額（緊接在體力條右側） */}
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
          <Text style={styles.balanceText}>{formatBalance(balance)}</Text>
        </View>
      </View>
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
    width: 48, // 放大火焰圖標（從 40 到 48）
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
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    fontFamily: 'monospace',
    textAlign: 'center',
    zIndex: 1, // 確保文字在 fill 之上
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    // 無底色、無邊框、無陰影，保持透明（與體力條一致）
    gap: 8,
  },
  balanceIconContainer: {
    width: 48, // 與 WalletBalanceOverlay 一致
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenIcon: {
    width: 48,
    height: 48,
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    fontFamily: 'monospace',
    letterSpacing: 0.3,
  },
});
