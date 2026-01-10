/**
 * Bottom Navigation Dock Component
 * 底部導航 Dock（5個圖標，參考等軸測 3D 地圖風格）
 * Solefood MVP v9.0 Plus
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomNavDockProps {
  onMapPress?: () => void;
  onBagPress?: () => void;
  onRepairPress?: () => void;
  onStreakPress?: () => void;
  onProfilePress?: () => void;
  badgeCounts?: {
    bag?: number;
    streak?: number;
  };
}

export const BottomNavDock: React.FC<BottomNavDockProps> = ({
  onMapPress,
  onBagPress,
  onRepairPress,
  onStreakPress,
  onProfilePress,
  badgeCounts = {},
}) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8); // 至少 8px，或使用安全區域
  const dockItems = [
    {
      icon: '🗺️',
      label: '地圖',
      onPress: onMapPress,
      badge: undefined,
    },
    {
      icon: '🎒',
      label: '背包',
      onPress: onBagPress,
      badge: badgeCounts.bag,
    },
    {
      icon: '🔧',
      label: '維修',
      onPress: onRepairPress,
      badge: undefined,
    },
    {
      icon: '🔥',
      label: '簽到',
      onPress: onStreakPress,
      badge: badgeCounts.streak,
    },
    {
      icon: '👤',
      label: '個人',
      onPress: onProfilePress,
      badge: undefined,
    },
  ];

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]} pointerEvents="box-none">
      {/* 玻璃擬態背景 */}
      <View style={styles.glassBackground} pointerEvents="none" />
      
      {/* Dock 項目 */}
      <View style={styles.dockContent} pointerEvents="auto">
        {dockItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.dockItem}
            onPress={item.onPress}
            activeOpacity={0.8}
            disabled={!item.onPress}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{item.icon}</Text>
              {item.badge !== undefined && item.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.label}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 72, // 最小高度
    zIndex: 90, // 降低 zIndex，讓 MainActionButton 在上層
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 10,
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(42, 42, 42, 0.95)', // 深灰半透明
    backdropFilter: 'blur(10px)', // iOS only
    borderTopWidth: 1,
    borderTopColor: 'rgba(6, 182, 212, 0.3)', // 霓虹青邊框
  },
  dockContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  dockItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  icon: {
    fontSize: 28,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#FFF',
    fontWeight: '700',
  },
  label: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#FFF',
    fontWeight: '600',
  },
});
