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
import { View, StyleSheet, TouchableOpacity, Text, Platform, Animated } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { locationService } from '../../services/location';
import { gpsHistoryService } from '../../services/gpsHistory';
import { useSessionStore } from '../../stores/sessionStore';
import { CAMERA_CONFIG, MAP_THEME, PERFORMANCE_CONFIG, MORNING_THEME, NIGHT_THEME, NO_LABELS_STYLE_JSON } from '../../config/mapbox';
import type { GPSHistoryPoint, CollectionSession } from '../../services/gpsHistory';
import { latLngToH3, h3ToLatLng } from '../../core/math/h3';
import { generateH3GeoJson, getH3GeoJsonStats } from '../../utils/h3Renderer';

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
}, ref) => {
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
  const [showLabels, setShowLabels] = useState<boolean>(true); // ✅ 地圖標籤顯示（預設：導航模式，採集時切換為探索模式）
  const [styleRefreshKey, setStyleRefreshKey] = useState(0); // 🚀 開發模式：樣式刷新鍵（強制重新載入地圖）
  // ✅ 3D 模型固定縮放：4 倍
  const MODEL_SCALE: [number, number, number] = [4, 4, 4];
  
  // ✅ 倒數動畫狀態
  const [countdown, setCountdown] = useState<number | null>(null); // 當前倒數數字（3, 2, 1 或 null）
  const countdownOpacity = useRef(new Animated.Value(0)).current; // 倒數動畫透明度
  const countdownScale = useRef(new Animated.Value(1)).current; // 倒數動畫縮放

  // Refs
  const cameraRef = useRef<Mapbox.Camera>(null);
  const mapRef = useRef<Mapbox.MapView>(null);
  
  // ✅ 方向平滑化（解決室內/靜止時 GPS 亂指向）
  const previousHeadingsRef = useRef<number[]>([]); // 歷史方向數據（用於平均）
  const lastValidHeadingRef = useRef<number>(0); // 上次有效方向
  const stationaryCountRef = useRef<number>(0); // 靜止計數器
  
  // ✅ 老 Android 設備性能優化
  const [performanceLevel, setPerformanceLevel] = useState<'high' | 'medium' | 'low'>('high');
  
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
        
        // 低端設備：Android 8.0 及以下（API < 28）
        if (androidVersion < 28) {
          console.log('[Performance] 🔧 檢測到低端 Android 設備（API < 28），啟用極簡性能模式:', {
            androidVersion,
            androidName: `Android ${androidVersion >= 26 ? '8.x' : '7.x 或更早'}`,
          });
          setPerformanceLevel('low');
        } 
        // 中端設備：Android 9.0-10 (API 28-29)
        else if (androidVersion < 30) {
          console.log('[Performance] ⚡ 檢測到中端 Android 設備（API 28-29），啟用平衡性能模式:', {
            androidVersion,
            androidName: androidVersion === 28 ? 'Android 9.0' : 'Android 10',
          });
          setPerformanceLevel('medium');
        } 
        // 高端設備：Android 11+ (API 30+)
        else {
          console.log('[Performance] 🚀 檢測到高端 Android 設備（API 30+），使用全功能模式');
          setPerformanceLevel('high');
        }
      } catch (error) {
        console.warn('[Performance] ⚠️ 無法檢測設備性能，使用默認高性能模式:', error);
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

  // 實際地圖模式
  const actualMapMode = showHistoryTrail ? 'HISTORY' : mapMode;
  const SPEED_THRESHOLD = 0.5; // m/s，低於此速度視為靜止
  const MIN_HEADING_CHANGE = 15; // 度，靜止時最小方向變化閾值（小於此值視為噪音）
  const HEADING_SMOOTH_WINDOW = 5; // 平滑窗口：取最近 5 次方向的平均值
  const STATIONARY_LOCK_COUNT = 10; // 靜止鎖定：連續 10 次靜止後，完全鎖定方向
  
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
        console.log('[Heading] 🔒 靜止鎖定：方向固定為', lastValidHeadingRef.current);
        return lastValidHeadingRef.current;
      }
      
      // 檢查方向變化是否足夠大（過濾小幅抖動）
      const headingDiff = Math.abs(rawHeading - lastValidHeadingRef.current);
      const normalizedDiff = Math.min(headingDiff, 360 - headingDiff); // 處理 0°/360° 邊界
      
      if (normalizedDiff < MIN_HEADING_CHANGE) {
        console.log('[Heading] ⚠️ 靜止時方向變化過小，視為噪音：', normalizedDiff, '°');
        return lastValidHeadingRef.current; // 保持上次有效方向
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
              console.log('[Heading] 🏃 移動中，更新運動方向:', location.coords.heading, '°, 速度:', location.coords.speed.toFixed(2), 'm/s');
              setMovementHeading(location.coords.heading);
            } else if (location.coords.speed !== null && location.coords.speed <= SPEED_THRESHOLD) {
              console.log('[Heading] 🛑 靜止中，速度:', location.coords.speed.toFixed(2), 'm/s');
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

  // ========== 歷史會話載入（僅用於歷史軌跡模式） ==========
  // ⚠️ 注意：歷史 H3 渲染已改用 exploredHexes，不再依賴 historySessions
  // historySessions 僅用於 HISTORY 模式（查看歷史軌跡）
  useEffect(() => {
    const loadHistorySessions = async () => {
      const allSessions = gpsHistoryService.getAllSessions();
      const endedSessions = allSessions.filter(s => s.endTime);
      const sessions = endedSessions.slice(0, 20);
      setHistorySessions(sessions);
      
      console.log('[MapboxRealTimeMap] 📊 載入', sessions.length, '個歷史會話（僅用於 HISTORY 模式）');
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
      countdownOpacity.setValue(0);
      countdownScale.setValue(1);
      
      console.log('[MapboxRealTimeMap] 🛑 採集結束，切換回導航模式');
      setShowLabels(true); // ✅ 採集結束，切換回導航模式（導航地圖）
      // ⚠️ showLabels 改變會觸發 MapView key 變化，進而重新掛載，確保圖層順序正確
      return;
    }

    // ✅ 採集開始：切換為探索模式，並觸發 MapView 重新掛載以確保圖層順序正確
    // ⚠️ 關鍵：與採集結束時的行為一致，都通過 showLabels 改變觸發 MapView 重新掛載
    console.log('[MapboxRealTimeMap] 🎬 採集開始，切換為探索模式');
    console.log('[MapboxRealTimeMap] 📊 採集開始前狀態:', {
      isCollecting: true,
      timeTheme,
      showLabels,
      showLabelsWillChange: showLabels !== false, // 檢查 showLabels 是否會改變
      currentSessionNewHexesSize: currentSessionNewHexes.size,
      currentSessionH3GeoJsonExists: currentSessionH3GeoJson !== null,
      currentMapViewKey: `map-${timeTheme}-${showLabels ? 'labels' : 'no-labels'}-refresh-${styleRefreshKey}`,
    });
    
    // 切換為探索模式（導航地圖 → 探索地圖）
    // ⚠️ showLabels 改變會觸發 MapView key 變化，進而重新掛載，確保圖層順序正確
    const prevShowLabels = showLabels;
    setShowLabels(false);
    console.log('[MapboxRealTimeMap] 🗺️ 已切換為探索模式（showLabels: false），MapView 將重新掛載', {
      showLabelsChanged: prevShowLabels !== false,
      mapViewKeyWillChange: prevShowLabels !== false, // 只有當 showLabels 改變時，MapView key 才會改變
    });
    
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
        // 倒數結束
        clearInterval(countdownInterval);
        setCountdown(null);
        countdownOpacity.setValue(0);
        countdownScale.setValue(1);
        console.log('[MapboxRealTimeMap] ✅ 倒數動畫結束，採集開始');
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
  const validateAndRepairDataConsistency = useCallback(() => {
    const allHistorySessions = gpsHistoryService.getAllSessions()
      .filter(s => s.endTime);
    
    // 從 historySessions 提取所有 H3
    const sessionH3s = new Set<string>();
    allHistorySessions.forEach(session => {
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
    
    console.log('[驗證] 數據一致性檢查:', {
      exploredHexesCount: exploredHexes.size,
      sessionH3sCount: sessionH3s.size,
      missingInExplored: missingInExplored.length,  // 在 sessions 但不在 exploredHexes
    });
    
    // ✅ 自動修復：如果 historySessions 有 H3 但 exploredHexes 沒有，自動補上
    if (missingInExplored.length > 0) {
      console.warn('[驗證] ⚠️ 發現數據不一致，自動修復中...', {
        count: missingInExplored.length,
        samples: missingInExplored.slice(0, 5),
      });
      
      // 合併缺失的 H3 到 exploredHexes
      const repairedHexes = new Set(exploredHexes);
      missingInExplored.forEach(h3 => repairedHexes.add(h3));
      
      // 更新 sessionStore
      useSessionStore.setState({ exploredHexes: repairedHexes });
      
      console.log('[驗證] ✅ 數據已修復:', {
        before: exploredHexes.size,
        after: repairedHexes.size,
        added: missingInExplored.length,
      });
    } else {
      console.log('[驗證] ✅ 數據一致性正常');
    }
  }, [exploredHexes]);

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
      console.log('[3D Model] ✅ 3D 模型已準備（使用簡化後的 GLB）');
      console.log('[3D Model] 📍 URL:', modelUrl);
      console.log('[3D Model] 🎮 開始加載模型...');
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
      console.log('[Performance] 🔧 限制 H3 渲染數量:', {
        original: exploredHexes.size,
        limited: hexesToRender.length,
        performanceLevel,
      });
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
      console.log('[MapboxRealTimeMap] ✅ historyH3GeoJson 已生成（基於 exploredHexes）:', {
        hexesCount: limitedHexes.size,
        featuresCount: result.features.length,
        stats,
        performanceLevel,
      });
    } else {
      console.log('[MapboxRealTimeMap] ⚠️ historyH3GeoJson 為空（exploredHexes.size =', limitedHexes.size, '）');
    }
    
    return result;
  }, [actualMapMode, exploredHexes, timeTheme, performanceSettings, performanceLevel]);

  // 當前會話 H3 GeoJSON
  const currentSessionH3GeoJson = useMemo(() => {
    if (!isCollecting || currentSessionNewHexes.size === 0) {
      console.log('[MapboxRealTimeMap] 📊 currentSessionH3GeoJson 狀態:', {
        isCollecting,
        currentSessionNewHexesSize: currentSessionNewHexes.size,
        result: 'null (未生成)',
      });
      return null;
    }

    const hexArray = Array.from(currentSessionNewHexes);
    const features: any[] = [];

    hexArray.forEach(h3Index => {
      try {
        const coord = h3ToLatLng(h3Index);
        if (!coord) return;

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
        // 忽略錯誤
      }
    });

    if (features.length === 0) {
      console.log('[MapboxRealTimeMap] 📊 currentSessionH3GeoJson 狀態:', {
        isCollecting,
        currentSessionNewHexesSize: currentSessionNewHexes.size,
        result: 'null (features 為空)',
      });
      return null;
    }

    const result = {
      type: 'FeatureCollection',
      features,
    };
    
    console.log('[MapboxRealTimeMap] 📊 currentSessionH3GeoJson 已生成:', {
      isCollecting,
      currentSessionNewHexesSize: currentSessionNewHexes.size,
      featuresCount: features.length,
      result: 'GeoJSON 已生成',
    });

    return result;
  }, [isCollecting, currentSessionNewHexes, getLowPolyCircle]);

  // GPS Trail GeoJSON - 即時更新的路徑軌跡（延遲兩個點，避免覆蓋游標）
  const gpsTrailGeoJson = useMemo(() => {
    if (!isCollecting || !gpsHistoryService.isSessionActive()) {
      console.log('[MapboxRealTimeMap] GPS Trail 未顯示：isCollecting =', isCollecting);
      return null;
    }

    const currentSessionPoints = gpsHistoryService.getCurrentSessionTrail();
    if (!currentSessionPoints || currentSessionPoints.length < 4) {
      console.log('[MapboxRealTimeMap] GPS Trail 點數不足（需要至少 4 個點）:', currentSessionPoints?.length || 0);
      return null;
    }

    // ✅ 關鍵：去掉最後兩個點（當前位置和前一個點），避免覆蓋游標
    // 軌跡 = 你「走過的路」，游標 = 你「現在的位置」
    const trailPoints = currentSessionPoints.slice(0, -2);
    
    if (trailPoints.length < 2) {
      console.log('[MapboxRealTimeMap] GPS Trail 延遲後點數不足:', trailPoints.length);
      return null; // 至少需要 2 個點才能畫線
    }

    const coordinates = trailPoints.map(point => [point.longitude, point.latitude]);
    console.log('[MapboxRealTimeMap] 🔥 GPS Trail 更新:', coordinates.length, '個點（延遲 2 個點）');

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
      console.log('[3D Model] ⚠️ userModelGeoJson: actualMapMode =', actualMapMode, '不是 GAME');
      return null;
    }
    if (!is3DModelReady) {
      console.log('[3D Model] ⚠️ userModelGeoJson: is3DModelReady =', is3DModelReady);
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
      console.log('[3D Model] 🧪 測試模式：使用固定位置', testLocation);
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
    
    console.log('[3D Model] ✅ userModelGeoJson 生成:', {
      coordinates: geoJson.features[0].geometry.coordinates,
      rotation: geoJson.features[0].properties.rotation,
      speed: geoJson.features[0].properties.speed,
      isTestMode: !currentLocation,
    });
    
    return geoJson;
  }, [currentLocation, actualMapMode, is3DModelReady, displayHeadingAdjusted, currentSpeed]);

  // ========== 計算 modelRotation 的固定值 ==========
  const modelRotationValue = useMemo(() => {
    // 根據平台應用不同的偏移量（iOS 和 Android 傳感器坐標系統不同）
    // iOS: 推車正確，保持 -180
    // Android: 推車需要順時針轉10度，從 -65 改為 -55
    const platformOffset = Platform.OS === 'ios' ? -180 : -55;
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
      console.log('[MapboxRealTimeMap] 🔑 MapView key 變化:', {
        before: prevMapViewKeyRef.current,
        after: mapViewKey,
        willRemount: true,
        currentSessionNewHexesSize: currentSessionNewHexes.size,
        currentSessionH3GeoJsonExists: currentSessionH3GeoJson !== null,
        currentSessionH3GeoJsonFeatures: currentSessionH3GeoJson?.features?.length || 0,
        userModelGeoJsonExists: !!userModelGeoJson,
        is3DModelReady,
        isCollecting,
        timeTheme,
        showLabels,
        styleRefreshKey,
      });
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
      >
        {/* ✅ 關鍵：先註冊模型（必須在所有圖層之前）+ 性能優化 */}
        {is3DModelReady && performanceSettings.enable3DModel && (
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

        {/* 🎮 Pokémon GO 風格攝影機 - 支援 2D/3D 切換 + 性能優化 */}
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={performanceSettings.zoomLevel} // ✅ 根據性能等級調整縮放
          pitch={viewMode === '3D' ? performanceSettings.pitch : 0} // ✅ 低端設備強制 2D（pitch = 0）
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
          
          if (shouldRender) {
            console.log('[MapboxRealTimeMap] 🎨 渲染 Current H3 圖層:', {
              layerId: 'current-h3-stroke',
              lineSortKey: 5,
              featuresCount: currentSessionH3GeoJson?.features?.length || 0,
              hasData,
              isCollecting,
              timeTheme,
            });
          }
          
          // ✅ 採集中時總是渲染圖層（即使內容為空），確保圖層註冊順序一致
          // ⚠️ 當 currentSessionH3GeoJson 為 null 時，使用空的 FeatureCollection 確保圖層始終存在
          const emptyGeoJson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
          return shouldRender ? (
            <Mapbox.ShapeSource 
              id="current-h3" 
              shape={hasData ? currentSessionH3GeoJson! : emptyGeoJson}
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
        {/* 用戶位置標記（白色箭頭）- 僅 IDLE 顯示；按下採集後隱藏，改顯示 3D 推車 */}
        {!isCollecting && (() => {
          const hasLocation = !!(currentLocation && currentLocation.coords);
          const shouldShow = actualMapMode === 'GAME' && hasLocation;
          const coords: [number, number] = hasLocation
            ? [currentLocation!.coords.longitude, currentLocation!.coords.latitude]
            : [0, 0];

          console.log('[MapboxRealTimeMap] 🎨 渲染 User Marker 圖層:', {
            layerId: 'user-marker-top',
            symbolSortKey: 99999,
            shouldShow,
            hasLocation,
            coords,
            timeTheme,
          });

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
                textRotate: displayHeading + (Platform.OS === 'ios' ? -90 : -150 + 180), // iOS箭頭需要-90，Android箭頭需要30（-150再轉180度）
                textAllowOverlap: true,
                textIgnorePlacement: true,
                symbolZOrder: 'viewport-y',
                symbolSortKey: 99999, // ✅ 極高排序值，確保在所有圖層上方
              }}
            />
          </Mapbox.ShapeSource>
          );
        })()}

        {/* 🎮 用戶 3D 推車（GLB）- 僅按下採集後才渲染；IDLE 時只顯示白色箭頭 + 性能優化 */}
        {userModelGeoJson && is3DModelReady && isCollecting && performanceSettings.enable3DModel && (
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
