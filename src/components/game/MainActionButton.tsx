/**
 * MainActionButton - 底部主按鈕 (Pokémon GO 風格)
 * 支持三態：待命 (START SHIFT) / 採集中 (卸貨/野餐) / 滿倉強調
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

export type GameState = 'IDLE' | 'COLLECTING' | 'UNLOADING' | 'PICNIC';

interface MainActionButtonProps {
  gameState: GameState;
  isBackpackFull: boolean;
  onStartShift: () => void;
  onUnload: () => void;
  onPicnic: () => void;
}

export const MainActionButton: React.FC<MainActionButtonProps> = ({
  gameState,
  isBackpackFull,
  onStartShift,
  onUnload,
  onPicnic,
}) => {
  // 待命模式：顯示 START SHIFT
  if (gameState === 'IDLE') {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.mainButton}
          onPress={onStartShift}
          activeOpacity={0.9}
        >
          <Text style={styles.mainButtonText}>START SHIFT</Text>
          <Text style={styles.mainButtonIcon}>▶️</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 採集中模式：顯示卸貨/野餐選項
  if (gameState === 'COLLECTING') {
    return (
      <View style={styles.container}>
        <View style={styles.collectionActions}>
          {/* 卸貨按鈕（主要） */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.unloadButton,
              isBackpackFull && styles.actionButtonPulse,
            ]}
            onPress={onUnload}
            activeOpacity={0.9}
          >
            <Text style={styles.actionIcon}>🚗</Text>
            <Text style={styles.actionText}>卸貨</Text>
            {isBackpackFull && (
              <View style={styles.fullBadge}>
                <Text style={styles.fullText}>滿</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* 野餐按鈕（次要） */}
          <TouchableOpacity
            style={[styles.actionButton, styles.picnicButton]}
            onPress={onPicnic}
            activeOpacity={0.9}
          >
            <Text style={styles.actionIcon}>🍽️</Text>
            <Text style={styles.actionText}>野餐</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 其他狀態（UNLOADING, PICNIC）- 不顯示按鈕
  return null;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    zIndex: 1000,
  },
  mainButton: {
    width: 180,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  mainButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 1,
  },
  mainButtonIcon: {
    fontSize: 24,
    marginTop: 2,
  },
  collectionActions: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
  },
  actionButton: {
    width: 140,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  unloadButton: {
    backgroundColor: '#2196F3',
  },
  picnicButton: {
    backgroundColor: '#FF9800',
  },
  actionIcon: {
    fontSize: 28,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 2,
  },
  actionButtonPulse: {
    transform: [{ scale: 1.05 }],
    shadowOpacity: 0.6,
  },
  fullBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F44336',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  fullText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFF',
  },
});
