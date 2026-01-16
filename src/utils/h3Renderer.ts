/**
 * H3 渲染工具模塊
 * 
 * ✅ 完全隔離的 H3 渲染邏輯
 * ✅ 不包含任何樣式配置
 * ✅ 不依賴於 gpsHistoryService 或 historySessions
 * ✅ 單一數據源：exploredHexes (Set<string>)
 * 
 * 設計原則：
 * 1. 只負責數據轉換：Set<string> -> GeoJSON
 * 2. 樣式由調用方決定（通過 MAP_THEME）
 * 3. 不執行任何異步操作
 * 4. 不依賴於任何外部狀態
 */

import { h3ToLatLng } from '../core/math/h3';

/**
 * GeoJSON Feature 類型
 */
export interface H3Feature {
  type: 'Feature';
  properties: {
    h3Index: string;
    opacity: number;
    weight: number;
    distance: number;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

/**
 * GeoJSON FeatureCollection 類型
 */
export interface H3FeatureCollection {
  type: 'FeatureCollection';
  features: H3Feature[];
}

/**
 * 漸層配置
 */
export interface GradientConfig {
  maxOpacity: number;  // 最大透明度（中心）
  minOpacity: number;  // 最小透明度（邊緣）
  nonLinear: boolean;  // 是否使用非線性漸變（平方）
}

/**
 * 計算兩點之間的距離（米）
 * 使用 Haversine 公式
 */
function getDistanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000; // 地球半徑（米）
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

/**
 * 計算地理中心（平均經緯度）
 */
function calculateGeoCenter(coords: Array<{ latitude: number; longitude: number }>): {
  latitude: number;
  longitude: number;
} {
  if (coords.length === 0) {
    return { latitude: 0, longitude: 0 };
  }
  
  const sum = coords.reduce(
    (acc, coord) => ({
      latitude: acc.latitude + coord.latitude,
      longitude: acc.longitude + coord.longitude,
    }),
    { latitude: 0, longitude: 0 }
  );
  
  return {
    latitude: sum.latitude / coords.length,
    longitude: sum.longitude / coords.length,
  };
}

/**
 * 從 H3 索引集合生成 GeoJSON
 * 
 * @param hexes - H3 索引集合
 * @param gradientConfig - 漸層配置
 * @returns GeoJSON FeatureCollection，如果沒有有效的 H3 則返回 null
 */
export function generateH3GeoJson(
  hexes: Set<string>,
  gradientConfig: GradientConfig
): H3FeatureCollection | null {
  if (hexes.size === 0) {
    return null;
  }

  // 1. 將 H3 索引轉換為經緯度坐標
  const coords: Array<{ h3Index: string; latitude: number; longitude: number }> = [];
  
  hexes.forEach(h3Index => {
    try {
      const coord = h3ToLatLng(h3Index);
      if (coord) {
        coords.push({
          h3Index,
          latitude: coord.latitude,
          longitude: coord.longitude,
        });
      }
    } catch (error) {
      console.warn('[H3Renderer] 無效的 H3 索引:', h3Index, error);
    }
  });

  if (coords.length === 0) {
    return null;
  }

  // 2. 計算地理中心
  const geoCenter = calculateGeoCenter(coords);

  // 3. 計算每個 H3 到地理中心的距離
  const coordsWithDistance = coords.map(coord => ({
    ...coord,
    distance: getDistanceMeters(geoCenter, coord),
  }));

  // 4. 找出最大距離（用於歸一化）
  const maxDistance = Math.max(...coordsWithDistance.map(c => c.distance), 1);

  // 5. 生成 GeoJSON Features
  const features: H3Feature[] = coordsWithDistance.map(coord => {
    const { h3Index, latitude, longitude, distance } = coord;
    
    // 歸一化距離（0-1）
    const normalized = Math.min(distance / maxDistance, 1);
    
    // 計算透明度（根據配置）
    let opacity: number;
    if (gradientConfig.nonLinear) {
      // 非線性漸變（平方）：中心更明顯，邊緣急劇變淡
      opacity =
        gradientConfig.maxOpacity -
        (gradientConfig.maxOpacity - gradientConfig.minOpacity) * (normalized * normalized);
    } else {
      // 線性漸變
      opacity =
        gradientConfig.maxOpacity -
        (gradientConfig.maxOpacity - gradientConfig.minOpacity) * normalized;
    }
    
    // 計算權重（用於 Heatmap 強度，0-1 之間）
    const weight = opacity / gradientConfig.maxOpacity;

    return {
      type: 'Feature',
      properties: {
        h3Index,
        opacity,
        weight,
        distance,
      },
      geometry: {
        type: 'Point',
        coordinates: [longitude, latitude], // GeoJSON 格式：[lng, lat]
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * 從 GeoJSON 提取統計信息（用於調試）
 */
export function getH3GeoJsonStats(geoJson: H3FeatureCollection | null): {
  count: number;
  opacityMin: number;
  opacityMax: number;
  opacityAvg: number;
  distanceMin: number;
  distanceMax: number;
  distanceAvg: number;
} | null {
  if (!geoJson || geoJson.features.length === 0) {
    return null;
  }

  const opacities = geoJson.features.map(f => f.properties.opacity);
  const distances = geoJson.features.map(f => f.properties.distance);

  return {
    count: geoJson.features.length,
    opacityMin: Math.min(...opacities),
    opacityMax: Math.max(...opacities),
    opacityAvg: opacities.reduce((sum, v) => sum + v, 0) / opacities.length,
    distanceMin: Math.min(...distances),
    distanceMax: Math.max(...distances),
    distanceAvg: distances.reduce((sum, v) => sum + v, 0) / distances.length,
  };
}
