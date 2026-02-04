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
 * ⭐ 改進版 GPS 平滑演算法（智慧過濾機制）
 * 
 * 過濾邏輯：
 * 1. 精度過濾：accuracy > 20m 直接丟棄
 * 2. GPS 漂移檢測：速度 > 15 m/s (54 km/h) 且距離 > 30m → 視為瞬移，丟棄
 * 3. 絕對速度上限：speed > 25 m/s (90 km/h) → 直接丟棄
 * 4. 最小移動門檻：distance < 2m 視為原地雜訊，忽略
 * 
 * 改進重點：
 * - 降低距離門檻 5m → 2m，避免低速移動時 H3 出現洞
 * - 新增智慧漂移檢測，區分「真實移動」和「GPS 漂移」
 * - iOS 和 Android 使用統一邏輯，確保跨平台一致性
 * 
 * @param newPoint - 新的 GPS 點
 * @param lastPoint - 上一個有效的 GPS 點（可選）
 * @returns 是否為有效點及原因
 */
export function isValidGPSPoint(
  newPoint: GPSPoint,
  lastPoint?: GPSPoint | null
): { valid: boolean; reason?: string } {
  console.log('[🔍 GPS Filter] 檢查 GPS 點', {
    newPoint: {
      lat: newPoint.latitude,
      lon: newPoint.longitude,
      accuracy: newPoint.accuracy,
      speed: newPoint.speed,
      timestamp: newPoint.timestamp,
    },
    hasLastPoint: !!lastPoint,
  });

  // 1. 精度過濾：accuracy > 20m 直接丟棄
  if (newPoint.accuracy !== undefined && newPoint.accuracy > 20) {
    console.log('[❌ GPS Filter] 精度過低，丟棄', { accuracy: newPoint.accuracy });
    return { valid: false, reason: `Accuracy too low: ${newPoint.accuracy.toFixed(1)}m (threshold: 20m)` };
  }

  // 如果沒有上一點，則此點有效（第一個點）
  if (!lastPoint) {
    console.log('[✅ GPS Filter] 第一個點，接受');
    return { valid: true };
  }

  // 2. 計算兩點間的距離和時間差
  const distanceKm = calculateDistance(
    { latitude: lastPoint.latitude, longitude: lastPoint.longitude },
    { latitude: newPoint.latitude, longitude: newPoint.longitude }
  );
  const distanceM = distanceKm * 1000; // 轉換為米
  const timeDiff = (newPoint.timestamp - lastPoint.timestamp) / 1000; // 轉換為秒
  
  console.log('[📏 GPS Filter] 距離和時間', {
    distanceM: distanceM.toFixed(2),
    timeDiff: timeDiff.toFixed(2),
  });

  // 3. 速度檢查：防止 GPS 瞬移和漂移
  if (timeDiff > 0) {
    const speed = distanceM / timeDiff; // 米/秒
    console.log('[🚀 GPS Filter] 計算速度', {
      speed: speed.toFixed(2),
      speedKmh: (speed * 3.6).toFixed(2),
    });
    
    // 3a. 智慧漂移檢測：速度快 + 距離遠 → 可能是 GPS 漂移
    if (speed > 15 && distanceM > 30) {
      // 15 m/s = 54 km/h，配合距離 > 30m 判斷為漂移
      console.log('[❌ GPS Filter] GPS 漂移，丟棄', {
        speed: speed.toFixed(2),
        speedKmh: (speed * 3.6).toFixed(2),
        distanceM: distanceM.toFixed(2),
      });
      return { 
        valid: false, 
        reason: `GPS drift detected: ${distanceM.toFixed(1)}m in ${timeDiff.toFixed(1)}s (${(speed * 3.6).toFixed(1)} km/h)` 
      };
    }
    
    // 3b. 絕對速度上限：超過人類可能達到的速度
    if (speed > 25) {
      // 25 m/s = 90 km/h，絕對不可能
      console.log('[❌ GPS Filter] 速度過快，丟棄', {
        speed: speed.toFixed(2),
        speedKmh: (speed * 3.6).toFixed(2),
      });
      return { 
        valid: false, 
        reason: `Impossible speed: ${speed.toFixed(1)} m/s (${(speed * 3.6).toFixed(1)} km/h, threshold: 90 km/h)` 
      };
    }
  } else {
    console.log('[⚠️ GPS Filter] timeDiff <= 0，跳過速度檢查', { timeDiff });
  }

  // 4. 最小移動門檻：distance < 2m 視為原地雜訊
  // 註：H3 Resolution 11 邊長約 25m，2m 門檻不會漏掉跨 H3 的移動
  if (distanceM < 2) {
    console.log('[❌ GPS Filter] 距離太小，丟棄', { distanceM: distanceM.toFixed(2) });
    return { valid: false, reason: `Distance too small: ${distanceM.toFixed(1)}m (threshold: 2m)` };
  }

  console.log('[✅ GPS Filter] GPS 點有效，接受');
  return { valid: true };
}

