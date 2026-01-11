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
import { entropyEngine } from '../../core/entropy/engine';
import { latLngToH3, H3_RESOLUTION } from '../../core/math/h3';
import type { LocationData } from '../../services/location';
import type { ExploredRegion } from '../../services/exploration';
import type { MovementInput } from '../../core/entropy/events';

interface RealTimeMapProps {
  // 是否顯示 GPS 軌跡線
  showTrail?: boolean;
  // 地圖高度（undefined 表示全螢幕）
  height?: number;
  // 是否正在採集（只有採集中才記錄軌跡）
  isCollecting?: boolean;
  // 採集起點
  startPoint?: { latitude: number; longitude: number } | null;
  // 採集終點
  endPoint?: { latitude: number; longitude: number } | null;
  // 選中的歷史會話ID（用於顯示歷史軌跡）
  selectedSessionId?: string | null;
  // 是否顯示歷史軌跡
  showHistoryTrail?: boolean;
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
  showTrail = true,
  height = 300,
  isCollecting = false,
  startPoint = null,
  endPoint = null,
  selectedSessionId = null,
  showHistoryTrail = false,
}) => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [trailCoordinates, setTrailCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [historyStartPoint, setHistoryStartPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [historyEndPoint, setHistoryEndPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [exploredRegions, setExploredRegions] = useState<ExploredRegion[]>([]);
  const [frequentRegions, setFrequentRegions] = useState<Array<{ h3Index: string; visitCount: number }>>([]); // 7天內訪問頻繁的區域
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [isFollowing, setIsFollowing] = useState(true); // 預設開啟跟隨模式
  const mapRef = useRef<MapView>(null);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);

  // 獲取 H3 網格邊界（用於顯示已探索區域）
  // 注意：在 React Native 中，h3-js 無法正常工作，因此直接使用降級實現
  const getH3Boundary = (h3Index: string): Array<[number, number]> => {
    // 降級方案：從 H3 ID 解析中心點並創建一個簡單的正方形多邊形
    // 對於 fallback ID，解析座標
    if (h3Index.startsWith('fallback_')) {
      const parts = h3Index.split('_');
      if (parts.length === 4) {
        const res = parseInt(parts[1]);
        const gridSize = Math.pow(10, res);
        const lat = (parseInt(parts[2]) / gridSize) - 90;
        const lng = (parseInt(parts[3]) / gridSize) - 180;
        
        // 根據解析度調整正方形大小（更小更精緻，提高精度）
        // Resolution 11: ~0.01 km²，對應約 0.0006 度（約 67m，高精度）
        // Resolution 10: ~0.05 km²，對應約 0.0012 度（約 135m，更小更精緻）
        // Resolution 9: ~0.1 km²，對應約 0.0025 度（約 280m）
        // 使用更小的方格，讓精度更高，視覺效果更精緻，不會遮擋道路
        const size = res >= 11 ? 0.0006 : res >= 10 ? 0.0012 : res >= 9 ? 0.0025 : 0.005;
        
        // 創建正方形（4個頂點）
        return [
          [lat - size, lng - size], // 左下
          [lat - size, lng + size], // 右下
          [lat + size, lng + size], // 右上
          [lat + size, lng - size], // 左上
        ];
      }
    }
    
    // 如果不是 fallback ID，嘗試使用 h3-js（但通常會失敗）
    // 為了避免編碼錯誤，我們直接返回空數組
    // 在 React Native 環境中，所有 H3 ID 都應該是 fallback 格式
    console.warn('[RealTimeMap] Unknown H3 index format:', h3Index);
    return [];
  };

  // 當 selectedSessionId、showHistoryTrail 或 isCollecting 變化時，更新軌跡顯示
  useEffect(() => {
    if (showHistoryTrail && selectedSessionId) {
      // 如果正在查看歷史軌跡，只載入起點和終點
      const historyTrail = gpsHistoryService.getSessionTrail(selectedSessionId);
      if (historyTrail.length > 0) {
        // 只保留起點和終點
        const startPoint = {
          latitude: historyTrail[0].latitude,
          longitude: historyTrail[0].longitude,
        };
        const endPoint = {
          latitude: historyTrail[historyTrail.length - 1].latitude,
          longitude: historyTrail[historyTrail.length - 1].longitude,
        };
        setHistoryStartPoint(startPoint);
        setHistoryEndPoint(endPoint);
        // 歷史軌跡不顯示完整軌跡線，清空 trailCoordinates
        setTrailCoordinates([]);
        
        // 自動將地圖中心設為起點
        if (mapRef.current) {
          const region: Region = {
            latitude: startPoint.latitude,
            longitude: startPoint.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          requestAnimationFrame(() => {
            if (mapRef.current) {
              mapRef.current.animateToRegion(region, 1000);
              console.log('[RealTimeMap] Historical trail: Map centered on start point');
            }
          });
        }
      } else {
        setHistoryStartPoint(null);
        setHistoryEndPoint(null);
        setTrailCoordinates([]);
      }
    } else if (isCollecting && gpsHistoryService.isSessionActive()) {
      // 如果正在採集會話中，載入當前會話的完整軌跡
      const currentTrail = gpsHistoryService.getCurrentSessionTrail();
      if (currentTrail.length > 0) {
        setTrailCoordinates(currentTrail.map(point => ({
          latitude: point.latitude,
          longitude: point.longitude,
        })));
      } else {
        setTrailCoordinates([]);
      }
      // 清空歷史起終點
      setHistoryStartPoint(null);
      setHistoryEndPoint(null);
    } else {
      // 沒有活動會話且不在查看歷史時，不顯示軌跡
      setTrailCoordinates([]);
      setHistoryStartPoint(null);
      setHistoryEndPoint(null);
    }
  }, [selectedSessionId, showHistoryTrail, isCollecting]);


  // 載入已探索區域和7天歷史統計
  useEffect(() => {
    const loadExploredData = () => {
      // 載入已探索區域（用於開拓者模式判斷）
      const regions = explorationService.getExploredRegions();
      setExploredRegions(regions);
      
      // 載入7天歷史點，計算訪問頻繁的區域（用於綠色正方形顯示）
      // 只顯示訪問3次以上的區域，避免過於密集，讓設計更精緻
      const historyPoints = gpsHistoryService.getHistoryPointsByDays(7);
      const frequent = explorationService.getFrequentlyVisitedRegions(historyPoints, 3);
      setFrequentRegions(frequent);
    };

    loadExploredData();
    
    // 定期更新已探索區域和統計（每 5 秒）
    const interval = setInterval(loadExploredData, 5000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // 獲取初始位置
    const initLocation = async () => {
      const location = await locationService.getCurrentLocation();
      if (location) {
        console.log('[RealTimeMap] Initial location obtained:', location);
        setCurrentLocation(location);
        const initialRegion: Region = {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setCurrentRegion(initialRegion);
        
        // 進入遊戲時，自動將地圖移動到用戶位置並開啟跟隨模式
        // 只有不在查看歷史軌跡時才自動跟隨
        if (!showHistoryTrail) {
          setIsFollowing(true);
          requestAnimationFrame(() => {
            if (mapRef.current) {
              mapRef.current.animateToRegion(initialRegion, 1000);
              console.log('[RealTimeMap] Map animated to user location on initial load, follow mode enabled');
            }
          });
        }
        
        // 載入軌跡：優先顯示歷史軌跡（只顯示起終點），其次顯示當前會話軌跡
        if (showHistoryTrail && selectedSessionId) {
          const historyTrail = gpsHistoryService.getSessionTrail(selectedSessionId);
          if (historyTrail.length > 0) {
            // 歷史軌跡只顯示起終點
            const startPoint = {
              latitude: historyTrail[0].latitude,
              longitude: historyTrail[0].longitude,
            };
            const endPoint = {
              latitude: historyTrail[historyTrail.length - 1].latitude,
              longitude: historyTrail[historyTrail.length - 1].longitude,
            };
            setHistoryStartPoint(startPoint);
            setHistoryEndPoint(endPoint);
            setTrailCoordinates([]); // 歷史軌跡不顯示完整軌跡線
            
            // 自動將地圖中心設為起點
            const region: Region = {
              latitude: startPoint.latitude,
              longitude: startPoint.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            };
            setCurrentRegion(region);
            requestAnimationFrame(() => {
              if (mapRef.current) {
                mapRef.current.animateToRegion(region, 1000);
                console.log('[RealTimeMap] Historical trail: Map centered on start point on initial load');
              }
            });
          }
        } else if (isCollecting && gpsHistoryService.isSessionActive()) {
          const currentTrail = gpsHistoryService.getCurrentSessionTrail();
          if (currentTrail.length > 0) {
            setTrailCoordinates(currentTrail.map(point => ({
              latitude: point.latitude,
              longitude: point.longitude,
            })));
          }
        }
      } else {
        console.warn('[RealTimeMap] Failed to get initial location');
      }
    };

    initLocation();

    // 始終訂閱位置更新（無論是否在採集模式），以便更新當前位置和記錄軌跡
    // GPS 歷史：只有在 isCollecting 為 true 時才記錄（由 locationService 控制）

    // 訂閱位置更新（始終訂閱，以便更新當前位置和顯示軌跡）
    subscriptionRef.current = locationService.subscribeToLocationUpdates((location, distance) => {
      console.log('[RealTimeMap] Location update received:', {
        lat: location.latitude,
        lng: location.longitude,
        distance: distance,
        historyCount: gpsHistoryService.getHistoryCount(),
      });
      
      // 立即更新當前位置（不節流）
      setCurrentLocation(location);
      
      // 只有在採集會話進行中時才記錄GPS點並觸發拾取（查看歷史時不記錄）
      if (isCollecting && gpsHistoryService.isSessionActive() && !showHistoryTrail) {
        // 記錄到當前會話
        gpsHistoryService.addPoint(location, distance);
        
        // 記錄造訪區域（用於探索系統）
        explorationService.recordVisit(location.latitude, location.longitude);
        
        // 觸發熵引擎處理拾取（GPS 更新時處理移動和拾取）
        // distance 是米，需要轉換為公里
        if (distance > 0) {
          const speed = location.speed ? location.speed * 3.6 : undefined; // m/s 轉換為 km/h
          
          try {
            const input: MovementInput = {
              distance: distance / 1000, // 轉換為公里
              speed: speed,
              timestamp: location.timestamp,
              gpsLocation: {
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                speed: speed,
              },
            };
            
            const result = entropyEngine.processMovement(input);
            console.log('[RealTimeMap] Processed movement via entropy engine:', {
              distance: input.distance.toFixed(3),
              speed: speed?.toFixed(1),
              events: result.events?.length || 0,
            });
            
            // 如果有拾取事件，記錄日誌（可選：未來可以顯示 Toast 提示）
            if (result.events && result.events.length > 0) {
              const lootEvent = result.events.find(e => 
                e.type === 'loot_success' || e.type === 'loot_converted' || e.type === 'loot_failed' || e.type === 'loot_rescue_available'
              );
              if (lootEvent) {
                console.log('[RealTimeMap] 🎉 Loot event triggered:', lootEvent.type, lootEvent.data);
              }
            }
          } catch (error) {
            console.error('[RealTimeMap] Error processing movement via entropy engine:', error);
          }
        }
        
        // 更新當前會話的軌跡顯示
        const currentTrail = gpsHistoryService.getCurrentSessionTrail();
        const newTrail = currentTrail.map(point => ({
          latitude: point.latitude,
          longitude: point.longitude,
        }));
        
        console.log('[RealTimeMap] Updating current session trail with', newTrail.length, 'points');
        if (newTrail.length > 0) {
          setTrailCoordinates(newTrail);
        }
      }
      
      // 跟隨模式邏輯：初始狀態為跟隨模式，用戶拖動地圖後切換為自由模式
      // 只有在跟隨模式時，地圖才會自動跟隨用戶位置（followsUserLocation={isFollowing}）
    });

    return () => {
      // 清理訂閱
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, [isCollecting, showTrail, showHistoryTrail, selectedSessionId]); // 依賴：採集狀態、軌跡顯示、歷史查看

  // 當切換到歷史查看模式時，自動禁用跟隨模式
  useEffect(() => {
    if (showHistoryTrail) {
      setIsFollowing(false);
    }
  }, [showHistoryTrail]);

  // 計算初始區域（優先使用 currentRegion，其次使用 currentLocation）
  const getInitialRegion = (): Region => {
    // 優先使用 currentRegion（從 initLocation 設置）
    if (currentRegion) {
      return currentRegion;
    }
    
    // 如果 currentRegion 還沒有設置，但 currentLocation 已獲取，使用它
    if (currentLocation) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    
    // 如果還沒有獲取到位置，使用一個合理的默認值（台灣附近）
    // 這會被 useEffect 中的 initLocation 立即覆蓋為真實位置
    return {
      latitude: 25.0330,
      longitude: 121.5654,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  };

  // 如果 height 未指定，使用全螢幕填充
  const containerStyle = height 
    ? [styles.container, { height }]
    : StyleSheet.absoluteFillObject;

  // 地圖樣式：無論是否有 height，都使用 absoluteFillObject 填滿容器
  const mapStyle = height
    ? [styles.map, { width: '100%', height: '100%' }]
    : StyleSheet.absoluteFillObject;

  return (
    <View 
      style={[
        containerStyle,
        { backgroundColor: 'transparent' }
      ]} 
      pointerEvents="box-none"
    >
      <MapView
        ref={mapRef}
        style={[mapStyle, { backgroundColor: '#1A1A1A' }]}
        initialRegion={getInitialRegion()}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={isFollowing && !showHistoryTrail} // 根據 isFollowing 狀態決定是否跟隨，查看歷史時不跟隨
        showsCompass={true}
        showsScale={true}
        mapType="standard"
        customMapStyle={[
          {
            elementType: "geometry",
            stylers: [{ color: "#1d2c4d" }]
          },
          {
            elementType: "labels.text.fill",
            stylers: [{ color: "#8ec3b9" }]
          },
          {
            elementType: "labels.text.stroke",
            stylers: [{ color: "#1a3646" }]
          },
          {
            featureType: "administrative.country",
            elementType: "geometry.stroke",
            stylers: [{ color: "#4b6878" }]
          },
          {
            featureType: "administrative.land_parcel",
            elementType: "labels.text.fill",
            stylers: [{ color: "#64779e" }]
          },
          {
            featureType: "administrative.province",
            elementType: "geometry.stroke",
            stylers: [{ color: "#4b6878" }]
          },
          {
            featureType: "landscape.man_made",
            elementType: "geometry.stroke",
            stylers: [{ color: "#334e87" }]
          },
          {
            featureType: "landscape.natural",
            elementType: "geometry",
            stylers: [{ color: "#023e58" }]
          },
          {
            featureType: "poi",
            elementType: "geometry",
            stylers: [{ color: "#283d6a" }]
          },
          {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#6f9ba5" }]
          },
          {
            featureType: "poi",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#1d2c4d" }]
          },
          {
            featureType: "poi.park",
            elementType: "geometry.fill",
            stylers: [{ color: "#023e58" }]
          },
          {
            featureType: "poi.park",
            elementType: "labels.text.fill",
            stylers: [{ color: "#3C7680" }]
          },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#304a7d" }]
          },
          {
            featureType: "road",
            elementType: "labels.text.fill",
            stylers: [{ color: "#98a5be" }]
          },
          {
            featureType: "road",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#1d2c4d" }]
          },
          {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#2c6675" }]
          },
          {
            featureType: "road.highway",
            elementType: "geometry.stroke",
            stylers: [{ color: "#255763" }]
          },
          {
            featureType: "road.highway",
            elementType: "labels.text.fill",
            stylers: [{ color: "#b0d5ce" }]
          },
          {
            featureType: "road.highway",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#023e58" }]
          },
          {
            featureType: "transit",
            elementType: "labels.text.fill",
            stylers: [{ color: "#98a5be" }]
          },
          {
            featureType: "transit",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#1d2c4d" }]
          },
          {
            featureType: "transit.line",
            elementType: "geometry.fill",
            stylers: [{ color: "#283d6a" }]
          },
          {
            featureType: "transit.station",
            elementType: "geometry",
            stylers: [{ color: "#3a4762" }]
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#0e1626" }]
          },
          {
            featureType: "water",
            elementType: "labels.text.fill",
            stylers: [{ color: "#4e6d70" }]
          }
        ]}
        onRegionChangeComplete={(region) => {
          setCurrentRegion(region);
        }}
        onPanDrag={() => {
          // 關鍵：一旦用戶開始拖動地圖，立即切換到自由模式
          if (isFollowing) {
            setIsFollowing(false);
            console.log('[RealTimeMap] User dragged map, switched to free roam mode');
          }
        }}
      >
        {/* 7天歷史：訪問頻繁的區域（綠色正方形，提示已探索，更精緻的設計） */}
        {frequentRegions
          .filter(({ visitCount }) => visitCount >= 3) // 只顯示訪問3次以上的區域，避免過於密集
          .map(({ h3Index, visitCount }) => {
            const boundary = getH3Boundary(h3Index);
            if (boundary.length === 0) return null;

            const coordinates = boundary.map(([lat, lng]) => ({
              latitude: lat,
              longitude: lng,
            }));

            // 更精緻的透明度計算：使用更淡的顏色，避免過綠遮擋道路
            // 訪問3次: 0.06, 10次: 0.12, 50次以上: 0.16（上限，更淡）
            // 這樣即使訪問很多次，也不會過綠，保持地圖清晰，道路可見
            const baseOpacity = 0.06;
            const maxOpacity = 0.16; // 降低上限，避免過綠
            const opacity = Math.min(maxOpacity, baseOpacity + (Math.log(visitCount + 1) / Math.log(50)) * 0.10);

            return (
              <Polygon
                key={`frequent_${h3Index}`}
                coordinates={coordinates}
                fillColor={`rgba(76, 175, 80, ${opacity})`} // 更淡的綠色，避免遮擋道路
                strokeColor="rgba(76, 175, 80, 0.25)" // 更淡的邊框，幾乎不可見
                strokeWidth={0.3} // 極細的邊框，更精緻
              />
            );
          })}

        {/* 已探索區域（開拓者模式判斷用，較淡） */}
        {exploredRegions.map((region) => {
          const boundary = getH3Boundary(region.h3Index);
          if (boundary.length === 0) return null;

          // 如果這個區域已經在 frequentRegions 中顯示了，就跳過（避免重複）
          if (frequentRegions.some(fr => fr.h3Index === region.h3Index)) {
            return null;
          }

          const coordinates = boundary.map(([lat, lng]) => ({
            latitude: lat,
            longitude: lng,
          }));

          return (
            <Polygon
              key={`explored_${region.h3Index}`}
              coordinates={coordinates}
              fillColor="rgba(0, 255, 0, 0.1)" // 較淡的綠色
              strokeColor="rgba(0, 255, 0, 0.3)"
              strokeWidth={1}
            />
          );
        })}

        {/* GPS 軌跡線（只顯示當前會話，歷史軌跡不顯示完整軌跡） */}
        {showTrail && !showHistoryTrail && trailCoordinates.length > 1 && (
          <Polyline
            coordinates={trailCoordinates}
            strokeColor="#4CAF50" // 當前會話用綠色
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
            opacity={1.0}
          />
        )}

        {/* 歷史軌跡起點標記 */}
        {showHistoryTrail && historyStartPoint && (
          <Marker
            coordinate={historyStartPoint}
            title="起點"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.customMarker, styles.startMarker]}>
              <View style={styles.markerDot} />
            </View>
          </Marker>
        )}

        {/* 歷史軌跡終點標記 */}
        {showHistoryTrail && historyEndPoint && (
          <Marker
            coordinate={historyEndPoint}
            title="終點"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.customMarker, styles.endMarker]}>
              <View style={styles.markerDot} />
            </View>
          </Marker>
        )}

        {/* 當前位置標記（只在非歷史查看模式時顯示） */}
        {!showHistoryTrail && currentLocation && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="我的位置"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.customMarker}>
              <View style={styles.markerDot} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* 實時信息覆蓋層（只在非歷史查看模式時顯示） */}
      {!showHistoryTrail && currentLocation && (
        <View style={styles.infoOverlay}>
          <Text style={styles.infoText}>
            速度: {currentLocation.speed ? (currentLocation.speed * 3.6).toFixed(1) : '0.0'} km/h
          </Text>
        </View>
      )}

      {/* 歸位按鈕（只在非歷史查看模式時顯示） */}
      {!showHistoryTrail && !isFollowing && currentLocation && (
        <View style={styles.recenterButtonContainer}>
          <TouchableOpacity
            style={styles.recenterButton}
            onPress={() => {
              setIsFollowing(true);
              if (mapRef.current && currentLocation) {
                const region: Region = {
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                  latitudeDelta: currentRegion?.latitudeDelta || 0.01,
                  longitudeDelta: currentRegion?.longitudeDelta || 0.01,
                };
                mapRef.current.animateToRegion(region, 500);
                console.log('[RealTimeMap] Recenter button pressed, returning to follow mode');
              }
            }}
          >
            <Text style={styles.recenterButtonText}>📍</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // 當 height 指定時才使用這些樣式
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  infoOverlay: {
    position: 'absolute',
    top: 100,  // 從 16 改為 100，避免被狀態欄和頂部 UI 擋住
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',  // 亮綠色，符合深色主題
    fontFamily: 'monospace',
  },
  // 歸位按鈕樣式
  recenterButtonContainer: {
    position: 'absolute',
    bottom: 120, // 在底部控制按鈕上方
    right: 16,
    pointerEvents: 'box-none',
  },
  recenterButton: {
    backgroundColor: '#FFFFFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  recenterButtonText: {
    fontSize: 24,
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
