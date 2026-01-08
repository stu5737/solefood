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
import type { LuckGradient, DeepZoneState, PathfinderState } from '../types/game';
import { DEEP_ZONE, ITEM_DISTRIBUTION, RESCUE_ADS } from '../utils/constants';

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
  sessionDistance: number;      // 本會話距離（km，用於深層領域檢測）
  estimatedValue: number;       // 估算價值（USD）
  pendingHygieneDebt: number;   // 累積衛生值債務（百分比）
  pendingDurabilityDebt: number; // 累積耐久度債務（百分比）
  currentEncounter: PendingEncounter | null; // 當前待救援物品（通用型，支援所有階層）
  adCaps: {                     // 廣告上限追蹤
    stamina: AdCap;
    capacity: AdCap;
    revival: AdCap;
  };
  // 新增：每日幸運梯度（包含登入狀態）
  luckGradient: LuckGradient;
  
  // 新增：登入狀態檢查標誌
  hasCheckedLoginStatus: boolean;  // 是否已檢查登入狀態（防止重複檢查）
  // 新增：深層領域狀態
  deepZone: DeepZoneState;
  // 新增：開拓者狀態
  pathfinder: PathfinderState;
  // 新增：當日累積里程（用於廣告解鎖）
  dailyDistance: number;
  lastDailyReset: string;       // 最後重置日期 (YYYY-MM-DD)
  // 新增：臨時擴容狀態
  isTempExpanded: boolean;       // 是否啟用臨時擴容（+50%）
  // 新增：登入狀態檢查標誌
  hasCheckedLoginStatus: boolean;  // 是否已檢查登入狀態（防止重複檢查）
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
  
  /**
   * 檢查深層領域
   * 
   * 當會話距離達到 10km 時，觸發深層領域狀態
   */
  checkDeepZone: () => void;
  
  /**
   * 更新簽到狀態
   * 
   * 檢查日期變更，更新連續簽到天數
   */
  updateStreak: () => void;
  
  /**
   * 重置每日數據
   * 
   * 在日期變更時重置每日距離和廣告上限
   */
  resetDaily: () => void;
  
  /**
   * 切換臨時擴容狀態
   * 
   * 觀看廣告後啟用臨時擴容（+50% 容量）
   */
  toggleTempExpansion: () => void;
  
  /**
   * 設置臨時擴容狀態
   * 
   * @param expanded - 是否啟用臨時擴容
   */
  setTempExpanded: (expanded: boolean) => void;
  
  /**
   * 手動設置登入天數（用於測試）
   * 
   * @param days - 新的登入天數
   */
  setLoginDays: (days: number) => void;
  
  /**
   * 檢查登入狀態
   * 
   * 在應用啟動時調用，檢查是否錯過簽到
   * - 如果 diff == 1: 連續簽到，loginDays++
   * - 如果 diff > 1: 進入緩衝或衰減模式
   */
  checkLoginStatus: () => {
    needsRescue: boolean;
    missedDays: number;
    canRescue: boolean;
  };
  
  /**
   * 使用休假救援（觀看廣告凍結連續簽到）
   * 
   * @returns 是否成功使用救援
   */
  useLeaveRescue: () => boolean;
  
  /**
   * 處理登入（用戶今天登入）
   */
  processLogin: () => void;
}

type SessionStore = SessionState & SessionActions;

const getTodayString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const initialState: SessionState = {
  totalDistance: 0,
  sessionDistance: 0,
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
  // 新增：每日幸運梯度
  luckGradient: {
    streak: 0,
    t2Bonus: 0,
    lastActiveDate: getTodayString(),
    lastLoginDate: getTodayString(),
    leaveDaysUsed: 0,
    consecutiveMissedDays: 0,
    isFrozen: false,
    isDecaying: false,
    decayStartDate: null,
    currentT2Chance: ITEM_DISTRIBUTION.T2_PERCENTAGE, // 基礎 14%
  },
  
  // 新增：登入狀態檢查標誌
  hasCheckedLoginStatus: false,
  // 新增：深層領域狀態
  deepZone: {
    isInDeepZone: false,
    sessionDistance: 0,
    t3Multiplier: 1,
  },
  // 新增：開拓者狀態
  pathfinder: {
    isPathfinder: false,
    lastVisited: null,
    h3Grid: '',
  },
  // 新增：當日累積里程
  dailyDistance: 0,
  lastDailyReset: getTodayString(),
  // 新增：臨時擴容狀態
  isTempExpanded: false,
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
      const newSessionDistance = state.sessionDistance + km;
      const newDailyDistance = state.dailyDistance + km;
      
      // 使用 calculateValue 重新計算估值
      // 這確保了邏輯一致性：50km = $1.00 USD
      const newEstimatedValue = calculateValue(newTotalDistance);
      
      // 更新深層領域狀態
      const isInDeepZone = newSessionDistance >= DEEP_ZONE.BREAKTHROUGH_DISTANCE;
      const t3Multiplier = isInDeepZone ? DEEP_ZONE.T3_MULTIPLIER : 1;
      
      return {
        totalDistance: newTotalDistance,
        sessionDistance: newSessionDistance,
        dailyDistance: newDailyDistance,
        estimatedValue: newEstimatedValue,
        deepZone: {
          isInDeepZone,
          sessionDistance: newSessionDistance,
          t3Multiplier,
        },
      };
    });
    
    // 檢查深層領域
    get().checkDeepZone();
    
    console.log('[SessionStore] Distance added', {
      added: km,
      total: get().totalDistance,
      session: get().sessionDistance,
      daily: get().dailyDistance,
      value: get().estimatedValue,
    });
  },
  
  /**
   * 檢查深層領域
   */
  checkDeepZone: () => {
    const state = get();
    const isInDeepZone = state.sessionDistance >= DEEP_ZONE.BREAKTHROUGH_DISTANCE;
    
    if (isInDeepZone && !state.deepZone.isInDeepZone) {
      // 剛進入深層領域
      set({
        deepZone: {
          isInDeepZone: true,
          sessionDistance: state.sessionDistance,
          t3Multiplier: DEEP_ZONE.T3_MULTIPLIER,
        },
      });
      
      console.log('[SessionStore] Deep Zone activated! T3 drop rate doubled.');
    }
  },
  
  /**
   * 手動設置登入天數（用於測試）
   * 
   * @param days - 新的登入天數
   */
  setLoginDays: (days: number) => {
    if (days < 0) {
      console.warn('[SessionStore] Login days cannot be negative');
      return;
    }
    
    // 計算 T2 機率：基礎 14% + (min(days, 30) * 0.5%)
    // 在 30 天時達到 29% (14% + 15%)
    const cappedDays = Math.min(days, 30);
    const t2Bonus = cappedDays * 0.5; // 每 day = 0.5%
    const currentT2Chance = ITEM_DISTRIBUTION.T2_PERCENTAGE + t2Bonus; // 14% + bonus
    
    set((state) => ({
      luckGradient: {
        ...state.luckGradient,
        streak: days,
        t2Bonus,
        currentT2Chance,
        isDecaying: false,
        decayStartDate: null,
        isFrozen: false,
        consecutiveMissedDays: 0,
      },
    }));
    
    console.log('[SessionStore] Login days set', {
      streak: days,
      t2Bonus,
      currentT2Chance,
    });
  },
  
  /**
   * 檢查登入狀態
   * 
   * 在應用啟動時調用，檢查是否錯過簽到
   */
  checkLoginStatus: () => {
    const today = getTodayString();
    const state = get();
    
    // 如果今天已經登入，不需要檢查
    if (state.luckGradient.lastLoginDate === today) {
      return {
        needsRescue: false,
        missedDays: 0,
        canRescue: false,
      };
    }
    
    const lastLoginDate = new Date(state.luckGradient.lastLoginDate);
    const todayDate = new Date(today);
    const daysDiff = Math.floor((todayDate.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      // 同一天，不需要處理
      return {
        needsRescue: false,
        missedDays: 0,
        canRescue: false,
      };
    }
    
    if (daysDiff === 1) {
      // 連續簽到
      get().processLogin();
      return {
        needsRescue: false,
        missedDays: 0,
        canRescue: false,
      };
    }
    
    // daysDiff > 1: 錯過了簽到
    const missedDays = daysDiff - 1;
    const consecutiveMissedDays = state.luckGradient.consecutiveMissedDays + missedDays;
    const canRescue = consecutiveMissedDays <= 3 && state.luckGradient.leaveDaysUsed < 3;
    
    if (consecutiveMissedDays > 3 || !canRescue) {
      // 超過緩衝期或無法救援，進入衰減模式
      set((state) => {
        const cappedDays = Math.min(state.luckGradient.streak, 30);
        const maxBonus = cappedDays * 0.5; // 最大加成（在 30 天時為 15%）
        const daysAfterBuffer = consecutiveMissedDays - 3;
        const decayAmount = Math.min(maxBonus, daysAfterBuffer * 0.5); // 每日衰減 0.5%
        const currentT2Chance = Math.max(
          ITEM_DISTRIBUTION.T2_PERCENTAGE,
          ITEM_DISTRIBUTION.T2_PERCENTAGE + maxBonus - decayAmount
        );
        
        return {
          luckGradient: {
            ...state.luckGradient,
            streak: 0,
            t2Bonus: 0,
            consecutiveMissedDays: 0,
            isFrozen: false,
            isDecaying: true,
            decayStartDate: today,
            currentT2Chance,
          },
        };
      });
      
      console.log('[SessionStore] Entered decay mode', {
        missedDays,
        consecutiveMissedDays,
        currentT2Chance: get().luckGradient.currentT2Chance,
      });
      
      return {
        needsRescue: false,
        missedDays,
        canRescue: false,
      };
    }
    
    // 在緩衝期內，可以救援
    set((state) => ({
      luckGradient: {
        ...state.luckGradient,
        consecutiveMissedDays,
      },
    }));
    
    return {
      needsRescue: true,
      missedDays,
      canRescue: true,
    };
  },
  
  /**
   * 使用休假救援（觀看廣告凍結連續簽到）
   */
  useLeaveRescue: () => {
    const state = get();
    
    // 檢查是否可以使用救援
    if (state.luckGradient.leaveDaysUsed >= 3) {
      console.warn('[SessionStore] Leave rescue limit reached');
      return false;
    }
    
    if (state.luckGradient.consecutiveMissedDays > 3) {
      console.warn('[SessionStore] Cannot rescue: exceeded buffer period');
      return false;
    }
    
    // 檢查廣告上限
    const canWatchAd = get().triggerRescue('revival');
    if (!canWatchAd) {
      console.warn('[SessionStore] Ad cap reached for leave rescue');
      return false;
    }
    
    // 凍結連續簽到
    set((state) => ({
      luckGradient: {
        ...state.luckGradient,
        isFrozen: true,
        leaveDaysUsed: state.luckGradient.leaveDaysUsed + 1,
        consecutiveMissedDays: 0, // 重置連續錯過天數
        lastLoginDate: getTodayString(), // 更新最後登入日期
      },
    }));
    
    console.log('[SessionStore] Leave rescue used', {
      leaveDaysUsed: get().luckGradient.leaveDaysUsed,
      streak: get().luckGradient.streak,
    });
    
    return true;
  },
  
  /**
   * 處理登入（用戶今天登入）
   */
  processLogin: () => {
    const today = getTodayString();
    const state = get();
    
    // 計算新的連續簽到天數
    let newStreak = state.luckGradient.streak;
    
    if (state.luckGradient.lastLoginDate !== today) {
      const lastLoginDate = new Date(state.luckGradient.lastLoginDate);
      const todayDate = new Date(today);
      const daysDiff = Math.floor((todayDate.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 1) {
        // 連續簽到
        newStreak += 1;
      } else if (daysDiff > 1 && !state.luckGradient.isFrozen) {
        // 斷簽且未凍結，重置
        newStreak = 1;
      }
      // daysDiff === 0 表示同一天，不更新
    }
    
    // 計算 T2 機率：基礎 14% + (min(streak, 30) * 0.5%)
    const cappedDays = Math.min(newStreak, 30);
    const t2Bonus = cappedDays * 0.5; // 每 day = 0.5%
    const currentT2Chance = ITEM_DISTRIBUTION.T2_PERCENTAGE + t2Bonus; // 14% + bonus
    
    set((state) => ({
      luckGradient: {
        ...state.luckGradient,
        streak: newStreak,
        t2Bonus,
        lastLoginDate: today,
        lastActiveDate: today,
        consecutiveMissedDays: 0,
        isFrozen: false, // 登入後解除凍結
        isDecaying: false,
        decayStartDate: null,
        currentT2Chance,
      },
    }));
    
    console.log('[SessionStore] Login processed', {
      streak: newStreak,
      t2Bonus,
      currentT2Chance,
    });
  },
  
  /**
   * 更新簽到狀態
   */
  updateStreak: () => {
    const today = getTodayString();
    const state = get();
    
    if (state.luckGradient.lastActiveDate !== today) {
      // 日期變更
      const lastDate = new Date(state.luckGradient.lastActiveDate);
      const todayDate = new Date(today);
      const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let newStreak = state.luckGradient.streak;
      
      if (daysDiff === 1) {
        // 連續簽到
        newStreak += 1;
      } else if (daysDiff > 1) {
        // 斷簽
        newStreak = 1; // 重新開始
      }
      // daysDiff === 0 表示同一天，不更新
      
      // 計算 T2 加成
      const { calculateLuckGradient } = require('../core/math/luck');
      const t2Bonus = calculateLuckGradient(newStreak);
      
      set({
        luckGradient: {
          streak: newStreak,
          t2Bonus,
          lastActiveDate: today,
          leaveDaysUsed: state.luckGradient.leaveDaysUsed,
        },
      });
      
      console.log('[SessionStore] Streak updated', {
        streak: newStreak,
        t2Bonus,
      });
    }
  },
  
  /**
   * 重置每日數據
   */
  resetDaily: () => {
    const today = getTodayString();
    const state = get();
    
    if (state.lastDailyReset !== today) {
      set({
        dailyDistance: 0,
        lastDailyReset: today,
        adCaps: {
          stamina: { used: 0, cap: 5 },
          capacity: { used: 0, cap: 3 },
          revival: { used: 0, cap: 1 },
        },
        hasCheckedLoginStatus: false, // 重置登入狀態檢查標誌
      });
      
      // 如果處於衰減模式，應用每日衰減
      if (state.luckGradient.isDecaying && state.luckGradient.decayStartDate) {
        const decayStartDate = new Date(state.luckGradient.decayStartDate);
        const todayDate = new Date(today);
        const daysSinceDecay = Math.floor((todayDate.getTime() - decayStartDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // 每日衰減 0.5%，直到回到基礎 14%
        const decayAmount = daysSinceDecay * 0.5; // 每日 0.5%
        const currentT2Chance = Math.max(
          ITEM_DISTRIBUTION.T2_PERCENTAGE,
          state.luckGradient.currentT2Chance - decayAmount
        );
        
        set((state) => ({
          luckGradient: {
            ...state.luckGradient,
            currentT2Chance,
            // 如果已回到基礎值，退出衰減模式
            isDecaying: currentT2Chance > ITEM_DISTRIBUTION.T2_PERCENTAGE,
          },
        }));
        
        console.log('[SessionStore] Applied daily decay', {
          daysSinceDecay,
          decayAmount,
          currentT2Chance,
        });
      }
      
      // 更新簽到狀態
      get().updateStreak();
      
      console.log('[SessionStore] Daily data reset');
    }
  },
  
  /**
   * 切換臨時擴容狀態
   * 
   * 觀看廣告後啟用臨時擴容（+50% 容量）
   */
  toggleTempExpansion: () => {
    set((state) => {
      const newState = !state.isTempExpanded;
      console.log('[SessionStore] Temp expansion toggled', { isTempExpanded: newState });
      return {
        isTempExpanded: newState,
      };
    });
  },
  
  /**
   * 設置臨時擴容狀態
   * 
   * @param expanded - 是否啟用臨時擴容
   */
  setTempExpanded: (expanded: boolean) => {
    set({
      isTempExpanded: expanded,
    });
    console.log('[SessionStore] Temp expansion set', { isTempExpanded: expanded });
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
