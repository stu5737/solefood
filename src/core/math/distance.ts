/**
 * 距離計算模組（純函數）
 * 使用 Haversine 公式計算兩點之間的距離
 * Solefood MVP v8.7
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * 將度數轉換為弧度
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * 使用 Haversine 公式計算兩點之間的距離
 * @param start 起點座標
 * @param end 終點座標
 * @returns 距離（公里）
 */
export function calculateDistance(start: Coordinates, end: Coordinates): number {
  const R = 6371; // 地球半徑（公里）
  
  const dLat = toRadians(end.latitude - start.latitude);
  const dLon = toRadians(end.longitude - start.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(start.latitude)) *
      Math.cos(toRadians(end.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * 計算速度（公里/小時）
 * @param distance 距離（公里）
 * @param timeDiff 時間差（毫秒）
 * @returns 速度（公里/小時）
 */
export function calculateSpeed(distance: number, timeDiff: number): number {
  if (timeDiff <= 0) return 0;
  
  const hours = timeDiff / 1000 / 3600; // 轉換為小時
  return distance / hours;
}

/**
 * GPS 點過濾接口
 */
export interface GPSPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
}

/**
 * ⭐ STEPN 等級的 GPS 平滑演算法（三重過濾機制）
 * 
 * 過濾邏輯：
 * 1. 精度過濾：accuracy > 20m 直接丟棄
 * 2. 最小移動門檻：distance < 5m 視為原地雜訊，忽略
 * 3. 速度合理性檢查：speed > 25 m/s (90 km/h) 視為 GPS 瞬移，丟棄
 * 
 * @param newPoint - 新的 GPS 點
 * @param lastPoint - 上一個有效的 GPS 點（可選）
 * @returns 是否為有效點
 */
export function isValidGPSPoint(
  newPoint: GPSPoint,
  lastPoint?: GPSPoint | null
): { valid: boolean; reason?: string } {
  // 1. 精度過濾：accuracy > 20m 直接丟棄
  if (newPoint.accuracy !== undefined && newPoint.accuracy > 20) {
    return { valid: false, reason: `Accuracy too low: ${newPoint.accuracy.toFixed(1)}m (threshold: 20m)` };
  }

  // 如果沒有上一點，則此點有效（第一個點）
  if (!lastPoint) {
    return { valid: true };
  }

  // 2. 距離檢查：計算兩點間的距離
  const distanceKm = calculateDistance(
    { latitude: lastPoint.latitude, longitude: lastPoint.longitude },
    { latitude: newPoint.latitude, longitude: newPoint.longitude }
  );
  const distanceM = distanceKm * 1000; // 轉換為米

  // 最小移動門檻：distance < 5m 視為原地雜訊
  if (distanceM < 5) {
    return { valid: false, reason: `Distance too small: ${distanceM.toFixed(1)}m (threshold: 5m)` };
  }

  // 3. 速度合理性檢查：防止 GPS 瞬移
  const timeDiff = (newPoint.timestamp - lastPoint.timestamp) / 1000; // 轉換為秒
  if (timeDiff > 0) {
    const speed = distanceM / timeDiff; // 米/秒
    if (speed > 25) {
      // 25 m/s = 90 km/h，人類不可能達到
      return { valid: false, reason: `Speed too high: ${speed.toFixed(1)} m/s (${(speed * 3.6).toFixed(1)} km/h, threshold: 90 km/h)` };
    }
  }

  return { valid: true };
}

