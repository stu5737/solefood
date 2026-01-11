/**
 * 發現新區域通知元件 (Discovery Toast)
 * Solefood MVP v9.0 Plus
 * 
 * 當使用者踏入從未去過的 H3 六邊形時，顯示精美的提示通知
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DiscoveryToastProps {
  visible: boolean;
  onHide: () => void;
  duration?: number; // 顯示持續時間（毫秒）
}

/**
 * 發現新區域通知元件
 * 
 * 使用 Animated API 實現滑入/滑出動畫
 * 樣式：半透明深綠色漸層，圓角，帶圖示和文字
 */
export const DiscoveryToast: React.FC<DiscoveryToastProps> = ({
  visible,
  onHide,
  duration = 3000, // 預設 3 秒
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current; // 從上方滑入
  const fadeAnim = useRef(new Animated.Value(0)).current; // 淡入淡出

  useEffect(() => {
    if (visible) {
      // 顯示動畫：滑入 + 淡入
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // 3 秒後自動隱藏
      const timer = setTimeout(() => {
        // 隱藏動畫：滑出 + 淡出
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onHide();
        });
      }, duration);

      return () => {
        clearTimeout(timer);
      };
    } else {
      // 重置動畫值
      slideAnim.setValue(-100);
      fadeAnim.setValue(0);
    }
  }, [visible, duration, slideAnim, fadeAnim, onHide]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.content}>
        {/* 圖示 */}
        <Ionicons name="map" size={24} color="#FFF" style={styles.icon} />
        {/* 文字 */}
        <Text style={styles.text}>✨ 開拓新版圖！</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100, // 頂部下方（避開狀態欄和 HUD）
    alignSelf: 'center',
    zIndex: 10000, // 確保在最上層
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.95)', // 寶石綠 (emerald-600)，半透明
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25, // 圓角（rounded-full）
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8, // Android 陰影
    // 磨砂玻璃效果（backdrop-blur）
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System', // 使用系統字體
  },
});
