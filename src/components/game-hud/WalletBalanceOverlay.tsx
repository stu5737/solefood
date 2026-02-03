/**
 * WalletBalanceOverlay - 錢包餘額覆蓋層
 * 顯示玩家 $SOIL 代幣餘額（待機狀態，右上角）
 * 採用玻璃態風格，與 TopHUD 保持一致
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface WalletBalanceOverlayProps {
  /** $SOIL 餘額（預設為硬編碼值，後續可從 Store 讀取） */
  balance?: number;
}

export const WalletBalanceOverlay: React.FC<WalletBalanceOverlayProps> = React.memo(({
  balance = 1250.0, // 硬編碼預設值，方便測試
}) => {
  const insets = useSafeAreaInsets();

  // 格式化餘額顯示（千分位，無小數點）
  const formatBalance = (value: number) => {
    return Math.round(value).toLocaleString('en-US');
  };

  return (
    <View
      style={[
        styles.container,
        {
          top: insets.top + 12, // 與體力條垂直對齊（下移 2px）
          right: 16, // 離右邊緣更遠（從 12 增加到 16）
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.balanceCard}>
        {/* $SOIL 圖標 */}
        <View style={styles.iconContainer}>
          <Image
            source={require('../../../assets/images/soil_token_icon.png')}
            style={styles.tokenIcon}
            resizeMode="contain"
            onError={(error) => {
              console.warn('[WalletBalanceOverlay] $SOIL 圖標加載失敗，使用預設圖標:', error);
            }}
          />
          {/* 備用：如果圖片加載失敗，顯示葉子圖標 */}
          {/* <Ionicons name="leaf-outline" size={24} color="rgba(139, 195, 74, 0.9)" /> */}
        </View>

        {/* 餘額文字 */}
        <Text style={styles.balanceText}>{formatBalance(balance)}</Text>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // ✅ balance 不變時不重繪
  return prevProps.balance === nextProps.balance;
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 2001, // 在 TopHUD (2000) 之上
    pointerEvents: 'box-none',
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center', // 垂直居中對齊，與體力條一致
    // 無底色、無邊框、無陰影，保持透明（與體力條一致）
    gap: 8, // 與體力條的 gap 一致
  },
  iconContainer: {
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
    fontSize: 14, // 與 IdleTopHUD 中的資產數字協調（統一為 14）
    fontWeight: '700',
    color: '#FFF',
    fontFamily: 'monospace',
    letterSpacing: 0.3,
  },
});
