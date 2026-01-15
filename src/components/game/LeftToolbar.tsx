/**
 * LeftToolbar - 左側工具欄 (Pokémon GO 風格)
 * 次要功能：歷史軌跡、重新定位、快速食用
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ToolButtonProps {
  icon: string; // Emoji
  onPress: () => void;
  badge?: number;
  active?: boolean;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  icon,
  onPress,
  badge,
  active = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.toolButton, active && styles.toolButtonActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.toolIcon}>{icon}</Text>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

interface LeftToolbarProps {
  sessionCount: number;
  consumableCount: number;
  isCollecting: boolean;
  followMode: 'NONE' | 'FOLLOW' | 'COMPASS';
  onShowHistory: () => void;
  onRecenterMap: () => void;
  onQuickConsume?: () => void;
}

export const LeftToolbar: React.FC<LeftToolbarProps> = ({
  sessionCount,
  consumableCount,
  isCollecting,
  followMode,
  onShowHistory,
  onRecenterMap,
  onQuickConsume,
}) => {
  return (
    <View style={styles.container}>
      {/* 歷史軌跡 */}
      {sessionCount > 0 && (
        <ToolButton
          icon="🗺️"
          onPress={onShowHistory}
          badge={sessionCount}
        />
      )}

      {/* 重新定位 */}
      <ToolButton
        icon="📍"
        onPress={onRecenterMap}
        active={followMode !== 'NONE'}
      />

      {/* 快速食用（僅採集中 + 有可食用物品） */}
      {isCollecting && consumableCount > 0 && onQuickConsume && (
        <ToolButton
          icon="🍬"
          onPress={onQuickConsume}
          badge={consumableCount}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 12,
  },
  toolButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  toolButtonActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.6)',
    borderColor: '#4CAF50',
  },
  toolIcon: {
    fontSize: 22,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F44336',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF',
  },
});
