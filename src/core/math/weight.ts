/**
 * 重量/容量計算模組（純函數）
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 本模組實現物理法則層的重量與容量計算
 * 特別強調零容忍機制（Zero Tolerance）
 */

import { ITEM_WEIGHTS, ZERO_TOLERANCE } from '../../utils/constants';

/**
 * 根據階層獲取物品重量
 * @param tier 物品階層 (1, 2, 3)
 * @returns 重量（kg）
 */
export function getItemWeightByTier(tier: 1 | 2 | 3): number {
  switch (tier) {
    case 1:
      return ITEM_WEIGHTS.T1;
    case 2:
      return ITEM_WEIGHTS.T2;
    case 3:
      return ITEM_WEIGHTS.T3;
    default:
      return 0;
  }
}

/**
 * 計算總重量
 * @param items 物品列表（每個物品需有 weight 屬性）
 * @returns 總重量（kg）
 */
export function calculateTotalWeight(items: Array<{ weight: number }>): number {
  return items.reduce((sum, item) => sum + item.weight, 0);
}

/**
 * 檢查是否超載
 * @param currentWeight 當前負重（kg）
 * @param maxWeight 最大容量（kg）
 * @returns 是否超載
 */
export function isOverloaded(currentWeight: number, maxWeight: number): boolean {
  return currentWeight > maxWeight;
}

/**
 * 計算容量使用率
 * @param currentWeight 當前負重（kg）
 * @param maxWeight 最大容量（kg）
 * @returns 使用率（0-1）
 */
export function calculateCapacityUsage(
  currentWeight: number,
  maxWeight: number
): number {
  if (maxWeight === 0) return 1; // 容量為 0 時，使用率為 100%
  return Math.min(1, currentWeight / maxWeight);
}

/**
 * 計算基於耐久度的最大容量
 * 
 * 根據白皮書 v8.7 第五章：結構完整性與零容忍崩塌
 * 公式：maxWeight = baseMaxWeight × (durability / 100)
 * 
 * **零容忍機制（Zero Tolerance）**：
 * 當 durability = 0 時，容量必須強制為 0，觸發背包崩塌（Backpack Collapse）
 * 這是系統的剛性限制，不允許任何例外。
 * 
 * @param baseMax - 基礎最大容量（kg），例如 10kg
 * @param durability - 當前耐久度（0-100）
 * @returns 調整後的最大容量（kg）
 * 
 * @example
 * ```typescript
 * // 正常情況：耐久度 100%，容量 = 10kg
 * const cap1 = calculateMaxCapacity(10, 100); // 返回 10
 * 
 * // 耐久度 50%，容量 = 5kg
 * const cap2 = calculateMaxCapacity(10, 50); // 返回 5
 * 
 * // 零容忍：耐久度 0%，容量強制為 0
 * const cap3 = calculateMaxCapacity(10, 0); // 返回 0（觸發崩塌）
 * ```
 */
export function calculateMaxCapacity(baseMax: number, durability: number): number {
  if (baseMax < 0) {
    throw new Error('Base max capacity cannot be negative');
  }
  if (durability < 0 || durability > 100) {
    throw new Error('Durability must be between 0 and 100');
  }
  
  // 零容忍檢查：當 durability = 0 時，容量必須強制為 0
  if (durability === ZERO_TOLERANCE.DURABILITY_THRESHOLD) {
    return 0;
  }
  
  // 正常計算：maxWeight = baseMaxWeight × (durability / 100)
  const durabilityRatio = durability / 100;
  return baseMax * durabilityRatio;
}

