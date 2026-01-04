/**
 * Player 相關類型定義
 * Solefood MVP v8.7
 */

export interface PlayerState {
  // 核心屬性
  stamina: number;
  maxStamina: number;
  
  // 容量系統
  currentWeight: number;
  maxWeight: number;
  baseMaxWeight: number;
  
  // 耐久系統
  durability: number;
  maxDurability: number;
  
  // 衛生系統
  hygiene: number;
  maxHygiene: number;
  
  // 狀態標誌
  isGhost: boolean;
  isImmobilized: boolean;
}

export interface PlayerActions {
  consumeStamina: (amount: number) => void;
  restoreStamina: (amount: number) => void;
  updateWeight: (weight: number) => void;
  decayDurability: (amount: number) => void;
  restoreDurability: (amount: number) => void;
  decayHygiene: (amount: number) => void;
  restoreHygiene: (amount: number) => void;
  checkZeroTolerance: () => void;
  resetPlayer: () => void;
  
  // 新增：卸貨力學
  calculateUnloadCost: (weight: number) => number;
  canUnload: (weight: number) => boolean;
  
  // 新增：清潔費計算
  calculateCleanCost: () => number;
  
  // 新增：重裝稅計算
  calculateRepairCost: (points: number) => number;
  
  // 新增：背包擴容
  expandCapacity: (units: number) => { success: boolean; cost: number; newCapacity: number };
  
  // 新增：緊急維修（零容忍崩塌後）
  emergencyRepair: (cost: number) => boolean;
}

export type PlayerStore = PlayerState & PlayerActions;

