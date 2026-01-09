/**
 * 卸貨力學計算模組（純函數）
 * Solefood MVP v8.7 (Final Consolidated Edition)
 */

import { UNLOADING, PAYOUT_MATRIX } from '../../utils/constants';
import { PayoutMode } from '../../types/game';

/**
 * 計算卸貨體力消耗
 * 公式：每卸下 1.0kg 消耗 2 點體力
 * @param weight 卸貨重量（kg）
 * @returns 體力消耗
 */
export function calculateUnloadStaminaCost(weight: number): number {
  return weight * UNLOADING.STAMINA_COST_PER_KG;
}

/**
 * 檢查是否可以卸貨
 * @param currentStamina 當前體力
 * @param weight 卸貨重量（kg）
 * @param mode 變現模式
 * @returns 是否可以卸貨
 */
export function canUnload(
  currentStamina: number,
  weight: number,
  mode: PayoutMode = 'normal'
): boolean {
  // M Ad (Porter) 和 M Info (Data) 免除體力消耗
  if (mode === 'porter' || mode === 'data') {
    return true;
  }
  
  // M Normal 需要足夠體力
  const requiredStamina = calculateUnloadStaminaCost(weight);
  return currentStamina >= requiredStamina;
}

/**
 * 計算變現倍率
 * @param mode 變現模式
 * @returns 倍率
 */
export function getPayoutMultiplier(mode: PayoutMode): number {
  switch (mode) {
    case 'normal':
      return PAYOUT_MATRIX.NORMAL;
    case 'porter':
      return PAYOUT_MATRIX.PORTER;
    case 'data':
      return PAYOUT_MATRIX.DATA;
    default:
      return PAYOUT_MATRIX.NORMAL;
  }
}

/**
 * 計算最終收益（十進位階梯制）
 * @param baseValue 基礎價值（$SOLE）
 * @param mode 變現模式
 * @param hygiene 衛生值（0-100，用於收益折損）
 * @returns 最終收益（$SOLE）
 * 
 * 十進位階梯制邏輯（Progressive Decile Tier System）：
 * - 90-100%: 1.0x (完美狀態)
 * - 80-89%: 0.9x (輕微磨損)
 * - 70-79%: 0.8x (中度磨損)
 * - ...
 * - 0-9%: 0.1x (幾近報廢)
 * 
 * 這讓「清潔」變得更有急迫性，因為一旦掉出 90% 的舒適圈，懲罰是持續加重的！
 */
export function calculateFinalPayout(
  baseValue: number,
  mode: PayoutMode,
  hygiene: number
): number {
  const multiplier = getPayoutMultiplier(mode);
  const baseEarnings = baseValue * multiplier;
  
  // 十進位階梯制：根據衛生值計算品質倍率
  const { getTieredMultiplier } = require('./tiered');
  const qualityMultiplier = getTieredMultiplier(hygiene);
  
  return baseEarnings * qualityMultiplier;
}

