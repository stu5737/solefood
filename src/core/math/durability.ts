/**
 * Durability 衰減計算模組（純函數）
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 本模組實現物理法則層的耐久度衰減計算
 */

/**
 * 計算耐久度衰減
 * 
 * 根據白皮書 v8.7 第五章：裝備維修與完美主義懲罰
 * 實現「工業強化」模式（Industrial Reinforcement）
 * 
 * 公式：decay = distance × (1 + (currentWeight × 0.15)) × 0.1
 * 
 * 重量因子計算：
 * - 負重越高，衰減越快
 * - 但大容量背包具有「工業強化」特性，每公斤的磨損率降低
 * - weightFactor = 1 + (currentWeight × 0.15)
 * - 係數從 0.5 降低到 0.15，確保高級玩家（Whales）仍能獲利
 * 
 * @param distance - 移動距離（公里）
 * @param currentWeight - 當前負重（kg）
 * @returns 耐久度衰減值（點數）
 * 
 * @example
 * ```typescript
 * // 無負重移動 1km
 * const decay1 = calculateDecay(1.0, 0); // 返回 0.1（基礎衰減）
 * 
 * // 10kg 負重移動 1km（新玩家）
 * const decay2 = calculateDecay(1.0, 10); // 返回 0.25（2.5x 係數）
 * 
 * // 30kg 負重移動 1km（高級玩家）
 * const decay3 = calculateDecay(1.0, 30); // 返回 0.55（5.5x 係數）
 * ```
 */
export function calculateDecay(distance: number, currentWeight: number): number {
  if (distance < 0) {
    throw new Error('Distance cannot be negative');
  }
  if (currentWeight < 0) {
    throw new Error('Current weight cannot be negative');
  }
  
  // 基礎衰減率：每公里 0.1 點
  // 根據白皮書，這是線性衰退的基礎值
  const baseDecayRate = 0.1;
  
  // 重量係數：負重越高，衰減越快
  // 工業強化模式：係數從 0.5 降低到 0.15
  // 這確保大容量背包（30kg）的磨損率不會過高
  // 當 currentWeight = 0 時，係數 = 1.0（無懲罰）
  // 當 currentWeight = 10 時，係數 = 2.5（2.5x 衰減）
  // 當 currentWeight = 30 時，係數 = 5.5（5.5x 衰減，而非之前的 16x）
  const weightCoefficient = 0.15; // 工業強化係數
  const weightFactor = 1 + (currentWeight * weightCoefficient);
  
  return distance * baseDecayRate * weightFactor;
}

/**
 * 計算基於耐久度的最大容量
 * 公式：maxWeight = baseMaxWeight × (durability / 100)
 * @param baseMaxWeight 基礎最大容量（kg）
 * @param durability 當前耐久度（0-100）
 * @returns 調整後的最大容量（kg）
 */
export function calculateMaxWeightFromDurability(
  baseMaxWeight: number,
  durability: number
): number {
  const durabilityRatio = Math.max(0, Math.min(100, durability)) / 100;
  return baseMaxWeight * durabilityRatio;
}

/**
 * 檢查耐久度是否為零（觸發零容忍）
 * @param durability 當前耐久度
 * @returns 是否為零
 */
export function isDurabilityZero(durability: number): boolean {
  return durability <= 0;
}

