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
import Constants from 'expo-constants';
import { Alert, Platform } from 'react-native';
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

      // ⭐ 新增：檢查位置服務是否啟用（iOS/Android 通用）
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        console.warn('[BackgroundLocationService] ⚠️  Location services are disabled');
        Alert.alert(
          '位置服務未啟用',
          Platform.OS === 'ios'
            ? '請在「設定」>「隱私權與安全性」>「定位服務」中啟用定位服務。'
            : '請在「設定」>「位置」中啟用定位服務。',
          [{ text: '確定' }]
        );
        return false;
      }
      console.log('[BackgroundLocationService] ✅ 位置服務已啟用');

      // 然後請求後台權限
      console.log('[BackgroundLocationService] 📋 請求後台位置權限...');
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      console.log('[BackgroundLocationService] 📊 後台權限狀態:', backgroundStatus);
      
      // ⭐ 修改：對於 iOS，即使只有 "While Using" 權限，也提供更詳細的提示
      if (backgroundStatus !== 'granted') {
        console.warn('[BackgroundLocationService] ⚠️  Background location permission denied');
        if (Platform.OS === 'ios') {
          console.warn('[BackgroundLocationService] 💡 iOS: 請在設置中選擇「總是允許」以獲得最佳體驗');
          Alert.alert(
            '需要「總是允許」權限',
            '為了在背景持續記錄您的運動軌跡，請在「設定」>「隱私權與安全性」>「定位服務」>「Solefood MVP」中選擇「總是允許」。',
            [{ text: '確定' }]
          );
        } else {
          console.warn('[BackgroundLocationService] 💡 Android: 請在設置中授予後台位置權限');
          Alert.alert(
            '需要後台位置權限',
            '請在「設定」>「應用程式」>「Solefood MVP」>「權限」>「位置」中授予「一律允許」權限。',
            [{ text: '確定' }]
          );
        }
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
      
      // ⭐ 關鍵檢查：確認是否在 Expo Go 中運行（不支持背景任務）
      const isExpoGo = Constants.executionEnvironment === 'storeClient';
      if (isExpoGo) {
        console.error('[BackgroundLocationService] ❌ Expo Go 不支持背景位置追蹤任務');
        Alert.alert(
          '需要 Development Build',
          '背景位置追蹤功能需要使用 Development Build 或 Production Build，無法在 Expo Go 中使用。\n\n請執行：\n1. npx expo prebuild --clean\n2. npx expo run:ios (或 run:android)',
          [{ text: '確定' }]
        );
        return false;
      }
      console.log('[BackgroundLocationService] ✅ 運行環境檢查通過（非 Expo Go）');
      
      // 檢查是否已經在追蹤
      if (this.isTracking) {
        console.log('[BackgroundLocationService] ⚠️  Already tracking, skipping...');
        return true;
      }

      // ⭐ 優化：先檢查當前權限狀態，然後再決定是否請求
      console.log('[BackgroundLocationService] 📋 檢查當前權限狀態...');
      
      let currentForegroundStatus = (await Location.getForegroundPermissionsAsync()).status;
      let currentBackgroundStatus = (await Location.getBackgroundPermissionsAsync()).status;
      
      console.log('[BackgroundLocationService] 📊 當前前台權限:', currentForegroundStatus);
      console.log('[BackgroundLocationService] 📊 當前後台權限:', currentBackgroundStatus);
      
      // 如果前台權限都沒有，必須請求
      if (currentForegroundStatus !== 'granted') {
        console.log('[BackgroundLocationService] 📋 前台權限未授予，開始請求權限...');
      const hasPermission = await this.requestBackgroundPermissions();
      if (!hasPermission) {
          console.error('[BackgroundLocationService] ❌ 前台權限被拒絕：Cannot start tracking: permission denied');
          return false;
        }
        // 重新檢查權限狀態
        currentForegroundStatus = (await Location.getForegroundPermissionsAsync()).status;
        currentBackgroundStatus = (await Location.getBackgroundPermissionsAsync()).status;
      }
      
      // ⭐ 關鍵修改：即使只有前台權限，也嘗試啟動（iOS 配合 allowsBackgroundLocationUpdates 可能可以工作）
      if (currentForegroundStatus === 'granted') {
        if (currentBackgroundStatus === 'granted') {
          console.log('[BackgroundLocationService] ✅ 完整權限已授予（前台 + 後台）');
        } else {
          console.warn('[BackgroundLocationService] ⚠️  只有前台權限，將嘗試啟動背景追蹤（功能可能受限）');
          if (Platform.OS === 'ios') {
            console.warn('[BackgroundLocationService] 💡 iOS: 配合 allowsBackgroundLocationUpdates，可能可以在部分背景下工作（會顯示藍色狀態條）');
            console.warn('[BackgroundLocationService] 💡 建議在設置中選擇「總是允許」以獲得完整功能');
          } else {
            console.warn('[BackgroundLocationService] 💡 Android: 建議在設置中授予「一律允許」權限');
          }
        }
      } else {
        console.error('[BackgroundLocationService] ❌ 前台權限未授予：Cannot start tracking');
        return false;
      }

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
      
      // ⭐ 根據平台和權限狀態構建配置選項
      const taskOptions: Location.LocationTaskOptions = {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 5,
      };
      
      // ⭐ iOS 特定配置
      if (Platform.OS === 'ios') {
        // iOS 需要 allowsBackgroundLocationUpdates 才能在背景工作
        taskOptions.showsBackgroundLocationIndicator = true;
        // ⭐ 關鍵：只有當後台權限已授予時，才設置 allowsBackgroundLocationUpdates
        // 否則可能會拋出錯誤
        if (currentBackgroundStatus === 'granted') {
          taskOptions.allowsBackgroundLocationUpdates = true;
          console.log('[BackgroundLocationService] ✅ iOS: 已設置 allowsBackgroundLocationUpdates');
        } else {
          console.warn('[BackgroundLocationService] ⚠️  iOS: 後台權限未授予，將使用前台模式（功能受限）');
          // 不設置 allowsBackgroundLocationUpdates，讓它在前台模式下運行
        }
      }
      
      // ⭐ Android：不設前台服務，避免觸發「Foreground service cannot be started when in background」等 Console Error
      // （原生層在 reject 時會印紅字，無法從 JS 關閉；改為僅前台模式可穩定啟動、無紅字）
      if (Platform.OS === 'android') {
        console.log('[BackgroundLocationService] Android: 使用僅前台模式（無前台服務通知，避免啟動錯誤）');
      }
      
      try {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, taskOptions);

      this.isTracking = true;
      console.log('[BackgroundLocationService] ✅ 背景位置追蹤已成功啟動！');
      return true;
      } catch (startError: any) {
        // ⭐ 特殊處理：UIBackgroundModes 配置錯誤
        const errorMessage = startError?.message || '';
        const isBackgroundModeError = errorMessage.includes('UIBackgroundModes') || 
                                      errorMessage.includes('Info.plist') ||
                                      errorMessage.includes('Background location has not been configured');
        
        if (isBackgroundModeError) {
          console.error('[BackgroundLocationService] ❌ UIBackgroundModes 配置錯誤');
          console.error('[BackgroundLocationService] 💡 這通常表示需要重新生成原生專案');
          console.error('[BackgroundLocationService] 💡 請執行以下步驟：');
          console.error('[BackgroundLocationService]   1. 停止開發伺服器 (Ctrl+C)');
          console.error('[BackgroundLocationService]   2. 執行: npx expo prebuild --clean');
          console.error('[BackgroundLocationService]   3. 執行: npx expo run:ios (或 run:android)');
          console.error('[BackgroundLocationService]   4. 重新啟動開發伺服器');
          
          Alert.alert(
            '需要重新生成原生專案',
            'UIBackgroundModes 配置需要在原生專案中生效。\n\n請執行：\n1. 停止開發伺服器\n2. npx expo prebuild --clean\n3. npx expo run:ios\n4. 重新啟動開發伺服器',
            [{ text: '確定' }]
          );
          
          // 不再嘗試降級方案，因為這是配置問題，需要重新生成原生專案
          throw startError;
        }
        
        // ⭐ 如果啟動失敗，嘗試降級方案（僅前台模式，不開前台服務通知）
        const isForegroundServiceNotAllowed = startError?.code === 'ERR_FOREGROUND_SERVICE_START_NOT_ALLOWED';
        const isBackgroundStartError = /foreground service cannot be started when the application is in the background/i.test(errorMessage);
        if (isBackgroundStartError) {
          console.warn('[BackgroundLocationService] ⚠️ Android 不允許在背景時啟動前台服務，改為僅前台模式（請在 App 前景時再點「開始採集」可獲得完整背景追蹤）');
        } else if (isForegroundServiceNotAllowed) {
          console.warn('[BackgroundLocationService] ⚠️ Android 不允許啟動前台服務，改為僅前台模式（請在設定中將位置改為「一律允許」可獲得完整背景追蹤）');
        } else {
          console.warn('[BackgroundLocationService] ⚠️ 完整配置啟動失敗，改為僅前台模式（功能可能受限）');
        }
        console.warn('[BackgroundLocationService] 原因:', startError?.code || errorMessage);
        
        // 降級方案：不設 foregroundService，避免再次觸發 ERR_FOREGROUND_SERVICE_START_NOT_ALLOWED
        const fallbackOptions: Location.LocationTaskOptions = {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 5,
        };
        // Android 降級時一律不設前台服務，否則可能再次報錯
        if (Platform.OS === 'android') {
          console.warn('[BackgroundLocationService] ⚠️  Android: 使用基本配置（無前台服務通知）');
        }
        
        try {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, fallbackOptions);
          console.warn('[BackgroundLocationService] ⚠️  使用降級配置啟動成功（功能可能受限）');
          this.isTracking = true;
          return true;
        } catch (fallbackError: any) {
          console.warn('[BackgroundLocationService] ❌ 降級方案也失敗，改為回傳 false（不拋出）:', fallbackError?.code, fallbackError?.message);
          this.isTracking = false;
          if (Platform.OS === 'android') {
            Alert.alert(
              '無法啟動位置追蹤',
              '請確認：\n1. App 在前景時再點「開始採集」\n2. 設定中位置權限為「一律允許」\n3. 關閉省電/背景限制此 App 後重試。',
              [{ text: '確定' }]
            );
          }
          return false;
        }
      }
    } catch (error) {
      const err = error as any;
      const msg = (err?.message ?? err?.error?.message ?? String(error)) || '';
      const code = err?.code ?? err?.error?.code ?? '';
      const isAndroidForegroundError = Platform.OS === 'android' && (
        /foreground service cannot be started when the application is in the background/i.test(msg) ||
        (/couldn't start the foreground service/i.test(msg) && /in the background/i.test(msg)) ||
        code === 'ERR_FOREGROUND_SERVICE_START_NOT_ALLOWED' ||
        /ERR_FOREGROUND_SERVICE_START_NOT_ALLOWED/i.test(msg)
      );
      if (isAndroidForegroundError) {
        console.warn('[BackgroundLocationService] ⚠️ Android 前台服務無法啟動（已略過紅字）。請執行：npx expo prebuild --clean 後 npx expo run:android 重裝（app.json 已設 isAndroidForegroundServiceEnabled: false）');
        this.isTracking = false;
        return false;
      }
      
      // ⭐ Android 前台服務錯誤：不再印任何紅字（訊息可能在 message 或 stack）
      if (!isAndroidForegroundError) {
        console.error('[BackgroundLocationService] ❌ 啟動背景位置追蹤失敗:');
        console.error('[BackgroundLocationService] 錯誤詳情:', error);
      }
      
      // ⭐ 更詳細的錯誤信息（確保完整顯示）；Android 前台服務錯誤已於上方 return
      if (error && typeof error === 'object' && !isAndroidForegroundError) {
        
        // 完整輸出錯誤信息
        console.error('[BackgroundLocationService] ========== 錯誤詳情 ==========');
        console.error('[BackgroundLocationService] 錯誤代碼:', err.code || 'N/A');
        console.error('[BackgroundLocationService] 錯誤訊息:', err.message || String(error));
        
        // 如果有嵌套的錯誤訊息（Expo 錯誤通常有嵌套結構）
        if (err.message && typeof err.message === 'string') {
          const fullMessage = err.message;
          if (Platform.OS === 'android' && /foreground service/i.test(fullMessage) && /in the background/i.test(fullMessage)) {
            console.warn('[BackgroundLocationService] ⚠️ Android 前台服務無法啟動（已略過紅字）。請執行：npx expo prebuild --clean 後 npx expo run:android 重裝');
            this.isTracking = false;
            return false;
          }
          console.error('[BackgroundLocationService] 完整錯誤訊息:', fullMessage);
          
          // 檢查是否包含 UIBackgroundModes 相關錯誤
          if (fullMessage.includes('UIBackgroundModes') || 
              fullMessage.includes('Info.plist') || 
              fullMessage.includes('Background location has not been configured')) {
            console.error('[BackgroundLocationService] ========== 解決方案 ==========');
            console.error('[BackgroundLocationService] 💡 問題: UIBackgroundModes 配置未正確應用到原生專案');
            console.error('[BackgroundLocationService] 💡 解決步驟：');
            console.error('[BackgroundLocationService]   1. 停止開發伺服器 (Ctrl+C)');
            console.error('[BackgroundLocationService]   2. 執行: npx expo prebuild --clean');
            console.error('[BackgroundLocationService]   3. 執行: npx expo run:ios');
            console.error('[BackgroundLocationService]   4. 重新啟動開發伺服器');
            console.error('[BackgroundLocationService] ============================');
            
            Alert.alert(
              '需要重新生成原生專案',
              'UIBackgroundModes 配置需要在原生專案中生效。\n\n請執行：\n1. npx expo prebuild --clean\n2. npx expo run:ios\n3. 重新啟動開發伺服器\n\n注意：不能在 Expo Go 中測試背景定位功能。',
              [{ text: '確定' }]
            );
          } else if (fullMessage.includes('permission') || err.code === 'ERR_LOCATION_UNAVAILABLE') {
            console.error('[BackgroundLocationService] 💡 解決方案: 請在系統設置中授予「總是允許」位置權限');
            Alert.alert(
              '需要位置權限',
              '請在「設定」>「隱私權與安全性」>「定位服務」>「Solefood MVP」中選擇「總是允許」。',
              [{ text: '確定' }]
            );
          } else if (err.code === 'ERR_FOREGROUND_SERVICE_START_NOT_ALLOWED') {
            console.error('[BackgroundLocationService] 💡 Android: 系統不允許啟動前台服務，請在設定中將位置權限改為「一律允許」');
            if (Platform.OS === 'android') {
              Alert.alert(
                '背景追蹤需要權限',
                '請在「設定」>「應用程式」>「Solefood MVP」>「權限」中，將位置改為「一律允許」，以啟用背景追蹤。\n\n若僅需在 App 開啟時記錄，可忽略此訊息。',
                [{ text: '確定' }]
              );
            }
          } else if (fullMessage.includes('task') || fullMessage.includes('Task')) {
            console.error('[BackgroundLocationService] 💡 解決方案: 請確認 LocationTask.ts 已在 app/_layout.tsx 中導入');
          }
        }
        
        // 輸出錯誤堆疊（如果有）；Android 前台服務錯誤不再印紅字
        if (err.stack) {
          const stackHasForegroundError = Platform.OS === 'android' && /foreground service/i.test(err.stack) && /in the background/i.test(err.stack);
          if (!stackHasForegroundError) {
            console.error('[BackgroundLocationService] 錯誤堆疊:', err.stack);
          }
        }
      } else if (error instanceof Error) {
        console.error('[BackgroundLocationService] 錯誤訊息:', error.message);
        console.error('[BackgroundLocationService] 錯誤堆疊:', error.stack);
      } else {
        console.error('[BackgroundLocationService] 未知錯誤類型:', typeof error, error);
      }
      
      this.isTracking = false;
      return false;
    }
  }

  /**
   * 停止後台位置追蹤
   * 
   * ⭐ 防崩潰修復：強制停止並清理，防止殘留任務
   */
  async stopBackgroundTracking(): Promise<void> {
    try {
      console.log('[BackgroundLocationService] 🧹 開始停止背景位置追蹤...');

      // ⭐ 防崩潰修復：無論 isTracking 狀態如何，都嘗試停止（防止殘留）
      // 檢查任務是否在運行
      const isTaskRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      
      if (isTaskRunning) {
        // 停止後台位置更新
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        console.log('[BackgroundLocationService] ✅ 背景位置更新任務已停止');
      } else {
        console.log('[BackgroundLocationService] ℹ️  任務未在運行，無需停止');
      }

      // ⭐ 強制重置狀態（無論是否成功停止）
      this.isTracking = false;
      console.log('[BackgroundLocationService] ✅ 背景位置追蹤已完全停止');
    } catch (error) {
      console.error('[BackgroundLocationService] ❌ 停止背景位置追蹤時出錯:', error);
      // ⭐ 即使出錯也強制重置狀態（防止卡在 tracking 狀態）
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
