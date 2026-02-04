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

import React, { useEffect, useState, useRef, useMemo, useCallback, useImperativeHandle } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Animated, Image } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { locationService } from '../../services/location';
import { gpsHistoryService } from '../../services/gpsHistory';
import { useSessionStore } from '../../stores/sessionStore';
import { CAMERA_CONFIG, MAP_THEME, PERFORMANCE_CONFIG, MORNING_THEME, NIGHT_THEME, NO_LABELS_STYLE_JSON, FOOD_DROP_ICON, FOOD_DROP_CLUSTER } from '../../config/mapbox';
import { type RestaurantPoint } from '../../config/restaurants';
import { useRestaurantStore } from '../../stores/restaurantStore';
import type { GPSHistoryPoint, CollectionSession } from '../../services/gpsHistory';
import { latLngToH3, h3ToLatLng } from '../../core/math/h3';
import { generateH3GeoJson, getH3GeoJsonStats } from '../../utils/h3Renderer';
import { calculateDistanceMeters } from '../../utils/geo';

const TOOLTIP_CAMERA_ICON = require('../../../assets/images/camera_icon.png');
const TOOLTIP_UNLOAD_ICON = require('../../../assets/images/unload_icon.png');
const SEVEN_ELEVEN_ICON = require('../../../assets/images/seven_eleven_icon.png');

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
  onCountdownComplete?: () => void;
  /** 使用者點擊地圖上的餐廳標註時回調（遊戲模式下可顯示卸貨畫面） */
  onRestaurantPress?: (restaurant: RestaurantPoint) => void;
  /** 一次點到多個餐廳時回調（可顯示「選擇餐廳」讓使用者選一個） */
  onRestaurantPressMultiple?: (restaurants: RestaurantPoint[]) => void;
  /** 使用者點擊地圖空白處時回調（可用於關閉卸貨條等） */
  onMapPress?: () => void;
  /** 選中的餐廳（用於在圖標正上方浮出卸貨按鈕） */
  selectedRestaurantForUnload?: RestaurantPoint | null;
  /** 點擊「看廣告請工人卸貨」時（開啟卸貨變現彈窗） */
  onUnload?: () => void;
  /** 點擊「上傳菜單卸貨」時（拍照） */
  onCamera?: () => void;
  /** 關閉浮動按鈕 */
  onCloseRestaurant?: () => void;
}

export interface MapboxRealTimeMapRef {
  toggle3D2DAndRecenter: () => void;
}

export const MapboxRealTimeMap = React.forwardRef<MapboxRealTimeMapRef, MapboxRealTimeMapProps>(({
  showTrail = true,
  height,
  isCollecting,
  selectedSessionId,
  showHistoryTrail = false,
  onCountdownComplete,
  onRestaurantPress,
  onRestaurantPressMultiple,
  onMapPress,
  selectedRestaurantForUnload = null,
  onUnload,
  onCamera,
  onCloseRestaurant,
}, ref) => {
  // Store 狀態
  const exploredHexes = useSessionStore((state) => state.exploredHexes);
  const restaurantPoints = useRestaurantStore((state) => state.restaurantPoints);
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
  const [showLabels, setShowLabels] = useState<boolean>(true); // ✅ 地圖標籤顯示（預設：導航模式，採集時切換為探索模式）
  const [styleRefreshKey, setStyleRefreshKey] = useState(0); // 🚀 開發模式：樣式刷新鍵（強制重新載入地圖）
  // ✅ 3D 模型固定縮放：4 倍
  const MODEL_SCALE: [number, number, number] = [4, 4, 4];
  
  // ✅ 倒數動畫狀態
  const [countdown, setCountdown] = useState<number | null>(null); // 當前倒數數字（3, 2, 1 或 null）
  const [countdownComplete, setCountdownComplete] = useState(false); // 321 結束後才 true，避免先渲染 3D 推車再倒數
  const countdownOpacity = useRef(new Animated.Value(0)).current; // 倒數動畫透明度
  const countdownScale = useRef(new Animated.Value(1)).current; // 倒數動畫縮放

  // Refs
  const cameraRef = useRef<Mapbox.Camera>(null);
  const mapRef = useRef<Mapbox.MapView>(null);
  
  // ✅ 方向平滑化（解決室內/靜止時 GPS 亂指向）
  const previousHeadingsRef = useRef<number[]>([]); // 歷史方向數據（用於平均）
  const lastValidHeadingRef = useRef<number>(0); // 上次有效方向
  const stationaryCountRef = useRef<number>(0); // 靜止計數器
  
  // ✅ Android 修復：用於基於位置計算方向
  const previousLocationRef = useRef<Location.LocationObject | null>(null);
  
  // ✅ Android 高速時 UserMarker 跟得上：ref + 定時 flush，避免 callback 阻塞導致卡死
  const latestLocationRef = useRef<Location.LocationObject | null>(null);
  const lastLocationFlushTsRef = useRef<number>(0);
  const locationFlushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationLogCountRef = useRef(0);
  const userModelLogCountRef = useRef(0);
  
  // ✅ Android 鏡頭動畫鎖：動畫期間禁止 camera follow 覆蓋
  const isCameraAnimatingRef = useRef(false);
  const hasInitialZoomedRef = useRef(false);
  const hasGameZoomedRef = useRef(false);
  const hasIdleZoomedRef = useRef(false); // GAME → IDLE 動畫追蹤
  
  // ✅ 老 Android 設備性能優化
  const [performanceLevel, setPerformanceLevel] = useState<'high' | 'medium' | 'low'>('high');
  
  // ✅ Android 鏡頭控制：用 state 完全控制 zoom/pitch/center，避免 prop 衝突
  const [androidCameraZoom, setAndroidCameraZoom] = useState<number>(17.5);
  const [androidCameraPitch, setAndroidCameraPitch] = useState<number>(0);
  const [androidCameraCenter, setAndroidCameraCenter] = useState<[number, number] | null>(null);
  
  // 檢測設備性能等級
  useEffect(() => {
    const detectPerformanceLevel = () => {
      if (Platform.OS !== 'android') {
        setPerformanceLevel('high'); // iOS 默認高性能
        return;
      }
      
      try {
        // 檢測 Android API Level（老設備通常 < 28 = Android 9.0）
        // Android 版本對應：
        // API 26-27 = Android 8.0-8.1 (Oreo) - 2017年
        // API 28 = Android 9.0 (Pie) - 2018年
        // API 29 = Android 10 - 2019年
        // API 30+ = Android 11+ - 2020年+
        const androidVersion = Platform.Version as number;
        
        if (androidVersion < 28) {
          setPerformanceLevel('low');
        } else if (androidVersion < 30) {
          setPerformanceLevel('medium');
        } else {
          setPerformanceLevel('high');
        }
      } catch {
        setPerformanceLevel('high');
      }
    };
    
    detectPerformanceLevel();
  }, []);
  
  // ✅ 性能優化配置（根據設備等級調整）
  const performanceSettings = useMemo(() => {
    if (performanceLevel === 'low') {
      return {
        // 低端設備：極簡模式
        enable3DModel: false, // 禁用 3D 模型
        enableHeatmap: false, // 禁用熱力圖（改用簡單填充）
        maxH3Features: 100, // 限制 H3 渲染數量
        heatmapRadius: 20, // 較小的熱力圖半徑
        heatmapIntensity: 0.3, // 降低熱力圖強度
        updateThrottle: 2000, // 2 秒更新一次（降低更新頻率）
        enable3DBuildings: false, // 禁用 3D 建築
        pitch: 0, // 強制 2D 模式（無傾斜）
        zoomLevel: 16, // 降低縮放級別（減少渲染負擔）
      };
    } else if (performanceLevel === 'medium') {
      return {
        // 中端設備：平衡模式
        enable3DModel: true,
        enableHeatmap: true,
        maxH3Features: 500,
        heatmapRadius: 30,
        heatmapIntensity: 0.5,
        updateThrottle: 1000, // 1 秒更新一次
        enable3DBuildings: false,
        pitch: CAMERA_CONFIG.pitch,
        zoomLevel: CAMERA_CONFIG.zoomLevel,
      };
    } else {
      // 高端設備：全功能模式
      return {
        enable3DModel: true,
        enableHeatmap: true,
        maxH3Features: Infinity,
        heatmapRadius: 45,
        heatmapIntensity: 1.0,
        updateThrottle: 500,
        enable3DBuildings: PERFORMANCE_CONFIG.enable3DBuildings,
        pitch: CAMERA_CONFIG.pitch,
        zoomLevel: CAMERA_CONFIG.zoomLevel,
      };
    }
  }, [performanceLevel]);
  
  // ✅ Android：初始化鏡頭狀態（performanceSettings 變化時同步）
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    setAndroidCameraZoom(performanceSettings.zoomLevel);
    setAndroidCameraPitch(viewMode === '3D' ? performanceSettings.pitch : 0);
  }, [performanceSettings.zoomLevel, performanceSettings.pitch, viewMode]);

  // 實際地圖模式
  const actualMapMode = showHistoryTrail ? 'HISTORY' : mapMode;
  // ✅ Android 特定：降低速度閾值，更容易捕捉到移動
  const SPEED_THRESHOLD = Platform.OS === 'android' ? 0.3 : 0.5; // m/s，Android 降低閾值
  const MIN_HEADING_CHANGE = 15; // 度，靜止時最小方向變化閾值（小於此值視為噪音）
  const HEADING_SMOOTH_WINDOW = 5; // 平滑窗口：取最近 5 次方向的平均值
  const STATIONARY_LOCK_COUNT = 10; // 靜止鎖定：連續 10 次靜止後，完全鎖定方向
  
  // ✅ Android 修復：計算兩個位置點之間的方向
  const calculateHeadingFromPositions = useCallback((prevLoc: Location.LocationObject, currLoc: Location.LocationObject): number => {
    const deltaLon = currLoc.coords.longitude - prevLoc.coords.longitude;
    const deltaLat = currLoc.coords.latitude - prevLoc.coords.latitude;
    
    // 使用 atan2 計算方位角（弧度）
    const headingRad = Math.atan2(deltaLon, deltaLat);
    // 轉換為度數（0-360）
    const headingDeg = (headingRad * 180 / Math.PI + 360) % 360;
    
    return headingDeg;
  }, []);
  
  const currentSpeed = currentLocation?.coords?.speed ?? 0;
  const isMoving = currentSpeed !== null && currentSpeed > SPEED_THRESHOLD;
  
  // ✅ 平滑化後的方向（解決亂指向問題）
  const displayHeading = (() => {
    const rawHeading = isMoving ? movementHeading : compassHeading;
    
    // 靜止狀態處理
    if (!isMoving) {
      stationaryCountRef.current += 1;
      
      // 如果連續靜止超過閾值，完全鎖定方向（不再變化）
      if (stationaryCountRef.current > STATIONARY_LOCK_COUNT) {
        return lastValidHeadingRef.current;
      }
      
      // 檢查方向變化是否足夠大（過濾小幅抖動）
      const headingDiff = Math.abs(rawHeading - lastValidHeadingRef.current);
      const normalizedDiff = Math.min(headingDiff, 360 - headingDiff); // 處理 0°/360° 邊界
      
      if (normalizedDiff < MIN_HEADING_CHANGE) {
        return lastValidHeadingRef.current;
      }
    } else {
      // 移動時重置靜止計數器
      stationaryCountRef.current = 0;
    }
    
    // 移動平均平滑化
    previousHeadingsRef.current.push(rawHeading);
    if (previousHeadingsRef.current.length > HEADING_SMOOTH_WINDOW) {
      previousHeadingsRef.current.shift(); // 保持窗口大小
    }
    
    // 計算平均方向（處理角度環形特性）
    const smoothedHeading = averageAngles(previousHeadingsRef.current);
    lastValidHeadingRef.current = smoothedHeading;
    
    return smoothedHeading;
  })();
  
  const displayHeadingAdjusted = ((displayHeading - 90) % 360 + 360) % 360; // 箭頭符號➤基準朝右，需轉成北方為0
  
  // ✅ 輔助函數：計算角度平均值（處理 0°/360° 邊界問題）
  function averageAngles(angles: number[]): number {
    if (angles.length === 0) return 0;
    
    let sinSum = 0;
    let cosSum = 0;
    
    for (const angle of angles) {
      const rad = (angle * Math.PI) / 180;
      sinSum += Math.sin(rad);
      cosSum += Math.cos(rad);
    }
    
    const avgRad = Math.atan2(sinSum / angles.length, cosSum / angles.length);
    const avgDeg = (avgRad * 180) / Math.PI;
    
    return (avgDeg + 360) % 360; // 確保結果在 0-360 範圍內
  }

  // ========== 3D/2D 切換 + 使用者拉回中央（暴露給父層按鈕） ==========
  const toggle3D2DAndRecenter = useCallback(() => {
    const nextMode = viewMode === '2D' ? '3D' : '2D';
    setViewMode(nextMode);
    if (!currentLocation?.coords) return;
    const pitch = nextMode === '3D' ? CAMERA_CONFIG.pitch : 0;
    setIsRecenteringManually(true);
    cameraRef.current?.setCamera({
      centerCoordinate: [currentLocation.coords.longitude, currentLocation.coords.latitude],
      zoomLevel: CAMERA_CONFIG.zoomLevel,
      pitch,
      animationDuration: 400,
      animationMode: 'flyTo',
    });
    setTimeout(() => setIsRecenteringManually(false), 500);
  }, [viewMode, currentLocation]);

  useImperativeHandle(ref, () => ({ toggle3D2DAndRecenter }), [toggle3D2DAndRecenter]);

  // ========== 位置追蹤 ==========
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let headingSubscription: Location.LocationSubscription | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;

    const startTracking = async (retryCount = 0) => {
      try {
        // ✅ 首先請求位置權限
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (retryCount < 3) {
            retryTimeout = setTimeout(() => {
              startTracking(retryCount + 1);
            }, 2000);
          }
          return;
        }

        const isEnabled = await Location.hasServicesEnabledAsync();
        if (!isEnabled) {
          if (retryCount < 3) {
            retryTimeout = setTimeout(() => {
              startTracking(retryCount + 1);
            }, 2000);
          }
          return;
        }

        // 獲取初始位置（添加超時和重試）
        let initialLocation: Location.LocationObject | null = null;
        try {
          initialLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000, // 5 秒超時
          });
        } catch (getLocationError: any) {
          if (Platform.OS === 'ios' && retryCount < 3) {
            retryTimeout = setTimeout(() => {
              startTracking(retryCount + 1);
            }, 3000);
            return;
          }
          throw getLocationError;
        }

        if (!initialLocation) {
          throw new Error('無法獲取初始位置');
        }

        const userCenter: [number, number] = [initialLocation.coords.longitude, initialLocation.coords.latitude];

        // 設置初始位置（先設定，讓 Camera 組件能渲染）
        setCurrentLocation(initialLocation);
        latestLocationRef.current = initialLocation;
        lastLocationFlushTsRef.current = initialLocation.timestamp;
        
        // 設置初始運動方向（只有有效值才更新）
        if (initialLocation.coords.heading !== null && initialLocation.coords.heading !== undefined && initialLocation.coords.heading >= 0) {
          setMovementHeading(initialLocation.coords.heading);
        }

        // ========== iOS 專用：用 setCamera 同步定位到正確位置 ==========
        if (Platform.OS === 'ios') {
          setTimeout(() => {
            cameraRef.current?.setCamera({
              centerCoordinate: userCenter,
              zoomLevel: performanceSettings.zoomLevel,
              pitch: viewMode === '3D' ? performanceSettings.pitch : 0,
              heading: 0,
              animationDuration: 0, // 瞬間完成，無動畫
            });
          }, 50);
        }

        // ========== Android 專用：用 setCamera 同步定位 + state 動畫 ==========
        if (Platform.OS === 'android' && !hasInitialZoomedRef.current) {
          hasInitialZoomedRef.current = true;
          isCameraAnimatingRef.current = true; // 🔒 鎖定 camera follow
          
          const targetZoom = performanceSettings.zoomLevel;
          const targetPitch = viewMode === '3D' ? performanceSettings.pitch : 0;
          
          // 🎯 步驟1：立即用 setCamera API 同步定位到用戶位置 + zoom 2（瞬間完成，無動畫）
          setTimeout(() => {
            cameraRef.current?.setCamera({
              centerCoordinate: userCenter,
              zoomLevel: 2,
              pitch: 0,
              heading: 0,
              animationDuration: 0, // 瞬間完成
            });
            
            // 🎯 步驟2：同步設定 state（讓後續動畫能運作）
            setAndroidCameraCenter(userCenter);
            setAndroidCameraZoom(2);
            setAndroidCameraPitch(0);
          }, 50); // 等待 Camera 組件 mount
          
          // Stage 1: 大洲尺度（zoom 8）- 400ms 後（50 + 350ms 間隔，快速跳躍）
          setTimeout(() => {
            setAndroidCameraZoom(8);
          }, 400);
          
          // Stage 2: 國家尺度（zoom 13）- 950ms 後（400 + 550ms 間隔，中速）
          setTimeout(() => {
            setAndroidCameraZoom(13);
          }, 950);
          
          // Stage 3: 城市尺度（zoom 16）- 1700ms 後（950 + 750ms 間隔，慢速）
          setTimeout(() => {
            setAndroidCameraZoom(16);
          }, 1700);
          
          // Stage 4: 目標街道尺度 + 傾斜 - 2700ms 後（1700 + 1000ms 間隔，很慢）
          setTimeout(() => {
            setAndroidCameraZoom(targetZoom);
            setAndroidCameraPitch(targetPitch);
            setTimeout(() => {
              setAndroidCameraCenter(null);
              isCameraAnimatingRef.current = false;
            }, 1200);
          }, 2700);
        }

        // 位置追蹤
        // ✅ Android 高速時跟得上：更短 timeInterval（500ms）+ callback 只寫 ref，由定時 flush 更新 UI
        const watchTimeInterval = Platform.OS === 'android' ? 500 : 1000;
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: watchTimeInterval,
            distanceInterval: 0,
          },
          (location) => {
            // ✅ 先寫入 ref，不直接 setState，避免高速時 callback 阻塞導致卡死
            latestLocationRef.current = location;
            
            locationLogCountRef.current += 1;
            
            // ✅ Android 修復：優先使用位置計算方向
            if (location.coords.speed !== null && location.coords.speed > SPEED_THRESHOLD) {
              let calculatedHeading: number | null = null;
              if (Platform.OS === 'android' && previousLocationRef.current) {
                const distanceLat = Math.abs(location.coords.latitude - previousLocationRef.current.coords.latitude);
                const distanceLon = Math.abs(location.coords.longitude - previousLocationRef.current.coords.longitude);
                const hasMovedEnough = distanceLat > 0.000001 || distanceLon > 0.000001;
                if (hasMovedEnough) {
                  calculatedHeading = calculateHeadingFromPositions(previousLocationRef.current, location);
                  setMovementHeading(calculatedHeading);
                }
              }
              if (!calculatedHeading && location.coords.heading != null && location.coords.heading >= 0) {
                setMovementHeading(location.coords.heading);
              }
            }
            previousLocationRef.current = location;
            
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
        
        // ✅ 定時把 ref 的座標 flush 到 state（約 10 次/秒），UserMarker 才跟得上且不卡死
        const FLUSH_MS = Platform.OS === 'android' ? 80 : 100;
        locationFlushIntervalRef.current = setInterval(() => {
          const latest = latestLocationRef.current;
          if (!latest || latest.timestamp === lastLocationFlushTsRef.current) return;
          lastLocationFlushTsRef.current = latest.timestamp;
          setCurrentLocation(latest);
        }, FLUSH_MS);

        // 羅盤方向追蹤（靜止時使用）
        headingSubscription = await Location.watchHeadingAsync((headingData) => {
          const rawHeading = headingData.trueHeading ?? headingData.magHeading ?? 0;
          if (rawHeading >= 0) {
            setCompassHeading(rawHeading);
          }
        });

      } catch (error: any) {
        const errorCode = error?.code;
        const errorMessage = error?.message || '';
        const isLocationUnavailable = 
          errorCode === 'ERR_LOCATION_UNAVAILABLE' || 
          errorCode === 0 || 
          error?.domain === 'kCLErrorDomain' ||
          errorMessage.includes('Cannot obtain current location') ||
          errorMessage.includes('location unavailable');
        void isLocationUnavailable;
        
        if (retryCount < 3) {
          retryTimeout = setTimeout(() => {
            startTracking(retryCount + 1);
          }, 3000);
        }
      }
    };

    startTracking();

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (locationFlushIntervalRef.current) {
        clearInterval(locationFlushIntervalRef.current);
        locationFlushIntervalRef.current = null;
      }
      if (subscription) {
        subscription.remove();
      }
      if (headingSubscription) {
        headingSubscription.remove();
      }
    };
  }, [isCollecting]);

  // ========== Android 專用：IDLE → GAME (isCollecting) 時 zoom in 動畫（地球→街道，漸進式減速）==========
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!isCollecting) {
      hasGameZoomedRef.current = false;
      return;
    }
    if (hasGameZoomedRef.current) return;
    if (!currentLocation?.coords) return;
    
    hasGameZoomedRef.current = true;
    isCameraAnimatingRef.current = true; // 🔒 鎖定 camera follow
    
    const targetZoom = performanceSettings.zoomLevel;
    const targetPitch = viewMode === '3D' ? performanceSettings.pitch : 0;
    const userCenter: [number, number] = [currentLocation.coords.longitude, currentLocation.coords.latitude];
    
    setTimeout(() => {
      cameraRef.current?.setCamera({
        centerCoordinate: userCenter,
        zoomLevel: 2,
        pitch: 0,
        heading: 0,
        animationDuration: 0,
      });
      
      // 🎯 步驟2：同步設定 state（讓後續動畫能運作）
      setAndroidCameraCenter(userCenter);
      setAndroidCameraZoom(2);
      setAndroidCameraPitch(0);
    }, 50); // 等待 Camera 組件 mount（跟 App 啟動一樣）
    
    setTimeout(() => {
      setAndroidCameraZoom(8);
    }, 400);
    setTimeout(() => {
      setAndroidCameraZoom(13);
    }, 950);
    setTimeout(() => {
      setAndroidCameraZoom(16);
    }, 1700);
    setTimeout(() => {
      setAndroidCameraZoom(targetZoom);
      setAndroidCameraPitch(targetPitch);
      setTimeout(() => {
        setAndroidCameraCenter(null);
        isCameraAnimatingRef.current = false;
      }, 1200);
    }, 2700);
  }, [isCollecting, currentLocation?.coords?.latitude, currentLocation?.coords?.longitude, performanceSettings.zoomLevel, viewMode]);

  // ========== Android 專用：GAME → IDLE (isCollecting 結束) 時 zoom in 動畫（地球→街道，漸進式減速）==========
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    
    // 當採集中時，重置標記
    if (isCollecting) {
      hasIdleZoomedRef.current = false;
      return;
    }
    
    // 如果已經執行過或沒有位置，跳過
    if (hasIdleZoomedRef.current) return;
    if (!currentLocation?.coords) return;
    
    hasIdleZoomedRef.current = true;
    isCameraAnimatingRef.current = true; // 🔒 鎖定 camera follow
    
    const targetZoom = performanceSettings.zoomLevel;
    const targetPitch = viewMode === '3D' ? performanceSettings.pitch : 0;
    const userCenter: [number, number] = [currentLocation.coords.longitude, currentLocation.coords.latitude];
    
    setTimeout(() => {
      cameraRef.current?.setCamera({
        centerCoordinate: userCenter,
        zoomLevel: 2,
        pitch: 0,
        heading: 0,
        animationDuration: 0,
      });
      setAndroidCameraCenter(userCenter);
      setAndroidCameraZoom(2);
      setAndroidCameraPitch(0);
    }, 50);
    setTimeout(() => {
      setAndroidCameraZoom(8);
    }, 400);
    setTimeout(() => {
      setAndroidCameraZoom(13);
    }, 950);
    setTimeout(() => {
      setAndroidCameraZoom(16);
    }, 1700);
    setTimeout(() => {
      setAndroidCameraZoom(targetZoom);
      setAndroidCameraPitch(targetPitch);
      setTimeout(() => {
        setAndroidCameraCenter(null);
        isCameraAnimatingRef.current = false;
      }, 1200);
    }, 2700);
  }, [isCollecting, currentLocation?.coords?.latitude, currentLocation?.coords?.longitude, performanceSettings.zoomLevel, viewMode]);

  // ========== 游標跟隨：當 currentLocation 更新時強制 Camera 跟隨（expo-location 驅動） ==========
  // followUserLocation 跟隨的是 Mapbox 原生定位，模擬器 GPX 由 expo-location 提供，故需手動驅動 Camera
  // Android：改用 state 同步 zoom/pitch，避免與動畫衝突
  const lastCameraCenterRef = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (isCameraAnimatingRef.current) return; // 🔒 動畫期間跳過，避免覆蓋動畫
    if (actualMapMode !== 'GAME' || isRecenteringManually || !currentLocation?.coords) return;
    
    const lon = currentLocation.coords.longitude;
    const lat = currentLocation.coords.latitude;
    const center: [number, number] = [lon, lat];
    const last = lastCameraCenterRef.current;
    if (last && last[0] === center[0] && last[1] === center[1]) return;
    lastCameraCenterRef.current = center;
    
    if (Platform.OS === 'android') {
      // Android：用 state 同步鏡頭設定（避免 setCamera 與 prop 衝突）
      setAndroidCameraZoom(performanceSettings.zoomLevel);
      setAndroidCameraPitch(viewMode === '3D' ? performanceSettings.pitch : 0);
    } else {
      // iOS：用 setCamera（維持原邏輯，完美不動）
      cameraRef.current?.setCamera({
        centerCoordinate: center,
        zoomLevel: performanceSettings.zoomLevel,
        pitch: viewMode === '3D' ? performanceSettings.pitch : 0,
        heading: 0,
        animationDuration: CAMERA_CONFIG.animationDuration,
        animationMode: 'easeTo',
      });
    }
  }, [currentLocation?.coords?.latitude, currentLocation?.coords?.longitude, actualMapMode, isRecenteringManually, viewMode, performanceSettings.zoomLevel, performanceSettings.pitch, androidCameraZoom, androidCameraPitch]);

  // ========== 歷史會話載入（僅用於歷史軌跡模式） ==========
  // ⚠️ 注意：歷史 H3 渲染已改用 exploredHexes，不再依賴 historySessions
  // historySessions 僅用於 HISTORY 模式（查看歷史軌跡）
  useEffect(() => {
    const loadHistorySessions = async () => {
      const allSessions = gpsHistoryService.getAllSessions();
      const endedSessions = allSessions.filter(s => s.endTime);
      const sessions = endedSessions.slice(0, 20);
      setHistorySessions(sessions);
    };

    loadHistorySessions();

    // 當採集結束時，重新載入一次（用於更新歷史軌跡列表）
    if (!isCollecting) {
      const timer = setTimeout(() => {
        loadHistorySessions();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isCollecting]); // ✅ 簡化依賴項

  // ========== 倒數動畫：採集開始/結束時的處理 ==========
  useEffect(() => {
    if (!isCollecting) {
      // 採集結束，重置倒數狀態，切換回導航模式
      setCountdown(null);
      setCountdownComplete(false);
      countdownOpacity.setValue(0);
      countdownScale.setValue(1);
      
      setShowLabels(true);
      // ⚠️ showLabels 改變會觸發 MapView key 變化，進而重新掛載，確保圖層順序正確
      return;
    }

    // ✅ 採集開始：先隱藏 3D 推車，等 321 完成後再顯示
    setCountdownComplete(false);
    // 切換為探索模式（導航地圖 → 探索地圖）
    setShowLabels(false);
    
    // 立即開始倒數動畫（3 -> 2 -> 1 -> 結束）
    let currentCount = 3;
    setCountdown(currentCount);

    // 初始動畫
    countdownOpacity.setValue(0);
    countdownScale.setValue(0.5);
    Animated.parallel([
      Animated.timing(countdownOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.spring(countdownScale, {
          toValue: 1.2,
          tension: 50,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.spring(countdownScale, {
          toValue: 1,
          tension: 50,
          friction: 3,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 第一次淡出
    setTimeout(() => {
      Animated.timing(countdownOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, 600);

    const countdownInterval = setInterval(() => {
      currentCount -= 1;
      
      if (currentCount <= 0) {
        // 倒數結束：先標記完成再回調，如此 3D 推車會在 321 之後才顯示
        clearInterval(countdownInterval);
        setCountdown(null);
        setCountdownComplete(true);
        countdownOpacity.setValue(0);
        countdownScale.setValue(1);
        onCountdownComplete?.();
        return;
      }

      // 更新倒數數字
      setCountdown(currentCount);

      // 重置動畫值
      countdownOpacity.setValue(0);
      countdownScale.setValue(0.5);

      // 播放動畫
      Animated.parallel([
        Animated.timing(countdownOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.spring(countdownScale, {
            toValue: 1.2,
            tension: 50,
            friction: 3,
            useNativeDriver: true,
          }),
          Animated.spring(countdownScale, {
            toValue: 1,
            tension: 50,
            friction: 3,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // 1 秒後淡出
      setTimeout(() => {
        Animated.timing(countdownOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }, 600);
    }, 1000); // 每 1 秒更新一次

    return () => {
      clearInterval(countdownInterval);
    };
  }, [isCollecting, countdownOpacity, countdownScale]);

  // ========== 數據一致性驗證與修復 ==========
  // ✅ 新版：驗證並自動修復 exploredHexes 的一致性
  // ✅ 增強：過濾損壞的會話（閃退導致的不完整數據）
  const validateAndRepairDataConsistency = useCallback(() => {
    const allHistorySessions = gpsHistoryService.getAllSessions()
      .filter(s => s.endTime) // 只要已結束的會話
      .filter(s => s.points && s.points.length >= 10); // ✅ 至少 10 個點才算有效
    
    // ✅ 進一步驗證：檢查點之間的距離，過濾掉損壞的會話
    const validSessions = allHistorySessions.filter(session => {
      if (!session.points || session.points.length < 2) return false;
      
      // 計算最大跳躍距離
      let maxJump = 0;
      for (let i = 1; i < session.points.length; i++) {
        const prev = session.points[i - 1];
        const curr = session.points[i];
        const dist = calculateDistanceMeters(
          prev.latitude,
          prev.longitude,
          curr.latitude,
          curr.longitude
        );
        maxJump = Math.max(maxJump, dist);
      }
      
      // ✅ 如果任意兩個連續點之間距離超過 200m，視為損壞的會話
      if (maxJump > 200) {
        return false; // 丟棄這個會話
      }
      
      return true;
    });
    
    
    // 從有效會話提取所有 H3
    const sessionH3s = new Set<string>();
    validSessions.forEach(session => {
      if (session.points) {
        session.points.forEach(point => {
          try {
            const h3Index = latLngToH3(point.latitude, point.longitude, H3_RESOLUTION);
            sessionH3s.add(h3Index);
          } catch (error) {
            // 忽略錯誤
          }
        });
      }
    });
    
    // 檢查 exploredHexes 和 sessionH3s 的一致性
    const missingInExplored = Array.from(sessionH3s).filter(h3 => !exploredHexes.has(h3));
    
    
    // ✅ 自動修復：如果 historySessions 有 H3 但 exploredHexes 沒有，自動補上
    if (missingInExplored.length > 0) {
      
      // 合併缺失的 H3 到 exploredHexes
      const repairedHexes = new Set(exploredHexes);
      missingInExplored.forEach(h3 => repairedHexes.add(h3));
      
      // 更新 sessionStore
      useSessionStore.setState({ exploredHexes: repairedHexes });
      
    } else {
    }
  }, [exploredHexes]);

  // ========== 診斷功能：檢查會話數據完整性 ==========
  // ✅ 用於開發模式下排查數據損壞問題
  const diagnoseSessions = useCallback(() => {
    const allSessions = gpsHistoryService.getAllSessions();
    
    
    let suspiciousCount = 0;
    
    allSessions.forEach((session, index) => {
      const hasEnd = !!session.endTime;
      const pointCount = session.points?.length || 0;
      
      // 計算平均點間距
      let avgDistance = 0;
      let maxJump = 0;
      if (pointCount > 1) {
        let totalDist = 0;
        for (let i = 1; i < session.points.length; i++) {
          const prev = session.points[i - 1];
          const curr = session.points[i];
          const dist = calculateDistanceMeters(
            prev.latitude,
            prev.longitude,
            curr.latitude,
            curr.longitude
          );
          totalDist += dist;
          maxJump = Math.max(maxJump, dist);
        }
        avgDistance = totalDist / (pointCount - 1);
      }
      
      const isSuspicious = !hasEnd || pointCount === 0 || pointCount < 10 || maxJump > 200;
      
      if (isSuspicious) {
        suspiciousCount++;
      }
      
    });
    
  }, []);

  // ⭐ 開發模式：暴露診斷函數到全局（方便調試）
  useEffect(() => {
    if (__DEV__) {
      (global as any).diagnoseSessions = diagnoseSessions;
    }
  }, [diagnoseSessions]);

  // ✅ 在卸貨後調用驗證與修復
  useEffect(() => {
    if (!isCollecting) {
      // 等待 3 秒，確保所有異步操作完成
      const timer = setTimeout(() => {
        validateAndRepairDataConsistency();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isCollecting, validateAndRepairDataConsistency]);

  // 更新選中的會話
  useEffect(() => {
    if (showHistoryTrail && selectedSessionId) {
      const session = historySessions.find(s => s.sessionId === selectedSessionId);
      setSelectedSession(session || null);
    }
  }, [showHistoryTrail, selectedSessionId, historySessions]);

  // ========== 3D 模型 URL ==========
  
  // ✅ 你的 3D 模型 URL（固定大小：4 倍，逆時針旋轉 90 度）
  const modelUrl = 'https://github.com/stu5737/solefood/raw/refs/heads/main/assets/models/user-avator.glb';
  
  // 🧪 測試模型（Duck.glb）- 備用，用於驗證功能
  // const modelUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb';
  
  // ========== 3D 模型準備 ==========
  // ✅ 模型已簡化並上傳到 GitHub
  useEffect(() => {
    // 延遲啟用，確保地圖完全加載
    const timer = setTimeout(() => {
      setIs3DModelReady(true);
    }, 1500);
    
    return () => clearTimeout(timer);
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

  // ⚠️ 已移除：getDistanceMeters（已移至 src/utils/h3Renderer.ts）
  // ⚠️ 已移除：calculateSessionH3GeoJson（舊版基於 GPS 點的渲染邏輯）
  // 現在使用 src/utils/h3Renderer.ts 的 generateH3GeoJson（基於 exploredHexes）

  // ========== 歷史 H3 GeoJSON（新版：基於 exploredHexes） ==========
  // ✅ 修復：使用 exploredHexes 作為唯一數據源
  // ✅ 不再依賴 historySessions，避免數據不一致
  // ✅ 性能優化：老設備限制渲染數量
  const historyH3GeoJson = useMemo(() => {
    if (actualMapMode !== 'GAME') return null;
    
    // ✅ 性能優化：限制 H3 數量（老設備）
    let hexesToRender = Array.from(exploredHexes);
    if (performanceSettings.maxH3Features < Infinity && hexesToRender.length > performanceSettings.maxH3Features) {
      // 隨機採樣，保留最近的 H3（優先保留）
      const sortedHexes = hexesToRender.slice(-performanceSettings.maxH3Features);
      hexesToRender = sortedHexes;
    }
    
    const limitedHexes = new Set(hexesToRender);
    
    // 獲取當前主題配置
    const theme = timeTheme === 'morning' ? MORNING_THEME : NIGHT_THEME;
    
    // 使用獨立的 H3 渲染模塊
    const result = generateH3GeoJson(limitedHexes, {
      maxOpacity: theme.historyH3.fill.opacityRange.max,
      minOpacity: theme.historyH3.fill.opacityRange.min,
      nonLinear: true, // 使用非線性漸變（平方）
    });
    
    // ✅ Debug: 確認 GeoJSON 已生成
    if (result) {
      const stats = getH3GeoJsonStats(result);
    } else {
    }
    
    return result;
  }, [actualMapMode, exploredHexes, timeTheme, performanceSettings, performanceLevel]);

  // 當前會話 H3 GeoJSON
  const currentSessionH3GeoJson = useMemo(() => {
    console.log('[🎨 MapboxMap] 重新計算 currentSessionH3GeoJson', {
      isCollecting,
      currentSessionNewHexesSize: currentSessionNewHexes.size,
      hexes: Array.from(currentSessionNewHexes).slice(0, 5), // 只顯示前 5 個
    });

    if (!isCollecting || currentSessionNewHexes.size === 0) {
      console.log('[⚠️ MapboxMap] currentSessionH3GeoJson 返回 null', {
        isCollecting,
        size: currentSessionNewHexes.size,
      });
      return null;
    }

    const hexArray = Array.from(currentSessionNewHexes);
    const features: any[] = [];

    hexArray.forEach(h3Index => {
      try {
        const coord = h3ToLatLng(h3Index);
        if (!coord) {
          console.warn('[⚠️ MapboxMap] h3ToLatLng 返回 null', { h3Index });
          return;
        }

        const { latitude: lat, longitude: lng } = coord;
        // ✅ 增加邊數（從 8 改為 16），讓圓形更圓滑
        const circleCoords = getLowPolyCircle(lat, lng, 20, 16);

        features.push({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [circleCoords],
          },
        });
      } catch (error) {
        console.error('[❌ MapboxMap] 處理 H3 時出錯', { h3Index, error });
      }
    });

    if (features.length === 0) {
      console.warn('[⚠️ MapboxMap] features 為空，返回 null');
      return null;
    }

    const result = {
      type: 'FeatureCollection',
      features,
    };
    
    console.log('[✅ MapboxMap] currentSessionH3GeoJson 生成成功', {
      featuresCount: features.length,
    });

    return result;
  }, [isCollecting, currentSessionNewHexes, getLowPolyCircle]);

  // GPS Trail GeoJSON - 即時更新的路徑軌跡（延遲兩個點，避免覆蓋游標）
  const gpsTrailGeoJson = useMemo(() => {
    if (!isCollecting || !gpsHistoryService.isSessionActive()) {
      return null;
    }

    const currentSessionPoints = gpsHistoryService.getCurrentSessionTrail();
    if (!currentSessionPoints || currentSessionPoints.length < 4) {
      return null;
    }

    // ✅ 關鍵：去掉最後兩個點（當前位置和前一個點），避免覆蓋游標
    // 軌跡 = 你「走過的路」，游標 = 你「現在的位置」
    const trailPoints = currentSessionPoints.slice(0, -2);
    
    if (trailPoints.length < 2) {
      return null; // 至少需要 2 個點才能畫線
    }

    const coordinates = trailPoints.map(point => [point.longitude, point.latitude]);

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
    if (actualMapMode !== 'GAME') {
      return null;
    }
    if (!is3DModelReady) {
      return null;
    }

    // 🧪 測試模式：如果沒有 GPS 位置，使用固定測試位置（舊金山）
    const testLocation = {
      longitude: -122.4194,
      latitude: 37.7749,
    };

    const location = currentLocation 
      ? {
          longitude: currentLocation.coords.longitude,
          latitude: currentLocation.coords.latitude,
        }
      : testLocation;

    if (!currentLocation) {
    }

    const geoJson = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            location.longitude,
            location.latitude,
            0, // 高度（米）
          ],
        },
        properties: {
          // 旋轉角度（根據運動方向，或使用默認值）
          rotation: currentLocation ? displayHeadingAdjusted : 0,
          // 速度（用於動態縮放）
          speed: currentLocation ? currentSpeed : 0,
        },
      }],
    };
    
    if (__DEV__) {
      const n = (userModelLogCountRef.current += 1);
      if (n % 10 === 1) {
      }
    }
    return geoJson;
  }, [currentLocation, actualMapMode, is3DModelReady, displayHeadingAdjusted, currentSpeed]);

  // ========== 計算 modelRotation 的固定值 ==========
  const modelRotationValue = useMemo(() => {
    // 根據平台應用不同的偏移量（iOS 和 Android 傳感器坐標系統不同）
    // iOS: 推車正確，保持 -180
    // Android: 使用計算方向後，調整為 -180（手推車模型逆時鐘旋轉 90 度以指向 12 點鐘方向）
    const platformOffset = -180; // iOS 和 Android 統一使用 -180
    const yaw = ((displayHeading + platformOffset) + 360) % 360;
    return [0, 0, yaw]; // [pitch, roll, yaw]
  }, [displayHeading]);

  // ========== 渲染 ==========
  
  const mapStyle = height ? { height } : styles.map;

  // 📊 追蹤 MapView key 變化（用於調試圖層順序問題）
  const mapViewKey = `map-${timeTheme}-${showLabels ? 'labels' : 'no-labels'}-refresh-${styleRefreshKey}`;
  const prevMapViewKeyRef = useRef<string>(mapViewKey);
  
  useEffect(() => {
    if (prevMapViewKeyRef.current !== mapViewKey) {
      prevMapViewKeyRef.current = mapViewKey;
    }
  }, [mapViewKey, currentSessionNewHexes.size, currentSessionH3GeoJson, userModelGeoJson, is3DModelReady, isCollecting, timeTheme, showLabels, styleRefreshKey]);

  return (
    <View style={[styles.container, mapStyle]}>
      <Mapbox.MapView
        key={mapViewKey}
        ref={mapRef}
        style={styles.map}
        // ✅ 使用主題樣式（早晨/夜晚），根據 showLabels 狀態切換
        // ⚠️ 注意：Mapbox Studio 更新樣式後，需要：
        // 1. 確認樣式已發布
        // 2. 清除緩存：rm -rf .expo && rm -rf node_modules/.cache
        // 3. 重啟應用：npx expo start --clear
        // 4. 等待 1-2 分鐘讓 Mapbox 同步
        styleURL={
          timeTheme === 'morning' 
            ? (showLabels ? MORNING_THEME.mapStyleWithLabels : MORNING_THEME.mapStyle)
            : (showLabels ? NIGHT_THEME.mapStyleWithLabels : NIGHT_THEME.mapStyle)
        }
        logoEnabled={PERFORMANCE_CONFIG.logoEnabled}
        attributionEnabled={PERFORMANCE_CONFIG.attributionEnabled}
        compassEnabled={PERFORMANCE_CONFIG.compassEnabled}
        zoomEnabled={PERFORMANCE_CONFIG.zoomEnabled}
        scrollEnabled={PERFORMANCE_CONFIG.scrollEnabled}
        pitchEnabled={PERFORMANCE_CONFIG.pitchEnabled}
        rotateEnabled={PERFORMANCE_CONFIG.rotateEnabled}
        scaleBarEnabled={false}
        onPress={(feature) => {
          const props = feature?.properties as { id?: string } | undefined;
          const isOurRestaurant = props?.id && restaurantPoints.some((r) => r.id === props.id);
          if (!isOurRestaurant && onMapPress) onMapPress();
        }}
      >
        {/* ✅ 關鍵：先註冊模型（必須在所有圖層之前）+ 性能優化 */}
        {is3DModelReady && performanceSettings.enable3DModel && (
          <Mapbox.Models
            models={{
              'user-avatar-model': modelUrl, // ✅ 殺手三修復：直接使用 https:// URL，不用本地文件
            }}
            onPress={(e) => {
            }}
            onError={(error) => {
            }}
          />
        )}

        {/* 🎮 Pokémon GO 風格攝影機 - 支援 2D/3D 切換 + 性能優化 */}
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={Platform.OS === 'android' ? androidCameraZoom : performanceSettings.zoomLevel}
          pitch={Platform.OS === 'android' ? androidCameraPitch : (viewMode === '3D' ? performanceSettings.pitch : 0)}
          heading={0} // ✅ 北方朝上，不跟隨設備旋轉（三角形會自己根據運動方向旋轉）
          followUserLocation={actualMapMode === 'GAME' && !isRecenteringManually && !isCameraAnimatingRef.current}
          followUserMode={CAMERA_CONFIG.followUserMode} // 兩種模式都使用 'course' 模式
          animationDuration={Platform.OS === 'android' ? 900 : CAMERA_CONFIG.animationDuration}
          centerCoordinate={
            // Android：動畫期間使用鎖定的中心點（避免飄移）
            Platform.OS === 'android' && androidCameraCenter
              ? androidCameraCenter
              : actualMapMode === 'HISTORY' && selectedSession && selectedSession.points.length > 0
              ? [selectedSession.points[0].longitude, selectedSession.points[0].latitude]
              : currentLocation && currentLocation.coords
              ? [currentLocation.coords.longitude, currentLocation.coords.latitude]
              : undefined
          }
        />

        {/* ✅ 餐廳圖標：用 images 傳入 require()，iOS/Android 皆可用（nativeAssetImages 在 Android 需原生 drawable） */}
        <Mapbox.Images
          images={{ seven_eleven_icon: SEVEN_ELEVEN_ICON }}
          onImageMissing={(imageKey) => {
          }}
        />

        {/* 歷史 H3 Hexes - 迷霧效果（支援早晚主題切換）+ 性能優化 */}
        {historyH3GeoJson && (
          <Mapbox.ShapeSource id="history-h3" shape={historyH3GeoJson}>
            {performanceSettings.enableHeatmap ? (
              // ✅ 高性能設備：使用熱力圖（視覺效果好）
              <Mapbox.HeatmapLayer
                id="history-h3-heatmap"
                style={{
                  // ✅ 根據時間主題動態切換顏色
                  heatmapColor: timeTheme === 'morning' 
                    ? MORNING_THEME.historyH3.heatmapColor 
                    : NIGHT_THEME.historyH3.heatmapColor,
                  // ✅ 根據性能等級調整半徑（老設備使用更小的半徑）
                  heatmapRadius: [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    6, performanceSettings.heatmapRadius * 0.2,
                    8, performanceSettings.heatmapRadius * 0.3,
                    10, performanceSettings.heatmapRadius * 0.5,
                    13, performanceSettings.heatmapRadius * 0.7,
                    15, performanceSettings.heatmapRadius * 0.85,
                    18, performanceSettings.heatmapRadius
                  ],
                  // ✅ 權重：根據 weight 屬性調整每個點的影響力
                  heatmapWeight: [
                    'interpolate',
                    ['linear'],
                    ['get', 'weight'],
                    0, 0,
                    1, 1
                  ],
                  // ✅ 根據性能等級調整強度（老設備降低強度）
                  heatmapIntensity: [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    6, performanceSettings.heatmapIntensity * 0.2,
                    8, performanceSettings.heatmapIntensity * 0.3,
                    10, performanceSettings.heatmapIntensity * 0.5,
                    13, performanceSettings.heatmapIntensity * 0.65,
                    15, performanceSettings.heatmapIntensity * 0.8,
                    18, performanceSettings.heatmapIntensity
                  ],
                  heatmapOpacity: 1,
                }}
              />
            ) : (
              // ✅ 低端設備：使用簡單填充層（性能更好）
              <Mapbox.FillLayer
                id="history-h3-fill"
                style={{
                  fillColor: timeTheme === 'morning' 
                    ? MORNING_THEME.historyH3.fill.color 
                    : NIGHT_THEME.historyH3.fill.color,
                  fillOpacity: timeTheme === 'morning' 
                    ? MORNING_THEME.historyH3.fill.opacityRange.max 
                    : NIGHT_THEME.historyH3.fill.opacityRange.max,
                }}
              />
            )}
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
        {/* ⚠️ 關鍵：採集開始時，即使 currentSessionH3GeoJson 為 null，也要渲染圖層（內容為空），確保圖層註冊順序正確 */}
        {(() => {
          const shouldRender = isCollecting; // ✅ 採集中時總是渲染，即使內容為空
          const hasData = currentSessionH3GeoJson !== null;
          
          // ✅ 採集中時總是渲染圖層（即使內容為空），確保圖層註冊順序一致
          // ⚠️ 當 currentSessionH3GeoJson 為 null 時，使用空的 FeatureCollection 確保圖層始終存在
          const emptyGeoJson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
          const shapeData = hasData ? currentSessionH3GeoJson! : emptyGeoJson;
          
          // ⭐ Android 修復：添加動態 key 強制重新渲染（每次 currentSessionNewHexes 變化時）
          const shapeSourceKey = Platform.OS === 'android' 
            ? `current-h3-${currentSessionNewHexes.size}`
            : 'current-h3';
          
          return shouldRender ? (
            <Mapbox.ShapeSource 
              key={shapeSourceKey}
              id="current-h3" 
              shape={shapeData}
            >
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
                  lineOpacity: timeTheme === 'morning' 
                    ? MORNING_THEME.currentH3.stroke.opacity 
                    : MAP_THEME.currentH3.stroke.opacity,
                  lineDasharray: timeTheme === 'morning' 
                    ? MORNING_THEME.currentH3.stroke.dasharray 
                    : MAP_THEME.currentH3.stroke.dasharray,
                  lineSortKey: 5, // ✅ 排序值 5，確保在 user marker (99999) 下方
                }}
              />
            </Mapbox.ShapeSource>
          ) : null;
        })()}
        {/* 用戶位置標記（白色箭頭）- IDLE 或 321 倒數中顯示；倒數完成後改顯示 3D 推車 */}
        {(!isCollecting || !countdownComplete) && (() => {
          const hasLocation = !!(currentLocation && currentLocation.coords);
          const shouldShow = actualMapMode === 'GAME' && hasLocation;
          const coords: [number, number] = hasLocation
            ? [currentLocation!.coords.longitude, currentLocation!.coords.latitude]
            : [0, 0];

          return (
            <Mapbox.ShapeSource
              key="user-location-source"
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
                textOpacity: shouldShow ? 0.7 : 0,
                textPitchAlignment: 'map',
                textRotationAlignment: 'map',
                textRotate: displayHeading - 90, // 箭頭符號➤朝右，減90度讓它朝上（北），iOS/Android 統一
                textAllowOverlap: true,
                textIgnorePlacement: true,
                symbolZOrder: 'viewport-y',
                symbolSortKey: 99999, // ✅ 極高排序值，確保在所有圖層上方
              }}
            />
          </Mapbox.ShapeSource>
          );
        })()}

        {/* 🎮 用戶 3D 推車（GLB）- 321 倒數完成後才顯示，避免 IDLE→遊戲時先閃推車再倒數 */}
        {userModelGeoJson && is3DModelReady && isCollecting && countdownComplete && performanceSettings.enable3DModel && (
          <Mapbox.ShapeSource 
            key="user-3d-model-source"
            id="user-3d-model-source" 
            shape={userModelGeoJson}
            onPress={(e) => {
            }}
          >
            <Mapbox.ModelLayer
              id="user-3d-model-layer"
              style={{
                // ✅ 使用註冊的模型名稱（對應上方 Models 中的 key）
                modelId: 'user-avatar-model',
                // ✅ 旋轉（根據運動方向 + 逆時針 90 度）
                modelRotation: modelRotationValue,
                // ✅ 縮放（固定大小：4 倍）
                // ⚠️ 注意：@rnmapbox/maps v10.2.10 不支持動態 modelScale，因此使用固定值
                modelScale: MODEL_SCALE, // ✅ 固定 4 倍大小
                
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

        {/* 🍽️ 餐廳標註：聚合 (Clustering) + LOD，資料來自 useRestaurantStore（API 載入） */}
        {actualMapMode === 'GAME' && restaurantPoints.length > 0 && (() => {
          const foodDropGeoJson: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: restaurantPoints.map(({ id, coord, title }) => ({
              type: 'Feature' as const,
              properties: {
                id,
                title, // 只顯示店名（如 7-ELEVEN），不帶地點前綴
              },
              geometry: { type: 'Point' as const, coordinates: coord },
            })),
          };
          const handleShapePress = (event: { features: GeoJSON.Feature[] }) => {
            if (!isCollecting) return;
            const features = event.features ?? [];
            const restaurants: RestaurantPoint[] = [];
            for (const f of features) {
              const props = f?.properties as { id?: string; point_count?: number } | undefined;
              if (!props?.point_count && props?.id) {
                const r = restaurantPoints.find((x) => x.id === props.id);
                if (r) restaurants.push(r);
              }
            }
            if (restaurants.length === 0) return;
            if (restaurants.length >= 2 && onRestaurantPressMultiple) {
              onRestaurantPressMultiple(restaurants);
            } else if (restaurants.length === 1 && onRestaurantPress) {
              onRestaurantPress(restaurants[0]);
            }
          };
          // Mapbox step: ['step', input, default, stop1, out1, stop2, out2] → count < 10 藍, 10–50 黃, >50 紅
          const clusterCircleColor = [
            'step',
            ['get', 'point_count'],
            FOOD_DROP_CLUSTER.circleColorSteps[0][1],
            FOOD_DROP_CLUSTER.circleColorSteps[1][0],
            FOOD_DROP_CLUSTER.circleColorSteps[1][1],
            FOOD_DROP_CLUSTER.circleColorSteps[2][0],
            FOOD_DROP_CLUSTER.circleColorSteps[2][1],
          ] as const;
          return (
            <>
              <Mapbox.ShapeSource
                id="sample-food-drops"
                shape={foodDropGeoJson}
                cluster={FOOD_DROP_CLUSTER.cluster}
                clusterRadius={FOOD_DROP_CLUSTER.clusterRadius}
                clusterMaxZoomLevel={FOOD_DROP_CLUSTER.clusterMaxZoomLevel}
                onPress={handleShapePress}
                hitbox={{ width: 28, height: 28 }}
              >
              {/* 1. 聚合圓圈層：Zoom 0–14 顯示，依數量分色 (藍→黃→紅) */}
              <Mapbox.CircleLayer
                id="food-drops-cluster-circle"
                filter={['has', 'point_count']}
                style={{
                  circleColor: clusterCircleColor,
                  circleRadius: FOOD_DROP_CLUSTER.circleRadius,
                  circleStrokeWidth: FOOD_DROP_CLUSTER.circleStrokeWidth,
                  circleStrokeColor: FOOD_DROP_CLUSTER.circleStrokeColor,
                }}
              />
              {/* 2. 聚合數字層：圓圈內顯示數量 */}
              <Mapbox.SymbolLayer
                id="food-drops-cluster-count"
                filter={['has', 'point_count']}
                style={{
                  textField: ['get', 'point_count_abbreviated'],
                  textSize: FOOD_DROP_CLUSTER.countTextSize,
                  textColor: FOOD_DROP_CLUSTER.countTextColor,
                  textAllowOverlap: true,
                  textIgnorePlacement: true,
                  symbolSortKey: FOOD_DROP_CLUSTER.symbolSortKey,
                }}
              />
              {/* 3. 未聚合層：Zoom 15 僅圖標、Zoom 16+ 圖標+店名，圖標與文字垂直對齊（主流地圖邏輯） */}
              <Mapbox.SymbolLayer
                id="sample-food-drops-symbol"
                filter={['!', ['has', 'point_count']]}
                minZoomLevel={FOOD_DROP_CLUSTER.unclusteredMinZoom}
                style={{
                  iconImage: 'seven_eleven_icon',
                  iconSize: 0.36,
                  iconAnchor: 'center',
                  iconAllowOverlap: true,
                  iconIgnorePlacement: true,
                  textField: ['step', ['zoom'], '', FOOD_DROP_CLUSTER.poiTextMinZoom, ['get', 'title']],
                  textSize: FOOD_DROP_ICON.textSize,
                  textColor: FOOD_DROP_ICON.textColor,
                  textHaloColor: FOOD_DROP_ICON.textHaloColor,
                  textHaloWidth: FOOD_DROP_ICON.textHaloWidth,
                  textAnchor: 'left',
                  textOffset: [1.55, 0],
                  textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
                  textMaxWidth: 10,
                  textAllowOverlap: true,
                  textIgnorePlacement: true,
                  symbolSortKey: FOOD_DROP_ICON.symbolSortKey,
                }}
              />
            </Mapbox.ShapeSource>
            </>
          );
        })()}

        {/* 選中餐廳時：tooltip 浮在圖標上方，錨點在圖標下方一點，與圖標保持間隔不壓住 */}
        {selectedRestaurantForUnload && isCollecting && actualMapMode === 'GAME' && onUnload && onCamera && onCloseRestaurant && (() => {
          // Android 與 iOS 座標偏移可能不同；Android 縮小垂直間距，讓 tooltip 與餐廳圖標不要離太遠
          const latOffset = Platform.OS === 'android' ? 0.00012 : 0.00018;
          const lngOffset = Platform.OS === 'android' ? 0 : 0;
          const tooltipCoord: [number, number] = [
            selectedRestaurantForUnload.coord[0] + lngOffset,
            selectedRestaurantForUnload.coord[1] + latOffset,
          ];
          const hitSlop = Platform.OS === 'android' ? { top: 16, bottom: 16, left: 16, right: 16 } : undefined;
          return (
            <Mapbox.MarkerView
              coordinate={tooltipCoord}
              anchor={{ x: 0.5, y: 1 }}
              allowOverlap
            >
              <View style={floatingUnloadStyles.tooltipWrap} pointerEvents="auto">
                <View style={floatingUnloadStyles.tooltipCard}>
                  <View style={floatingUnloadStyles.actions}>
                    <TouchableOpacity
                      style={[floatingUnloadStyles.btn, floatingUnloadStyles.btnCamera]}
                      onPress={onCamera}
                      activeOpacity={0.85}
                      hitSlop={hitSlop}
                    >
                      <Image source={TOOLTIP_CAMERA_ICON} style={floatingUnloadStyles.btnIcon} resizeMode="contain" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[floatingUnloadStyles.btn, floatingUnloadStyles.btnUnload]}
                      onPress={onUnload}
                      activeOpacity={0.85}
                      hitSlop={hitSlop}
                    >
                      <Image source={TOOLTIP_UNLOAD_ICON} style={floatingUnloadStyles.btnIconUnload} resizeMode="contain" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={floatingUnloadStyles.tooltipTail} />
                <View style={[floatingUnloadStyles.tooltipGap, Platform.OS === 'android' && { height: 4 }]} />
              </View>
            </Mapbox.MarkerView>
          );
        })()}
      </Mapbox.MapView>

      {/* 🎬 倒數動畫（3-2-1）- 採集開始時顯示 */}
      {countdown !== null && (
        <Animated.View
          style={[
            styles.countdownContainer,
            {
              opacity: countdownOpacity,
              transform: [{ scale: countdownScale }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.countdownCircle}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        </Animated.View>
      )}

      {/* 所有按鈕已移至 Omni Dashboard；3D/2D+回中央 按鈕已移至 index 設置列 */}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MAP_THEME.background,
  },
  map: {
    flex: 1,
  },
  // 所有按鈕樣式已移除，功能移至 Omni Dashboard
  
  // === 倒數動畫樣式 ===
  countdownContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000, // ✅ 確保在最上層
    pointerEvents: 'none',
  },
  countdownCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    borderColor: MAP_THEME.userMarker.arrow.color, // 橙色邊框
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
  },
  countdownText: {
    fontSize: 120,
    fontWeight: '900',
    color: MAP_THEME.userMarker.arrow.color, // 橙色數字
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});

const floatingUnloadStyles = StyleSheet.create({
  tooltipWrap: {
    alignItems: 'center',
  },
  tooltipCard: {
    backgroundColor: 'rgba(50, 55, 70, 0.72)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 6,
    minWidth: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCamera: {},
  btnUnload: {},
  btnIcon: {
    width: 52,
    height: 52,
  },
  btnIconUnload: {
    width: 68,
    height: 68,
  },
  tooltipTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(50, 55, 70, 0.72)',
    marginTop: -1,
  },
  tooltipGap: {
    height: 12,
    width: '100%',
  },
});
