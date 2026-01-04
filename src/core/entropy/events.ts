/**
 * 熵事件類型定義
 * Solefood MVP v8.7 (Final Consolidated Edition)
 */

import type { Item } from '../../types/item';

/**
 * 移動輸入介面
 * 
 * 這是熵計算引擎的輸入數據結構
 */
export interface MovementInput {
  distance: number;    // 移動距離（公里）
  speed: number;       // 移動速度（km/h）
  timestamp: number;   // 時間戳（毫秒）
  forceLootTier?: 1 | 2 | 3; // 調試用：強制生成指定階層的物品（可選）
}

/**
 * 熵計算結果
 * 
 * 包含所有衰減計算的結果
 */
export interface EntropyResult {
  staminaBurn: number;      // 體力消耗
  durabilityDecay: number;  // 耐久度衰減
  hygieneDecay: number;     // 衛生值衰減
  timestamp: number;        // 計算時間戳
}

/**
 * 熵事件類型
 */
export type EntropyEventType = 
  | 'movement_processed'    // 移動事件已處理
  | 'stamina_depleted'      // 體力耗盡
  | 'durability_zero'        // 耐久度歸零
  | 'hygiene_low'          // 衛生值過低
  | 'loot_success'         // 拾取成功
  | 'loot_failed'          // 拾取失敗（超載或體力不足）
  | 'loot_intercept'       // 拾取攔截（用於救援機制）
  | 'loot_converted'       // 拾取轉換（背包滿時自動消耗恢復體力）
  | 'loot_rescue_available'; // 拾取救援可用（T3 體力不足，可看廣告）

/**
 * 拾取結果
 */
export interface LootResult {
  tier: 1 | 2 | 3;
  success: boolean;
  reason?: 'overload' | 'insufficient_stamina' | 'ghost_mode' | 'immobilized' | 'OVERLOAD_SOLVABLE' | 'OVERLOAD_IMPOSSIBLE' | 't3_rescue_available';
  itemId?: string;
  // 智能超載交換相關字段
  item?: Item;  // 等待拾取的物品
  cost?: number;  // 需要消耗的 T1 數量
  currentWeight?: number;  // 當前重量
  maxWeight?: number;  // 最大容量
  // 轉換溢出相關字段
  restoredAmount?: number;  // 恢復的體力值（已棄用，使用 grossAmount 和 netAmount）
  itemValue?: number;       // 物品價值（用於警告提示）
  grossAmount?: number;     // 總恢復值（食用恢復）
  netAmount?: number;        // 淨收益（總恢復 - 拾取成本）
  pickupCost?: number;       // 拾取成本（勞動成本）
}

/**
 * 熵事件
 */
export interface EntropyEvent {
  type: EntropyEventType;
  data: EntropyResult | LootResult | Record<string, unknown>;
  timestamp: number;
}

