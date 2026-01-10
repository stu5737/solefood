/**
 * GameMapView Component
 * 遊戲地圖視圖 - 顯示地圖、角色、資源、計時器等
 * 基於新的遊戲界面模板設計
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RealTimeMap } from '../map/RealTimeMap';

interface GameMapViewProps {
  isCollecting: boolean;
  startPoint?: { latitude: number; longitude: number } | null;
  endPoint?: { latitude: number; longitude: number } | null;
  followUser?: boolean;
  showTrail?: boolean;
}

export const GameMapView: React.FC<GameMapViewProps> = ({
  isCollecting,
  startPoint,
  endPoint,
  followUser = true,
  showTrail = true,
}) => {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <RealTimeMap
        followUser={followUser}
        showTrail={showTrail}
        height={undefined}
        isCollecting={isCollecting}
        startPoint={startPoint}
        endPoint={endPoint}
      />
      {/* 未來可以在這裡添加角色、資源點、計時器等覆蓋層 */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    zIndex: 0,
  },
});
