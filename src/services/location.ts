/**
 * GPS 位置追蹤服務
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 使用 Expo Location API 進行位置追蹤
 */

import * as Location from 'expo-location';
import { calculateDistance, type Coordinates } from '../core/math/distance';

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

  constructor(options: LocationTrackingOptions = { accuracy: Location.Accuracy.Balanced }) {
    this.options = options;
  }

  /**
   * 請求位置權限
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.warn('[LocationService] Location permission denied');
        return false;
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
        const granted = await this.requestPermissions();
        if (!granted) {
          return null;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: this.options.accuracy,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
        accuracy: location.coords.accuracy || undefined,
        speed: location.coords.speed || undefined,
      };
    } catch (error) {
      console.error('[LocationService] Failed to get current location:', error);
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
          accuracy: this.options.accuracy,
          timeInterval: this.options.timeInterval || 1000, // 默認 1 秒
          distanceInterval: this.options.distanceInterval || 10, // 默認 10 米
        },
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            accuracy: location.coords.accuracy || undefined,
            speed: location.coords.speed || undefined,
          };

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
      console.log('[LocationService] Location tracking stopped');
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
