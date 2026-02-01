/**
 * 合併多份門市圖資並去重（距離 + 同格）
 * 用於 Overpass 7-Eleven + 綠界 ECPay 門市整合
 */

import { calculateDistanceMeters } from './geo';
import type { RestaurantPoint } from '../config/restaurants';

/** 兩點距離小於此值（米）視為同一門市，只保留一筆 */
const MERGE_RADIUS_M = 30;
/** 同格（小數第 5 位相同）只留一筆 */
const GRID_DECIMALS = 5;

function getLatLon(p: RestaurantPoint): { lat: number; lon: number } {
  const [lon, lat] = p.coord;
  return { lat, lon };
}

/**
 * 合併多組 RestaurantPoint[] 並去重（距離合併 + 同格去重）
 * 保留順序：先出現的優先（通常綠界在前、Overpass 在後）
 */
export function mergeAndDedupeRestaurants(...sources: RestaurantPoint[][]): RestaurantPoint[] {
  const raw: RestaurantPoint[] = [];
  for (const list of sources) {
    if (Array.isArray(list)) raw.push(...list);
  }
  if (raw.length === 0) return [];

  // 1) 距離合併：與已保留點距離 < MERGE_RADIUS_M 視為重複
  const kept: RestaurantPoint[] = [];
  for (const p of raw) {
    const { lat, lon } = getLatLon(p);
    const isDup = kept.some((k) => {
      const { lat: klat, lon: klon } = getLatLon(k);
      return calculateDistanceMeters(lat, lon, klat, klon) < MERGE_RADIUS_M;
    });
    if (isDup) continue;
    kept.push(p);
  }

  // 2) 同格只留一筆
  const seen = new Set<string>();
  const final: RestaurantPoint[] = [];
  for (const p of kept) {
    const { lat, lon } = getLatLon(p);
    const cell = `${round(lat, GRID_DECIMALS)},${round(lon, GRID_DECIMALS)}`;
    if (seen.has(cell)) continue;
    seen.add(cell);
    final.push(p);
  }

  return final;
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}
