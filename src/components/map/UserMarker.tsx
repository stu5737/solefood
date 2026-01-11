/**
 * 用戶標記組件（簡潔圓形標記，適合 LBS 遊戲）
 * ⭐ Android 極限修復：極限縮小版 + 渲染優化
 * 原理：大幅縮小尺寸到 Android 能穩定處理的範圍（40x40），移除不必要的樣式
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
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
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  // ⭐ Android 修復：座標變化時重新啟用 tracksViewChanges，確保新位置能渲染
  useEffect(() => {
    if (coordinate) {
      setTracksViewChanges(true);
    }
  }, [coordinate?.latitude, coordinate?.longitude]);

  if (!coordinate || 
      !isFinite(coordinate.latitude) || 
      !isFinite(coordinate.longitude) ||
      Math.abs(coordinate.latitude) > 90 ||
      Math.abs(coordinate.longitude) > 180) {
    console.warn('[UserMarker] Invalid coordinate:', coordinate);
    return null;
  }

  console.log('[UserMarker] Rendering marker at:', coordinate, 'Platform:', Platform.OS, 'tracksViewChanges:', tracksViewChanges);

  // ⭐ Android 極限修復：給 Android 更多時間來「捕捉 (snapshot)」這個 View
  // 將延遲時間增加到 1000ms (1秒)，確保 Android 有足夠時間渲染
  const handleLoad = () => {
    setTimeout(() => {
      setTracksViewChanges(false);
      console.log('[UserMarker] tracksViewChanges set to false after load (1000ms)');
    }, 1000); // ⭐ 關鍵：1000ms 延遲，給 Android 更多時間
  };

  // 組件掛載後也觸發一次（因為 View 可能沒有 onLoad 事件）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tracksViewChanges) {
        setTracksViewChanges(false);
        console.log('[UserMarker] tracksViewChanges set to false after mount (1000ms)');
      }
    }, 1000); // ⭐ 關鍵：1000ms 延遲
    return () => clearTimeout(timer);
  }, []);

  return (
    <Marker
      coordinate={coordinate}
      title="我的位置"
      anchor={{ x: 0.5, y: 0.5 }} // ⭐ 關鍵：從中心點對齊座標
      tracksViewChanges={tracksViewChanges} // ⭐ 控制渲染時機
      zIndex={1000}
    >
      {/* ⭐ 極限縮小版：最小、最乾淨的結構 */}
      <View style={styles.markerContainer} onLayout={handleLoad}>
        <View style={styles.mainMarker}>
          <View style={styles.innerDot} />
        </View>
      </View>
    </Marker>
  );
};

export const UserMarker = UserMarkerComponent;

const styles = StyleSheet.create({
  // ⭐ 極限縮小版：容器縮小到 Android 能穩定處理的範圍
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40, // ⭐ 關鍵：大幅縮小至 40x40
    height: 40,
    backgroundColor: 'transparent', // ⭐ 關鍵：完全透明，移除所有不必要的樣式
  },
  // 主標記：極限縮小版
  mainMarker: {
    width: 36, // ⭐ 關鍵：縮小至 36x36
    height: 36,
    borderRadius: 18, // ⭐ 注意：保留圓角，但尺寸已縮小
    backgroundColor: '#007AFF',
    borderWidth: 3, // ⭐ 稍微減小邊框，確保在容器內
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    // ⭐ 移除 elevation 和 shadow，減少渲染負擔
    // elevation: 8,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.4,
    // shadowRadius: 4,
  },
  innerDot: {
    width: 12, // ⭐ 稍微縮小內部圓點
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
});
