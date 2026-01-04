/**
 * 估值計算模組（純函數）
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 本模組實現物理法則層的價值計算
 */

import { VALUATION } from '../../utils/constants';

/**
 * 計算基於距離的估值
 * 
 * 根據白皮書 v8.7 第一章：市場定位與價值錨定
 * 公式：50km = $1.00 USD
 * 
 * 這是 Solefood 的核心價值錨定模型，確保玩家對「勞動成果」有清晰的認知。
 * 對於一名普通玩家，累積行走約 50 公里的淨收益，約等於 $1.00 USD。
 * 
 * @param distance - 移動距離（公里）
 * @returns 估值（USD）
 * 
 * @example
 * ```typescript
 * // 行走 50km = $1.00
 * const value1 = calculateValue(50); // 返回 1.0
 * 
 * // 行走 25km = $0.50
 * const value2 = calculateValue(25); // 返回 0.5
 * 
 * // 行走 100km = $2.00
 * const value3 = calculateValue(100); // 返回 2.0
 * ```
 */
export function calculateValue(distance: number): number {
  if (distance < 0) {
    throw new Error('Distance cannot be negative');
  }
  
  // 公式：value = (distance / 50) × 1.00 USD
  return (distance / VALUATION.KM_PER_DOLLAR) * 1.0;
}

/**
 * 計算每公里的價值
 * @returns 每公里價值（USD）
 */
export function getValuePerKilometer(): number {
  return VALUATION.DOLLAR_PER_KM;
}

/**
 * 計算達到目標價值所需的距離
 * @param targetValue 目標價值（USD）
 * @returns 所需距離（公里）
 */
export function calculateDistanceForValue(targetValue: number): number {
  return targetValue * VALUATION.KM_PER_DOLLAR;
}

