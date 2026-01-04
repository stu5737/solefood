/**
 * Item 相關類型定義
 * Solefood MVP v8.7
 */

export type ItemTier = 1 | 2 | 3;

export interface Item {
  id: string;
  tier: ItemTier;
  weight: number;        // T1=0.5kg, T2=1.5kg, T3=4.0kg
  value: number;         // 基礎價值：T1=10, T2=50, T3=500 ($SOLE)
  pickupCost: number;   // 拾取消耗：T1=3, T2=9, T3=30
  timestamp: number;
  restoreStamina?: number; // 食用恢復體力：T1=5, T2=15, T3=100
}

export interface TierCount {
  t1: number;
  t2: number;
  t3: number;
}

export interface ItemDistribution {
  t1Percentage: number;
  t2Percentage: number;
  t3Percentage: number;
}

export interface InventoryState {
  items: Item[];
  totalWeight: number;
  tierCount: TierCount;
  distribution: ItemDistribution;
}

export interface InventoryActions {
  addItem: (item: Item) => boolean;
  removeItem: (itemId: string) => void;
  clearInventory: () => void;
  calculateTotalWeight: () => number;
  canPickup: (item: Item) => boolean;
  updateTierCount: () => void;
  updateDistribution: () => void;
}

export type InventoryStore = InventoryState & InventoryActions;

