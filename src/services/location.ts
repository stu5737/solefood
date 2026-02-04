/**
 * GPS 位置追蹤服務
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 使用 Expo Location API 進行位置追蹤
 */

import * as Location from 'expo-location';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { calculateDistance, type Coordinates, isValidGPSPoint, type GPSPoint } from '../core/math/distance';

// 動態導入，避免循環依賴
let gpsHistoryService: any = null;
let bgTrackingNotification: any = null;

export interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
}

export interface LocationTrackingOptions {
  accuracy: Location.Accuracy;
  timeInterval?: number;  // 位置更新間隔（毫秒）
  distanceInterval?: number; // 距離間隔（米）
}

/**
 * 位置追蹤服務類
 */
class LocationService {
  private watchSubscription: Location.LocationSubscription | null = null;
  private lastLocation: LocationData | null = null;
  private onLocationUpdate?: (location: LocationData, distance: number) => void;
  private options: LocationTrackingOptions;
  private appState: AppStateStatus = AppState.currentState;
  private backgroundLogCounter: number = 0; // 背景模式下的日誌計數器
  private appStateSubscription: any = null;

  constructor(options: LocationTrackingOptions = { accuracy: Location.Accuracy.Balanced }) {
    this.options = options;
    
    // 監聽 App 狀態變化
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      const wasBackground = this.appState.match(/inactive|background/);
      const isNowForeground = nextAppState === 'active';
      
      if (wasBackground && isNowForeground) {
        this.backgroundLogCounter = 0;
      }
      
      this.appState = nextAppState;
    });
  }

  /**
   * 請求位置權限（包含背景定位）
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // 先請求前景權限
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        return false;
      }
      
      // 再請求背景權限
      try {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        
        if (backgroundStatus !== 'granted') {
          return true;
        }
      } catch {
        // 某些平台可能不支持背景權限請求
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 檢查位置權限
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * 獲取當前位置（一次性）
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          return null;
        }
      }

      // 檢查位置服務是否啟用
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: this.options.accuracy,
        timeout: 10000, // 10 秒超時
        maximumAge: 5000, // 允許使用 5 秒內的緩存位置
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
        accuracy: location.coords.accuracy || undefined,
        speed: location.coords.speed || undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * 開始位置追蹤
   */
  async startTracking(
    onUpdate: (location: LocationData, distance: number) => void
  ): Promise<boolean> {
    try {
      // ⭐ 防崩潰修復 1：先停止任何可能殘留的監聽（防呆機制）
      if (this.watchSubscription) {
        this.watchSubscription.remove();
        this.watchSubscription = null;
      }
      
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          return false;
        }
      }

      this.onLocationUpdate = onUpdate;

      // ⭐ 防崩潰修復 2：確保 watchSubscription 為 null 後再啟動新的
      this.watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation, // ⭐ STEPN 修復：使用最高精度
          timeInterval: 1000, // ⭐ STEPN 修復：1 秒更新一次
          distanceInterval: 5, // ⭐ STEPN 修復：每 5 公尺才觸發一次更新，由系統底層先幫忙濾掉微小雜訊
          // 確保背景定位工作
          mayShowUserSettingsDialog: true, // Android: 如果權限被拒絕，顯示設置對話框
        },
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            accuracy: location.coords.accuracy || undefined,
            speed: location.coords.speed || undefined,
          };

          // ⭐ Android 修復 1：驗證座標有效性
          if (!isFinite(locationData.latitude) || !isFinite(locationData.longitude) ||
              Math.abs(locationData.latitude) > 90 || Math.abs(locationData.longitude) > 180) {
            return;
          }

          // ⭐ STEPN 等級過濾：使用三重過濾機制
          const gpsPoint: GPSPoint = {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            timestamp: locationData.timestamp,
            accuracy: locationData.accuracy,
            speed: locationData.speed,
          };

          const lastGPSPoint = this.lastLocation ? {
            latitude: this.lastLocation.latitude,
            longitude: this.lastLocation.longitude,
            timestamp: this.lastLocation.timestamp,
            accuracy: this.lastLocation.accuracy,
            speed: this.lastLocation.speed,
          } : null;

          const validation = isValidGPSPoint(gpsPoint, lastGPSPoint);
          if (!validation.valid) {
            return;
          }

          // 計算距離（如果存在上一個位置）
          // calculateDistance 返回公里，需要轉換為米
          let distance = 0;
          if (this.lastLocation) {
            const distanceKm = calculateDistance(
              {
                latitude: this.lastLocation.latitude,
                longitude: this.lastLocation.longitude,
              },
              {
                latitude: locationData.latitude,
                longitude: locationData.longitude,
              }
            );
            distance = distanceKm * 1000; // 轉換為米
          }

          const isBackground = this.appState.match(/inactive|background/);
          if (isBackground) {
            this.backgroundLogCounter++;
            // ⭐ 關鍵修復：在背景模式下，如果會話活躍，就記錄點（不依賴 React 組件狀態）
            try {
              // 動態導入避免循環依賴
              if (!gpsHistoryService) {
                gpsHistoryService = require('./gpsHistory').gpsHistoryService;
              }
              if (!bgTrackingNotification) {
                bgTrackingNotification = require('./backgroundTrackingNotification').bgTrackingNotification;
              }
              
              // 如果採集會話活躍，記錄背景定位點
              if (gpsHistoryService && gpsHistoryService.isSessionActive()) {
                bgTrackingNotification.recordBackgroundPoint();
              }
            } catch {
              // 忽略導入錯誤
            }
          }

          // 更新最後位置
          this.lastLocation = locationData;

          // 調用主回調（如果存在）
          if (this.onLocationUpdate) {
            this.onLocationUpdate(locationData, distance);
          }

          // 調用所有訂閱的回調
          this.locationCallbacks.forEach(cb => {
            try {
              cb(locationData, distance);
            } catch {
              // 靜默忽略
            }
          });
        }
      );

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 停止位置追蹤
   */
  stopTracking(): void {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
      this.lastLocation = null;
      this.onLocationUpdate = undefined;
      this.locationCallbacks.clear(); // 清除所有訂閱
      this.backgroundLogCounter = 0;
    }
  }

  /**
   * 獲取背景日誌計數器（用於 DevDashboard 顯示）
   */
  getBackgroundLogCount(): number {
    return this.backgroundLogCounter;
  }

  /**
   * 獲取當前 App 狀態（用於 DevDashboard 顯示）
   */
  getAppState(): AppStateStatus {
    return this.appState;
  }

  /**
   * 重啟位置追蹤（用於修復 iOS 模擬器 GPS 訊號中斷問題）
   * 
   * 此方法會：
   * 1. 停止當前的 watchSubscription
   * 2. 等待 500ms（讓系統清理）
   * 3. 重新啟動追蹤，保留所有現有的訂閱回調
   */
  async restartTracking(): Promise<boolean> {
    try {
      // 保存現有的回調（避免丟失訂閱）
      const savedCallbacks = new Set(this.locationCallbacks);
      const savedOnUpdate = this.onLocationUpdate;
      
      // 1. 強制停止當前監聽
      if (this.watchSubscription) {
        this.watchSubscription.remove();
        this.watchSubscription = null;
      }
      
      // 2. 清除狀態（但保留回調）
      this.lastLocation = null;
      this.onLocationUpdate = undefined;
      this.backgroundLogCounter = 0;
      
      // 3. 等待 500ms，讓系統清理
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 4. 重新啟動追蹤
      // 如果有保存的主回調，使用它；否則使用統一回調分發給所有訂閱者
      const onUpdate = savedOnUpdate || ((location, distance) => {
        savedCallbacks.forEach(cb => {
          try {
            cb(location, distance);
          } catch {
            // 靜默忽略
          }
        });
      });
      
      // 恢復回調集合
      this.locationCallbacks = savedCallbacks;
      
      // 重新啟動追蹤
      return await this.startTracking(onUpdate);
    } catch {
      return false;
    }
  }

  /**
   * 清理資源
   */
  cleanup(): void {
    this.stopTracking();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }

  /**
   * 訂閱位置更新（用於實時地圖）
   * 
   * 注意：此方法會重用現有的 watchSubscription，如果已經在追蹤則添加回調到鏈中
   * 
   * @param callback - 位置更新回調函數
   * @returns 訂閱對象（可用於取消訂閱）
   */
  private locationCallbacks: Set<(location: LocationData, distance: number) => void> = new Set();

  subscribeToLocationUpdates(
    callback: (location: LocationData, distance: number) => void
  ): { remove: () => void } | null {
    // 添加回調到集合中
    this.locationCallbacks.add(callback);

    // 如果已經有訂閱，直接返回
    if (this.watchSubscription) {
      return {
        remove: () => {
          this.locationCallbacks.delete(callback);
        },
      };
    }

    // 如果沒有訂閱，啟動追蹤（使用統一回調分發給所有訂閱者）
    this.startTracking((location, distance) => {
      // 調用所有訂閱的回調
      this.locationCallbacks.forEach(cb => {
        try {
          cb(location, distance);
        } catch {
          // 靜默忽略
        }
      });
    }).catch(() => {
      // 靜默忽略
    });

    // 返回取消訂閱函數
    return {
      remove: () => {
        this.locationCallbacks.delete(callback);
      },
    };
  }

  /**
   * 獲取最後位置
   */
  getLastLocation(): LocationData | null {
    return this.lastLocation;
  }

  /**
   * 驗證速度（防作弊）
   * @param speed 速度（m/s）
   * @returns 是否為有效速度
   */
  validateSpeed(speed: number): boolean {
    // 轉換為 km/h（1 m/s = 3.6 km/h）
    const speedKmh = speed * 3.6;
    const maxSpeed = 50; // 最大速度 50 km/h
    
    if (speedKmh > maxSpeed) {
      return false;
    }
    
    return true;
  }

  /**
   * 驗證 GPS 數據（綜合防作弊檢查）
   * 
   * @param currentLocation - 當前位置
   * @param previousLocation - 上一個位置（可選）
   * @returns 驗證結果
   */
  validateGPSData(
    currentLocation: LocationData,
    previousLocation?: LocationData
  ): { valid: boolean; reason?: string } {
    // 1. 檢查速度
    if (currentLocation.speed !== undefined) {
      const speedKmh = currentLocation.speed * 3.6;
      if (speedKmh > 50) {
        return { valid: false, reason: `Suspicious speed: ${speedKmh.toFixed(2)} km/h` };
      }
    }

    // 2. 檢查精度
    if (currentLocation.accuracy && currentLocation.accuracy > 100) {
      return { valid: false, reason: `Low accuracy: ${currentLocation.accuracy.toFixed(2)}m` };
    }

    // 3. 檢查距離跳躍（如果存在上一個位置）
    if (previousLocation) {
      const distance = calculateDistance(
        { latitude: previousLocation.latitude, longitude: previousLocation.longitude },
        { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
      );
      
      const timeDiff = (currentLocation.timestamp - previousLocation.timestamp) / 1000; // 秒
      
      // 如果時間差為 0 或負數，跳過距離檢查
      if (timeDiff > 0) {
        const maxPossibleDistance = (timeDiff / 3600) * 50; // 最大可能距離（50 km/h）
        
        if (distance > maxPossibleDistance * 1.5) { // 允許 50% 誤差
          return { 
            valid: false, 
            reason: `Impossible distance jump: ${distance.toFixed(2)}km in ${timeDiff.toFixed(1)}s` 
          };
        }
      }
    }

    return { valid: true };
  }
}

/**
 * 導出單例實例
 */
export const locationService = new LocationService({
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 1000, // 1 秒更新一次
  distanceInterval: 10, // 10 米更新一次
});

/**
 * 導出類（用於測試）
 */
export { LocationService };
