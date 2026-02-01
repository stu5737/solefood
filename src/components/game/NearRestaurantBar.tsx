/**
 * NearRestaurantBar - 靠近餐廳時顯示的卸貨／拍照條
 * 遊戲模式下，GPS 進入合理範圍內可卸貨並開啟相機
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SEVEN_ELEVEN_ICON = require('../../../assets/images/seven_eleven_icon.png');

export interface NearbyRestaurant {
  id: string;
  title: string;
  emoji?: string;
  distanceMeters?: number; // 點擊餐廳時可為 0 或省略
}

interface NearRestaurantBarProps {
  restaurant: NearbyRestaurant;
  onUnload: () => void;
  onCamera: () => void;
  onClose?: () => void;
}

export const NearRestaurantBar: React.FC<NearRestaurantBarProps> = ({
  restaurant,
  onUnload,
  onCamera,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { bottom: insets.bottom + 100 }]} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.header}>
          <Image source={SEVEN_ELEVEN_ICON} style={styles.storeIcon} resizeMode="contain" />
          <Text style={styles.label} numberOfLines={1}>
            {restaurant.title}
          </Text>
          {onClose && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.hint}>
          {restaurant.distanceMeters != null && restaurant.distanceMeters <= 80
            ? '在卸貨範圍內'
            : '請靠近餐廳後再按卸貨'}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.cameraButton]}
            onPress={onCamera}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonIcon}>📷</Text>
            <Text style={styles.buttonText}>拍照</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.unloadButton]}
            onPress={onUnload}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonIcon}>🚗</Text>
            <Text style={styles.buttonText}>卸貨</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 1999,
  },
  card: {
    backgroundColor: 'rgba(30, 35, 50, 0.96)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    minWidth: 260,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  storeIcon: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 100,
  },
  cameraButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  unloadButton: {
    backgroundColor: '#2196F3',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  buttonIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
