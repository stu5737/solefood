/**
 * 實時地圖組件
 * Solefood MVP v9.0 Plus
 * 
 * 顯示實時 GPS 位置並跟隨用戶移動
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { locationService } from '../../services/location';
import type { LocationData } from '../../services/location';

interface RealTimeMapProps {
  // 是否自動跟隨用戶位置
  followUser?: boolean;
  // 是否顯示 GPS 軌跡線
  showTrail?: boolean;
  // 地圖高度
  height?: number;
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
}) => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [trailCoordinates, setTrailCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [isFollowing, setIsFollowing] = useState(followUser);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const mapRef = useRef<MapView>(null);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);

  // 限制軌跡點數量（性能優化）
  const MAX_TRAIL_POINTS = 1000;

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
        setTrailCoordinates([{ latitude: location.latitude, longitude: location.longitude }]);
      }
    };

    initLocation();

    // 節流的位置更新（每秒最多更新一次地圖）
    const throttledMapUpdate = throttle((location: LocationData) => {
      // 更新軌跡線
      if (showTrail) {
        setTrailCoordinates(prev => {
          const newTrail = [...prev, { latitude: location.latitude, longitude: location.longitude }];
          // 只保留最近 N 個點
          return newTrail.slice(-MAX_TRAIL_POINTS);
        });
      }

      // 如果啟用跟隨模式，自動移動地圖中心
      if (isFollowing && mapRef.current) {
        const newRegion: Region = {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01, // 約 1km 視野
          longitudeDelta: 0.01,
        };
        setCurrentRegion(newRegion);
        mapRef.current.animateToRegion(newRegion, 500); // 500ms 動畫
      }
    }, 1000); // 每秒最多更新一次

    // 訂閱位置更新
    subscriptionRef.current = locationService.subscribeToLocationUpdates((location, distance) => {
      // 立即更新當前位置（不節流）
      setCurrentLocation(location);
      
      // 節流地圖更新
      throttledMapUpdate(location);
    });

    return () => {
      // 清理訂閱
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, [isFollowing, showTrail]);

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
        followsUserLocation={isFollowing}
        showsCompass={true}
        showsScale={true}
        mapType="standard"
        onRegionChangeComplete={(region) => {
          setCurrentRegion(region);
        }}
      >
        {/* GPS 軌跡線 */}
        {showTrail && trailCoordinates.length > 1 && (
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
});
