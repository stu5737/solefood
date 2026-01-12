/**
 * 後台位置追蹤服務
 * Solefood MVP v9.0 Plus
 * 
 * 管理後台位置追蹤任務的啟動和停止
 * 使用 expo-task-manager 和 expo-location 實現後台位置追蹤
 * 
 * 注意：需要安裝 expo-task-manager 依賴
 * 執行：npx expo install expo-task-manager
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { LOCATION_TASK_NAME } from './LocationTask';
import { useSessionStore } from '../stores/sessionStore';

/**
 * 後台位置追蹤服務類
 */
class BackgroundLocationService {
  private isTracking: boolean = false;

  /**
   * 請求後台位置權限
   */
  async requestBackgroundPermissions(): Promise<boolean> {
    try {
      // 首先請求前台權限
      console.log('[BackgroundLocationService] 📋 請求前台位置權限...');
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      console.log('[BackgroundLocationService] 📊 前台權限狀態:', foregroundStatus);
      if (foregroundStatus !== 'granted') {
        console.warn('[BackgroundLocationService] ⚠️  Foreground location permission denied');
        return false;
      }
      console.log('[BackgroundLocationService] ✅ 前台權限已授予');

      // 然後請求後台權限
      console.log('[BackgroundLocationService] 📋 請求後台位置權限...');
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      console.log('[BackgroundLocationService] 📊 後台權限狀態:', backgroundStatus);
      if (backgroundStatus !== 'granted') {
        console.warn('[BackgroundLocationService] ⚠️  Background location permission denied');
        console.warn('[BackgroundLocationService] 💡 請在設置中授予後台位置權限');
        return false;
      }
      console.log('[BackgroundLocationService] ✅ 後台權限已授予');

      return true;
    } catch (error) {
      console.error('[BackgroundLocationService] ❌ 請求權限失敗:');
      console.error('[BackgroundLocationService] 錯誤詳情:', error);
      if (error instanceof Error) {
        console.error('[BackgroundLocationService] 錯誤訊息:', error.message);
      }
      return false;
    }
  }

  /**
   * 開始後台位置追蹤
   * 
   * 只有在採集模式下才啟動後台任務
   * 
   * @returns 是否成功啟動
   */
  async startBackgroundTracking(): Promise<boolean> {
    try {
      console.log('[BackgroundLocationService] 🚀 開始啟動背景位置追蹤...');
      
      // 檢查是否已經在追蹤
      if (this.isTracking) {
        console.log('[BackgroundLocationService] ⚠️  Already tracking, skipping...');
        return true;
      }

      // 請求權限
      console.log('[BackgroundLocationService] 📋 請求位置權限...');
      const hasPermission = await this.requestBackgroundPermissions();
      if (!hasPermission) {
        console.error('[BackgroundLocationService] ❌ 權限被拒絕：Cannot start tracking: permission denied');
        return false;
      }
      console.log('[BackgroundLocationService] ✅ 權限已授予');

      // 確保任務已定義（LocationTask.ts 應該已經定義）
      console.log('[BackgroundLocationService] 🔍 檢查任務是否已定義:', LOCATION_TASK_NAME);
      const isTaskDefined = TaskManager.isTaskDefined(LOCATION_TASK_NAME);
      console.log('[BackgroundLocationService] 📊 任務定義狀態:', isTaskDefined);
      if (!isTaskDefined) {
        console.error('[BackgroundLocationService] ❌ 任務未定義:', LOCATION_TASK_NAME);
        console.error('[BackgroundLocationService] 💡 請確保 LocationTask.ts 已在 app/_layout.tsx 中導入');
        return false;
      }
      console.log('[BackgroundLocationService] ✅ 任務已定義');

      // 檢查是否已經在運行
      console.log('[BackgroundLocationService] 🔍 檢查任務是否已在運行...');
      const isTaskRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('[BackgroundLocationService] 📊 任務運行狀態:', isTaskRunning);
      if (isTaskRunning) {
        console.log('[BackgroundLocationService] ⚠️  Task already running');
        this.isTracking = true;
        return true;
      }

      // 啟動後台位置更新
      // 為了驗證功能，設置較短的更新間隔（1秒），讓用戶能頻繁看到日誌和通知
      console.log('[BackgroundLocationService] 🎯 啟動位置更新任務...');
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.BestForNavigation, // ⭐ STEPN 修復：使用最高精度
        timeInterval: 1000, // ⭐ STEPN 修復：1 秒更新一次
        distanceInterval: 5, // ⭐ STEPN 修復：每 5 公尺才觸發一次更新，由系統底層先幫忙濾掉微小雜訊
        // ⭐ iOS 關鍵：允許背景更新（會出現藍色狀態條）
        showsBackgroundLocationIndicator: true,
        allowsBackgroundLocationUpdates: true,
        // ⭐ Android 關鍵：前台服務通知（防止被系統殺掉）
        foregroundService: {
          notificationTitle: 'Solefood 運行中',
          notificationBody: '正在背景記錄您的探索軌跡...',
          notificationColor: '#22C55E', // 綠色
        },
      });

      this.isTracking = true;
      console.log('[BackgroundLocationService] ✅ 背景位置追蹤已成功啟動！');
      return true;
    } catch (error) {
      console.error('[BackgroundLocationService] ❌ 啟動背景位置追蹤失敗:');
      console.error('[BackgroundLocationService] 錯誤詳情:', error);
      if (error instanceof Error) {
        console.error('[BackgroundLocationService] 錯誤訊息:', error.message);
        console.error('[BackgroundLocationService] 錯誤堆疊:', error.stack);
      }
      this.isTracking = false;
      return false;
    }
  }

  /**
   * 停止後台位置追蹤
   */
  async stopBackgroundTracking(): Promise<void> {
    try {
      if (!this.isTracking) {
        console.log('[BackgroundLocationService] Not tracking, skipping...');
        return;
      }

      // 檢查任務是否在運行
      const isTaskRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (!isTaskRunning) {
        console.log('[BackgroundLocationService] Task not running');
        this.isTracking = false;
        return;
      }

      // 停止後台位置更新
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);

      this.isTracking = false;
      console.log('[BackgroundLocationService] Background location tracking stopped');
    } catch (error) {
      console.error('[BackgroundLocationService] Failed to stop background tracking:', error);
      this.isTracking = false;
    }
  }

  /**
   * 檢查是否正在追蹤
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }
}

/**
 * 導出單例實例
 */
export const backgroundLocationService = new BackgroundLocationService();

/**
 * 導出類（用於測試）
 */
export { BackgroundLocationService };
