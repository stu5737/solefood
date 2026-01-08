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
          let distance = 0;
          if (this.lastLocation) {
            distance = calculateDistance(
              {
                latitude: this.lastLocation.latitude,
                longitude: this.lastLocation.longitude,
              },
              {
                latitude: locationData.latitude,
                longitude: locationData.longitude,
              }
            );
          }

          // 更新最後位置
          this.lastLocation = locationData;

          // 調用回調
          if (this.onLocationUpdate && distance > 0) {
            this.onLocationUpdate(locationData, distance);
          }
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
      console.log('[LocationService] Location tracking stopped');
    }
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
