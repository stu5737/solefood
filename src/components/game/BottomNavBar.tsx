/**
 * BottomNavBar Component
 * 底部導航欄 - 錢包、物品、Meme、商店、雷達
 * 基於新的遊戲界面模板設計
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useSessionStore } from '../../stores/sessionStore';

interface BottomNavBarProps {
  onVaultPress?: () => void;
  onItemsPress?: () => void;
  onMemesPress?: () => void;
  onShopPress?: () => void;
  onRadarPress?: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  onVaultPress,
  onItemsPress,
  onMemesPress,
  onShopPress,
  onRadarPress,
}) => {
  const insets = useSafeAreaInsets();
  const inventoryState = useInventoryStore();
  const sessionState = useSessionStore();

  const navItems = [
    {
      id: 'vault',
      icon: '💼',
      label: 'Vault',
      onPress: onVaultPress || (() => Alert.alert('錢包', '錢包功能（待實現）')),
      badge: null,
    },
    {
      id: 'items',
      icon: '🎒',
      label: 'Items',
      onPress: onItemsPress || (() => Alert.alert('物品', '物品功能（待實現）')),
      badge: inventoryState.items.length > 0 ? inventoryState.items.length : null,
    },
    {
      id: 'memes',
      icon: '🐕',
      label: 'Meme',
      onPress: onMemesPress || (() => Alert.alert('Meme', 'Meme 功能（待實現）')),
      badge: null,
    },
    {
      id: 'shop',
      icon: '🏪',
      label: 'Shop',
      onPress: onShopPress || (() => Alert.alert('商店', '商店功能（待實現）')),
      badge: null,
    },
    {
      id: 'radar',
      icon: '📡',
      label: 'Radar',
      onPress: onRadarPress || (() => Alert.alert('雷達', '雷達功能（待實現）')),
      badge: null,
    },
  ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom || 8 }]}>
      {navItems.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.navButton}
          onPress={item.onPress}
          activeOpacity={0.7}
        >
          <View style={styles.hexagon}>
            {item.badge && item.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.badge > 99 ? '99+' : item.badge}
                </Text>
              </View>
            )}
            <Text style={styles.icon}>{item.icon}</Text>
          </View>
          <Text style={styles.label}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  navButton: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  hexagon: {
    width: 48,
    height: 48,
    backgroundColor: '#FFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 4,
  },
  icon: {
    fontSize: 24,
  },
  label: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    zIndex: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
});
