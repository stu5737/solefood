/**
 * 地理計算工具
 * 用於距離、附近點等遊戲邏輯（如餐廳卸貨範圍）
 */

const R = 6371000; // 地球半徑（米）

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * 計算兩點之間的距離（米）- Haversine 公式
 */
export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
