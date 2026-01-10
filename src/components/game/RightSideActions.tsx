/**
 * Right Side Actions Component
 * 右側懸浮按鈕組（參考等軸測 3D 地圖風格）
 * Solefood MVP v9.0 Plus
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface RightSideActionsProps {
  onCameraPress?: () => void;
  onRescuePress?: () => void;
  showRescue?: boolean; // 當體力低時顯示救援按鈕
}

export const RightSideActions: React.FC<RightSideActionsProps> = ({
  onCameraPress,
  onRescuePress,
  showRescue = false,
}) => {
  return (
    <View style={styles.container}>
      {/* 相機按鈕 */}
      {onCameraPress && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onCameraPress}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>📷</Text>
        </TouchableOpacity>
      )}

      {/* 救援按鈕（條件顯示） */}
      {showRescue && onRescuePress && (
        <TouchableOpacity
          style={[styles.actionButton, styles.rescueButton]}
          onPress={onRescuePress}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>🚨</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80, // 在頂部環境條下方
    right: 16,
    zIndex: 60,
    alignItems: 'center',
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  rescueButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.95)', // 紅色（緊急）
    borderColor: '#EF4444',
  },
  actionIcon: {
    fontSize: 24,
  },
});
