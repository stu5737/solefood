/**
 * Hygiene 衰減計算模組（純函數）
 * Solefood MVP v8.7
 */

import { HYGIENE } from '../../utils/constants';

/**
 * 計算衛生值衰減
 * 公式：decay = time × activityMultiplier
 * @param timeElapsed 經過時間（小時）
 * @param activityMultiplier 活動強度係數（預設 1.0）
 * @returns 衛生值衰減值
 */
export function calculateHygieneDecay(
  timeElapsed: number,
  activityMultiplier: number = 1.0
): number {
  // 基礎衰減率：每小時 0.5 點（可調整）
  const baseDecayRate = 0.5;
  
  return timeElapsed * baseDecayRate * activityMultiplier;
}

/**
 * 計算基於衛生值的收益懲罰
 * 衛生值越低，收益越少
 * @param baseEarnings 基礎收益
 * @param hygiene 當前衛生值（0-100）
 * @returns 調整後的收益
 */
export function calculateEarningsWithHygienePenalty(
  baseEarnings: number,
  hygiene: number
): number {
  // 衛生值比例：0.0 (最低) 到 1.0 (最高)
  const hygieneRatio = Math.max(0, Math.min(HYGIENE.MAX_HYGIENE, hygiene)) / HYGIENE.MAX_HYGIENE;
  
  // 收益係數：0.5 (最低衛生) 到 1.0 (最高衛生)
  const earningsMultiplier = 0.5 + (hygieneRatio * 0.5);
  
  return baseEarnings * earningsMultiplier;
}

/**
 * 檢查衛生值是否過低（影響收益）
 * @param hygiene 當前衛生值
 * @param threshold 閾值（預設 30）
 * @returns 是否過低
 */
export function isHygieneLow(hygiene: number, threshold: number = 30): boolean {
  return hygiene < threshold;
}

