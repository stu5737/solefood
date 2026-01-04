/**
 * Stamina 計算模組（純函數）
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 本模組實現物理法則層的體力消耗計算
 */

import { STAMINA, ITEM_PICKUP_COSTS } from '../../utils/constants';

/**
 * 計算移動體力消耗
 * 
 * 根據白皮書 v8.7 第二章：物理法則與體力經濟學
 * 公式：每移動 100 公尺消耗 1 點體力，即 1km = 10pts
 * 
 * @param distance - 移動距離（公里）
 * @returns 體力消耗值（點數）
 * 
 * @example
 * ```typescript
 * const burn = calculateMovementBurn(1.0); // 返回 10
 * const burn2 = calculateMovementBurn(0.5); // 返回 5
 * ```
 */
export function calculateMovementBurn(distance: number): number {
  if (distance < 0) {
    throw new Error('Distance cannot be negative');
  }
  return distance * STAMINA.BURN_PER_KM;
}

/**
 * 計算拾取物品的體力消耗
 * 
 * 根據白皮書 v8.7 第二章：雙重消耗模型
 * - T1 琥珀粗糖：消耗 3 點體力
 * - T2 翡翠晶糖：消耗 9 點體力
 * - T3 皇室純糖：消耗 30 點體力
 * 
 * @param tier - 物品階層 (1, 2, 3)
 * @returns 拾取消耗的體力值（點數）
 * 
 * @example
 * ```typescript
 * const cost1 = calculatePickupCost(1); // 返回 3
 * const cost2 = calculatePickupCost(2); // 返回 9
 * const cost3 = calculatePickupCost(3); // 返回 30
 * ```
 */
export function calculatePickupCost(tier: 1 | 2 | 3): number {
  switch (tier) {
    case 1:
      return ITEM_PICKUP_COSTS.T1;
    case 2:
      return ITEM_PICKUP_COSTS.T2;
    case 3:
      return ITEM_PICKUP_COSTS.T3;
    default:
      throw new Error(`Invalid tier: ${tier}. Must be 1, 2, or 3.`);
  }
}

/**
 * 計算重量懲罰
 * 負重越高，體力消耗越大
 * @param baseBurn 基礎消耗
 * @param currentWeight 當前負重（kg）
 * @param maxWeight 最大容量（kg）
 * @returns 調整後的體力消耗
 */
export function calculateWeightPenalty(
  baseBurn: number,
  currentWeight: number,
  maxWeight: number
): number {
  if (maxWeight === 0) return baseBurn; // 防止除零
  
  // 重量比例：currentWeight / maxWeight
  const weightRatio = currentWeight / maxWeight;
  
  // 懲罰係數：1.0 (無負重) 到 2.0 (滿負重)
  const penaltyMultiplier = 1.0 + weightRatio;
  
  return baseBurn * penaltyMultiplier;
}

/**
 * 計算總體力消耗（包含重量懲罰）
 * 
 * 這是移動體力消耗與重量懲罰的組合計算
 * 
 * @param distance - 距離（公里）
 * @param currentWeight - 當前負重（kg）
 * @param maxWeight - 最大容量（kg）
 * @returns 總體力消耗（點數）
 */
export function calculateTotalStaminaBurn(
  distance: number,
  currentWeight: number,
  maxWeight: number
): number {
  const baseBurn = calculateMovementBurn(distance);
  return calculateWeightPenalty(baseBurn, currentWeight, maxWeight);
}

/**
 * 檢查體力是否足夠
 * @param currentStamina 當前體力
 * @param requiredStamina 所需體力
 * @returns 是否足夠
 */
export function hasEnoughStamina(
  currentStamina: number,
  requiredStamina: number
): boolean {
  return currentStamina >= requiredStamina;
}

