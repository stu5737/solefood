/**
 * 後台位置追蹤任務
 * Solefood MVP v9.0 Plus
 * 
 * 使用 expo-task-manager 和 expo-location 實現後台位置追蹤
 * 確保遊戲邏輯在屏幕關閉或 App 進入背景時也能正常運行
 * 
 * 注意：需要安裝 expo-task-manager 依賴
 * 執行：npx expo install expo-task-manager
 */

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { useSessionStore } from '../stores/sessionStore';
import { gpsHistoryService } from './gpsHistory';
import { explorationService } from './exploration';
import { entropyEngine } from '../core/entropy/engine';
import { calculateDistance, isValidGPSPoint, type GPSPoint } from '../core/math/distance';
import { latLngToH3, H3_RESOLUTION } from '../core/math/h3';
import type { MovementInput } from '../core/entropy/events';

/**
 * 任務名稱
 */
export const LOCATION_TASK_NAME = 'GAME_LOCATION_TRACKING';

/**
 * ⭐ 修復：在 TaskManager 外部維護 lastValidPoint（避免從 gpsHistoryService 獲取舊點）
 * 這樣可以確保每次過濾都使用最近一次通過過濾的點
 */
let lastValidPoint: GPSPoint | null = null;

/**
 * ⭐ 重置 lastValidPoint（在會話開始時調用）
 * 導出此函數供 BackgroundLocationService 調用
 */
export function resetLocationTaskState() {
  console.log('[🔄 LocationTask] 重置狀態，清除 lastValidPoint');
  lastValidPoint = null;
}

/**
 * 定義後台位置追蹤任務
 * 
 * 此任務會在後台持續運行，即使屏幕關閉或 App 進入背景
 * 任務邏輯：
 * 1. 接收位置更新
 * 2. 檢查 isCollecting 狀態
 * 3. 如果正在採集，執行遊戲邏輯（記錄軌跡、探索判定、拾取處理）
 * 4. 如果不在採集，僅更新當前位置（不執行遊戲邏輯）
 */
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  const taskCount = (global as any).__locationTaskExecutionCount || 0;
  (global as any).__locationTaskExecutionCount = taskCount + 1;

  if (error) {
    // ⭐ 詳細的錯誤處理
    const errorCode = (error as any)?.code;
    const errorMessage = (error as any)?.message || String(error);
    
    if (errorMessage.includes('kCLErrorDomain') || errorCode === 0) {
      const errorCount = (global as any).__locationTaskErrorCount || 0;
      (global as any).__locationTaskErrorCount = errorCount + 1;
    } else {
      return;
    }
    
    // ⭐ 對於 kCLErrorDomain Code=0，不返回，繼續處理（如果 data 存在）
  }

  if (!data) {
    return;
  }

  // 類型斷言：確保 data 包含 locations
  const { locations } = data as { locations: Location.LocationObject[] };
  
  if (!locations || locations.length === 0) {
    return;
  }

  // 獲取最新的位置
  const location = locations[locations.length - 1];
  
  if (!location || !location.coords) {
    console.warn('[⚠️ LocationTask] 位置數據無效');
    return;
  }

  const { latitude, longitude, timestamp: coordsTimestamp, accuracy, speed } = location.coords;
  
  // ⭐ 修復：使用 location.timestamp 而不是 coords.timestamp
  // location.timestamp 是必定存在的，而 coords.timestamp 可能是 undefined
  const timestamp = location.timestamp || Date.now();
  
  console.log('[📍 LocationTask] 收到位置更新', {
    latitude,
    longitude,
    accuracy,
    speed,
    timestamp,
    locationTimestamp: location.timestamp,
    coordsTimestamp,
  });

  // 驗證位置數據有效性
  if (!isFinite(latitude) || !isFinite(longitude)) {
    return;
  }

  // ⭐ STEPN 等級過濾：使用三重過濾機制
  const gpsPoint: GPSPoint = {
    latitude,
    longitude,
    timestamp: timestamp || Date.now(),
    accuracy: accuracy || undefined,
    speed: speed || undefined,
  };

  // ⭐ 修復：使用模組級別的 lastValidPoint 而不是從 gpsHistoryService 獲取
  // 這樣可以確保每次過濾都使用最近一次通過過濾的點，避免使用舊會話的點
  console.log('[🔍 LocationTask] 準備過濾 GPS 點', {
    hasLastValidPoint: !!lastValidPoint,
    lastValidPointAge: lastValidPoint ? ((Date.now() - lastValidPoint.timestamp) / 1000).toFixed(1) + 's' : 'N/A',
  });

  const validation = isValidGPSPoint(gpsPoint, lastValidPoint);
  console.log('[🔍 LocationTask] GPS 過濾結果', {
    valid: validation.valid,
    reason: validation.reason,
  });
  
  if (!validation.valid) {
    console.log('[❌ LocationTask] GPS 點被過濾，原因：', validation.reason);
    return;
  }
  
  console.log('[✅ LocationTask] GPS 點通過過濾');
  
  // ⭐ 更新 lastValidPoint（只在通過過濾後更新）
  lastValidPoint = gpsPoint;

  // ⭐ 修復：使用 gpsHistoryService 檢查是否正在採集（而不是從 Store）
  // 因為 isCollecting 不在 sessionStore 中，而是通過會話狀態來判斷
  const isCollecting = gpsHistoryService.isSessionActive();
  
  // 從 Store 獲取地圖模式
  const store = useSessionStore.getState();
  const mapMode = store.mapMode;
  
  // 構建位置數據對象
  const locationData = {
    latitude,
    longitude,
    timestamp: timestamp || Date.now(),
    accuracy: accuracy || undefined,
    speed: speed || undefined,
  };

  // 邏輯閘門：只有在「採集模式」下才執行遊戲邏輯
  if (!isCollecting) {
    console.log('[⏸️ LocationTask] 未在採集模式，跳過遊戲邏輯（請先點「開始採集」）');
    return;
  }

  if (gpsHistoryService.isSessionActive()) {
    // 計算距離（使用上一個位置）
    const recentPoints = gpsHistoryService.getRecentPoints(1);
    let distance = 0;
    
    if (recentPoints.length > 0) {
      const lastLocation = recentPoints[0];
      const distanceKm = calculateDistance(
        { latitude: lastLocation.latitude, longitude: lastLocation.longitude },
        { latitude, longitude }
      );
      distance = distanceKm * 1000; // 轉換為米
    }

    // 1. 記錄到當前會話
    gpsHistoryService.addPoint(locationData, distance);

    // 2. 記錄造訪區域（用於探索系統）
    explorationService.recordVisit(latitude, longitude);

    // 3. 探索者模式：檢查是否發現新區域（僅在主遊戲模式）
    if (mapMode === 'GAME' && latitude && longitude) {
      // ⭐ 修復：先將座標轉換為 H3 索引，然後調用 discoverNewHex
      const h3Index = latLngToH3(latitude, longitude, H3_RESOLUTION);
      console.log('[🗺️ LocationTask] 正在發現新 H3', {
        h3Index,
        latitude,
        longitude,
        mapMode,
      });
      if (h3Index) {
        const result = store.discoverNewHex(h3Index);
        console.log('[📊 LocationTask] discoverNewHex 結果', {
          hasNewDiscovery: result.hasNewDiscovery,
          isGrayZone: result.isGrayZone,
          newHexes: result.explorationDetails.newHexes.length,
          currentSessionSize: store.currentSessionNewHexes.size,
        });
      } else {
        console.warn('[⚠️ LocationTask] H3 索引為空！');
      }
    } else {
      console.log('[📍 LocationTask] 跳過 H3 發現', { mapMode, hasCoords: !!(latitude && longitude) });
    }

    // 4. 觸發熵引擎處理拾取（GPS 更新時處理移動和拾取）
    if (distance > 0) {
      // 處理速度：GPS 可能返回負數（無效值），需要過濾
      const speedKmh = (speed && speed > 0) ? speed * 3.6 : undefined;

      console.log('[🎯 LocationTask] 準備觸發熵引擎', {
        distance: distance / 1000,
        speedKmh,
        latitude,
        longitude,
      });

      try {
        const input: MovementInput = {
          distance: distance / 1000, // 轉換為公里
          speed: speedKmh,
          timestamp: locationData.timestamp,
          gpsLocation: {
            latitude,
            longitude,
            accuracy: locationData.accuracy,
            speed: speedKmh,
          },
        };

        entropyEngine.processMovement(input);
        console.log('[✅ LocationTask] 熵引擎處理完成');
      } catch (error) {
        console.error('[❌ LocationTask] 熵引擎處理失敗', error);
      }
    } else {
      console.log('[⏭️ LocationTask] 距離為 0，跳過熵引擎');
    }

  }
});
