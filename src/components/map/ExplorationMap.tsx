/**
 * 探索地圖組件
 * Solefood MVP v9.0 Plus
 * 
 * 顯示已探索區域和 Gray Zone
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapView, { Polygon, Marker, Polyline } from 'react-native-maps';
import { explorationService } from '../../services/exploration';
import { gpsHistoryService } from '../../services/gpsHistory';
import { h3ToLatLng } from '../../core/math/h3';
import type { ExploredRegion } from '../../services/exploration';
import type { GPSHistoryPoint } from '../../services/gpsHistory';

/**
 * 獲取 H3 網格邊界（使用 h3-js 或降級方案）
 */
function getH3Boundary(h3Index: string): Array<[number, number]> {
  try {
    const h3 = require('h3-js');
    if (h3 && h3.getCellBoundary) {
      const boundary = h3.getCellBoundary(h3Index);
      return boundary.map((coord: any) => [coord[0], coord[1]]);
    }
  } catch (error) {
    console.warn('[ExplorationMap] Failed to get H3 boundary:', error);
  }
  
  // 降級方案：使用中心點創建一個簡單的多邊形
  const center = h3ToLatLng(h3Index);
  if (center) {
    const size = 0.001; // 約 100m
    return [
      [center.latitude - size, center.longitude - size],
      [center.latitude - size, center.longitude + size],
      [center.latitude + size, center.longitude + size],
      [center.latitude + size, center.longitude - size],
    ];
  }
  
  return [];
}

export const ExplorationMap: React.FC = () => {
  const [exploredRegions, setExploredRegions] = useState<ExploredRegion[]>([]);
  const [gpsHistory, setGpsHistory] = useState<GPSHistoryPoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    // 載入已探索區域
    const regions = explorationService.getExploredRegions();
    setExploredRegions(regions);

    // 載入 GPS 歷史
    const history = gpsHistoryService.getHistory(100); // 最近 100 個點
    setGpsHistory(history);

    // 獲取當前位置（如果可用）
    if (history.length > 0) {
      const lastPoint = history[history.length - 1];
      setCurrentLocation({
        latitude: lastPoint.latitude,
        longitude: lastPoint.longitude,
      });
    }
  }, []);

  // 計算地圖初始區域
  const getInitialRegion = () => {
    if (currentLocation) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    
    // 如果有 GPS 歷史，使用第一個點
    if (gpsHistory.length > 0) {
      const firstPoint = gpsHistory[0];
      return {
        latitude: firstPoint.latitude,
        longitude: firstPoint.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
    }
    
    // 默認位置（台北）
    return {
      latitude: 25.0330,
      longitude: 121.5654,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  };

  // 將 GPS 歷史點轉換為 Polyline 座標
  const gpsTrailCoordinates = gpsHistory.map((point) => ({
    latitude: point.latitude,
    longitude: point.longitude,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>探索地圖</Text>
      <Text style={styles.subtitle}>
        已探索區域: {exploredRegions.length} | GPS 軌跡點: {gpsHistory.length}
      </Text>
      
      <MapView
        style={styles.map}
        initialRegion={getInitialRegion()}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* 渲染已探索區域（綠色半透明） */}
        {exploredRegions.map((region) => {
          const boundary = getH3Boundary(region.h3Index);
          if (boundary.length === 0) return null;

          const coordinates = boundary.map(([lat, lng]) => ({
            latitude: lat,
            longitude: lng,
          }));

          return (
            <Polygon
              key={region.h3Index}
              coordinates={coordinates}
              fillColor="rgba(0, 255, 0, 0.2)" // 綠色半透明（已探索）
              strokeColor="rgba(0, 255, 0, 0.5)"
              strokeWidth={1}
            />
          );
        })}

        {/* 渲染 GPS 軌跡線 */}
        {gpsTrailCoordinates.length > 1 && (
          <Polyline
            coordinates={gpsTrailCoordinates}
            strokeColor="#007AFF" // 藍色軌跡線
            strokeWidth={3}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* 渲染 GPS 歷史點（標記） */}
        {gpsHistory.map((point, index) => {
          // 只顯示每 10 個點中的一個，避免標記過多
          if (index % 10 !== 0 && index !== gpsHistory.length - 1) {
            return null;
          }

          return (
            <Marker
              key={`point-${index}`}
              coordinate={{
                latitude: point.latitude,
                longitude: point.longitude,
              }}
              title={`軌跡點 ${index + 1}`}
              description={point.timestamp ? new Date(point.timestamp).toLocaleString() : ''}
              pinColor={index === gpsHistory.length - 1 ? '#FF0000' : '#007AFF'} // 最後一個點為紅色
            />
          );
        })}

        {/* 當前位置標記 */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="當前位置"
            pinColor="#00FF00" // 綠色
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    padding: 16,
    paddingBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  map: {
    flex: 1,
    width: '100%',
  },
});
