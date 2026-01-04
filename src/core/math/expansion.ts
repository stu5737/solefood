/**
 * 背包擴容計算模組（純函數）
 * Solefood MVP v8.7 (Final Consolidated Edition)
 */

import { EXPANSION_PRICING, CAPACITY } from '../../utils/constants';

/**
 * 計算擴容費用
 * @param currentCapacity 當前容量（kg）
 * @param units 擴容單位數（每單位 +2kg）
 * @returns 總費用（$SOLE）
 */
export function calculateExpansionCost(
  currentCapacity: number,
  units: number
): number {
  let totalCost = 0;
  let remainingUnits = units;
  let current = currentCapacity;
  
  while (remainingUnits > 0) {
    let costPerUnit: number;
    
    // 判斷當前區間
    if (current >= EXPANSION_PRICING.MASTER.MIN_WEIGHT) {
      // 完全體區間
      costPerUnit = EXPANSION_PRICING.MASTER.COST_PER_UNIT;
    } else if (current >= EXPANSION_PRICING.GROWTH.MIN_WEIGHT) {
      // 成長期區間
      costPerUnit = EXPANSION_PRICING.GROWTH.COST_PER_UNIT;
    } else {
      // 新手期區間
      costPerUnit = EXPANSION_PRICING.BEGINNER.COST_PER_UNIT;
    }
    
    // 計算當前區間可擴容的單位數
    const unitsInCurrentTier = Math.min(
      remainingUnits,
      Math.ceil((getTierMaxWeight(current) - current) / CAPACITY.EXPANSION_UNIT)
    );
    
    totalCost += costPerUnit * unitsInCurrentTier;
    current += unitsInCurrentTier * CAPACITY.EXPANSION_UNIT;
    remainingUnits -= unitsInCurrentTier;
  }
  
  return totalCost;
}

/**
 * 獲取當前容量所屬區間的最大值
 */
function getTierMaxWeight(current: number): number {
  if (current < EXPANSION_PRICING.GROWTH.MIN_WEIGHT) {
    return EXPANSION_PRICING.GROWTH.MIN_WEIGHT;
  } else if (current < EXPANSION_PRICING.MASTER.MIN_WEIGHT) {
    return EXPANSION_PRICING.MASTER.MIN_WEIGHT;
  } else {
    return Infinity;
  }
}

/**
 * 計算擴容後的新容量
 * @param currentCapacity 當前容量（kg）
 * @param units 擴容單位數
 * @returns 新容量（kg）
 */
export function calculateNewCapacity(
  currentCapacity: number,
  units: number
): number {
  return currentCapacity + (units * CAPACITY.EXPANSION_UNIT);
}

