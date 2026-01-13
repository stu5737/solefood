/**
 * 用戶標記組件（簡潔圓形標記，適合 LBS 遊戲）
 * ⭐ 穩定版：移除 tracksViewChanges 動態控制，使用默認行為
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';

interface UserMarkerProps {
  coordinate: {
    latitude: number;
    longitude: number;
  } | null;
}

const UserMarkerComponent: React.FC<UserMarkerProps> = ({
  coordinate,
}) => {
  // ⭐ 驗證座標有效性
  if (!coordinate || 
      !isFinite(coordinate.latitude) || 
      !isFinite(coordinate.longitude) ||
      Math.abs(coordinate.latitude) > 90 ||
      Math.abs(coordinate.longitude) > 180) {
    console.warn('[UserMarker] Invalid coordinate:', coordinate);
    return null;
  }

  console.log('[UserMarker] 🎯 Rendering marker at:', coordinate);

  return (
    <Marker
      coordinate={coordinate}
      title="我的位置"
      anchor={{ x: 0.5, y: 0.5 }} // ⭐ 從中心點對齊座標
      tracksViewChanges={false} // ⭐ 固定為 false，確保穩定顯示（防止採集結束後消失）
      zIndex={1000} // ⭐ 確保在所有 H3 層之上
      opacity={1.0} // ⭐ 確保完全不透明
    >
      <View style={styles.markerContainer}>
        <View style={styles.mainMarker}>
          <View style={styles.innerDot} />
        </View>
      </View>
    </Marker>
  );
};

export const UserMarker = UserMarkerComponent;

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32, // ⭐ 小巧尺寸
    height: 32,
    backgroundColor: 'transparent',
  },
  mainMarker: {
    width: 28, // ⭐ 藍色小點點
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4285F4', // ⭐ Google 藍色
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    // ⭐ 輕微陰影，保持可見度
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  innerDot: {
    width: 10, // ⭐ 小內部圓點
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
});
