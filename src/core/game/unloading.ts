/**
 * 卸貨結算邏輯
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 實現「卸貨後結算」模式：
 * - 耐久度和衛生值只在卸貨時一次性衰減
 * - 計算整個行程的累積磨損
 */

import { usePlayerStore } from '../../stores/playerStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { calculateFinalPayout } from '../math/unloading';
import { ITEM_VALUES } from '../../utils/constants';
import type { PayoutMode } from '../../types/game';

/**
 * 卸貨結算結果
 */
export interface UnloadSettlementResult {
  revenue: number;              // 最終收益（$SOLE）
  durabilityLoss: number;        // 耐久度損失
  hygieneLoss: number;           // 衛生值損失
  totalDistance: number;         // 總移動距離
  itemsDelivered: number;        // 交付物品數量
}

/**
 * 計算結算結果（不應用狀態變更）
 * 用於調試和預覽
 * 
 * @param mode - 變現模式（normal, porter, data）
 * @returns 結算結果（只計算，不應用）
 */
export function calculateSettlement(mode: PayoutMode = 'normal'): UnloadSettlementResult {
  const playerStore = usePlayerStore.getState();
  const sessionStore = useSessionStore.getState();
  const inventoryStore = useInventoryStore.getState();

  // 1. 獲取會話數據
  const totalDistance = sessionStore.totalDistance;
  const items = inventoryStore.items;
  const currentHygiene = playerStore.hygiene; // 使用當前衛生值計算收益

  // 2. 計算總耐久度損失（基於累積債務，而不是當前狀態）
  // 重要：使用累積債務模式，防止「負重卸載」作弊
  // 即使玩家在卸貨前減輕負重，債務仍然存在
  const totalDurabilityLoss = sessionStore.pendingDurabilityDebt;

  // 3. 計算總衛生值損失（基於累積債務，而不是當前庫存）
  // 重要：使用累積債務模式，確保即使物品被食用，債務仍然存在
  const totalHygieneLoss = sessionStore.pendingHygieneDebt;

  // 4. 計算基礎收益（所有物品的總價值）
  let baseValue = 0;
  items.forEach((item) => {
    const itemValue = ITEM_VALUES[`T${item.tier}` as 'T1' | 'T2' | 'T3'];
    baseValue += itemValue;
  });

  // 5. 計算最終收益（應用變現倍率和衛生值折損）
  const revenue = calculateFinalPayout(baseValue, mode, currentHygiene);

  // 6. 返回結算結果（不應用狀態變更）
  return {
    revenue,
    durabilityLoss: totalDurabilityLoss,
    hygieneLoss: totalHygieneLoss,
    totalDistance,
    itemsDelivered: items.length,
  };
}

/**
 * 執行卸貨結算
 * 
 * 流程：
 * 1. 獲取會話數據（總距離、物品列表）
 * 2. 計算總衰減（耐久度、衛生值）
 * 3. 計算收益（基於當前衛生值，因為衰減在收益計算後應用）
 * 4. 應用狀態變更（衰減、清空庫存、重置會話）
 * 
 * @param mode - 變現模式（normal, porter, data）
 * @returns 結算結果
 */
export function executeUnloadSettlement(mode: PayoutMode = 'normal'): UnloadSettlementResult {
  const playerStore = usePlayerStore.getState();
  const sessionStore = useSessionStore.getState();
  const inventoryStore = useInventoryStore.getState();

  // 1. 獲取會話數據
  const totalDistance = sessionStore.totalDistance;
  const items = inventoryStore.items;
  const currentHygiene = playerStore.hygiene; // 使用當前衛生值計算收益

  // 2. 計算總耐久度損失（基於累積債務，而不是當前狀態）
  // 重要：使用累積債務模式，防止「負重卸載」作弊
  // 即使玩家在卸貨前減輕負重，債務仍然存在
  // 這確保了「工業強化」數學模型的完整性
  const totalDurabilityLoss = sessionStore.pendingDurabilityDebt;

  // 3. 計算總衛生值損失（基於累積債務，而不是當前庫存）
  // 重要：使用累積債務模式，確保即使物品被食用，債務仍然存在
  // 這修復了漏洞：如果玩家在旅程中手動食用物品，結算時仍會扣除該物品造成的污染
  const totalHygieneLoss = sessionStore.pendingHygieneDebt;

  // 4. 計算基礎收益（所有物品的總價值）
  let baseValue = 0;
  items.forEach((item) => {
    const itemValue = ITEM_VALUES[`T${item.tier}` as 'T1' | 'T2' | 'T3'];
    baseValue += itemValue;
  });

  // 5. 計算最終收益（應用變現倍率和衛生值折損）
  // 注意：使用當前衛生值（100%）計算收益，因為衰減在收益計算後才應用
  const revenue = calculateFinalPayout(baseValue, mode, currentHygiene);

  // 6. 應用狀態變更
  // 6.1 衰減耐久度（會自動觸發 checkZeroTolerance）
  playerStore.updateDurability(-totalDurabilityLoss);

  // 6.2 衰減衛生值
  playerStore.updateHygiene(-totalHygieneLoss);

  // 6.3 清空庫存
  // 移除所有物品並重置重量
  // 注意：需要先複製 items 數組，因為 removeItem 會修改原數組
  const itemsToRemove = [...items];
  itemsToRemove.forEach((item) => {
    inventoryStore.removeItem(item.id);
  });
  // 重置重量（removeItem 會自動更新，但為了確保一致性，我們再次設置）
  playerStore.setWeight(0);

  // 6.4 重置會話（距離和估值）
  sessionStore.resetSession();
  
  // 6.5 重置衛生值債務（準備下一次行程）
  sessionStore.resetHygieneDebt();
  
  // 6.6 重置耐久度債務（準備下一次行程）
  sessionStore.resetDurabilityDebt();

  // 7. 返回結算結果
  const result: UnloadSettlementResult = {
    revenue,
    durabilityLoss: totalDurabilityLoss,
    hygieneLoss: totalHygieneLoss,
    totalDistance,
    itemsDelivered: items.length,
  };

  console.log('[UnloadSettlement] Settlement completed', result);

  return result;
}

