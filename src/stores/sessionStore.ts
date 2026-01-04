/**
 * SessionState Store
 * 追蹤實時會話指標和救援可用性
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 本 Store 實現狀態管理層，使用核心數學函數計算估值
 */

import { create } from 'zustand';
import { calculateValue } from '../core/math/valuation';
import type { Item } from '../types/item';

/**
 * 救援廣告類型
 */
type RescueType = 'stamina' | 'capacity' | 'revival';

/**
 * 救援廣告上限配置
 */
interface AdCap {
  used: number;      // 已使用次數
  cap: number;       // 每日上限
}

/**
 * 待救援物品狀態
 */
export interface PendingEncounter {
  item: Item;                    // 待救援的物品（任意階層）
  status: 'PENDING_AD';          // 狀態：等待廣告救援
  timestamp: number;             // 觸發時間戳
}

/**
 * SessionState 介面定義
 */
interface SessionState {
  totalDistance: number;        // 總移動距離（km）
  estimatedValue: number;       // 估算價值（USD）
  pendingHygieneDebt: number;   // 累積衛生值債務（百分比）
  pendingDurabilityDebt: number; // 累積耐久度債務（百分比）
  currentEncounter: PendingEncounter | null; // 當前待救援物品（通用型，支援所有階層）
  adCaps: {                     // 廣告上限追蹤
    stamina: AdCap;
    capacity: AdCap;
    revival: AdCap;
  };
}

/**
 * SessionActions 介面定義
 */
interface SessionActions {
  /**
   * 添加距離
   * 
   * 更新 totalDistance，並使用 calculateValue 重新計算 estimatedValue
   * 
   * @param km - 新增的距離（公里）
   */
  addDistance: (km: number) => void;
  
  /**
   * 觸發救援廣告
   * 
   * 檢查 adCaps[type].used < cap
   * 如果通過，增加使用次數並返回 true
   * 
   * @param type - 救援類型 ('stamina' | 'capacity' | 'revival')
   * @returns 是否成功觸發
   */
  triggerRescue: (type: RescueType) => boolean;
  
  /**
   * 重置會話數據
   * 
   * 在卸貨結算後重置距離和估值
   */
  resetSession: () => void;
  
  /**
   * 添加衛生值債務
   * 
   * 當物品進入背包時，記錄衛生值污染債務
   * 即使物品後來被食用，債務仍然存在
   * 
   * @param amount - 衛生值污染量（百分比，負數）
   */
  addHygieneDebt: (amount: number) => void;
  
  /**
   * 重置衛生值債務
   * 
   * 在卸貨結算後重置債務，準備下一次行程
   */
  resetHygieneDebt: () => void;
  
  /**
   * 添加耐久度債務
   * 
   * 當玩家移動時，記錄耐久度磨損債務
   * 使用「工業強化」數學模型計算
   * 即使玩家在卸貨前減輕負重，債務仍然存在
   * 
   * @param amount - 耐久度磨損量（百分比）
   */
  addDurabilityDebt: (amount: number) => void;
  
  /**
   * 重置耐久度債務
   * 
   * 在卸貨結算後重置債務，準備下一次行程
   */
  resetDurabilityDebt: () => void;
  
  /**
   * 設置待救援物品（通用型）
   * 
   * 當玩家觸發廣告救援時，立即保存物品狀態到持久化存儲
   * 支援所有階層的物品（T1/T2/T3），不限制於 T3
   * 
   * @param item - 待救援的物品
   */
  setPendingEncounter: (item: Item) => void;
  
  /**
   * 清除待救援物品
   * 
   * 在廣告救援成功完成後，清除待救援狀態
   * 確保交易原子性：只有在物品成功添加到背包後才清除
   */
  clearPendingEncounter: () => void;
}

type SessionStore = SessionState & SessionActions;

const initialState: SessionState = {
  totalDistance: 0,
  estimatedValue: 0,
  pendingHygieneDebt: 0,      // 累積衛生值債務（初始為 0）
  pendingDurabilityDebt: 0,   // 累積耐久度債務（初始為 0）
  currentEncounter: null,      // 當前待救援物品（初始為 null）
  adCaps: {
    stamina: {
      used: 0,
      cap: 5,  // 每日上限 5 次
    },
    capacity: {
      used: 0,
      cap: 3,  // 每日上限 3 次
    },
    revival: {
      used: 0,
      cap: 1,  // 每日上限 1 次
    },
  },
};

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...initialState,

  /**
   * 添加距離
   * 
   * 使用 calculateValue 函數重新計算估值
   * 確保邏輯一致性（50km = $1.00 USD）
   * 
   * @param km - 新增的距離（公里）
   */
  addDistance: (km: number) => {
    if (km < 0) {
      throw new Error('Distance cannot be negative');
    }
    
    set((state) => {
      const newTotalDistance = state.totalDistance + km;
      
      // 使用 calculateValue 重新計算估值
      // 這確保了邏輯一致性：50km = $1.00 USD
      const newEstimatedValue = calculateValue(newTotalDistance);
      
      return {
        totalDistance: newTotalDistance,
        estimatedValue: newEstimatedValue,
      };
    });
    
    console.log('[SessionStore] Distance added', {
      added: km,
      total: get().totalDistance,
      value: get().estimatedValue,
    });
  },

  /**
   * 觸發救援廣告
   * 
   * 驗證流程：
   * 1. 檢查 adCaps[type].used < cap
   * 2. 如果通過，增加 used 計數並返回 true
   * 3. 如果失敗，返回 false
   * 
   * @param type - 救援類型
   * @returns 是否成功觸發
   */
  triggerRescue: (type: RescueType) => {
    const { adCaps } = get();
    const adCap = adCaps[type];
    
    // 檢查是否超過上限
    if (adCap.used >= adCap.cap) {
      console.warn('[SessionStore] Rescue ad cap reached', {
        type,
        used: adCap.used,
        cap: adCap.cap,
      });
      return false;
    }
    
    // 增加使用次數
    set((state) => ({
      adCaps: {
        ...state.adCaps,
        [type]: {
          ...state.adCaps[type],
          used: state.adCaps[type].used + 1,
        },
      },
    }));
    
    console.log('[SessionStore] Rescue ad triggered', {
      type,
      used: get().adCaps[type].used,
      cap: get().adCaps[type].cap,
    });
    
    return true;
  },

  /**
   * 重置會話數據
   * 
   * 在卸貨結算後重置距離和估值，準備下一次行程
   */
  resetSession: () => {
    set({
      totalDistance: 0,
      estimatedValue: 0,
    });
    
    console.log('[SessionStore] Session reset');
  },
  
  /**
   * 添加衛生值債務
   * 
   * 當物品進入背包時，記錄衛生值污染債務
   * 即使物品後來被食用，債務仍然存在
   * 
   * @param amount - 衛生值污染量（百分比，負數）
   */
  addHygieneDebt: (amount: number) => {
    set((state) => {
      const newDebt = state.pendingHygieneDebt + amount;
      
      console.log('[SessionStore] Hygiene debt added', {
        added: amount,
        totalDebt: newDebt,
      });
      
      return {
        pendingHygieneDebt: newDebt,
      };
    });
  },
  
  /**
   * 重置衛生值債務
   * 
   * 在卸貨結算後重置債務，準備下一次行程
   */
  resetHygieneDebt: () => {
    set({
      pendingHygieneDebt: 0,
    });
    
    console.log('[SessionStore] Hygiene debt reset');
  },
  
  /**
   * 添加耐久度債務
   * 
   * 當玩家移動時，記錄耐久度磨損債務
   * 使用「工業強化」數學模型計算
   * 即使玩家在卸貨前減輕負重，債務仍然存在
   * 
   * @param amount - 耐久度磨損量（百分比）
   */
  addDurabilityDebt: (amount: number) => {
    set((state) => {
      const newDebt = state.pendingDurabilityDebt + amount;
      
      console.log('[SessionStore] Durability debt added', {
        added: amount,
        totalDebt: newDebt,
      });
      
      return {
        pendingDurabilityDebt: newDebt,
      };
    });
  },
  
  /**
   * 重置耐久度債務
   * 
   * 在卸貨結算後重置債務，準備下一次行程
   */
  resetDurabilityDebt: () => {
    set({
      pendingDurabilityDebt: 0,
    });
    
    console.log('[SessionStore] Durability debt reset');
  },
  
  /**
   * 設置待救援物品（通用型）
   * 
   * 當玩家觸發廣告救援時，立即保存物品狀態到持久化存儲
   * 支援所有階層的物品（T1/T2/T3），不限制於 T3
   * 
   * @param item - 待救援的物品
   */
  setPendingEncounter: (item: Item) => {
    const encounter: PendingEncounter = {
      item,
      status: 'PENDING_AD',
      timestamp: Date.now(),
    };
    
    set({
      currentEncounter: encounter,
    });
    
    console.log(`[SessionStore] Pending encounter saved: T${item.tier} item (${item.id})`);
  },
  
  /**
   * 清除待救援物品
   * 
   * 在廣告救援成功完成後，清除待救援狀態
   * 確保交易原子性：只有在物品成功添加到背包後才清除
   */
  clearPendingEncounter: () => {
    set({
      currentEncounter: null,
    });
    
    console.log('[SessionStore] Pending encounter cleared');
  },
}));
