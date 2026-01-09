/**
 * 階梯式倍率計算模組（純函數）
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 實現「十進位階梯制 (Decile Tier System)」：
 * - 90-100%: 1.0x (完美狀態)
 * - 80-89%: 0.9x (輕微磨損)
 * - 70-79%: 0.8x (中度磨損)
 * - ...
 * - 0-9%: 0.1x (幾近報廢)
 * 
 * 應用於：
 * - 耐久度 → 容量倍率
 * - 衛生值 → 收益倍率
 */

/**
 * 計算階梯式倍率
 * 
 * 公式：
 * - 90-100%: 1.0x
 * - 80-89%: 0.9x
 * - 70-79%: 0.8x
 * - 60-69%: 0.7x
 * - 50-59%: 0.6x
 * - 40-49%: 0.5x
 * - 30-39%: 0.4x
 * - 20-29%: 0.3x
 * - 10-19%: 0.2x
 * - 0-9%: 0.1x
 * 
 * 計算邏輯：
 * multiplier = (floor(value / 10) + 1) / 10
 * 
 * 範例：
 * - 95% → floor(9.5) + 1 = 10 → 1.0x
 * - 85% → floor(8.5) + 1 = 9 → 0.9x
 * - 72% → floor(7.2) + 1 = 8 → 0.8x
 * - 5% → floor(0.5) + 1 = 1 → 0.1x
 * 
 * @param value - 數值（0-100）
 * @returns 倍率（0.1 - 1.0）
 */
export function getTieredMultiplier(value: number): number {
  // 確保數值在 0-100 範圍內
  const safeValue = Math.max(0, Math.min(100, value));
  
  // 90-100% 直接返回 1.0x
  if (safeValue >= 90) {
    return 1.0;
  }
  
  // 計算階梯倍率：floor(value / 10) + 1，然後除以 10
  // 這確保每個 10% 區間對應一個倍率階梯
  const tier = Math.floor(safeValue / 10) + 1;
  const multiplier = tier / 10;
  
  // 確保倍率在 0.1 - 1.0 範圍內
  return Math.max(0.1, Math.min(1.0, multiplier));
}

/**
 * 獲取階梯狀態描述
 * 
 * @param value - 數值（0-100）
 * @returns 狀態描述
 */
export function getTierStatus(value: number): string {
  const safeValue = Math.max(0, Math.min(100, value));
  const multiplier = getTieredMultiplier(safeValue);
  
  if (multiplier >= 1.0) {
    return '✨ 完美 (Perfect)';
  } else if (multiplier >= 0.9) {
    return '👌 良好 (Good)';
  } else if (multiplier >= 0.8) {
    return '⚠️ 普通 (Fair)';
  } else if (multiplier >= 0.7) {
    return '📉 磨損 (Worn)';
  } else if (multiplier >= 0.6) {
    return '🔧 需要維修 (Needs Repair)';
  } else if (multiplier >= 0.5) {
    return '⚠️ 嚴重磨損 (Severely Worn)';
  } else if (multiplier >= 0.4) {
    return '🚨 危險狀態 (Critical)';
  } else if (multiplier >= 0.3) {
    return '💀 幾近報廢 (Near Ruined)';
  } else if (multiplier >= 0.2) {
    return '💀 報廢邊緣 (Ruined Edge)';
  } else {
    return '💀 報廢 (Ruined)';
  }
}
