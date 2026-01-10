/**
 * Map Overlay Component
 * 地圖覆蓋層（迷霧和開拓者狀態）
 * Solefood MVP v9.0 Plus
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface MapOverlayProps {
  totalDistance: number;
  isPathfinder: boolean;
  isInDeepZone: boolean;
  sessionDistance: number;
}

export const MapOverlay: React.FC<MapOverlayProps> = ({
  totalDistance,
  isPathfinder,
  isInDeepZone,
  sessionDistance,
}) => {
  const fadeAnim = React.useRef(new Animated.Value(isPathfinder ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isPathfinder ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isPathfinder]);

  return (
    <View style={styles.container}>
      {/* 頂部狀態列 */}
      <View style={styles.topStatusBar}>
        <Text style={styles.distanceText}>
          {totalDistance.toFixed(1)} KM
        </Text>
        {isInDeepZone && (
          <View style={styles.deepZoneBadge}>
            <Text style={styles.deepZoneText}>
              ⚡ DEEP ZONE (T3 x2)
            </Text>
          </View>
        )}
      </View>

      {/* 開拓者浮窗 */}
      {isPathfinder && (
        <Animated.View
          style={[
            styles.pathfinderWidget,
            { opacity: fadeAnim },
          ]}
        >
          <View style={styles.pathfinderHeader}>
            <Text style={styles.pathfinderIcon}>✨</Text>
            <Text style={styles.pathfinderTitle}>PATHFINDER ACTIVE</Text>
          </View>
          <Text style={styles.pathfinderSubtext}>
            T2 Drop Rate: +10%
          </Text>
        </Animated.View>
      )}

      {/* 深層領域距離指示器 */}
      {sessionDistance > 0 && (
        <View style={styles.distanceIndicator}>
          <Text style={styles.distanceLabel}>DISTANCE:</Text>
          <Text
            style={[
              styles.distanceValue,
              isInDeepZone && styles.distanceValueDeep,
            ]}
          >
            {sessionDistance.toFixed(1)}km
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none', // 允許點擊穿透，不阻擋地圖互動
    backgroundColor: 'transparent', // 透明背景，不遮擋地圖
    zIndex: 10, // 在地圖上方，但在其他 UI 元素下方
  },
  topStatusBar: {
    position: 'absolute', // 絕對定位，不佔用布局空間
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)', // 半透明背景
    borderBottomWidth: 1,
    borderBottomColor: '#06B6D4',
    zIndex: 11, // 確保在其他元素上方
    pointerEvents: 'auto', // 狀態列本身可以點擊
  },
  distanceText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#FFF',
    fontWeight: '700',
  },
  deepZoneBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  deepZoneText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#F59E0B',
    fontWeight: '700',
  },
  pathfinderWidget: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#06B6D4',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
  },
  pathfinderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pathfinderIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  pathfinderTitle: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#06B6D4',
    fontWeight: '700',
    letterSpacing: 1,
  },
  pathfinderSubtext: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#FFF',
    marginTop: 4,
  },
  distanceIndicator: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#06B6D4',
    alignItems: 'flex-end',
  },
  distanceLabel: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: '#06B6D4',
    marginBottom: 2,
  },
  distanceValue: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#FFF',
    fontWeight: '700',
  },
  distanceValueDeep: {
    color: '#F59E0B',
  },
});
