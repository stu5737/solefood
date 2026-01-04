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

