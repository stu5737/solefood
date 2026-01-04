/**
 * InventoryState Store
 * 管理玩家的物品庫存
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 本 Store 實現狀態管理層，與 playerStore 進行跨 Store 通信
 */

import { create } from 'zustand';
import { Item, ItemTier } from '../types/item';
import { ITEM_CONSUME_RESTORE } from '../utils/constants';
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
}));
