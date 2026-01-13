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
import * as Notifications from 'expo-notifications';
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
  // ⭐ 減少日誌頻率：只在第一次或每 10 次顯示一次任務觸發日誌
  const taskCount = (global as any).__locationTaskExecutionCount || 0;
  (global as any).__locationTaskExecutionCount = taskCount + 1;
  
  // 只在第一次或每 10 次顯示一次（減少日誌噪音）
  if (taskCount === 0 || taskCount % 10 === 0) {
    const taskStartTime = new Date().toLocaleTimeString('zh-TW', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
    console.log(`[LocationTask] 🔄 背景任務觸發 [${taskStartTime}] (執行次數: ${taskCount + 1})`);
  }
  
  if (error) {
    // ⭐ 詳細的錯誤處理
    const errorCode = (error as any)?.code;
    const errorMessage = (error as any)?.message || String(error);
    
    // ⭐ 針對 kCLErrorDomain Code=0 的特殊處理（模擬器已知限制）
    if (errorMessage.includes('kCLErrorDomain') || errorCode === 0) {
      // ⭐ 降級為 warn，並減少日誌頻率（只在第一次或每 20 次顯示一次）
      const errorCount = (global as any).__locationTaskErrorCount || 0;
      (global as any).__locationTaskErrorCount = errorCount + 1;
      
      // 只在第一次或每 20 次顯示一次警告（減少日誌噪音）
      if (errorCount === 0) {
        console.warn('[LocationTask] ⚠️  iOS 模擬器背景位置任務限制（已知問題，將靜默處理）');
        console.warn('[LocationTask] 💡 這是模擬器的已知限制，不影響前台功能');
        console.warn('[LocationTask] 💡 背景功能請在真機上測試');
      } else if (errorCount % 20 === 0) {
        console.warn(`[LocationTask] ⚠️  模擬器限制錯誤（已發生 ${errorCount} 次，繼續靜默處理）`);
      }
      
      // ⭐ 不直接返回，讓任務繼續嘗試（可能下次會成功）
      // 如果 data 存在，繼續處理
    } else {
      // 其他錯誤：正常記錄
      console.error('[LocationTask] ❌ Task error:', error);
      console.error('[LocationTask] 錯誤代碼:', errorCode);
      console.error('[LocationTask] 錯誤訊息:', errorMessage);
      
      if (errorCode === 1) {
        console.error('[LocationTask] 💡 錯誤類型: kCLErrorLocationUnknown');
        console.error('[LocationTask] 💡 位置服務無法確定位置');
      } else if (errorCode === 2) {
        console.error('[LocationTask] 💡 錯誤類型: kCLErrorDenied');
        console.error('[LocationTask] 💡 位置權限被拒絕');
        console.error('[LocationTask] 💡 請在「設定」>「隱私權與安全性」>「定位服務」中授予權限');
      }
      
      // 其他錯誤直接返回
      return;
    }
    
    // ⭐ 對於 kCLErrorDomain Code=0，不返回，繼續處理（如果 data 存在）
  }

  if (!data) {
    console.log('[LocationTask] ⚠️  No data received');
    return;
  }

  // 類型斷言：確保 data 包含 locations
  const { locations } = data as { locations: Location.LocationObject[] };
  
  if (!locations || locations.length === 0) {
    console.log('[LocationTask] ⚠️  No locations in data');
    return;
  }

  // 獲取最新的位置
  const location = locations[locations.length - 1];
  
  if (!location || !location.coords) {
    console.log('[LocationTask] ⚠️  Invalid location object');
    return;
  }

  const { latitude, longitude, timestamp, accuracy, speed } = location.coords;

  // 驗證位置數據有效性
  if (!isFinite(latitude) || !isFinite(longitude)) {
    console.log('[LocationTask] ⚠️  Invalid coordinates:', { latitude, longitude });
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

  // 獲取上一個有效位置（用於過濾）
  const recentPoints = gpsHistoryService.getRecentPoints(1);
  const lastPoint = recentPoints.length > 0 ? {
    latitude: recentPoints[0].latitude,
    longitude: recentPoints[0].longitude,
    timestamp: recentPoints[0].timestamp,
    accuracy: recentPoints[0].accuracy,
    speed: recentPoints[0].speed,
  } : null;

  const validation = isValidGPSPoint(gpsPoint, lastPoint);
  if (!validation.valid) {
    console.log(`[LocationTask] ⚠️ GPS point filtered: ${validation.reason}`);
    return; // 直接丟棄，不記錄也不畫線
  }

  // ⭐ 修復：使用 gpsHistoryService 檢查是否正在採集（而不是從 Store）
  // 因為 isCollecting 不在 sessionStore 中，而是通過會話狀態來判斷
  const isCollecting = gpsHistoryService.isSessionActive();
  
  // 從 Store 獲取地圖模式
  const store = useSessionStore.getState();
  const mapMode = store.mapMode;
  
  // ⭐ 減少日誌頻率：只在第一次或每 20 次顯示狀態檢查
  if (taskCount === 0 || taskCount % 20 === 0) {
    console.log(`[LocationTask] 📊 狀態檢查: isCollecting=${isCollecting}, mapMode=${mapMode}, sessionId=${gpsHistoryService.getCurrentSessionId() || 'none'}`);
  }

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
    // 待機模式：不做任何事，直接返回（確保不記錄）
    // ⭐ 減少日誌：只在第一次顯示
    if (taskCount === 0 || taskCount % 50 === 0) {
      console.log('[LocationTask] 💤 待機模式：不執行遊戲邏輯');
    }
    return;
  }
  
  // ⭐ 減少日誌：只在第一次顯示進入採集模式
  if (taskCount === 0 || taskCount % 50 === 0) {
    console.log('[LocationTask] ✅ 採集模式：開始處理遊戲邏輯');
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
      if (h3Index) {
        const isNew = store.discoverNewHex(h3Index);
        if (isNew) {
          console.log('[LocationTask] New area discovered:', h3Index);
          // 注意：Toast 通知需要在 UI 層處理（後台任務無法顯示 UI）
        }
      } else {
        console.warn('[LocationTask] Failed to convert coordinates to H3 index:', { latitude, longitude });
      }
    }

    // 4. 觸發熵引擎處理拾取（GPS 更新時處理移動和拾取）
    if (distance > 0) {
      // 處理速度：GPS 可能返回負數（無效值），需要過濾
      const speedKmh = (speed && speed > 0) ? speed * 3.6 : undefined;

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

        const result = entropyEngine.processMovement(input);
        console.log('[LocationTask] Processed movement via entropy engine:', {
          distance: input.distance.toFixed(3),
          speed: speedKmh?.toFixed(1),
          events: result.events?.length || 0,
        });

        // 如果有拾取事件，記錄日誌（可選：未來可以在 UI 層顯示 Toast 提示）
        if (result.events && result.events.length > 0) {
          const lootEvent = result.events.find(
            (e) =>
              e.type === 'loot_success' ||
              e.type === 'loot_converted' ||
              e.type === 'loot_failed' ||
              e.type === 'loot_rescue_available'
          );
          if (lootEvent) {
            console.log('[LocationTask] 🎉 Loot event triggered:', lootEvent.type, lootEvent.data);
          }
        }
      } catch (error) {
        console.error('[LocationTask] Error processing movement via entropy engine:', error);
      }
    }

    // ⭐ 減少日誌頻率：只在每 5 次顯示一次詳細信息（減少日誌噪音）
    if (taskCount % 5 === 0) {
      const timeStr = new Date().toLocaleTimeString('zh-TW', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
      const speedDisplay = speed && speed > 0 ? `${speed.toFixed(1)} m/s` : 'N/A';
      
      // 終端日誌：簡化輸出（每 5 次顯示一次）
      console.log(`[LocationTask] 🎯 背景運行中 [${timeStr}] - 座標: (${latitude.toFixed(5)}, ${longitude.toFixed(5)}) - 速度: ${speedDisplay}`);
    }
    
    // ⭐ 減少通知頻率：只在每 10 次發送一次通知（避免通知轟炸）
    if (taskCount % 10 === 0) {
      try {
        const timeStr = new Date().toLocaleTimeString('zh-TW', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        });
        const speedDisplay = speed && speed > 0 ? `${speed.toFixed(1)} m/s` : 'N/A';
        
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🎒 採集運作中',
            body: `✅ 還在運行！ [${timeStr}] - 速度: ${speedDisplay}`,
            sound: false, // 避免太吵，可設為 true
            data: { timestamp: Date.now() }, // 添加時間戳數據
          },
          trigger: null, // 立即發送
        });
        
        // ⭐ 減少日誌：只在每 10 次顯示一次通知發送日誌
        if (taskCount % 50 === 0) {
          console.log(`[LocationTask] 📲 通知已發送（每 10 次發送一次通知）`);
        }
      } catch (error) {
        // 如果通知發送失敗，記錄但不影響主邏輯
        console.error('[LocationTask] ❌ Failed to send notification:', error);
      }
    }
    
    // ⭐ 移除任務完成的日誌（減少噪音）
  }
});
