/**
 * 實時地圖組件
 * Solefood MVP v9.0 Plus
 * 
 * 顯示實時 GPS 位置並跟隨用戶移動
 */

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated, Dimensions, Platform } from 'react-native';
import MapView, { Marker, Polyline, Region, Polygon, Geojson } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { locationService } from '../../services/location';
import { gpsHistoryService } from '../../services/gpsHistory';
import { explorationService } from '../../services/exploration';
import { entropyEngine } from '../../core/entropy/engine';
import { latLngToH3, H3_RESOLUTION, getH3CellBoundary, h3ToLatLng } from '../../core/math/h3';
import { useSessionStore } from '../../stores/sessionStore';
import { UserMarker } from './UserMarker';
import LivePath from './LivePath';
import type { LocationData } from '../../services/location';
import type { ExploredRegion } from '../../services/exploration';
import type { MovementInput } from '../../core/entropy/events';

// ⭐ Android 修復：定義標準縮放常數（適合走路遊戲的距離）
const DEFAULT_ZOOM_DELTA = {
  latitudeDelta: 0.002, // 非常近，約 200~300 公尺範圍，適合看清楚 H3 格子
  longitudeDelta: 0.002 * (Dimensions.get('window').width / Dimensions.get('window').height), // 根據螢幕長寬比自動計算
};

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
  // 從 Store 獲取地圖模式和已探索的 H3 六邊形
  const mapMode = useSessionStore((state) => state.mapMode);
  const exploredHexes = useSessionStore((state) => state.exploredHexes);
  const currentSessionNewHexes = useSessionStore((state) => state.currentSessionNewHexes); // ⭐ 新增：當前會話的新領地
  const discoverNewHex = useSessionStore((state) => state.discoverNewHex); // ⭐ 新增：探索新領地的方法
  const updateExploredHexesFromHistory = useSessionStore((state) => state.updateExploredHexesFromHistory);
  const totalDistance = useSessionStore((state) => state.totalDistance);
  
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [markerKey, setMarkerKey] = useState(0); // ⭐ Android 強力修復：用於強制觸發 UserMarker re-render
  const [historyStartPoint, setHistoryStartPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [historyEndPoint, setHistoryEndPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [exploredRegions, setExploredRegions] = useState<ExploredRegion[]>([]);
  const [frequentRegions, setFrequentRegions] = useState<Array<{ h3Index: string; visitCount: number }>>([]); // 7天內訪問頻繁的區域
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  // ⭐ 新增：追蹤 exploredHexes 的變化，用於強制重繪
  const [hexesRenderKey, setHexesRenderKey] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  // ⭐⭐ 修復 4: 強制卸載 LivePath 的狀態（防止多次採集循環後的 GPS 軌跡殘留）
  const [forceUnmountLivePath, setForceUnmountLivePath] = useState(false);
  // ⭐ Android 修復：增加 mapReady 狀態鎖
  const [isMapReady, setIsMapReady] = useState(false);
  // ⭐ Android 修復：追蹤是否已經執行過初次聚焦
  const hasInitialFocusRef = useRef(false);
  // 跟隨模式：NONE（手動模式）、USER（跟隨用戶，北方朝上）、COMPASS（跟隨用戶，地圖隨手機旋轉）
  const [followMode, setFollowMode] = useState<'NONE' | 'USER' | 'COMPASS'>('USER'); // 預設為 USER 模式
  const [heading, setHeading] = useState<number>(0); // 手機方位（0-360度，用於 COMPASS 模式）
  const mapRef = useRef<MapView>(null);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const headingSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const lastMapHeadingRef = useRef<number>(0); // 上一次應用到地圖的方位（用於防抖動）
  
  // Null Guard：保存上一次有效的 location（防止 Marker 消失）
  const lastValidLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  
  // 穩定的 coordinate 對象（使用 ref 避免每次 render 都創建新對象）
  const stableCoordinateRef = useRef<{ latitude: number; longitude: number } | null>(null);
  
  // ⚡️ STEPN 級別優化：使用 useRef + 強制更新策略，完全避免不必要的 re-render
  const trailCoordinatesRef = useRef<Array<{ latitude: number; longitude: number }>>([]);
  const [trailUpdateTrigger, setTrailUpdateTrigger] = useState(0); // 只在需要時觸發更新
  
  // ⭐ 修復閃爍：緩存上一次的軌跡資訊，用於深度比較
  const lastTrailLengthRef = useRef<number>(0);
  const lastTrailLastPointRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastUpdateTimeRef = useRef<number>(0); // ⚡️ 新增：時間節流
  
  // 穩定的軌跡引用（只在 trigger 變化時才重新計算）
  const trailCoordinates = useMemo(() => {
    return trailCoordinatesRef.current;
  }, [trailUpdateTrigger]);
  
  // ⚡️ 輔助函數：更新軌跡（只在真正需要時觸發 re-render + 時間節流）
  const MIN_UPDATE_INTERVAL = 2000; // 最小更新間隔：2 秒（進一步降低更新頻率）
  
  const updateTrailCoordinates = useCallback((newTrail: Array<{ latitude: number; longitude: number }>) => {
    const now = Date.now();
    
    // 深度比較：只有當軌跡長度改變或最後一個點改變時才更新
    const isLengthChanged = newTrail.length !== lastTrailLengthRef.current;
    const isLastPointChanged = newTrail.length > 0 && (
      !lastTrailLastPointRef.current ||
      Math.abs(lastTrailLastPointRef.current.latitude - newTrail[newTrail.length - 1].latitude) > 0.000001 ||
      Math.abs(lastTrailLastPointRef.current.longitude - newTrail[newTrail.length - 1].longitude) > 0.000001
    );
    const isCleared = newTrail.length === 0 && lastTrailLengthRef.current > 0;
    
    const shouldUpdate = isLengthChanged || isLastPointChanged || isCleared;
    
    // ⚡️ 時間節流：只有新增點或距離上次更新超過 MIN_UPDATE_INTERVAL 才更新
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    const canUpdate = isLengthChanged || isCleared || timeSinceLastUpdate >= MIN_UPDATE_INTERVAL;
    
    if (shouldUpdate && canUpdate) {
      trailCoordinatesRef.current = newTrail;
      lastTrailLengthRef.current = newTrail.length;
      lastTrailLastPointRef.current = newTrail.length > 0 ? newTrail[newTrail.length - 1] : null;
      lastUpdateTimeRef.current = now;
      setTrailUpdateTrigger(prev => prev + 1); // 觸發 useMemo 重新計算
    }
  }, []);
  
  // ⭐ 移除：自定義縮放控制函數（已改用原生縮放控制）
  
  // ⭐ 新增：低多邊形圓形生成函數（高效能版本）
  const getLowPolyCircle = useCallback((centerLat: number, centerLng: number, radiusMeters: number, steps: number = 10): number[][] => {
    const coords: number[][] = [];
    const earthRadius = 6378137; // 地球半徑（米）

    // ⚡ 效能關鍵：只用 10 個點來模擬圓形
    for (let i = 0; i < steps; i++) {
      const angle = (i * 360) / steps;
      const rad = (angle * Math.PI) / 180;

      // 計算圓形上的點（考慮緯度對經度的影響）
      const dx = radiusMeters * Math.cos(rad);
      const dy = radiusMeters * Math.sin(rad);

      const dLat = (dy / earthRadius) * (180 / Math.PI);
      const dLng = (dx / (earthRadius * Math.cos((centerLat * Math.PI) / 180))) * (180 / Math.PI);

      // GeoJSON 格式：[lng, lat]（經度在前）
      coords.push([centerLng + dLng, centerLat + dLat]);
    }

    // 確保多邊形閉合（第一個點和最後一個點相同）
    if (coords.length > 0 && (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1])) {
      coords.push([coords[0][0], coords[0][1]]);
    }

    return coords;
  }, []);

  // 根據 showHistoryTrail 確定實際的地圖模式
  const actualMapMode = showHistoryTrail ? 'HISTORY' : mapMode;

  // ⭐ 新增：將 exploredHexes 轉換為 GeoJSON（圓形氣泡風格，使用 useMemo 優化效能）
  const h3GeoJsonData = useMemo(() => {
    // ⭐ 修復：嚴格的空值檢查，沒資料就不回傳物件
    if (!isHydrated || exploredHexes.size === 0) {
      return null;
    }

    const hexesArray = Array.from(exploredHexes);
    
    // ⭐ 修復：移除視口過濾（避免 currentRegion 變化導致重新計算）
    // 直接處理所有 hexes，讓地圖引擎自己處理視口裁剪
    const hexesToProcess = hexesArray;

    // ⚡ 效能關鍵：10 邊形圓形（視覺上像圓，效能接近六邊形）
    const CIRCLE_RADIUS_METERS = 20; // ⭐ 圓形半徑：20m
    const CIRCLE_STEPS = 10; // 10 邊形（低多邊形，高效能）

    // ⭐ 優化：轉換為 MultiPolygon 結構（圓形氣泡）+ 間隔採樣
    const multiPolygonCoordinates = hexesToProcess
      .map((h3Index) => {
        if (!h3Index || typeof h3Index !== 'string') {
          return null;
        }

        // ⭐ 修復：移除採樣邏輯，渲染所有 H3（確保完整顯示歷史軌跡）
        // 32 個 H3 圓形不會影響性能，保證用戶看到完整的探索記錄

        // 獲取 H3 中心點
        const center = h3ToLatLng(h3Index);
        if (!center) {
          // 降級方案：如果無法獲取中心點，使用邊界計算中心
          const boundary = getH3CellBoundary(h3Index);
          if (boundary.length === 0) {
            return null;
          }
          const centerLat = boundary.reduce((sum, [lat]) => sum + lat, 0) / boundary.length;
          const centerLng = boundary.reduce((sum, [, lng]) => sum + lng, 0) / boundary.length;
          
          // 生成低多邊形圓形座標
          const circleCoords = getLowPolyCircle(centerLat, centerLng, CIRCLE_RADIUS_METERS, CIRCLE_STEPS);
          return [circleCoords];
        }

        // 生成低多邊形圓形座標
        const circleCoords = getLowPolyCircle(center.latitude, center.longitude, CIRCLE_RADIUS_METERS, CIRCLE_STEPS);

        // MultiPolygon 的每個 polygon 需要外層陣列：[[coordinates]]
        return [circleCoords];
      })
      .filter((polygon): polygon is NonNullable<typeof polygon> => polygon !== null);

    // ⭐ 修復：如果沒有有效的 polygons，直接返回 null（避免空物件）
    if (multiPolygonCoordinates.length === 0) {
      return null;
    }

    // ⭐ 優化：使用單一 Feature<MultiPolygon> 結構
    const geoJson = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: {}, // 不需要個別屬性，提升效能
          geometry: {
            type: 'MultiPolygon' as const,
            coordinates: multiPolygonCoordinates, // MultiPolygon 結構：[[[lng, lat], ...]], [[[lng, lat], ...]], ...
          },
        },
      ],
    };

    const totalHexes = exploredHexes.size;
    const renderedHexes = multiPolygonCoordinates.length;
    const samplingRate = totalHexes > 0 ? ((renderedHexes / totalHexes) * 100).toFixed(1) : '0';

    console.log(`[RealTimeMap] 🎨 GeoJSON 圓形氣泡轉換完成: ${renderedHexes} 個圓形 (採樣率: ${samplingRate}%)`, {
      totalHexes,
      renderedHexes,
      circleCount: multiPolygonCoordinates.length,
      stepsPerCircle: CIRCLE_STEPS,
      radiusMeters: CIRCLE_RADIUS_METERS,
      samplingRate: `${samplingRate}%`,
    });

    return geoJson;
  }, [hexesRenderKey, isHydrated, getLowPolyCircle]); // ⭐ 使用 hexesRenderKey 確保內容變化時正確更新

  // ⭐ 新增：將當前會話的新 H3 轉換為 GeoJSON（高亮顯示，探索者模式的「即時墨水」）
  const currentSessionGeoJsonData = useMemo(() => {
    // ⚡️ 關鍵修復：使用 .size 作為依賴，確保清空時正確響應
    // 只在遊戲模式且有新格子時渲染
    if (!isHydrated || currentSessionNewHexes.size === 0) {
      console.log('[RealTimeMap] 🎨 當前會話 GeoJSON: 無新格子或未 hydrated');
      return null;
    }

    const hexesArray = Array.from(currentSessionNewHexes);
    
    // ⚡ 當前會話不需要採樣，全部渲染（因為數量較少）
    const CIRCLE_RADIUS_METERS = 20; // 與歷史軌跡相同半徑
    const CIRCLE_STEPS = 10;

    const multiPolygonCoordinates = hexesArray
      .map((h3Index) => {
        if (!h3Index || typeof h3Index !== 'string') {
          return null;
        }

        // 獲取 H3 中心點
        const center = h3ToLatLng(h3Index);
        if (!center) {
          const boundary = getH3CellBoundary(h3Index);
          if (boundary.length === 0) {
            return null;
          }
          const centerLat = boundary.reduce((sum, [lat]) => sum + lat, 0) / boundary.length;
          const centerLng = boundary.reduce((sum, [, lng]) => sum + lng, 0) / boundary.length;
          
          const circleCoords = getLowPolyCircle(centerLat, centerLng, CIRCLE_RADIUS_METERS, CIRCLE_STEPS);
          return [circleCoords];
        }

        const circleCoords = getLowPolyCircle(center.latitude, center.longitude, CIRCLE_RADIUS_METERS, CIRCLE_STEPS);
        return [circleCoords];
      })
      .filter((polygon): polygon is NonNullable<typeof polygon> => polygon !== null);

    if (multiPolygonCoordinates.length === 0) {
      return null;
    }

    const geoJson = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'MultiPolygon' as const,
            coordinates: multiPolygonCoordinates,
          },
        },
      ],
    };

    console.log(`[RealTimeMap] 🎨 當前會話 GeoJSON 轉換完成: ${multiPolygonCoordinates.length} 個圓形`, {
      totalNewHexes: currentSessionNewHexes.size,
      renderedCircles: multiPolygonCoordinates.length,
      radiusMeters: CIRCLE_RADIUS_METERS,
    });

    return geoJson;
  }, [currentSessionNewHexes.size, isHydrated, getLowPolyCircle]); // ⚡️ 使用 .size 作為依賴

  // ⭐ 新增：監聽 exploredHexes 變化，強制重繪
  useEffect(() => {
    if (exploredHexes.size > 0) {
      setHexesRenderKey(prev => prev + 1);
      console.log('[RealTimeMap] 🔄 exploredHexes changed, forcing re-render:', exploredHexes.size);
    }
  }, [exploredHexes.size]);

  // ⭐ 新增：監聽採集狀態變化，確保停止時清除當前會話的視覺元素
  useEffect(() => {
    if (!isCollecting) {
      console.log('[RealTimeMap] 🛑 採集已停止，當前會話新 H3 數量:', currentSessionNewHexes.size);
      console.log('[RealTimeMap] 🎨 綠色層已隱藏（通過 isCollecting 條件），青色層應包含:', exploredHexes.size, '個 H3');
      
      // ⚡️⚡️ 修復 4 (步驟 1): 立即強制卸載 LivePath
      setForceUnmountLivePath(true);
      console.log('[RealTimeMap] 🗑️ 強制卸載 LivePath（防止多次採集後的殘留）');
      
      // ⚡️ 修復 1: 強制重新渲染 UserMarker（防止消失）
      setMarkerKey(prev => prev + 1);
      console.log('[RealTimeMap] 🔄 UserMarker key 已更新，強制重新渲染');
      
      // ⚡️ 修復 2: 短暫延遲後更新 H3 圖層，等待 mergeCurrentSessionHexes 完成
      // 因為現在不會提前清空 currentSessionNewHexes，數據會正確合併，只需一次更新
      setTimeout(() => {
        setHexesRenderKey(prev => prev + 1);
        console.log('[RealTimeMap] 🔄 H3 render key 已更新，顯示合併後的完整數據');
      }, 300);
      
      // ⚡️ 修復 3: 強化 GPS 軌跡清理（多次強制重新渲染，確保完全清除）
      // 第一次：立即清空所有 GPS 軌跡數據
      trailCoordinatesRef.current = [];
      lastTrailLengthRef.current = 0;
      lastTrailLastPointRef.current = null;
      lastUpdateTimeRef.current = 0;
      setTrailUpdateTrigger(prev => prev + 1);
      console.log('[RealTimeMap] 🗑️ GPS 軌跡已立即清除（第 1 次）');
      
      // 第二次：0ms 延遲（確保 React 更新循環完成）
      setTimeout(() => {
        trailCoordinatesRef.current = [];
        lastTrailLengthRef.current = 0;
        lastTrailLastPointRef.current = null;
        lastUpdateTimeRef.current = 0;
        setTrailUpdateTrigger(prev => prev + 1);
        console.log('[RealTimeMap] 🗑️ GPS 軌跡清除（第 2 次，0ms 後）');
      }, 0);
      
      // 第三次：50ms 延遲（確保視圖更新）
      setTimeout(() => {
        trailCoordinatesRef.current = [];
        lastTrailLengthRef.current = 0;
        lastTrailLastPointRef.current = null;
        lastUpdateTimeRef.current = 0;
        setTrailUpdateTrigger(prev => prev + 1);
        console.log('[RealTimeMap] 🗑️ GPS 軌跡清除（第 3 次，50ms 後）');
      }, 50);
      
      // 第四次：100ms 延遲（最終確認，確保無殘留）
      setTimeout(() => {
        trailCoordinatesRef.current = [];
        lastTrailLengthRef.current = 0;
        lastTrailLastPointRef.current = null;
        lastUpdateTimeRef.current = 0;
        setTrailUpdateTrigger(prev => prev + 1);
        console.log('[RealTimeMap] 🗑️ GPS 軌跡清除（第 4 次，100ms 後）- 確認長度:', trailCoordinatesRef.current.length, '應為 0');
      }, 100);
      
      // ⚡️⚡️ 修復 4 (步驟 2): 200ms 後重新啟用 LivePath（確保下次採集時正常渲染）
      setTimeout(() => {
        setForceUnmountLivePath(false);
        console.log('[RealTimeMap] ✅ LivePath 已重新啟用（準備下次採集）');
      }, 200);
      
      // ⭐ 修復：不再提前清除 currentSessionNewHexes
      // 讓 endSession → mergeCurrentSessionHexes 自然處理合併和清除
      // 避免在合併之前就清空數據導致漏圖
      console.log('[RealTimeMap] 🛑 採集已停止，等待 endSession 自動合併 H3 數據');
    } else {
      // ⚡️⚡️ 修復 4 (步驟 3): 採集開始時，確保 LivePath 可以渲染
      setForceUnmountLivePath(false);
      console.log('[RealTimeMap] ▶️ 採集進行中，當前會話新 H3 數量:', currentSessionNewHexes.size);
    }
  }, [isCollecting, currentSessionNewHexes.size, exploredHexes.size]);
  
  // ⭐ 新增：檢查 hydration 狀態
  useEffect(() => {
    // 檢查 persist 是否已完成 hydration
    const checkHydration = async () => {
      // 給一個短暫延遲，確保 persist 完成
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 如果 exploredHexes 有數據，說明已經 hydrated
      if (exploredHexes.size > 0) {
        setIsHydrated(true);
        console.log('[RealTimeMap] ✅ Store hydrated, exploredHexes:', exploredHexes.size);
      } else {
        // 如果沒有數據，嘗試手動觸發 updateExploredHexesFromHistory
        console.log('[RealTimeMap] ⚠️  No exploredHexes, triggering updateExploredHexesFromHistory...');
        try {
          await updateExploredHexesFromHistory();
          const { useSessionStore } = require('../../stores/sessionStore');
          const store = useSessionStore.getState();
          console.log('[RealTimeMap] ✅ After updateExploredHexesFromHistory, exploredHexes:', store.exploredHexes.size);
          setIsHydrated(true);
        } catch (error) {
          console.error('[RealTimeMap] ❌ Failed to update exploredHexes:', error);
          setIsHydrated(true); // 即使失敗也標記為 hydrated，避免無限等待
        }
      }
    };
    
    checkHydration();
  }, []);
  
  // ⭐ 新增：當 mapMode 改變時，重新更新 exploredHexes
  useEffect(() => {
    if (actualMapMode === 'GAME' && isHydrated) {
      console.log('[RealTimeMap] 🔄 Map mode changed to GAME, updating exploredHexes...');
      updateExploredHexesFromHistory().catch(console.error);
    }
  }, [actualMapMode, isHydrated]);

  // ⭐ Android 修復：實作「初次聚焦」邏輯（雙重鎖定機制）
  useEffect(() => {
    // 只有在地圖準備好、有位置、且還沒執行過初次聚焦時才執行
    if (!isMapReady || !currentLocation || hasInitialFocusRef.current || showHistoryTrail) {
      return;
    }

    // ⭐ Android 專用 Hack：在 animateCamera 外層包一個 setTimeout
    // 舊手機需要這 500ms 緩衝來完成 Layout 計算，否則指令會無效
    const focusDelay = Platform.OS === 'android' ? 500 : 100;
    
    setTimeout(() => {
      if (mapRef.current && currentLocation && !hasInitialFocusRef.current) {
        hasInitialFocusRef.current = true;
        
        // 使用 animateCamera 而不是 animateToRegion（更穩定）
        mapRef.current.animateCamera({
          center: {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          },
          zoom: 17, // ⭐ 對應 Google Maps 的放大倍率（適合走路遊戲）
          altitude: Platform.OS === 'ios' ? 1000 : undefined, // ⭐ 僅 iOS 需要，設為較低數值以防太遠
          heading: 0, // 北方朝上
        }, {
          duration: 1000,
        });
        
        setFollowMode('USER');
        console.log('[RealTimeMap] Initial focus executed: map ready + location available, USER mode enabled');
      }
    }, focusDelay);
  }, [isMapReady, currentLocation, showHistoryTrail]);

  // ⭐ Android 修復：地圖準備完成的 callback
  const handleMapReady = () => {
    setIsMapReady(true);
    console.log('[RealTimeMap] Map ready callback triggered');
  };

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
      // 如果正在查看歷史軌跡，載入完整的軌跡線
      const historyTrail = gpsHistoryService.getSessionTrail(selectedSessionId);
      if (historyTrail.length > 0) {
        // 載入完整軌跡線
        const fullTrail = historyTrail.map(point => ({
          latitude: point.latitude,
          longitude: point.longitude,
        }));
        updateTrailCoordinates(fullTrail);
        
        // 設置起點和終點
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
        
        // 自動縮放地圖以涵蓋整個軌跡
        if (mapRef.current && fullTrail.length > 0) {
          requestAnimationFrame(() => {
            if (mapRef.current) {
              mapRef.current.fitToCoordinates(fullTrail, {
                edgePadding: {
                  top: 50,
                  right: 50,
                  bottom: 50,
                  left: 50,
                },
                animated: true,
              });
              console.log('[RealTimeMap] Historical trail: Map fitted to coordinates');
            }
          });
        }
      } else {
        setHistoryStartPoint(null);
        setHistoryEndPoint(null);
        updateTrailCoordinates([]);
      }
    } else if (isCollecting && gpsHistoryService.isSessionActive()) {
      // 如果正在採集會話中，載入當前會話的完整軌跡
      const currentTrail = gpsHistoryService.getCurrentSessionTrail();
      if (currentTrail.length > 0) {
        const newTrail = currentTrail.map(point => ({
          latitude: point.latitude,
          longitude: point.longitude,
        }));
        updateTrailCoordinates(newTrail);
      } else {
        updateTrailCoordinates([]);
      }
      // 清空歷史起終點
      setHistoryStartPoint(null);
      setHistoryEndPoint(null);
    } else {
      // 沒有活動會話且不在查看歷史時，不顯示軌跡
      updateTrailCoordinates([]);
      setHistoryStartPoint(null);
      setHistoryEndPoint(null);
    }
  }, [selectedSessionId, showHistoryTrail, isCollecting]);


  // ⭐ 需求 1：靜態渲染 - 只在進入 GAME 模式時渲染一次（不邊走邊渲染）
  useEffect(() => {
    if (mapMode === 'GAME') {
      // 只在進入 GAME 模式時渲染一次（靜態）
      const timer = setTimeout(() => {
        updateExploredHexesFromHistory();
      }, 500); // 延遲 500ms 確保服務已初始化
      
      return () => clearTimeout(timer);
    }
  }, [mapMode, updateExploredHexesFromHistory]);
  
  // ⭐ 移除定期更新（不再邊走邊渲染）
  
  // 載入已探索區域和7天歷史統計（用於其他功能，如開拓者模式判斷）
  useEffect(() => {
    const loadExploredData = () => {
      // 載入已探索區域（用於開拓者模式判斷）
      const regions = explorationService.getExploredRegions();
      setExploredRegions(regions);
      
      // 載入7天歷史點，計算訪問頻繁的區域（用於其他功能）
      // 注意：H3 六邊形顯示已改為使用 exploredHexes，這裡保留用於其他功能
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
    // ⭐ Android 修復 4：權限檢查 - 在 useEffect 最開始就請求權限
    const initLocation = async () => {
      // 請求位置權限（在獲取位置之前）
      const hasPermission = await locationService.checkPermissions();
      if (!hasPermission) {
        const granted = await locationService.requestPermissions();
        if (!granted) {
          console.warn('[RealTimeMap] Location permission denied. Map will not show user location.');
          // 即使權限被拒絕，也繼續執行（用戶可以稍後在設置中授予權限）
        }
      }
      
      // 獲取初始位置
      const location = await locationService.getCurrentLocation();
      if (location && isFinite(location.latitude) && isFinite(location.longitude)) {
        console.log('[RealTimeMap] Initial location obtained:', location);
        // Null Guard：保存有效的 location（防止 Marker 消失）
        const newCoord = {
          latitude: location.latitude,
          longitude: location.longitude,
        };
        lastValidLocationRef.current = newCoord;
        stableCoordinateRef.current = newCoord;
        setCurrentLocation(location);
        setMarkerKey(prev => prev + 1); // ⭐ Android 強力修復：強制觸發 re-render
        const initialRegion: Region = {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: DEFAULT_ZOOM_DELTA.latitudeDelta, // ⭐ 使用標準縮放常數
          longitudeDelta: DEFAULT_ZOOM_DELTA.longitudeDelta,
        };
        setCurrentRegion(initialRegion);
        
        // ⭐ 注意：初次聚焦邏輯已移至專門的 useEffect，這裡不再執行
        
        // 載入軌跡：優先顯示歷史軌跡（完整軌跡線），其次顯示當前會話軌跡
        if (showHistoryTrail && selectedSessionId) {
          const historyTrail = gpsHistoryService.getSessionTrail(selectedSessionId);
          if (historyTrail.length > 0) {
            // 載入完整軌跡線
            const fullTrail = historyTrail.map(point => ({
              latitude: point.latitude,
              longitude: point.longitude,
            }));
            updateTrailCoordinates(fullTrail);
            
            // 設置起點和終點
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
            
            // 自動縮放地圖以涵蓋整個軌跡
            requestAnimationFrame(() => {
              if (mapRef.current && fullTrail.length > 0) {
                mapRef.current.fitToCoordinates(fullTrail, {
                  edgePadding: {
                    top: 50,
                    right: 50,
                    bottom: 50,
                    left: 50,
                  },
                  animated: true,
                });
                console.log('[RealTimeMap] Historical trail: Map fitted to coordinates on initial load');
              }
            });
          }
        } else if (isCollecting && gpsHistoryService.isSessionActive()) {
          const currentTrail = gpsHistoryService.getCurrentSessionTrail();
          if (currentTrail.length > 0) {
            const newTrail = currentTrail.map(point => ({
              latitude: point.latitude,
              longitude: point.longitude,
            }));
            
            // ⚡️ 深度比較：只有當軌跡長度改變或最後一個點改變時才更新
            const shouldUpdate = 
              newTrail.length !== lastTrailLengthRef.current ||
              (newTrail.length > 0 && (
                !lastTrailLastPointRef.current ||
                Math.abs(lastTrailLastPointRef.current.latitude - newTrail[newTrail.length - 1].latitude) > 0.000001 ||
                Math.abs(lastTrailLastPointRef.current.longitude - newTrail[newTrail.length - 1].longitude) > 0.000001
              ));
            
            if (shouldUpdate) {
              updateTrailCoordinates(newTrail);
            }
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
        accuracy: location.accuracy,
        historyCount: gpsHistoryService.getHistoryCount(),
      });
      
      // ⭐ Android 修復 1：解鎖視圖更新 - setCurrentLocation 永遠執行（不依賴 isCollecting）
      // 這樣可以確保使用者游標始終顯示，無論是否在採集狀態
      if (location && isFinite(location.latitude) && isFinite(location.longitude) &&
          Math.abs(location.latitude) <= 90 && Math.abs(location.longitude) <= 180) {
        
        const newCoord = {
          latitude: location.latitude,
          longitude: location.longitude,
        };
        lastValidLocationRef.current = newCoord;
        
        // ⭐ Android 修復：根據精度調整更新閾值
        if (!stableCoordinateRef.current) {
          // 第一個點，直接設置（即使精度較差也要顯示）
          stableCoordinateRef.current = newCoord;
          setMarkerKey(prev => prev + 1); // ⭐ Android 強力修復：強制觸發 re-render
          console.log('[RealTimeMap] Initial coordinate set:', newCoord);
        } else {
          // 簡單的距離計算（米）
          const coordDistance = Math.sqrt(
            Math.pow((newCoord.latitude - stableCoordinateRef.current.latitude) * 111000, 2) +
            Math.pow((newCoord.longitude - stableCoordinateRef.current.longitude) * 111000 * Math.cos(newCoord.latitude * Math.PI / 180), 2)
          );
          
          // ⭐ Android 強力修復：大幅降低更新閾值，確保標記能更新
          // 精度差時（>50m），閾值設為 5m；精度好時（<50m），閾值設為 1m
          const threshold = (location.accuracy && location.accuracy > 50) ? 5 : 1;
          
          if (coordDistance > threshold) {
            stableCoordinateRef.current = newCoord;
            setMarkerKey(prev => prev + 1); // ⭐ Android 強力修復：強制觸發 re-render
            console.log(`[RealTimeMap] Coordinate updated (distance: ${coordDistance.toFixed(1)}m, threshold: ${threshold}m, accuracy: ${location.accuracy?.toFixed(1)}m)`);
          }
        }
        
        // ⭐ 關鍵：setCurrentLocation 永遠執行，不依賴 isCollecting
        setCurrentLocation(location);
      } else {
        console.warn('[RealTimeMap] Invalid location data received:', location);
      }
      
      // ⭐ Android 修復 2：區分視圖更新和數據記錄
      // 只有在採集會話進行中時才記錄GPS點並觸發拾取（查看歷史時不記錄）
      // 但 setCurrentLocation 已經在上面執行了，所以這裡只處理記錄邏輯
      if (isCollecting && gpsHistoryService.isSessionActive() && !showHistoryTrail) {
        // 記錄到當前會話
        gpsHistoryService.addPoint(location, distance);
        
        // ⭐ 新增：探索者模式 - 即時發現新領地（邊走邊畫）
        if (mapMode === 'GAME' && location.latitude && location.longitude) {
          const { latLngToH3, H3_RESOLUTION } = require('../../core/math/h3');
          const h3Index = latLngToH3(location.latitude, location.longitude, H3_RESOLUTION);
          if (h3Index) {
            const isNew = discoverNewHex(h3Index);
            if (isNew) {
              console.log('[RealTimeMap] 🎯 New territory discovered:', h3Index);
            }
          }
        }
        
        // ⚠️ 注意：背景模式下的記錄現在在 locationService 中處理（不依賴 React 組件狀態）
        // 這裡只在前景模式下額外記錄（可選，但保留也不影響，因為會檢查 appState）
        // 為了避免重複計數，只在前景模式下記錄
        const { bgTrackingNotification } = require('../../services/backgroundTrackingNotification');
        const appState = require('react-native').AppState.currentState;
        if (appState === 'active') {
          // 前景模式下也可以記錄（用於 DevDashboard 顯示）
          bgTrackingNotification.recordBackgroundPoint();
        }
        
        // 記錄造訪區域（用於探索系統）
        explorationService.recordVisit(location.latitude, location.longitude);
        
        // 觸發熵引擎處理拾取（GPS 更新時處理移動和拾取）
        // distance 是米，需要轉換為公里
        if (distance > 0) {
          // 處理速度：GPS 可能返回負數（無效值），需要過濾
          // m/s 轉換為 km/h，如果速度為負數或無效，設為 undefined
          const speed = (location.speed && location.speed > 0) ? location.speed * 3.6 : undefined;
          
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
        
        // ⭐ 修復閃爍：更新當前會話的軌跡顯示（只有當軌跡真正改變時才更新狀態）
        const currentTrail = gpsHistoryService.getCurrentSessionTrail();
        const newTrail = currentTrail.map(point => ({
          latitude: point.latitude,
          longitude: point.longitude,
        }));
        
        // ⭐ 深度比較：只有當軌跡長度改變或最後一個點改變時才更新
        const shouldUpdate = 
          newTrail.length !== lastTrailLengthRef.current ||
          (newTrail.length > 0 && (
            !lastTrailLastPointRef.current ||
            Math.abs(lastTrailLastPointRef.current.latitude - newTrail[newTrail.length - 1].latitude) > 0.000001 ||
            Math.abs(lastTrailLastPointRef.current.longitude - newTrail[newTrail.length - 1].longitude) > 0.000001
          )) ||
          (newTrail.length === 0 && lastTrailLengthRef.current > 0); // 軌跡被清空時也要更新
        
        if (shouldUpdate) {
          console.log('[RealTimeMap] Updating current session trail with', newTrail.length, 'points');
          updateTrailCoordinates(newTrail);
        }
      }
      
      // 跟隨模式邏輯：初始狀態為 USER 模式，用戶拖動地圖後切換為 NONE 模式
      // 只有在跟隨模式時，地圖才會自動跟隨用戶位置（followsUserLocation={followMode !== 'NONE'}）
    });

    // ⭐ 防崩潰修復：嚴格的生命週期清理
    return () => {
      console.log('[RealTimeMap] 🧹 清理位置訂閱（防止記憶體洩漏）');
      // 清理訂閱
      if (subscriptionRef.current) {
        try {
          subscriptionRef.current.remove();
          subscriptionRef.current = null;
          console.log('[RealTimeMap] ✅ 位置訂閱已清理');
        } catch (error) {
          console.warn('[RealTimeMap] ⚠️  清理訂閱時出錯:', error);
        }
      }
    };
  }, [isCollecting, showTrail, showHistoryTrail, selectedSessionId]); // 依賴：採集狀態、軌跡顯示、歷史查看

  // 當切換到歷史查看模式時，自動禁用跟隨模式
  useEffect(() => {
    if (showHistoryTrail) {
      setFollowMode('NONE');
    }
  }, [showHistoryTrail]);

  // 訂閱羅盤方位更新（用於 COMPASS 模式的地圖旋轉）
  useEffect(() => {
    let mounted = true;

    const watchHeading = async () => {
      // 只在 COMPASS 模式下訂閱羅盤
      if (followMode !== 'COMPASS') {
        return;
      }

      try {
        // 檢查位置權限（羅盤需要位置權限）
        const hasPermission = await locationService.checkPermissions();
        if (!hasPermission) {
          const granted = await locationService.requestPermissions();
          if (!granted) {
            console.warn('[RealTimeMap] Cannot watch heading: permission denied');
            return;
          }
        }

        // 訂閱方位更新（帶防抖動機制）
        headingSubscriptionRef.current = await Location.watchHeadingAsync((headingData) => {
          if (!mounted || followMode !== 'COMPASS') return;

          // 獲取磁力方位（0-360度）
          const magneticHeading = headingData.magHeading ?? 0;
          const targetHeading = ((magneticHeading % 360) + 360) % 360;
          
          // 防抖動：只有當變化 > 5 度時才更新地圖
          const headingDiff = Math.abs(targetHeading - lastMapHeadingRef.current);
          // 處理角度跨越（例如從 359° 到 1°）
          const normalizedDiff = headingDiff > 180 ? 360 - headingDiff : headingDiff;
          
          if (normalizedDiff > 5) {
            lastMapHeadingRef.current = targetHeading;
            setHeading(targetHeading);
            
            // 使用 animateCamera 旋轉地圖（不旋轉標記）
            if (mapRef.current && currentLocation) {
              mapRef.current.animateCamera({
                center: {
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                },
                heading: targetHeading,
                pitch: 0, // 保持 2D 俯視
              }, { duration: 200 }); // 短動畫時間確保平滑
            }
          }
        });
      } catch (error) {
        console.error('[RealTimeMap] Failed to watch heading:', error);
      }
    };

    // 只在主遊戲模式且 COMPASS 模式下訂閱羅盤
    if (actualMapMode === 'GAME' && followMode === 'COMPASS') {
      watchHeading();
    }

    return () => {
      mounted = false;
      if (headingSubscriptionRef.current) {
        headingSubscriptionRef.current.remove();
        headingSubscriptionRef.current = null;
      }
    };
  }, [followMode, actualMapMode, currentLocation]);

  // 當 followMode 改變時，更新地圖相機
  useEffect(() => {
    if (!mapRef.current || !currentLocation || actualMapMode !== 'GAME') return;

    if (followMode === 'USER') {
      // USER 模式：跟隨用戶位置，鎖定北方朝上
      mapRef.current.animateCamera({
        center: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        heading: 0, // 北方朝上
        pitch: 0,
      }, { duration: 500 });
      lastMapHeadingRef.current = 0;
    }
  }, [followMode, currentLocation, actualMapMode]);

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
        latitudeDelta: DEFAULT_ZOOM_DELTA.latitudeDelta, // ⭐ 使用標準縮放常數
        longitudeDelta: DEFAULT_ZOOM_DELTA.longitudeDelta,
      };
    }
    
    // 如果還沒有獲取到位置，使用一個合理的默認值（台灣附近）
    // 這會被 useEffect 中的 initLocation 立即覆蓋為真實位置
    return {
      latitude: 25.0330,
      longitude: 121.5654,
      latitudeDelta: DEFAULT_ZOOM_DELTA.latitudeDelta, // ⭐ 使用標準縮放常數
      longitudeDelta: DEFAULT_ZOOM_DELTA.longitudeDelta,
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
        // ⭐ 修復：移除 key（避免地圖重新創建，影響縮放功能）
        style={[mapStyle, { backgroundColor: '#1A1A1A' }]}
        initialRegion={getInitialRegion()}
        onMapReady={handleMapReady} // ⭐ Android 修復：地圖準備完成的 callback
        showsUserLocation={false} // ⭐ 只顯示自定義藍色 Marker
        showsMyLocationButton={false}
        showsZoomControls={true} // ⭐ 新增：Android 原生縮放控制
        followsUserLocation={followMode !== 'NONE' && actualMapMode === 'GAME'}
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
          // 關鍵：一旦用戶開始拖動地圖，立即切換到 NONE 模式（手動模式）
          if (followMode !== 'NONE') {
            setFollowMode('NONE');
            console.log('[RealTimeMap] User dragged map, switched to NONE mode');
          }
        }}
      >
        {/* ⭐ 優化：使用 GeoJSON MultiPolygon 渲染 H3 圓形氣泡（Teal 配色，與綠色路徑搭配） */}
        {actualMapMode === 'GAME' && isHydrated && h3GeoJsonData && (
          <Geojson
            key={`history-bubbles-${exploredHexes.size}-${hexesRenderKey}`} // ⭐⭐ 修復 2：結合 size 和 renderKey，確保多次採集後正確重繪
            geojson={h3GeoJsonData}
            fillColor="rgba(38, 166, 154, 0.2)" // ⭐ Teal 400，20% 透明度（類比色和諧，與綠色路徑搭配）
            strokeColor="rgba(0, 0, 0, 0)" // 無邊框（完全透明）
            strokeWidth={0} // 無邊框
            zIndex={1} // ⭐ 在底圖之上，但在玩家游標之下
          />
        )}

        {/* ⭐ 新增：當前會話的新領地（高亮顯示，探索者模式的「即時墨水」） */}
        {/* ⚡️ 關鍵修復：只在採集進行中時顯示綠色層，停止時立即隱藏 */}
        {actualMapMode === 'GAME' && isCollecting && isHydrated && currentSessionGeoJsonData && (
          <Geojson
            key="current-session-layer"
            geojson={currentSessionGeoJsonData}
            fillColor="rgba(76, 175, 80, 0.4)" // ⭐ 亮綠色，40% 透明度（高亮，表示「新鮮墨水」）
            strokeColor="rgba(76, 175, 80, 0.6)" // ⭐ 半透明綠色邊框
            strokeWidth={1}
            zIndex={2} // ⭐ 在歷史軌跡之上，表示「最新探索」
          />
        )}

        {/* 歷史軌跡模式：顯示軌跡線 */}
        {actualMapMode === 'HISTORY' && showTrail && trailCoordinates.length > 1 && (
          <Polyline
            coordinates={trailCoordinates}
            strokeColor="#00FF00" // 歷史軌跡用亮綠色
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
            opacity={0.9}
          />
        )}
        
        {/* 主遊戲模式的當前會話軌跡（如果正在採集）- 使用互補色對比 */}
        {/* ⭐⭐ 修復 4 (步驟 4): 添加 forceUnmountLivePath 條件，確保採集停止時立即卸載 */}
        {actualMapMode === 'GAME' && isCollecting && !forceUnmountLivePath && showTrail && trailCoordinates.length >= 2 && (
          <LivePath
            key="live-path-collecting" // ⭐⭐ 修復 1：簡化為固定 key，完全依賴條件渲染控制生命週期
            coordinates={trailCoordinates}
            strokeColor="rgba(255, 112, 67, 0.85)" // 🔥 Coral Orange - 與 Teal 背景完美互補，STEPN 風格
            strokeWidth={5}
            opacity={0.95} // ⚡️ 高透明度確保清晰可見
            zIndex={3}
          />
        )}

        {/* 歷史軌跡起點標記（只在歷史模式顯示） */}
        {actualMapMode === 'HISTORY' && historyStartPoint && (
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

        {/* 歷史軌跡終點標記（只在歷史模式顯示） */}
        {actualMapMode === 'HISTORY' && historyEndPoint && (
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

        {/* 當前位置標記（只在主遊戲模式顯示） */}
        {/* ⭐ Android 強力修復：使用 currentLocation (state) 而不是 ref，確保 re-render */}
        {(() => {
          const markerCoord = currentLocation ? {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          } : (stableCoordinateRef.current || lastValidLocationRef.current);
          
          console.log('[RealTimeMap] Rendering UserMarker check:', {
            actualMapMode,
            hasCurrentLocation: !!currentLocation,
            hasStableCoord: !!stableCoordinateRef.current,
            hasLastValidCoord: !!lastValidLocationRef.current,
            markerCoord,
            markerKey,
          });
          
          if (actualMapMode === 'GAME' && markerCoord) {
            return (
              <UserMarker
                key={`user-marker-${markerKey}`} // ⭐ 動態 key，採集結束時強制重建
                coordinate={markerCoord}
              />
            );
          }
          
          return null;
        })()}
      </MapView>

      {/* 實時信息覆蓋層（只在主遊戲模式顯示） */}
      {actualMapMode === 'GAME' && currentLocation && (
        <View style={styles.infoOverlay}>
          <Text style={styles.infoText}>
            {currentLocation.speed ? (currentLocation.speed * 3.6).toFixed(1) : '0.0'} km/h
          </Text>
          <Text style={styles.infoSubText}>
            Total: {totalDistance.toFixed(2)} km
          </Text>
        </View>
      )}

      {/* ⭐ 移除：自定義縮放按鈕（已改用原生縮放控制） */}

      {/* 定位/羅盤按鈕（三態循環切換，只在主遊戲模式顯示） */}
      {actualMapMode === 'GAME' && currentLocation && (
        <View style={styles.recenterButtonContainer}>
          <TouchableOpacity
            style={styles.recenterButton}
            onPress={() => {
              // 三態循環切換：NONE -> USER -> COMPASS -> USER
              if (followMode === 'NONE') {
                // 切換到 USER 模式（跟隨用戶，北方朝上）
                setFollowMode('USER');
                if (mapRef.current && currentLocation) {
                  mapRef.current.animateCamera({
                    center: {
                      latitude: currentLocation.latitude,
                      longitude: currentLocation.longitude,
                    },
                    heading: 0,
                    pitch: 0,
                  }, { duration: 500 });
                }
                console.log('[RealTimeMap] Switched to USER mode (North Up)');
              } else if (followMode === 'USER') {
                // 切換到 COMPASS 模式（跟隨用戶，地圖隨手機旋轉）
                setFollowMode('COMPASS');
                console.log('[RealTimeMap] Switched to COMPASS mode');
              } else {
                // 從 COMPASS 切換回 USER 模式（關閉旋轉，回到北方朝上）
                setFollowMode('USER');
                if (mapRef.current && currentLocation) {
                  mapRef.current.animateCamera({
                    center: {
                      latitude: currentLocation.latitude,
                      longitude: currentLocation.longitude,
                    },
                    heading: 0,
                    pitch: 0,
                  }, { duration: 500 });
                }
                console.log('[RealTimeMap] Switched to USER mode (from COMPASS)');
              }
            }}
          >
            <Text style={styles.recenterButtonText}>
              {followMode === 'NONE' ? '📍' : followMode === 'USER' ? '📍' : '🧭'}
            </Text>
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
    top: 60,  // 調整位置，避免被縮小的模式切換按鈕擋住
    left: 0,
    right: 0,
    alignItems: 'center',  // 居中對齊
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',  // 亮綠色，符合深色主題
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  infoSubText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#E0E0E0',  // 淺灰色，較小字體
    fontFamily: 'monospace',
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.8,
  },
  // ⭐ 移除：自定義縮放控制按鈕樣式（已改用原生縮放控制）
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
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingIndicator: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 0,
  },
  headingCone: {
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderTopWidth: 25,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(76, 175, 80, 0.4)', // 半透明綠色扇形
    marginTop: 12, // 從標記點開始延伸
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
    zIndex: 1, // 確保標記在視野指示器上方
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
