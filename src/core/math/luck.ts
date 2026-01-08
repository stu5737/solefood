/**
 * 幸運梯度計算模組（純函數）
 * Solefood MVP v8.7 (Final Consolidated Edition)
 */

import { LUCK_GRADIENT, ITEM_DISTRIBUTION, PATHFINDER, DEEP_ZONE } from '../../utils/constants';

/**
 * 計算每日幸運梯度加成
 * 公式：T2_Rate = BASE_T2_RATE + (day / MAX_DAYS) × MAX_BONUS
 * @param streak 連續簽到天數
 * @returns T2 機率加成（%）
 */
export function calculateLuckGradient(streak: number): number {
  if (streak <= 0) return 0;
  
  const cappedStreak = Math.min(streak, LUCK_GRADIENT.MAX_DAYS);
  const bonus = (cappedStreak / LUCK_GRADIENT.MAX_DAYS) * LUCK_GRADIENT.MAX_BONUS;
  
  return Math.round(bonus * 100) / 100; // 保留兩位小數
}

/**
 * 計算最終 T2 掉落機率
 * @param baseRate 基礎機率（%）
 * @param streak 連續簽到天數
 * @param isPathfinder 是否為開拓者區域
 * @param currentT2Chance 當前 T2 機率（考慮衰減，可選）
 * @returns 最終 T2 機率（%）
 */
export function calculateT2DropRate(
  baseRate: number,
  streak: number,
  isPathfinder: boolean = false,
  currentT2Chance?: number
): number {
  // 如果提供了 currentT2Chance（考慮衰減），使用它作為基礎
  let rate = currentT2Chance !== undefined ? currentT2Chance : baseRate;
  
  // 如果沒有提供 currentT2Chance，應用傳統的幸運梯度
  if (currentT2Chance === undefined) {
    rate += calculateLuckGradient(streak);
  }
  
  // 應用開拓者紅利
  if (isPathfinder) {
    rate += PATHFINDER.T2_BONUS;
  }
  
  return Math.min(100, Math.max(0, rate)); // 限制在 0-100%
}

/**
 * 計算最終 T3 掉落機率
 * @param baseRate 基礎機率（%）
 * @param isInDeepZone 是否在深層領域（10km+）
 * @returns 最終 T3 機率（%）
 */
export function calculateT3DropRate(
  baseRate: number,
  isInDeepZone: boolean = false
): number {
  let rate = baseRate;
  
  // 應用深層領域倍率
  if (isInDeepZone) {
    rate *= DEEP_ZONE.T3_MULTIPLIER;
  }
  
  return Math.min(100, Math.max(0, rate)); // 限制在 0-100%
}

/**
 * 計算物品掉落機率（考慮所有加成）
 * @param tier 物品階層 (1, 2, 3)
 * @param streak 連續簽到天數
 * @param isPathfinder 是否為開拓者區域
 * @param isInDeepZone 是否在深層領域
 * @param currentT2Chance 當前 T2 機率（考慮衰減，可選）
 * @returns 掉落機率（%）
 */
export function calculateItemDropRate(
  tier: 1 | 2 | 3,
  streak: number = 0,
  isPathfinder: boolean = false,
  isInDeepZone: boolean = false,
  currentT2Chance?: number
): number {
  switch (tier) {
    case 1:
      // T1 機率 = 100% - T2% - T3%
      const t2Rate = calculateT2DropRate(
        ITEM_DISTRIBUTION.T2_PERCENTAGE,
        streak,
        isPathfinder,
        currentT2Chance
      );
      const t3Rate = calculateT3DropRate(
        ITEM_DISTRIBUTION.T3_PERCENTAGE,
        isInDeepZone
      );
      return Math.max(0, 100 - t2Rate - t3Rate);
      
    case 2:
      return calculateT2DropRate(
        ITEM_DISTRIBUTION.T2_PERCENTAGE,
        streak,
        isPathfinder,
        currentT2Chance
      );
      
    case 3:
      return calculateT3DropRate(
        ITEM_DISTRIBUTION.T3_PERCENTAGE,
        isInDeepZone
      );
      
    default:
      return 0;
  }
}

