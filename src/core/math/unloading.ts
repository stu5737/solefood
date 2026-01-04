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
 * 計算最終收益
 * @param baseValue 基礎價值（$SOLE）
 * @param mode 變現模式
 * @param hygiene 衛生值（0-100，用於收益折損）
 * @returns 最終收益（$SOLE）
 */
export function calculateFinalPayout(
  baseValue: number,
  mode: PayoutMode,
  hygiene: number
): number {
  const multiplier = getPayoutMultiplier(mode);
  const baseEarnings = baseValue * multiplier;
  
  // 應用衛生值折損
  const hygieneRatio = hygiene / 100;
  return baseEarnings * hygieneRatio;
}

