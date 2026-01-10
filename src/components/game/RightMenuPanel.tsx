/**
 * RightMenuPanel Component
 * 右側垂直菜單面板 - 邀請、朋友、任務、鍛造、抽獎、市場、活動
 * 基於新的遊戲界面模板設計
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RightMenuPanelProps {
  onInvitePress?: () => void;
  onFriendsPress?: () => void;
  onQuestsPress?: () => void;
  onForgePress?: () => void;
  onLuckyDrawPress?: () => void;
  onMarketPress?: () => void;
  onActivityPress?: () => void;
}

export const RightMenuPanel: React.FC<RightMenuPanelProps> = ({
  onInvitePress,
  onFriendsPress,
  onQuestsPress,
  onForgePress,
  onLuckyDrawPress,
  onMarketPress,
  onActivityPress,
}) => {
  const insets = useSafeAreaInsets();

  const menuItems = [
    {
      id: 'invite',
      icon: '👥',
      label: 'Invite',
      onPress: onInvitePress || (() => Alert.alert('邀請', '邀請功能（待實現）')),
    },
    {
      id: 'friends',
      icon: '👫',
      label: 'Friends',
      onPress: onFriendsPress || (() => Alert.alert('朋友', '朋友功能（待實現）')),
    },
    {
      id: 'quests',
      icon: '📋',
      label: 'Quests',
      onPress: onQuestsPress || (() => Alert.alert('任務', '任務功能（待實現）')),
    },
    {
      id: 'forge',
      icon: '🔨',
      label: 'Forge',
      onPress: onForgePress || (() => Alert.alert('鍛造', '鍛造功能（待實現）')),
    },
    {
      id: 'luckydraw',
      icon: '🎰',
      label: 'Lucky',
      onPress: onLuckyDrawPress || (() => Alert.alert('抽獎', '抽獎功能（待實現）')),
    },
    {
      id: 'market',
      icon: '🛒',
      label: 'Market',
      onPress: onMarketPress || (() => Alert.alert('市場', '市場功能（待實現）')),
    },
  ];

  return (
    <View style={[styles.container, { top: (insets.top || 0) + 120 }]}>
      {menuItems.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.menuButton}
          onPress={item.onPress}
          activeOpacity={0.7}
        >
          <View style={styles.hexagon}>
            <Text style={styles.icon}>{item.icon}</Text>
          </View>
          {item.label && (
            <Text style={styles.label}>{item.label}</Text>
          )}
        </TouchableOpacity>
      ))}

      {/* Activity 按鈕（較大，在底部） */}
      <TouchableOpacity
        style={[styles.menuButton, styles.activityButton]}
        onPress={onActivityPress || (() => Alert.alert('活動', '活動功能（待實現）'))}
        activeOpacity={0.7}
      >
        <View style={styles.activityHexagon}>
          <Text style={styles.activityIcon}>⚫</Text>
          <Text style={styles.activityLabel}>Activity</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 8,
    alignItems: 'center',
    zIndex: 90,
  },
  menuButton: {
    alignItems: 'center',
    marginBottom: 8,
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
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  icon: {
    fontSize: 24,
  },
  label: {
    fontSize: 9,
    color: '#666',
    marginTop: 2,
    fontWeight: '500',
  },
  activityButton: {
    marginTop: 8,
  },
  activityHexagon: {
    width: 56,
    height: 56,
    backgroundColor: '#FFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 8,
  },
  activityIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  activityLabel: {
    fontSize: 9,
    color: '#333',
    fontWeight: '600',
  },
});
