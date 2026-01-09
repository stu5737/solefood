/**
 * 實時地圖組件
 * Solefood MVP v9.0 Plus
 * 
 * 顯示實時 GPS 位置並跟隨用戶移動
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView, { Marker, Polyline, Region, Polygon } from 'react-native-maps';
import { locationService } from '../../services/location';
import { gpsHistoryService } from '../../services/gpsHistory';
import { explorationService } from '../../services/exploration';
import { latLngToH3, H3_RESOLUTION } from '../../core/math/h3';
import type { LocationData } from '../../services/location';
import type { ExploredRegion } from '../../services/exploration';

interface RealTimeMapProps {
  // 是否自動跟隨用戶位置
  followUser?: boolean;
  // 是否顯示 GPS 軌跡線
  showTrail?: boolean;
  // 地圖高度
  height?: number;
  // 是否正在採集（只有採集中才記錄軌跡）
  isCollecting?: boolean;
  // 採集起點
  startPoint?: { latitude: number; longitude: number } | null;
  // 採集終點
  endPoint?: { latitude: number; longitude: number } | null;
}

// 節流函數（性能優化）
const throttle = (func: Function, delay: number) => {
  let lastCall = 0;
  return (...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

export const RealTimeMap: React.FC<RealTimeMapProps> = ({
  followUser = true,
  showTrail = true,
  height = 300,
  isCollecting = false,
  startPoint = null,
  endPoint = null,
}) => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [trailCoordinates, setTrailCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [exploredRegions, setExploredRegions] = useState<ExploredRegion[]>([]);
  const [isFollowing, setIsFollowing] = useState(followUser);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const mapRef = useRef<MapView>(null);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);

  // 獲取 H3 網格邊界（用於顯示已探索區域）
  // 注意：在 React Native 中，h3-js 無法正常工作，因此直接使用降級實現
  const getH3Boundary = (h3Index: string): Array<[number, number]> => {
    // 降級方案：從 H3 ID 解析中心點並創建一個簡單的多邊形
    // 對於 fallback ID，解析座標
    if (h3Index.startsWith('fallback_')) {
      const parts = h3Index.split('_');
      if (parts.length === 4) {
        const res = parseInt(parts[1]);
        const gridSize = Math.pow(10, res);
        const lat = (parseInt(parts[2]) / gridSize) - 90;
        const lng = (parseInt(parts[3]) / gridSize) - 180;
        const size = 0.001; // 約 100m
        return [
          [lat - size, lng - size],
          [lat - size, lng + size],
          [lat + size, lng + size],
          [lat + size, lng - size],
        ];
      }
    }
    
    // 如果不是 fallback ID，嘗試使用 h3-js（但通常會失敗）
    // 為了避免編碼錯誤，我們直接返回空數組
    // 在 React Native 環境中，所有 H3 ID 都應該是 fallback 格式
    console.warn('[RealTimeMap] Unknown H3 index format:', h3Index);
    return [];
  };

  // 載入已探索區域
  useEffect(() => {
    const loadExploredRegions = () => {
      const regions = explorationService.getExploredRegions();
      setExploredRegions(regions);
    };

    loadExploredRegions();
    
    // 定期更新已探索區域（每 5 秒）
    const interval = setInterval(loadExploredRegions, 5000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // 獲取初始位置
    const initLocation = async () => {
      const location = await locationService.getCurrentLocation();
      if (location) {
        setCurrentLocation(location);
        const initialRegion: Region = {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setCurrentRegion(initialRegion);
        
        // 從 GPS 歷史服務載入軌跡
        const history = gpsHistoryService.getHistory();
        setTrailCoordinates(history.map(point => ({
          latitude: point.latitude,
          longitude: point.longitude,
        })));
      }
    };

    initLocation();

    // 只有在採集模式下才訂閱位置更新
    if (!isCollecting) {
      // 清理訂閱
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      return;
    }

    // 節流的位置更新（每秒最多更新一次地圖）
    const throttledMapUpdate = throttle((location: LocationData) => {
      // 從 GPS 歷史服務獲取完整軌跡（每個點都記錄）
      const history = gpsHistoryService.getHistory();
      setTrailCoordinates(history.map(point => ({
        latitude: point.latitude,
        longitude: point.longitude,
      })));

      // 如果正在採集，自動跟隨用戶位置（不需要手動點擊跟隨）
      if (isCollecting && mapRef.current) {
        const newRegion: Region = {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: currentRegion?.latitudeDelta || 0.01, // 保持當前縮放
          longitudeDelta: currentRegion?.longitudeDelta || 0.01,
        };
        setCurrentRegion(newRegion);
        mapRef.current.animateToRegion(newRegion, 500); // 500ms 動畫
      } else if (isFollowing && mapRef.current) {
        // 手動跟隨模式（非採集時）
        const newRegion: Region = {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: currentRegion?.latitudeDelta || 0.01,
          longitudeDelta: currentRegion?.longitudeDelta || 0.01,
        };
        setCurrentRegion(newRegion);
        mapRef.current.animateToRegion(newRegion, 500);
      }
    }, 1000); // 每秒最多更新一次

    // 訂閱位置更新（只有採集中才訂閱）
    subscriptionRef.current = locationService.subscribeToLocationUpdates((location, distance) => {
      console.log('[RealTimeMap] Location update received:', {
        lat: location.latitude,
        lng: location.longitude,
        distance: distance,
        historyCount: gpsHistoryService.getHistoryCount(),
      });
      
      // 立即更新當前位置（不節流）
      setCurrentLocation(location);
      
      // 立即更新軌跡（不節流，確保每個點都顯示）
      const history = gpsHistoryService.getHistory();
      const newTrail = history.map(point => ({
        latitude: point.latitude,
        longitude: point.longitude,
      }));
      
      console.log('[RealTimeMap] Updating trail with', newTrail.length, 'points');
      if (newTrail.length > 0) {
        setTrailCoordinates(newTrail);
      }
      
      // 如果正在採集，立即更新地圖中心（不節流）
      if (isCollecting && mapRef.current) {
        const newRegion: Region = {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: currentRegion?.latitudeDelta || 0.01,
          longitudeDelta: currentRegion?.longitudeDelta || 0.01,
        };
        setCurrentRegion(newRegion);
        mapRef.current.animateToRegion(newRegion, 300); // 更快的動畫
      }
      
      // 節流其他地圖更新
      throttledMapUpdate(location);
    });

    return () => {
      // 清理訂閱
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, [isCollecting, isFollowing, showTrail]);

  // 手動切換跟隨模式
  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
    
    // 如果重新啟用跟隨，立即移動到當前位置
    if (!isFollowing && currentLocation && mapRef.current) {
      const newRegion: Region = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setCurrentRegion(newRegion);
      mapRef.current.animateToRegion(newRegion, 500);
    }
  };

  // 縮放控制
  const zoomIn = () => {
    if (currentRegion && mapRef.current) {
      mapRef.current.animateToRegion({
        ...currentRegion,
        latitudeDelta: currentRegion.latitudeDelta * 0.5,
        longitudeDelta: currentRegion.longitudeDelta * 0.5,
      }, 300);
    }
  };

  const zoomOut = () => {
    if (currentRegion && mapRef.current) {
      mapRef.current.animateToRegion({
        ...currentRegion,
        latitudeDelta: Math.min(currentRegion.latitudeDelta * 2, 0.1),
        longitudeDelta: Math.min(currentRegion.longitudeDelta * 2, 0.1),
      }, 300);
    }
  };

  // 計算初始區域
  const getInitialRegion = (): Region => {
    if (currentLocation) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    
    // 默認位置（台北）
    return {
      latitude: 25.0330,
      longitude: 121.5654,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  };

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={getInitialRegion()}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={isFollowing && isCollecting}
        showsCompass={true}
        showsScale={true}
        mapType="standard"
        onRegionChangeComplete={(region) => {
          setCurrentRegion(region);
        }}
      >
        {/* 已探索區域（綠色半透明） */}
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
              fillColor="rgba(0, 255, 0, 0.2)" // 已探索：綠色半透明
              strokeColor="rgba(0, 255, 0, 0.5)"
              strokeWidth={1}
            />
          );
        })}

        {/* GPS 軌跡線（採集中或已有軌跡時顯示） */}
        {(isCollecting || trailCoordinates.length > 0) && showTrail && trailCoordinates.length > 1 && (
          <Polyline
            coordinates={trailCoordinates}
            strokeColor="#007AFF"
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* 當前位置標記（自定義樣式） */}
        {currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="我的位置"
            description={`精度: ${currentLocation.accuracy?.toFixed(0) || 'N/A'}m`}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.customMarker}>
              <View style={styles.markerDot} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* 實時信息覆蓋層 */}
      {currentLocation && (
        <View style={styles.infoOverlay}>
          <Text style={styles.infoText}>
            速度: {currentLocation.speed ? (currentLocation.speed * 3.6).toFixed(1) : '0.0'} km/h
          </Text>
          <Text style={styles.infoText}>
            精度: {currentLocation.accuracy?.toFixed(0) || 'N/A'} m
          </Text>
        </View>
      )}

      {/* 控制按鈕 */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isFollowing && styles.controlButtonActive]}
          onPress={toggleFollow}
        >
          <Text style={[styles.controlButtonText, isFollowing && styles.controlButtonTextActive]}>
            {isFollowing ? '📍 跟隨中' : '📍 點擊跟隨'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 縮放控制 */}
      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomButton} onPress={zoomIn}>
          <Text style={styles.zoomButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomButton} onPress={zoomOut}>
          <Text style={styles.zoomButtonText}>-</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  infoOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  controls: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  controlButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  controlButtonActive: {
    backgroundColor: '#007AFF',
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  controlButtonTextActive: {
    color: '#FFF',
  },
  zoomControls: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'column',
  },
  zoomButton: {
    backgroundColor: '#FFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  zoomButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  customMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    borderWidth: 3,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  startMarker: {
    backgroundColor: '#4CAF50', // 綠色
    borderColor: '#2E7D32',
  },
  endMarker: {
    backgroundColor: '#F44336', // 紅色
    borderColor: '#C62828',
  },
  markerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
});
