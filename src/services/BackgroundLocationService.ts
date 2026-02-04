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
import { LOCATION_TASK_NAME, resetLocationTaskState } from './LocationTask';
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
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== 'granted') {
        return false;
      }

      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        Alert.alert(
          '位置服務未啟用',
          Platform.OS === 'ios'
            ? '請在「設定」>「隱私權與安全性」>「定位服務」中啟用定位服務。'
            : '請在「設定」>「位置」中啟用定位服務。',
          [{ text: '確定' }]
        );
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

      if (backgroundStatus !== 'granted') {
        if (Platform.OS === 'ios') {
          Alert.alert(
            '需要「總是允許」權限',
            '為了在背景持續記錄您的運動軌跡，請在「設定」>「隱私權與安全性」>「定位服務」>「Solefood MVP」中選擇「總是允許」。',
            [{ text: '確定' }]
          );
        } else {
          Alert.alert(
            '需要後台位置權限',
            '請在「設定」>「應用程式」>「Solefood MVP」>「權限」>「位置」中授予「一律允許」權限。',
            [{ text: '確定' }]
          );
        }
        return false;
      }

      return true;
    } catch {
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
      const isExpoGo = Constants.executionEnvironment === 'storeClient';
      if (isExpoGo) {
        Alert.alert(
          '需要 Development Build',
          '背景位置追蹤功能需要使用 Development Build 或 Production Build，無法在 Expo Go 中使用。\n\n請執行：\n1. npx expo prebuild --clean\n2. npx expo run:ios (或 run:android)',
          [{ text: '確定' }]
        );
        return false;
      }

      if (this.isTracking) {
        return true;
      }

      let currentForegroundStatus = (await Location.getForegroundPermissionsAsync()).status;
      let currentBackgroundStatus = (await Location.getBackgroundPermissionsAsync()).status;

      if (currentForegroundStatus !== 'granted') {
        const hasPermission = await this.requestBackgroundPermissions();
        if (!hasPermission) {
          return false;
        }
        // 重新檢查權限狀態
        currentForegroundStatus = (await Location.getForegroundPermissionsAsync()).status;
        currentBackgroundStatus = (await Location.getBackgroundPermissionsAsync()).status;
      }
      
      if (currentForegroundStatus !== 'granted') {
        return false;
      }

      const isTaskDefined = TaskManager.isTaskDefined(LOCATION_TASK_NAME);
      if (!isTaskDefined) {
        return false;
      }

      const isTaskRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (isTaskRunning) {
        this.isTracking = true;
        return true;
      }

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
        }
      }

      try {
        // ⭐ 修復：在開始追蹤前重置 LocationTask 狀態
        resetLocationTaskState();
        console.log('[🚀 BackgroundLocationService] 已重置 LocationTask 狀態');
        
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, taskOptions);
        this.isTracking = true;
        console.log('[✅ BackgroundLocationService] 後台追蹤已啟動');
        return true;
      } catch (startError: any) {
        // ⭐ 特殊處理：UIBackgroundModes 配置錯誤
        const errorMessage = startError?.message || '';
        const isBackgroundModeError = errorMessage.includes('UIBackgroundModes') || 
                                      errorMessage.includes('Info.plist') ||
                                      errorMessage.includes('Background location has not been configured');
        
        if (isBackgroundModeError) {
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
        const fallbackOptions: Location.LocationTaskOptions = {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 5,
        };

        try {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, fallbackOptions);
          this.isTracking = true;
          return true;
        } catch (fallbackError: any) {
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
        this.isTracking = false;
        return false;
      }

      if (error && typeof error === 'object' && !isAndroidForegroundError) {
        if (err.message && typeof err.message === 'string') {
          const fullMessage = err.message;
          if (Platform.OS === 'android' && /foreground service/i.test(fullMessage) && /in the background/i.test(fullMessage)) {
            this.isTracking = false;
            return false;
          }

          if (fullMessage.includes('UIBackgroundModes') || 
              fullMessage.includes('Info.plist') || 
              fullMessage.includes('Background location has not been configured')) {
            Alert.alert(
              '需要重新生成原生專案',
              'UIBackgroundModes 配置需要在原生專案中生效。\n\n請執行：\n1. npx expo prebuild --clean\n2. npx expo run:ios\n3. 重新啟動開發伺服器\n\n注意：不能在 Expo Go 中測試背景定位功能。',
              [{ text: '確定' }]
            );
          } else if (fullMessage.includes('permission') || err.code === 'ERR_LOCATION_UNAVAILABLE') {
            Alert.alert(
              '需要位置權限',
              '請在「設定」>「隱私權與安全性」>「定位服務」>「Solefood MVP」中選擇「總是允許」。',
              [{ text: '確定' }]
            );
          } else if (err.code === 'ERR_FOREGROUND_SERVICE_START_NOT_ALLOWED') {
            if (Platform.OS === 'android') {
              Alert.alert(
                '背景追蹤需要權限',
                '請在「設定」>「應用程式」>「Solefood MVP」>「權限」中，將位置改為「一律允許」，以啟用背景追蹤。\n\n若僅需在 App 開啟時記錄，可忽略此訊息。',
                [{ text: '確定' }]
              );
            }
          }
        }
      }

      this.isTracking = false;
      return false;
    }
  }

  /**
   * 停止後台位置追蹤
   * 
   * ⭐ 防崩潰修復：強制停止並清理，防止殘留任務
   * ⭐ Android：當 native 層 SharedPreferences 為 null 時（例如卸貨/野餐時機），僅記警告、不拋錯
   */
  async stopBackgroundTracking(): Promise<void> {
    try {
      let isTaskRunning = false;
      try {
        isTaskRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      } catch (checkError: any) {
        const msg = String(checkError?.message ?? checkError ?? '');
        if (Platform.OS === 'android' && (msg.includes('SharedPreferences') || msg.includes('NullPointerException'))) {
          this.isTracking = false;
          return;
        }
        throw checkError;
      }

      if (isTaskRunning) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      this.isTracking = false;
    } catch (error: any) {
      const msg = String(error?.message ?? error ?? '');
      const isAndroidPrefNull = Platform.OS === 'android' && (
        msg.includes('SharedPreferences') ||
        msg.includes('NullPointerException') ||
        msg.includes('null object reference')
      );
      if (!isAndroidPrefNull) {
        // 非 Android SharedPreferences 錯誤時可選擇拋出或忽略
      }
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
