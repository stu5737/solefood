/**
 * MapboxRealTimeMap - Pokémon GO 風格地圖（Mapbox 版本）
 * Solefood v10.0 - 完整 3D 傾斜視角 + 賽博龐克風格
 * 
 * 核心特色：
 * - 65° 傾斜視角（Pitch）
 * - 車頭朝上模式（Course Up）
 * - 3D 建築擠出
 * - 賽博龐克天空
 * - 完整 H3 Hexes 渲染
 */

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { locationService } from '../../services/location';
import { gpsHistoryService } from '../../services/gpsHistory';
import { useSessionStore } from '../../stores/sessionStore';
import { CAMERA_CONFIG, MAP_THEME, PERFORMANCE_CONFIG, MORNING_THEME, NIGHT_THEME } from '../../config/mapbox';
import type { GPSHistoryPoint, CollectionSession } from '../../services/gpsHistory';
import { latLngToH3, h3ToLatLng } from '../../core/math/h3';

// ⚠️ 重要：設置 Mapbox Access Token
// 請在 src/config/mapbox.ts 中設置你的 token
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLE_URL } from '../../config/mapbox';

// 初始化 Mapbox
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const H3_RESOLUTION = 12;

interface MapboxRealTimeMapProps {
  showTrail?: boolean;
  height?: number;
  isCollecting: boolean;
  selectedSessionId?: string | null;
  showHistoryTrail?: boolean;
}

export const MapboxRealTimeMap: React.FC<MapboxRealTimeMapProps> = ({
  showTrail = true,
  height,
  isCollecting,
  selectedSessionId,
  showHistoryTrail = false,
}) => {
  // Store 狀態
  const exploredHexes = useSessionStore((state) => state.exploredHexes);
  const currentSessionNewHexes = useSessionStore((state) => state.currentSessionNewHexes);
  const mapMode = useSessionStore((state) => state.mapMode);

  // 本地狀態
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [movementHeading, setMovementHeading] = useState<number>(0); // 運動方向（移動中使用）
  const [compassHeading, setCompassHeading] = useState<number>(0); // 羅盤方向（靜止時使用）
  const [historySessions, setHistorySessions] = useState<CollectionSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<CollectionSession | null>(null);
  const [isRecenteringManually, setIsRecenteringManually] = useState(false); // 手動重新定位標誌
  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D'); // 視角模式：2D 空照圖 or 3D 傾斜
  const [timeTheme, setTimeTheme] = useState<'morning' | 'night'>('night'); // ✅ 時間主題：早晨 or 夜晚
  const [is3DModelReady, setIs3DModelReady] = useState(false); // ✅ 3D 模型是否已準備

  // Refs
  const cameraRef = useRef<Mapbox.Camera>(null);
  const mapRef = useRef<Mapbox.MapView>(null);

  // 實際地圖模式
  const actualMapMode = showHistoryTrail ? 'HISTORY' : mapMode;
  const SPEED_THRESHOLD = 0.5; // m/s，低於此速度視為靜止
  const currentSpeed = currentLocation?.coords?.speed ?? 0;
  const isMoving = currentSpeed !== null && currentSpeed > SPEED_THRESHOLD;
  const displayHeading = isMoving ? movementHeading : compassHeading;
  const displayHeadingAdjusted = ((displayHeading - 90) % 360 + 360) % 360; // 箭頭符號➤基準朝右，需轉成北方為0

  // ========== 位置追蹤 ==========
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let headingSubscription: Location.LocationSubscription | null = null;

    const startTracking = async () => {
      try {
        // 獲取初始位置
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCurrentLocation(initialLocation);
        
        // 設置初始運動方向（只有有效值才更新）
        if (initialLocation.coords.heading !== null && initialLocation.coords.heading !== undefined && initialLocation.coords.heading >= 0) {
          setMovementHeading(initialLocation.coords.heading);
        }
        
        console.log('[MapboxRealTimeMap] 初始位置:', initialLocation.coords);

        // 位置追蹤
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (location) => {
            setCurrentLocation(location);
            
            // ✅ 使用 GPS 提供的運動方向（heading）僅在移動時更新
            if (
              location.coords.speed !== null &&
              location.coords.speed > SPEED_THRESHOLD &&
              location.coords.heading !== null &&
              location.coords.heading !== undefined &&
              location.coords.heading >= 0
            ) {
              setMovementHeading(location.coords.heading);
            }
            
            // 如果正在採集，記錄到 GPS 歷史
            if (isCollecting && gpsHistoryService.isSessionActive()) {
              gpsHistoryService.addPoint({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                altitude: location.coords.altitude || 0,
                accuracy: location.coords.accuracy || 0,
                speed: location.coords.speed || 0,
                timestamp: location.timestamp,
              });
            }
          }
        );

        // 羅盤方向追蹤（靜止時使用）
        headingSubscription = await Location.watchHeadingAsync((headingData) => {
          const rawHeading = headingData.trueHeading ?? headingData.magHeading ?? 0;
          if (rawHeading >= 0) {
            setCompassHeading(rawHeading);
          }
        });

        console.log('[MapboxRealTimeMap] 位置追蹤已啟動');
      } catch (error) {
        console.error('[MapboxRealTimeMap] 位置追蹤失敗:', error);
      }
    };

    startTracking();

    return () => {
      if (subscription) {
        subscription.remove();
      }
      if (headingSubscription) {
        headingSubscription.remove();
      }
    };
  }, [isCollecting]);

  // ========== 歷史會話載入 ==========
  // 初始化時載入歷史會話（用於渲染歷史 H3）
  useEffect(() => {
    const loadHistorySessions = () => {
      const sessions = gpsHistoryService.getAllSessions()
        .filter(s => s.endTime)
        .slice(0, 20);
      setHistorySessions(sessions);
      console.log('[MapboxRealTimeMap] 📊 載入', sessions.length, '個歷史會話');
    };

    loadHistorySessions();

    // 當採集結束時重新載入
    if (!isCollecting) {
      setTimeout(loadHistorySessions, 500);
    }
  }, [isCollecting, exploredHexes.size]); // ✅ 新增：監聽 exploredHexes 變化

  // 更新選中的會話
  useEffect(() => {
    if (showHistoryTrail && selectedSessionId) {
      const session = historySessions.find(s => s.sessionId === selectedSessionId);
      setSelectedSession(session || null);
    }
  }, [showHistoryTrail, selectedSessionId, historySessions]);

  // ========== 3D 模型 URL ==========
  
  // ✅ 使用你的 GitHub Raw URL（已設為公開）
  const modelUrl = 'https://raw.githubusercontent.com/stu5737/solefood/main/assets/models/user-avator.glb';
  
  // ========== 3D 模型準備 ==========
  // ⚠️ 重要：模型索引數超過 Mapbox 限制（65535）
  // 當前模型：248575 個索引（超出 3.8 倍）
  // 需要簡化模型後才能使用
  useEffect(() => {
    // 暫時禁用 3D 模型，等待模型優化
    console.log('[3D Model] ⚠️ 3D 模型暫時禁用');
    console.log('[3D Model] ❌ 原因：模型索引數超過 Mapbox 限制');
    console.log('[3D Model] 📊 限制：65535，你的模型：248575');
    console.log('[3D Model] 💡 解決方案：請查看 MODEL_OPTIMIZATION_GUIDE.md');
    console.log('[3D Model] 🔧 需要簡化模型到 < 20000 個索引');
    
    // 暫時不啟用
    // setIs3DModelReady(true);
  }, [timeTheme]);

  // ========== H3 Hexes GeoJSON 生成 ==========
  
  /**
   * 生成低多邊形圓形（用於 H3 Hexes）
   */
  const getLowPolyCircle = useCallback((lat: number, lng: number, radiusMeters: number, sides: number = 8) => {
    const coords: [number, number][] = [];
    const earthRadius = 6371000; // 地球半徑（米）
    
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * 2 * Math.PI;
      const dx = radiusMeters * Math.cos(angle);
      const dy = radiusMeters * Math.sin(angle);
      
      const newLat = lat + (dy / earthRadius) * (180 / Math.PI);
      const newLng = lng + (dx / earthRadius) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);
      
      coords.push([newLng, newLat]); // GeoJSON 格式：[lng, lat]
    }
    
    return coords;
  }, []);

  const getDistanceMeters = useCallback((a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
  }, []);

  /**
   * 計算單個會話的 H3 GeoJSON
   * ✅ 渐层基于所有 H3 的地理中心，总是有从中心向外的渐层效果
   */
  const calculateSessionH3GeoJson = useCallback((points: GPSHistoryPoint[]) => {
    if (!points || points.length === 0) {
      return null;
    }

    const CIRCLE_RADIUS_METERS = 20;
    const hexes = new Map<string, { latitude: number; longitude: number; distance: number }>();

    // 只收集 GPS 點的 H3 索引，不做路徑補間
    points.forEach(point => {
      try {
        const h3Index = latLngToH3(point.latitude, point.longitude, H3_RESOLUTION);
        if (!hexes.has(h3Index)) {
          const coord = h3ToLatLng(h3Index);
          if (!coord) return;
          hexes.set(h3Index, { latitude: coord.latitude, longitude: coord.longitude, distance: 0 });
        }
      } catch (error) {
        // 忽略錯誤
      }
    });

    if (hexes.size === 0) {
      return null;
    }

    // ✅ 計算所有 H3 的地理中心（平均經緯度）
    const allCoords = Array.from(hexes.values());
    const geoCenter = {
      latitude: allCoords.reduce((sum, c) => sum + c.latitude, 0) / allCoords.length,
      longitude: allCoords.reduce((sum, c) => sum + c.longitude, 0) / allCoords.length,
    };

    // ✅ 重新計算每個 H3 到地理中心的距離
    hexes.forEach((item, h3Index) => {
      const distance = getDistanceMeters(geoCenter, item);
      hexes.set(h3Index, { ...item, distance });
    });

    // 生成 GeoJSON Features（使用地理中心計算渐层）
    const distances = Array.from(hexes.values()).map(item => item.distance);
    const maxDistance = Math.max(...distances, 1);
    const maxOpacity = MAP_THEME.historyH3.fill.opacityRange.max;
    const minOpacity = MAP_THEME.historyH3.fill.opacityRange.min;

    console.log('[MapboxRealTimeMap] 🎨 生成', hexes.size, '個 H3 hexes');
    console.log('[MapboxRealTimeMap] 📍 地理中心:', geoCenter.latitude.toFixed(6), geoCenter.longitude.toFixed(6));
    console.log('[MapboxRealTimeMap] 📏 最大距離:', maxDistance.toFixed(0), 'm');
    console.log('[MapboxRealTimeMap] 🎨 透明度範圍:', minOpacity, '->', maxOpacity);

    const features: any[] = [];
    hexes.forEach(item => {
      try {
        const { latitude: lat, longitude: lng, distance } = item;
        const normalized = Math.min(distance / maxDistance, 1);
        // ✅ 非線性漸變（平方）：讓中心更明顯，邊緣急劇變淡
        const opacity = maxOpacity - (maxOpacity - minOpacity) * (normalized * normalized);
        // ✅ 計算權重（用於 Heatmap 強度）
        const weight = opacity / maxOpacity; // 0-1 之間

        // ✅ Debug: 前 5 個 feature 的詳細資訊
        if (features.length < 5) {
          console.log(`[H3 Debug] Feature ${features.length}: distance=${distance.toFixed(0)}m, normalized=${normalized.toFixed(3)}, opacity=${opacity.toFixed(3)}, weight=${weight.toFixed(3)} (迷霧模式)`);
        }

        // ✅ 改用 Point 幾何（Heatmap 需要點數據）
        features.push({
          type: 'Feature',
          properties: { 
            opacity,
            weight, // Heatmap 權重
          },
          geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
        });
      } catch (error) {
        // 忽略錯誤
      }
    });

    // ✅ Debug: Opacity 統計
    if (features.length > 0) {
      const opacities = features.map(f => f.properties.opacity);
      console.log('[MapboxRealTimeMap] 🎨 Opacity 統計:', {
        min: Math.min(...opacities).toFixed(3),
        max: Math.max(...opacities).toFixed(3),
        avg: (opacities.reduce((sum, v) => sum + v, 0) / opacities.length).toFixed(3),
      });
    }

    if (features.length === 0) {
      return null;
    }

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [getLowPolyCircle, getDistanceMeters]);

  // 歷史 H3 GeoJSON - 基於 historySessions（用戶實際走過的路徑）
  // ✅ 不再传入 center，函数内部会自动计算地理中心
  const historyH3GeoJson = useMemo(() => {
    if (actualMapMode !== 'GAME') return null;
    
    const allPoints: GPSHistoryPoint[] = [];
    historySessions.forEach(session => {
      if (session.points) {
        allPoints.push(...session.points);
      }
    });

    const result = calculateSessionH3GeoJson(allPoints);
    
    // ✅ Debug: 確認 GeoJSON 有傳遞給 Mapbox
    if (result && result.features) {
      console.log('[MapboxRealTimeMap] ✅ historyH3GeoJson 已生成，含', result.features.length, '個 features');
      if (result.features.length > 0) {
        console.log('[MapboxRealTimeMap] 📊 首個 feature opacity:', result.features[0].properties?.opacity);
      }
    }
    
    return result;
  }, [actualMapMode, historySessions, calculateSessionH3GeoJson]);

  // 當前會話 H3 GeoJSON
  const currentSessionH3GeoJson = useMemo(() => {
    if (!isCollecting || currentSessionNewHexes.size === 0) return null;

    const hexArray = Array.from(currentSessionNewHexes);
    const features: any[] = [];

    hexArray.forEach(h3Index => {
      try {
        const coord = h3ToLatLng(h3Index);
        if (!coord) return;

        const { latitude: lat, longitude: lng } = coord;
        const circleCoords = getLowPolyCircle(lat, lng, 20, 8);

        features.push({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [circleCoords],
          },
        });
      } catch (error) {
        // 忽略錯誤
      }
    });

    if (features.length === 0) return null;

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [isCollecting, currentSessionNewHexes, getLowPolyCircle]);

  // GPS Trail GeoJSON - 即時更新的路徑軌跡（延遲一個點，避免覆蓋游標）
  const gpsTrailGeoJson = useMemo(() => {
    if (!isCollecting || !gpsHistoryService.isSessionActive()) {
      console.log('[MapboxRealTimeMap] GPS Trail 未顯示：isCollecting =', isCollecting);
      return null;
    }

    const currentSessionPoints = gpsHistoryService.getCurrentSessionTrail();
    if (!currentSessionPoints || currentSessionPoints.length < 2) {
      console.log('[MapboxRealTimeMap] GPS Trail 點數不足:', currentSessionPoints?.length || 0);
      return null;
    }

    // ✅ 關鍵：去掉最後一個點（當前位置），避免覆蓋游標
    // 軌跡 = 你「走過的路」，游標 = 你「現在的位置」
    const trailPoints = currentSessionPoints.slice(0, -1);
    
    if (trailPoints.length < 2) {
      console.log('[MapboxRealTimeMap] GPS Trail 延遲後點數不足:', trailPoints.length);
      return null; // 至少需要 2 個點才能畫線
    }

    const coordinates = trailPoints.map(point => [point.longitude, point.latitude]);
    console.log('[MapboxRealTimeMap] 🔥 GPS Trail 更新:', coordinates.length, '個點（延遲 1 個點）');

    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates,
        },
      }],
    };
  }, [isCollecting, currentLocation]); // ✅ 新增 currentLocation 依賴，確保每次位置更新都重繪

  // 用戶 3D 模型 GeoJSON
  const userModelGeoJson = useMemo(() => {
    // 只在遊戲模式且有位置時顯示
    if (!currentLocation) {
      console.log('[3D Model] ⚠️ userModelGeoJson: 無 currentLocation');
      return null;
    }
    if (actualMapMode !== 'GAME') {
      console.log('[3D Model] ⚠️ userModelGeoJson: actualMapMode =', actualMapMode, '不是 GAME');
      return null;
    }
    if (!is3DModelReady) {
      console.log('[3D Model] ⚠️ userModelGeoJson: is3DModelReady =', is3DModelReady);
      return null;
    }

    const geoJson = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            currentLocation.coords.longitude,
            currentLocation.coords.latitude,
            0, // 高度（米）
          ],
        },
        properties: {
          // 旋轉角度（根據運動方向）
          rotation: displayHeadingAdjusted,
          // 速度（用於動態縮放）
          speed: currentSpeed,
        },
      }],
    };
    
    console.log('[3D Model] ✅ userModelGeoJson 生成:', {
      coordinates: geoJson.features[0].geometry.coordinates,
      rotation: displayHeadingAdjusted,
      speed: currentSpeed,
    });
    
    return geoJson;
  }, [currentLocation, actualMapMode, is3DModelReady, displayHeadingAdjusted, currentSpeed]);

  // ========== 渲染 ==========
  
  const mapStyle = height ? { height } : styles.map;

  return (
    <View style={[styles.container, mapStyle]}>
      <Mapbox.MapView
        key={`map-${timeTheme}`}
        ref={mapRef}
        style={styles.map}
        // ✅ 殺手二修復：先使用 standard 樣式測試 3D 模型
        // 如果模型顯示正常，再切換回主題樣式
        styleURL={
          is3DModelReady 
            ? 'mapbox://styles/mapbox/standard' // 測試 3D 模型時使用 standard
            : (timeTheme === 'morning' ? MORNING_THEME.mapStyle : NIGHT_THEME.mapStyle)
        }
        logoEnabled={PERFORMANCE_CONFIG.logoEnabled}
        attributionEnabled={PERFORMANCE_CONFIG.attributionEnabled}
        compassEnabled={PERFORMANCE_CONFIG.compassEnabled}
        zoomEnabled={PERFORMANCE_CONFIG.zoomEnabled}
        scrollEnabled={PERFORMANCE_CONFIG.scrollEnabled}
        pitchEnabled={PERFORMANCE_CONFIG.pitchEnabled}
        rotateEnabled={PERFORMANCE_CONFIG.rotateEnabled}
      >
        {/* ✅ 關鍵：先註冊模型（必須在所有圖層之前） */}
        {is3DModelReady && (
          <Mapbox.Models
            models={{
              'user-avatar-model': modelUrl, // ✅ 殺手三修復：直接使用 https:// URL，不用本地文件
            }}
            onPress={(e) => {
              console.log('[3D Model] 🎯 模型被點擊:', e);
            }}
            onError={(error) => {
              console.error('[3D Model] ❌ Models 組件錯誤:', error);
            }}
          />
        )}

        {/* 🎮 Pokémon GO 風格攝影機 - 支援 2D/3D 切換 */}
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={CAMERA_CONFIG.zoomLevel}
          pitch={viewMode === '3D' ? CAMERA_CONFIG.pitch : 0} // 3D: 65°, 2D: 0°
          heading={0} // ✅ 北方朝上，不跟隨設備旋轉（三角形會自己根據運動方向旋轉）
          followUserLocation={actualMapMode === 'GAME' && !isRecenteringManually}
          followUserMode={CAMERA_CONFIG.followUserMode} // 兩種模式都使用 'course' 模式
          animationDuration={CAMERA_CONFIG.animationDuration}
          centerCoordinate={
            actualMapMode === 'HISTORY' && selectedSession && selectedSession.points.length > 0
              ? [selectedSession.points[0].longitude, selectedSession.points[0].latitude]
              : currentLocation && currentLocation.coords
              ? [currentLocation.coords.longitude, currentLocation.coords.latitude]
              : undefined
          }
        />

        {/* 歷史 H3 Hexes - 迷霧效果（支援早晚主題切換） */}
        {historyH3GeoJson && (
          <Mapbox.ShapeSource id="history-h3" shape={historyH3GeoJson}>
            <Mapbox.HeatmapLayer
              id="history-h3-heatmap"
              style={{
                // ✅ 根據時間主題動態切換顏色
                heatmapColor: timeTheme === 'morning' 
                  ? MORNING_THEME.historyH3.heatmapColor 
                  : NIGHT_THEME.historyH3.heatmapColor,
                // ✅ 縮小半徑：讓明亮中心更小，擴散更柔和
                heatmapRadius: [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  10, 25,   // zoom 10: 半徑 25px（縮小）
                  13, 35,   // zoom 13: 半徑 35px
                  15, 45,   // zoom 15: 半徑 45px
                  18, 60    // zoom 18: 半徑 60px（縮小明亮區域）
                ],
                // ✅ 權重：根據 weight 屬性調整每個點的影響力
                heatmapWeight: [
                  'interpolate',
                  ['linear'],
                  ['get', 'weight'],
                  0, 0,
                  1, 1
                ],
                // ✅ 降低強度：讓整體更柔和
                heatmapIntensity: [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  10, 0.5,   // 降低強度
                  15, 0.8,
                  18, 1.0
                ],
                heatmapOpacity: 1,
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* GPS Trail - 即時路徑軌跡（珊瑚橙）- 放在 H3 和用戶游標之間 */}
        {gpsTrailGeoJson && (
          <Mapbox.ShapeSource id="gps-trail" shape={gpsTrailGeoJson}>
            <Mapbox.LineLayer
              id="gps-trail-line"
              style={{
                lineColor: timeTheme === 'morning' 
                  ? MORNING_THEME.gpsTrail.color 
                  : MAP_THEME.gpsTrail.color,
                lineWidth: timeTheme === 'morning' 
                  ? MORNING_THEME.gpsTrail.width 
                  : MAP_THEME.gpsTrail.width,
                lineOpacity: MAP_THEME.gpsTrail.opacity,
                lineCap: 'round',
                lineJoin: 'round',
                lineSortKey: 3,
              }}
            />
          </Mapbox.ShapeSource>
        )}
        {/* 當前會話 H3 Hexes - 活力橙（只顯示邊框，不顯示填充） */}
        {currentSessionH3GeoJson && (
          <Mapbox.ShapeSource id="current-h3" shape={currentSessionH3GeoJson}>
            {/* ⚠️ 不渲染 fill layer，避免覆蓋 user marker */}
            {/* 外框：活力橙虛線 */}
            <Mapbox.LineLayer
              id="current-h3-stroke"
              style={{
                lineColor: timeTheme === 'morning' 
                  ? MORNING_THEME.currentH3.stroke.color 
                  : MAP_THEME.currentH3.stroke.color,
                lineWidth: timeTheme === 'morning' 
                  ? MORNING_THEME.currentH3.stroke.width 
                  : MAP_THEME.currentH3.stroke.width,
                lineOpacity: MAP_THEME.currentH3.stroke.opacity,
                lineDasharray: MAP_THEME.currentH3.stroke.dasharray,
                lineSortKey: 5, // ✅ 排序值 5，確保在 user marker (99999) 下方
              }}
            />
          </Mapbox.ShapeSource>
        )}
        {/* 用戶位置標記 - 永遠存在，使用 opacity 控制顯示/隱藏 */}
        {(() => {
          const hasLocation = !!(currentLocation && currentLocation.coords);
          const shouldShow = actualMapMode === 'GAME' && hasLocation;
          const coords: [number, number] = hasLocation
            ? [currentLocation!.coords.longitude, currentLocation!.coords.latitude]
            : [0, 0];

          return (
            <Mapbox.ShapeSource
              id="user-location-source"
              shape={{
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: coords,
                },
              }}
            >
            {/* 固定最上層 SymbolLayer（終極解法：不用 aboveLayerID，只用 sortKey + JSX 順序） */}
            <Mapbox.SymbolLayer
              id="user-marker-top"
              style={{
                textField: MAP_THEME.userMarker.arrow.symbol,
                textSize: viewMode === '3D'
                  ? MAP_THEME.userMarker.arrow.size.mode3D
                  : MAP_THEME.userMarker.arrow.size.mode2D,
                textColor: timeTheme === 'morning' 
                  ? MORNING_THEME.userMarker.arrow.color 
                  : MAP_THEME.userMarker.arrow.color,
                textHaloColor: timeTheme === 'morning' 
                  ? MORNING_THEME.userMarker.arrow.haloColor 
                  : MAP_THEME.userMarker.arrow.haloColor,
                textHaloWidth: timeTheme === 'morning' 
                  ? MORNING_THEME.userMarker.arrow.haloWidth 
                  : MAP_THEME.userMarker.arrow.haloWidth,
                textOpacity: shouldShow ? 1 : 0,
                textPitchAlignment: 'map',
                textRotationAlignment: 'map',
                textRotate: displayHeadingAdjusted,
                textAllowOverlap: true,
                textIgnorePlacement: true,
                symbolZOrder: 'viewport-y',
                symbolSortKey: 99999, // ✅ 極高排序值，確保在所有圖層上方
              }}
            />
          </Mapbox.ShapeSource>
          );
        })()}

        {/* 🎮 用戶 3D 模型（GLB）- 使用你的 GitHub Raw URL */}
        {userModelGeoJson && is3DModelReady && (
          <Mapbox.ShapeSource 
            id="user-3d-model-source" 
            shape={userModelGeoJson}
            onPress={(e) => {
              console.log('[3D Model] 🎯 ShapeSource 被點擊:', e);
            }}
          >
            <Mapbox.ModelLayer
              id="user-3d-model-layer"
              style={{
                // ✅ 使用註冊的模型名稱（對應上方 Models 中的 key）
                modelId: 'user-avatar-model',
                
                // ✅ 旋轉（根據運動方向）
                modelRotation: [
                  0,  // pitch (俯仰角)
                  0,  // roll (滾轉角)
                  ['get', 'rotation']  // yaw (偏航角 = 運動方向)
                ],
                
                // ✅ 縮放（根據 zoom level 動態調整）
                // ⚠️ 極限除錯法：先使用固定大值測試
                modelScale: [200, 200, 200], // ✅ 固定 200 倍大測試（如果看到再調小）
                // 如果看到模型，可以改回動態縮放：
                // modelScale: [
                //   'interpolate',
                //   ['linear'],
                //   ['zoom'],
                //   15, [1, 1, 1],
                //   17, [1.5, 1.5, 1.5],
                //   20, [2, 2, 2]
                // ],
                
                // ✅ 模型類型（使用 common-3d，location 可能不是有效值）
                modelType: 'common-3d',
                
                // ✅ 透明度
                modelOpacity: 1,
                
                // ✅ 環境光遮蔽
                modelAmbientOcclusionIntensity: 0.5,
                
                // ✅ 自發光強度（根據主題調整）
                modelEmissiveStrength: timeTheme === 'morning' ? 0.5 : 0.2,
                
                // ✅ 陰影
                modelCastShadows: true,
                modelReceiveShadows: true,
              }}
            />
          </Mapbox.ShapeSource>
        )}
      </Mapbox.MapView>

      {/* 🌓 時間主題切換按鈕（早晨/夜晚） */}
      {actualMapMode === 'GAME' && (
        <TouchableOpacity
          style={[
            styles.themeButton,
            timeTheme === 'morning' ? styles.themeButtonMorning : styles.themeButtonNight
          ]}
          activeOpacity={0.85}
          onPress={() => {
            const newTheme = timeTheme === 'morning' ? 'night' : 'morning';
            setTimeTheme(newTheme);
            console.log('[MapboxRealTimeMap] 🌓 切換時間主題:', timeTheme, '->', newTheme);
          }}
        >
          <View style={styles.buttonContent}>
            <Ionicons 
              name={timeTheme === 'morning' ? 'sunny' : 'moon'} 
              size={24} 
              color={MAP_THEME.ui.buttons.icon} 
            />
            <Text style={styles.viewModeLabel}>
              {timeTheme === 'morning' ? '早晨' : '夜晚'}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* 整合按鈕：重新定位 + 視角切換 */}
      {actualMapMode === 'GAME' && (
        <TouchableOpacity
          style={[
            styles.recenterButton,
            viewMode === '3D' ? styles.recenterButton3D : styles.recenterButton2D
          ]}
          onPress={async () => {
            console.log('[MapboxRealTimeMap] 🎯 多功能按鈕被點擊');
            
            if (!currentLocation || !currentLocation.coords) {
              console.warn('[MapboxRealTimeMap] ⚠️ 無法操作：currentLocation 為 null');
              return;
            }
            
            // 切換視角模式
            const newMode = viewMode === '3D' ? '2D' : '3D';
            setViewMode(newMode);
            console.log('[MapboxRealTimeMap] 🔄 切換視角模式:', viewMode, '->', newMode);
            
            const coords = [currentLocation.coords.longitude, currentLocation.coords.latitude];
            const targetPitch = newMode === '3D' ? CAMERA_CONFIG.pitch : 0;
            
            // 步驟 1: 暫時禁用 followUserLocation
            setIsRecenteringManually(true);
            
            // 步驟 2: 等待狀態更新
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // 步驟 3: 執行重新定位 + 視角切換
            cameraRef.current?.setCamera({
              centerCoordinate: coords,
              zoomLevel: CAMERA_CONFIG.zoomLevel,
              pitch: targetPitch,
              heading: 0, // ✅ 北方朝上
              animationDuration: 800,
            });
            
            console.log('[MapboxRealTimeMap] ✅ 已更新:', {
              mode: newMode,
              pitch: targetPitch,
              coords,
            });
            
            // 步驟 4: 動畫完成後，重新啟用 followUserLocation
            setTimeout(() => {
              setIsRecenteringManually(false);
            }, 900);
          }}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="locate" size={20} color={MAP_THEME.ui.buttons.icon} />
            <Text style={styles.viewModeLabel}>{viewMode}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MAP_THEME.background,
  },
  map: {
    flex: 1,
  },
  recenterButton: {
    position: 'absolute',
    bottom: 240, // 往上移，避免與 BackpackCard 重疊 (140 + 80 + 20)
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: MAP_THEME.ui.buttons.shadow.color,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: MAP_THEME.ui.buttons.shadow.opacity,
    shadowRadius: 6,
    elevation: 6,
  },
  recenterButton3D: {
    backgroundColor: MAP_THEME.ui.buttons.mode3D.background, // 活力橙 - 3D 模式
    borderColor: MAP_THEME.ui.buttons.mode3D.border,
  },
  recenterButton2D: {
    backgroundColor: MAP_THEME.ui.buttons.mode2D.background, // 清新綠 - 2D 模式
    borderColor: MAP_THEME.ui.buttons.mode2D.border,
  },
  // === 時間主題按鈕樣式 ===
  themeButton: {
    position: 'absolute',
    bottom: 310, // 在 2D/3D 按鈕上方 (240 + 56 + 14)
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: MAP_THEME.ui.buttons.shadow.color,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: MAP_THEME.ui.buttons.shadow.opacity,
    shadowRadius: 6,
    elevation: 6,
  },
  themeButtonMorning: {
    backgroundColor: 'rgba(255, 200, 100, 0.95)', // 早晨：金色
    borderColor: 'rgba(255, 220, 150, 1)',
  },
  themeButtonNight: {
    backgroundColor: 'rgba(100, 120, 180, 0.95)', // 夜晚：深藍色
    borderColor: 'rgba(150, 170, 220, 1)',
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: MAP_THEME.ui.buttons.text,
    marginTop: 2,
    fontFamily: 'monospace',
  },
});
