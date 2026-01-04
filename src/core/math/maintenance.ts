/**
 * 維護成本計算模組（純函數）
 * Solefood MVP v8.7 (Final Consolidated Edition)
 */

import { HYGIENE, HEAVY_DUTY_TAX } from '../../utils/constants';

/**
 * 計算清潔費
 * 公式：每 1% 汙染 = 2 $SOLE
 * @param hygiene 當前衛生值（0-100）
 * @returns 清潔費（$SOLE）
 */
export function calculateCleanCost(hygiene: number): number {
  const contamination = HYGIENE.MAX_HYGIENE - hygiene;
  return contamination * HYGIENE.CLEAN_COST_PER_PERCENT;
}

/**
 * 計算重裝稅（動態維修費）
 * 公式：cost = BASE_COST_PER_POINT × (1 + (baseMaxWeight - 10) / 10)
 * @param baseMaxWeight 基礎最大容量（kg）
 * @param points 需要修復的點數
 * @returns 維修費（$SOLE）
 */
export function calculateHeavyDutyTax(
  baseMaxWeight: number,
  points: number
): number {
  const multiplier = 1 + (baseMaxWeight - 10) / 10;
  return HEAVY_DUTY_TAX.BASE_COST_PER_POINT * multiplier * points;
}

/**
 * 計算基於衛生值的收益折損
 * 公式：收益 = 基礎收益 × (hygiene / 100)
 * @param baseEarnings 基礎收益（$SOLE）
 * @param hygiene 當前衛生值（0-100）
 * @returns 實際收益（$SOLE）
 */
export function calculateEarningsWithHygienePenalty(
  baseEarnings: number,
  hygiene: number
): number {
  const hygieneRatio = Math.max(0, Math.min(HYGIENE.MAX_HYGIENE, hygiene)) / HYGIENE.MAX_HYGIENE;
  return baseEarnings * hygieneRatio;
}

/**
 * 計算衛生值汙染
 * @param tier 物品階層 (1, 2, 3)
 * @returns 汙染值（百分比）
 */
export function calculateContamination(tier: 1 | 2 | 3): number {
  switch (tier) {
    case 1:
      return HYGIENE.CONTAMINATION.T1;
    case 2:
      return HYGIENE.CONTAMINATION.T2;
    case 3:
      return HYGIENE.CONTAMINATION.T3;
    default:
      return 0;
  }
}

