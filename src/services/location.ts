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
        console.log(`🟢 [LocationService] App entered FOREGROUND - Background GPS points logged: ${this.backgroundLogCounter}`);
        this.backgroundLogCounter = 0;
      } else if (nextAppState.match(/inactive|background/)) {
        console.log('🔴 [LocationService] App entered BACKGROUND - Location tracking should continue');
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
        console.warn('[LocationService] Foreground location permission denied');
        return false;
      }
      
      // 再請求背景權限
      try {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        
        if (backgroundStatus !== 'granted') {
          console.warn('[LocationService] Background location permission denied. App will only track when screen is on.');
          // 即使背景權限被拒絕，也允許前景定位繼續
          return true;
        }
        
        console.log('[LocationService] Both foreground and background permissions granted');
      } catch (backgroundError) {
        // 某些平台可能不支持背景權限請求，記錄但不阻止前景定位
        console.warn('[LocationService] Background permission request failed (may not be supported):', backgroundError);
      }
      
      return true;
    } catch (error) {
      console.error('[LocationService] Failed to request permissions:', error);
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
    } catch (error) {
      console.error('[LocationService] Failed to check permissions:', error);
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
        console.warn('[LocationService] Permission not granted, requesting...');
        const granted = await this.requestPermissions();
        if (!granted) {
          console.warn('[LocationService] Permission request denied');
          return null;
        }
      }

      // 檢查位置服務是否啟用
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        console.warn('[LocationService] Location services are disabled. Please enable location services in Settings.');
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
    } catch (error: any) {
      // 詳細的錯誤處理
      if (error.code === 'ERR_LOCATION_PERMISSION_DENIED') {
        console.error('[LocationService] Location permission denied. Please grant location permission in Settings.');
      } else if (error.code === 'ERR_LOCATION_UNAVAILABLE') {
        console.error('[LocationService] Location unavailable. Please check your location settings and ensure GPS is enabled.');
      } else if (error.message?.includes('kCLErrorDomain error 0')) {
        console.error('[LocationService] iOS Location Error: Location service may be disabled or unavailable. Please check Settings > Privacy > Location Services.');
      } else {
        console.error('[LocationService] Failed to get current location:', error);
      }
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
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          console.warn('[LocationService] Cannot start tracking: permission denied');
          return false;
        }
      }

      this.onLocationUpdate = onUpdate;

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
            console.warn(`[LocationService] Invalid coordinates: ${locationData.latitude}, ${locationData.longitude}`);
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
            console.log(`[LocationService] ⚠️ GPS point filtered: ${validation.reason}`);
            return; // 直接丟棄，不記錄也不畫線
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

          // 判斷是否在背景模式並記錄詳細日誌
          const isBackground = this.appState.match(/inactive|background/);
          const timeStr = new Date(location.timestamp).toLocaleTimeString();
          
          if (isBackground) {
            this.backgroundLogCounter++;
            // 每 10 個點記錄一次（避免日誌過多），但第一個點總是記錄
            if (this.backgroundLogCounter % 10 === 0 || this.backgroundLogCounter === 1) {
              console.log(`📱 [BG-GPS] ${timeStr} | Lat: ${locationData.latitude.toFixed(6)}, Lng: ${locationData.longitude.toFixed(6)} | Speed: ${locationData.speed ? (locationData.speed * 3.6).toFixed(1) : 'N/A'} km/h | Accuracy: ${locationData.accuracy?.toFixed(1) || 'N/A'}m | Count: ${this.backgroundLogCounter}`);
            }
            
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
            } catch (error) {
              // 忽略導入錯誤，避免阻塞位置更新
              // console.warn('[LocationService] Failed to record background point:', error);
            }
          } else {
            // 前景模式：每 5 個點記錄一次（減少日誌量）
            if (this.backgroundLogCounter === 0 || this.backgroundLogCounter % 5 === 0) {
              console.log(`🟢 [FG-GPS] ${timeStr} | Lat: ${locationData.latitude.toFixed(6)}, Lng: ${locationData.longitude.toFixed(6)} | Speed: ${locationData.speed ? (locationData.speed * 3.6).toFixed(1) : 'N/A'} km/h`);
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
            } catch (error) {
              console.error('[LocationService] Error in location callback:', error);
            }
          });
        }
      );

      console.log('[LocationService] Location tracking started');
      return true;
    } catch (error) {
      console.error('[LocationService] Failed to start tracking:', error);
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
      console.log('[LocationService] Location tracking stopped');
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
        } catch (error) {
          console.error('[LocationService] Error in location callback:', error);
        }
      });
    }).catch((error) => {
      console.error('[LocationService] Failed to start tracking for subscription:', error);
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
      console.warn(`[LocationService] Suspicious speed detected: ${speedKmh.toFixed(2)} km/h`);
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
