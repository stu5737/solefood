/**
 * InventoryState Store
 * 管理玩家的物品庫存
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 本 Store 實現狀態管理層，與 playerStore 進行跨 Store 通信
 */

import { create } from 'zustand';
import { Item, ItemTier } from '../types/item';
import { ITEM_CONSUME_RESTORE, ITEM_WEIGHTS, ITEM_VALUES, ITEM_PICKUP_COSTS, ITEM_DISTRIBUTION } from '../utils/constants';
import { usePlayerStore } from './playerStore';
import { calculatePickupCost } from '../core/math/stamina';

/**
 * InventoryState 介面定義
 */
interface InventoryState {
  items: Item[];            // 物品列表
  totalWeight: number;      // 總重量（自動計算）
}

/**
 * InventoryActions 介面定義
 */
interface InventoryActions {
  /**
   * 添加物品
   * 
   * 驗證流程：
   * 1. FIRST: 檢查容量 - (currentWeight + item.weight) <= playerStore.maxWeight
   * 2. SECOND: 檢查體力 - playerStore.stamina >= item.pickupCost
   * 
   * 如果通過驗證，添加物品並更新 totalWeight
   * 
   * @param item - 要添加的物品
   * @returns 是否成功添加
   */
  addItem: (item: Item) => boolean;
  
  /**
   * 移除物品
   * 
   * @param id - 物品 ID
   */
  removeItem: (id: string) => void;
  
  /**
   * 檢查是否可以拾取物品
   * 
   * 驗證流程：
   * 1. 檢查是否處於 Ghost Mode 或 Immobilized
   * 2. 檢查容量（使用有效最大容量，考慮階層閾值）
   * 3. 檢查體力
   * 
   * @param item - 要檢查的物品
   * @returns 是否可以拾取
   */
  canPickup: (item: Item) => boolean;
  
  /**
   * 消耗物品（食用）
   * 
   * 移除物品並根據 Tier 恢復體力：
   * - T1: +5 體力
   * - T2: +15 體力
   * - T3: +100 體力
   * 
   * @param id - 物品 ID
   */
  consumeItem: (id: string) => void;

  /**
   * 強制消耗物品（用於測試，無視體力上限）
   * 
   * @param id - 物品 ID
   */
  forceConsumeItem: (id: string) => void;

  /**
   * 消耗指定階層的物品（正常邏輯，檢查體力上限）
   * 
   * @param tier - 物品階層 (1, 2, 3)
   * @returns 是否成功消耗
   */
  consumeItemByTier: (tier: ItemTier) => boolean;

  /**
   * 強制消耗指定階層的物品（無視體力上限，用於測試）
   * 
   * @param tier - 物品階層 (1, 2, 3)
   * @returns 是否成功消耗
   */
  forceConsumeItemByTier: (tier: ItemTier) => boolean;

  /**
   * 添加測試物品（用於開發者控制台）
   * 
   * @param tier - 物品階層 (1, 2, 3)
   * @returns 是否成功添加
   */
  addTestItem: (tier: ItemTier) => boolean;

  /**
   * 添加隨機物品（用於測試或實際遊戲）
   * 
   * @param options - 可選配置
   * @param options.pathfinderBonus - 開拓者紅利加成（T2 掉落率加成）
   * @param options.streak - 連續簽到天數
   * @param options.isInDeepZone - 是否在深層領域
   * @returns 添加的物品或 null
   */
  addRandomItem: (options?: {
    pathfinderBonus?: number;
    streak?: number;
    isInDeepZone?: boolean;
  }) => Item | null;
}

type InventoryStore = InventoryState & InventoryActions;

const initialState: InventoryState = {
  items: [],
  totalWeight: 0,
};

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  ...initialState,

  /**
   * 檢查是否可以拾取物品
   * 
   * 驗證流程：
   * 1. FIRST: 檢查容量 - (currentWeight + item.weight) <= playerStore.maxWeight
   * 2. SECOND: 檢查體力 - playerStore.stamina >= item.pickupCost
   * 3. 檢查 Ghost Mode 和 Immobilized 狀態
   * 
   * @param item - 要檢查的物品
   * @returns 是否可以拾取
   */
  canPickup: (item: Item) => {
    const playerState = usePlayerStore.getState();
    const { totalWeight } = get();
    
    // 檢查是否處於 Ghost Mode 或 Immobilized
    if (playerState.isGhost || playerState.isImmobilized) {
      return false;
    }
    
    // FIRST: 檢查容量（使用有效最大容量，考慮階層閾值）
    // getEffectiveMaxWeight 現在會自動從 sessionStore 獲取臨時擴容狀態
    const effectiveMaxWeight = playerState.getEffectiveMaxWeight();
    const wouldExceedWeight = totalWeight + item.weight > effectiveMaxWeight;
    
    // SECOND: 檢查體力
    const requiredStamina = calculatePickupCost(item.tier);
    const insufficientStamina = playerState.stamina < requiredStamina;
    
    return !wouldExceedWeight && !insufficientStamina;
  },

  /**
   * 添加物品
   * 
   * 跨 Store 通信模式：
   * 使用 usePlayerStore.getState() 訪問 playerStore 的狀態
   * 進行容量和體力驗證
   */
  addItem: (item: Item) => {
    const playerState = usePlayerStore.getState();
    const { items, totalWeight } = get();
    
    // FIRST: 檢查容量（使用有效最大容量，考慮階層閾值）
    // 驗證：currentWeight + item.weight <= effectiveMaxWeight
    // getEffectiveMaxWeight 現在會自動從 sessionStore 獲取臨時擴容狀態
    const effectiveMaxWeight = playerState.getEffectiveMaxWeight();
    const wouldExceedWeight = totalWeight + item.weight > effectiveMaxWeight;
    
    if (wouldExceedWeight) {
      console.warn('[InventoryStore] Cannot add item: Weight limit exceeded', {
        itemId: item.id,
        currentWeight: totalWeight,
        itemWeight: item.weight,
        maxWeight: playerState.maxWeight,
      });
      return false;
    }
    
    // SECOND: 檢查體力
    // 驗證：stamina >= item.pickupCost
    // 使用 calculatePickupCost 確保邏輯一致性
    const requiredStamina = calculatePickupCost(item.tier);
    const insufficientStamina = playerState.stamina < requiredStamina;
    
    if (insufficientStamina) {
      console.warn('[InventoryStore] Cannot add item: Insufficient stamina', {
        itemId: item.id,
        currentStamina: playerState.stamina,
        requiredStamina,
      });
      return false;
    }
    
    // 檢查是否處於 Ghost Mode 或 Immobilized
    if (playerState.isGhost || playerState.isImmobilized) {
      console.warn('[InventoryStore] Cannot add item: Player is in Ghost Mode or Immobilized');
      return false;
    }
    
    // 通過所有驗證，添加物品
    const newItems = [...items, item];
    const newTotalWeight = totalWeight + item.weight;
    
    set({
      items: newItems,
      totalWeight: newTotalWeight,
    });
    
    // 消耗體力（使用 calculatePickupCost 計算的消耗值）
    usePlayerStore.getState().updateStamina(-requiredStamina);
    
    // 同步更新 PlayerState 的 currentWeight
    usePlayerStore.getState().setWeight(newTotalWeight);
    
    console.log('[InventoryStore] Item added successfully', {
      itemId: item.id,
      tier: item.tier,
      newTotalWeight,
    });
    
    return true;
  },

  /**
   * 移除物品
   * 
   * @param id - 物品 ID
   */
  removeItem: (id: string) => {
    const { items, totalWeight } = get();
    const item = items.find((i) => i.id === id);
    
    if (!item) {
      console.warn('[InventoryStore] Item not found:', id);
      return;
    }
    
    const newItems = items.filter((i) => i.id !== id);
    const newTotalWeight = totalWeight - item.weight;
    
    set({
      items: newItems,
      totalWeight: newTotalWeight,
    });
    
    // 同步更新 PlayerState 的 currentWeight
    usePlayerStore.getState().setWeight(newTotalWeight);
    
    console.log('[InventoryStore] Item removed', {
      itemId: id,
      newTotalWeight,
    });
  },

  /**
   * 消耗物品（食用）
   * 
   * 根據物品 Tier 恢復體力：
   * - T1: +5 體力
   * - T2: +15 體力
   * - T3: +100 體力
   * 
   * @param id - 物品 ID
   */
  consumeItem: (id: string) => {
    const { items, totalWeight } = get();
    const item = items.find((i) => i.id === id);
    
    if (!item) {
      console.warn('[InventoryStore] Item not found for consumption:', id);
      return;
    }
    
    // 計算恢復的體力值
    let restoreAmount: number;
    switch (item.tier) {
      case 1:
        restoreAmount = ITEM_CONSUME_RESTORE.T1;
        break;
      case 2:
        restoreAmount = ITEM_CONSUME_RESTORE.T2;
        break;
      case 3:
        restoreAmount = ITEM_CONSUME_RESTORE.T3;
        break;
      default:
        restoreAmount = 0;
    }
    
    // 移除物品
    const newItems = items.filter((i) => i.id !== id);
    const newTotalWeight = totalWeight - item.weight;
    
    set({
      items: newItems,
      totalWeight: newTotalWeight,
    });
    
    // 恢復體力
    usePlayerStore.getState().updateStamina(restoreAmount);
    
    // 同步更新 PlayerState 的 currentWeight
    usePlayerStore.getState().setWeight(newTotalWeight);
    
    console.log('[InventoryStore] Item consumed', {
      itemId: id,
      tier: item.tier,
      restoreAmount,
      newTotalWeight,
    });
  },

  /**
   * 強制消耗物品（用於測試，無視體力上限）
   * 
   * @param id - 物品 ID
   */
  forceConsumeItem: (id: string) => {
    const { items, totalWeight } = get();
    const item = items.find((i) => i.id === id);
    
    if (!item) {
      console.warn('[InventoryStore] Item not found for force consumption:', id);
      return;
    }
    
    // 計算恢復的體力值
    let restoreAmount: number;
    switch (item.tier) {
      case 1:
        restoreAmount = ITEM_CONSUME_RESTORE.T1;
        break;
      case 2:
        restoreAmount = ITEM_CONSUME_RESTORE.T2;
        break;
      case 3:
        restoreAmount = ITEM_CONSUME_RESTORE.T3;
        break;
      default:
        restoreAmount = 0;
    }
    
    // 移除物品
    const newItems = items.filter((i) => i.id !== id);
    const newTotalWeight = totalWeight - item.weight;
    
    set({
      items: newItems,
      totalWeight: newTotalWeight,
    });
    
    // 強制恢復體力（無視上限，允許溢出）
    const playerState = usePlayerStore.getState();
    const newStamina = playerState.stamina + restoreAmount;
    usePlayerStore.setState({ stamina: newStamina });
    
    // 同步更新 PlayerState 的 currentWeight
    usePlayerStore.getState().setWeight(newTotalWeight);
    
    console.log('[InventoryStore] Item force consumed (stamina may overflow)', {
      itemId: id,
      tier: item.tier,
      restoreAmount,
      newStamina,
      newTotalWeight,
    });
  },

  /**
   * 消耗指定階層的物品（正常邏輯，檢查體力上限）
   * 
   * @param tier - 物品階層 (1, 2, 3)
   * @returns 是否成功消耗
   */
  consumeItemByTier: (tier: ItemTier) => {
    const { items } = get();
    const item = items.find((i) => i.tier === tier);
    
    if (!item) {
      console.warn(`[InventoryStore] No T${tier} item found for consumption`);
      return false;
    }
    
    get().consumeItem(item.id);
    return true;
  },

  /**
   * 強制消耗指定階層的物品（無視體力上限，用於測試）
   * 
   * @param tier - 物品階層 (1, 2, 3)
   * @returns 是否成功消耗
   */
  forceConsumeItemByTier: (tier: ItemTier) => {
    const { items } = get();
    const item = items.find((i) => i.tier === tier);
    
    if (!item) {
      console.warn(`[InventoryStore] No T${tier} item found for force consumption`);
      return false;
    }
    
    get().forceConsumeItem(item.id);
    return true;
  },

  /**
   * 添加測試物品（用於開發者控制台）
   * 
   * @param tier - 物品階層 (1, 2, 3)
   * @returns 是否成功添加
   */
  addTestItem: (tier: ItemTier) => {
    const item: Item = {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tier,
      weight: ITEM_WEIGHTS[`T${tier}` as 'T1' | 'T2' | 'T3'],
      value: ITEM_VALUES[`T${tier}` as 'T1' | 'T2' | 'T3'],
      pickupCost: ITEM_PICKUP_COSTS[`T${tier}` as 'T1' | 'T2' | 'T3'],
      timestamp: Date.now(),
      restoreStamina: ITEM_CONSUME_RESTORE[`T${tier}` as 'T1' | 'T2' | 'T3'],
    };
    
    return get().addItem(item);
  },

  /**
   * 添加隨機物品（用於測試或實際遊戲）
   * 🆕 Phase 2：整合開拓者紅利到掉落率計算
   * 
   * @param options - 可選配置
   * @returns 添加的物品或 null
   */
  addRandomItem: (options?: {
    pathfinderBonus?: number;
    streak?: number;
    isInDeepZone?: boolean;
  }): Item | null => {
    const { pathfinderBonus = 0, streak = 0, isInDeepZone = false } = options || {};
    
    // ✅ 診斷 Log 3：函數調用參數
    console.log('🔍 [診斷] addRandomItem 調用', {
      pathfinderBonus,
      streak,
      isInDeepZone,
      hasOptions: !!options,
    });
    
    // 🎲 使用動態掉落率計算（考慮開拓者紅利）
    const { calculateItemDropRate } = require('../core/math/luck');
    const { useSessionStore } = require('./sessionStore');
    
    // 獲取當前 T2 機率（考慮衰減）
    const sessionState = useSessionStore.getState();
    const currentT2Chance = sessionState.luckGradient?.currentT2Chance;
    
    // 是否為開拓者區域（有紅利加成）
    const isPathfinder = pathfinderBonus > 0;
    
    // 計算實際掉落率
    const t1Rate = calculateItemDropRate(1, streak, isPathfinder, isInDeepZone, currentT2Chance);
    const t2Rate = calculateItemDropRate(2, streak, isPathfinder, isInDeepZone, currentT2Chance);
    const t3Rate = calculateItemDropRate(3, streak, isPathfinder, isInDeepZone);
    
    console.log('🎲 [掉落率計算]', {
      開拓者紅利: pathfinderBonus > 0 ? `+${pathfinderBonus}%` : '無',
      T1機率: `${t1Rate.toFixed(1)}%`,
      T2機率: `${t2Rate.toFixed(1)}%`,
      T3機率: `${t3Rate.toFixed(1)}%`,
    });
    
    // ✅ 診斷 Log 4：掉落率計算詳細
    console.log('🔍 [診斷] 掉落率詳細計算', {
      輸入參數: {
        pathfinderBonus,
        isPathfinder,
        streak,
        isInDeepZone,
        currentT2Chance,
      },
      計算結果: {
        T1: `${t1Rate.toFixed(1)}%`,
        T2: `${t2Rate.toFixed(1)}%`,
        T3: `${t3Rate.toFixed(1)}%`,
      },
      預期T2: isPathfinder ? '24.0%' : '14.0%',
      實際T2: `${t2Rate.toFixed(1)}%`,
      是否匹配: isPathfinder ? (t2Rate >= 23 && t2Rate <= 25) : (t2Rate >= 13 && t2Rate <= 15),
    });
    
    // 根據計算的機率隨機生成階層
    const rand = Math.random() * 100;
    let tier: ItemTier;
    
    if (rand < t1Rate) {
      tier = 1;
    } else if (rand < t1Rate + t2Rate) {
      tier = 2;
    } else {
      tier = 3;
    }
    
    const item: Item = {
      id: `random_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tier,
      weight: ITEM_WEIGHTS[`T${tier}` as 'T1' | 'T2' | 'T3'],
      value: ITEM_VALUES[`T${tier}` as 'T1' | 'T2' | 'T3'],
      pickupCost: ITEM_PICKUP_COSTS[`T${tier}` as 'T1' | 'T2' | 'T3'],
      timestamp: Date.now(),
      restoreStamina: ITEM_CONSUME_RESTORE[`T${tier}` as 'T1' | 'T2' | 'T3'],
    };
    
    const success = get().addItem(item);
    return success ? item : null;
  },
}));
