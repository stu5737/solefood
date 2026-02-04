/**
 * SessionState Store
 * 追蹤實時會話指標和救援可用性
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 本 Store 實現狀態管理層，使用核心數學函數計算估值
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateValue } from '../core/math/valuation';
import type { Item } from '../types/item';
import type { LuckGradient, DeepZoneState, PathfinderState } from '../types/game';
import { DEEP_ZONE, ITEM_DISTRIBUTION, RESCUE_ADS } from '../utils/constants';
import { getH3CellChildren, getH3Resolution, H3_RESOLUTION } from '../core/math/h3';
// ⭐ 注意：不再需要手動導入 storage，persist middleware 會自動處理

/**
 * ⭐ 自動持久化 currentSessionNewHexes 的 AsyncStorage Key
 * 防止應用重新載入時數據丟失
 */
const CURRENT_SESSION_HEXES_KEY = '@solefood/current-session-hexes';

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
  // 新增：地圖模式
  mapMode: 'GAME' | 'HISTORY';   // 地圖模式：GAME=主遊戲探索，HISTORY=歷史軌跡
  // 新增：已探索的 H3 六邊形網格（過去7天內走過的區域）
  exploredHexes: Set<string>;    // 已探索的 H3 索引集合（歷史 + 已結算的會話）
  currentSessionNewHexes: Set<string>; // ⭐ 當前會話新發現的 H3（採集時不顯示，結算後才合併）
  lastKnownHex: string | null;   // ⚡️ 新增：追蹤上一個 H3 格子（用於路徑補間）
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
   * 檢查並更新開拓者狀態
   * 
   * @param latitude - 緯度
   * @param longitude - 經度
   * @returns 是否為開拓者區域
   */
  checkPathfinder: (latitude: number, longitude: number) => boolean;
  
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
  
  /**
   * 切換地圖模式
   * 
   * @param mode - 地圖模式：'GAME' 或 'HISTORY'
   */
  setMapMode: (mode: 'GAME' | 'HISTORY') => void;
  
  /**
   * 發現新的 H3 六邊形區域
   * 
   * 當玩家進入新的六邊形時調用
   * 如果該區域未被探索，加入 exploredHexes 並返回 true
   * 
   * @param hexIndex - H3 索引
   * @returns 是否為新發現的區域
   */
  discoverNewHex: (hexIndex: string) => boolean;
  
  /**
   * 從7天歷史軌跡更新已探索的H3六邊形
   * 
   * 從GPS歷史服務中獲取過去7天的所有軌跡點
   * 將這些點轉換為H3索引並存入exploredHexes
   */
  updateExploredHexesFromHistory: () => Promise<void>;
  
  /**
   * 在停止採集時，將當前會話的新 H3 合併到 exploredHexes
   */
  mergeCurrentSessionHexes: () => Promise<void>;
  
  /**
   * 清空當前會話的新 H3（用於取消採集時）
   */
  clearCurrentSessionHexes: () => void;
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
  // 新增：地圖模式（預設為 GAME）
  mapMode: 'GAME' as const,
  // 新增：已探索的 H3 六邊形網格（使用 Set 存儲）
  exploredHexes: new Set<string>(),
  currentSessionNewHexes: new Set<string>(), // ⭐ 新增：當前會話新發現的 H3
  lastKnownHex: null, // ⚡️ 新增：初始化為 null
};

/**
 * ⭐ 從 AsyncStorage 恢復 currentSessionNewHexes（防止應用重新載入時數據丟失）
 * 
 * 在 Store 初始化後自動調用，恢復採集過程中的臨時數據
 */
const restoreCurrentSessionHexes = async () => {
  try {
    const persistedData = await AsyncStorage.getItem(CURRENT_SESSION_HEXES_KEY);
    if (persistedData) {
      const hexArray = JSON.parse(persistedData) as string[];
      const hexSet = new Set(hexArray);
      
      useSessionStore.setState({ 
        currentSessionNewHexes: hexSet 
      });
      
    } else {
    }
  } catch (error) {
  }
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
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
    
  },
  
  /**
   * 檢查深層領域
   */
  /**
   * 檢查並更新開拓者狀態
   * 
   * @param latitude - 緯度
   * @param longitude - 經度
   * @returns 是否為開拓者區域
   */
  checkPathfinder: (latitude: number, longitude: number) => {
    const { explorationService } = require('../services/exploration');
    const { latLngToH3, H3_RESOLUTION } = require('../core/math/h3');
    
    const h3Index = latLngToH3(latitude, longitude, H3_RESOLUTION);
    const isPathfinder = explorationService.isGrayZone(h3Index);
    
    set((state) => ({
      pathfinder: {
        isPathfinder,
        lastVisited: Date.now(),
        h3Grid: h3Index,
      },
    }));
    
    return isPathfinder;
  },
  
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
      
    }
  },
  
  /**
   * 手動設置登入天數（用於測試）
   * 
   * @param days - 新的登入天數
   */
  setLoginDays: (days: number) => {
    if (days < 0) {
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
      return false;
    }
    
    if (state.luckGradient.consecutiveMissedDays > 3) {
      return false;
    }
    
    // 檢查廣告上限
    const canWatchAd = get().triggerRescue('revival');
    if (!canWatchAd) {
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
        
      }
      
      // 更新簽到狀態
      get().updateStreak();
      
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
    
  },
  
  /**
   * 切換地圖模式
   * 
   * @param mode - 地圖模式：'GAME' 或 'HISTORY'
   */
  setMapMode: (mode: 'GAME' | 'HISTORY') => {
    set({ mapMode: mode });
  },
  
  /**
   * 發現新的 H3 六邊形區域
   * 
   * 當玩家進入新的六邊形時調用
   * 如果該區域未被探索，加入 exploredHexes 並返回 true
   * 
   * @param hexIndex - H3 索引
   * @returns 是否為新發現的區域
   */
  discoverNewHex: (hexIndex: string): {
    hasNewDiscovery: boolean;
    isGrayZone: boolean;
    explorationDetails: {
      newHexes: string[];
      historicalHexes: string[];
      currentHexes: string[];
    };
    pathfinderBonus: {
      active: boolean;
      t2DropRateBonus: number;
    };
  } => {
    console.log('[🔍 SessionStore] discoverNewHex 被調用', { hexIndex });

    if (!hexIndex) {
      console.warn('[⚠️ SessionStore] hexIndex 為空，返回');
      return {
        hasNewDiscovery: false,
        isGrayZone: false,
        explorationDetails: { newHexes: [], historicalHexes: [], currentHexes: [] },
        pathfinderBonus: { active: false, t2DropRateBonus: 0 }
      };
    }
    
    const state = get();
    const { lastKnownHex, exploredHexes, currentSessionNewHexes } = state;
    
    console.log('[📊 SessionStore] 當前狀態', {
      lastKnownHex,
      exploredHexesSize: exploredHexes.size,
      currentSessionNewHexesSize: currentSessionNewHexes.size,
    });

    // ⚡️ 如果是同一個格子，直接跳過（效能優化）
    if (hexIndex === lastKnownHex) {
      console.log('[⏭️ SessionStore] 相同的格子，跳過');
      return {
        hasNewDiscovery: false,
        isGrayZone: false,
        explorationDetails: { newHexes: [], historicalHexes: [], currentHexes: [] },
        pathfinderBonus: { active: false, t2DropRateBonus: 0 }
      };
    }
    
    const newCurrentSessionHexes = new Set(currentSessionNewHexes);
    let hasNewDiscoveries = false;
    
    // 📊 追蹤探索詳情
    const explorationDetails = {
      newHexes: [] as string[],
      historicalHexes: [] as string[],
      currentHexes: [] as string[]
    };
    
    // ⚡️ 核心邏輯：路徑補間 (Grid Path Interpolation) + 方案 B：限制距離
    if (lastKnownHex) {
      try {
        // 動態導入 h3-js 的 gridPathCells 方法
        const { getH3ModuleSync } = require('../core/math/h3');
        const h3 = getH3ModuleSync();
        
        // ⭐⭐⭐ 方案 B：限制插值距離（與 updateExploredHexesFromHistory 一致）
        const MAX_INTERPOLATION_CELLS = 20; // 約 100-200 米
        
        // 檢查是否支持 gridPathCells
        if (h3 && typeof h3.gridPathCells === 'function') {
          // 取得從上一格到當前格之間的所有格子
          const pathCells = h3.gridPathCells(lastKnownHex, hexIndex);
          
          // ⭐⭐⭐ 關鍵修復：只有距離合理時才插值，避免 GPS 跳動造成亂連線
          if (pathCells.length <= MAX_INTERPOLATION_CELLS) {
            // 距離合理，進行插值
            pathCells.forEach((cell: string) => {
              const isHistorical = exploredHexes.has(cell);
              const isCurrentSession = currentSessionNewHexes.has(cell);
              
              if (!isHistorical && !isCurrentSession) {
                // ✅ 新探索的 H3（Gray Zone）
                newCurrentSessionHexes.add(cell);
                hasNewDiscoveries = true;
                explorationDetails.newHexes.push(cell);
                
              } else if (isHistorical) {
                // ⏪ 走到歷史 H3
                explorationDetails.historicalHexes.push(cell);
                
              } else {
                // 🔁 當前會話已經走過
                explorationDetails.currentHexes.push(cell);
                
              }
            });
            
          } else {
            // ⭐⭐⭐ 距離太遠，跳過插值（GPS 跳動或漂移）
            
            // 只加入當前格子，不做插值
            const isHistorical = exploredHexes.has(hexIndex);
            const isCurrentSession = currentSessionNewHexes.has(hexIndex);
            
            if (!isHistorical && !isCurrentSession) {
              newCurrentSessionHexes.add(hexIndex);
              hasNewDiscoveries = true;
              explorationDetails.newHexes.push(hexIndex);
              
            } else if (isHistorical) {
              explorationDetails.historicalHexes.push(hexIndex);
            } else {
              explorationDetails.currentHexes.push(hexIndex);
            }
          }
        } else {
          // 降級方案：直接加入當前格子
          
          const isHistorical = exploredHexes.has(hexIndex);
          const isCurrentSession = currentSessionNewHexes.has(hexIndex);
          
          if (!isHistorical && !isCurrentSession) {
            newCurrentSessionHexes.add(hexIndex);
            hasNewDiscoveries = true;
            explorationDetails.newHexes.push(hexIndex);
            
          } else if (isHistorical) {
            explorationDetails.historicalHexes.push(hexIndex);
          } else {
            explorationDetails.currentHexes.push(hexIndex);
          }
        }
      } catch (error) {
        // 距離太遠（瞬移）或計算失敗，只加當前點
        
        const isHistorical = exploredHexes.has(hexIndex);
        const isCurrentSession = currentSessionNewHexes.has(hexIndex);
        
        if (!isHistorical && !isCurrentSession) {
          newCurrentSessionHexes.add(hexIndex);
          hasNewDiscoveries = true;
          explorationDetails.newHexes.push(hexIndex);
          
        } else if (isHistorical) {
          explorationDetails.historicalHexes.push(hexIndex);
        } else {
          explorationDetails.currentHexes.push(hexIndex);
        }
      }
    } else {
      // 第一次定位，直接加入當前格子
      if (!exploredHexes.has(hexIndex) && !currentSessionNewHexes.has(hexIndex)) {
        newCurrentSessionHexes.add(hexIndex);
        hasNewDiscoveries = true;
        explorationDetails.newHexes.push(hexIndex);
        
      }
    }
    
    // 只有真的有新格子才更新 State（減少渲染）
    if (hasNewDiscoveries) {
      console.log('[✅ SessionStore] 發現新格子，準備更新狀態', {
        newHexesCount: explorationDetails.newHexes.length,
        beforeSize: currentSessionNewHexes.size,
        afterSize: newCurrentSessionHexes.size,
      });
      
      set({ 
        currentSessionNewHexes: newCurrentSessionHexes,
        lastKnownHex: hexIndex // ⚡️ 更新最後位置
      });
      
      console.log('[💾 SessionStore] 狀態已更新，即將持久化');
      
      // ⭐ 即時驗證：檢查剛添加的 H3 是否正確存在於集合中
      for (const newHex of explorationDetails.newHexes) {
        const inCurrentSession = newCurrentSessionHexes.has(newHex);
        const inExploredHexes = exploredHexes.has(newHex);
        const isExplored = inExploredHexes || inCurrentSession;
        console.log('[🔎 SessionStore] H3 驗證', {
          hex: newHex,
          inCurrentSession,
          inExploredHexes,
          isExplored,
        });
      }
      
      // ⭐ 關鍵修復：立即持久化到 AsyncStorage（防止應用重新載入時數據丟失）
      AsyncStorage.setItem(
        CURRENT_SESSION_HEXES_KEY,
        JSON.stringify(Array.from(newCurrentSessionHexes))
      ).then(() => {
        console.log('[💾 SessionStore] AsyncStorage 持久化成功', {
          hexesCount: newCurrentSessionHexes.size,
        });
      }).catch(err => {
        console.error('[❌ SessionStore] AsyncStorage 持久化失敗', err);
      });
    } else {
      console.log('[⏭️ SessionStore] 沒有新格子，只更新最後位置');
      // 即使沒新格子，也要更新最後位置，以便下次計算
      set({ lastKnownHex: hexIndex });
    }
    
    // 🎁 開拓者紅利計算
    const pathfinderBonus = {
      active: hasNewDiscoveries,
      t2DropRateBonus: hasNewDiscoveries ? 10 : 0  // +10% T2 掉落率
    };
    
    
    return {
      hasNewDiscovery: hasNewDiscoveries,
      isGrayZone: hasNewDiscoveries,  // Gray Zone = 有新探索
      explorationDetails,
      pathfinderBonus
    };
  },
  
  /**
   * 從7天歷史軌跡更新已探索的H3六邊形
   * 
   * ⭐⭐⭐ 方案 B+C 修復：
   * - 方案 B：限制插值距離（最多 20 個格子，避免 GPS 漂移造成的遠距離填補）
   * - 方案 C：按 session 分組處理（避免跨 session 插值，防止不連續的會話被連接）
   * 
   * 從GPS歷史服務中獲取過去7天的所有軌跡點
   * 將這些點轉換為H3索引並存入exploredHexes
   */
  updateExploredHexesFromHistory: async () => {
    try {
      const { gpsHistoryService } = require('../services/gpsHistory');
      const { latLngToH3, H3_RESOLUTION } = require('../core/math/h3');
      
      // ⭐ 修復 1：確保 gpsHistoryService 已初始化
      if (!gpsHistoryService.initialized) {
        await gpsHistoryService.initialize();
      }
      
      const state = get();
      const existingHexes = new Set<string>(state.exploredHexes);
      
      
      // 首先檢查並遷移舊的 Res 10 數據到 Res 11
      const oldHexes = Array.from(existingHexes);
      if (oldHexes.length > 0) {
        const res10Hexes = oldHexes.filter((hex) => {
          if (hex.startsWith('fallback_')) {
            const parts = hex.split('_');
            if (parts.length === 4) {
              const res = parseInt(parts[1]);
              return res === 10;
            }
          }
          return false;
        });
        
        if (res10Hexes.length > 0) {
          const { getH3CellChildren } = require('../core/math/h3');
          const migratedHexes = new Set<string>(existingHexes);
          
          for (const res10Hex of res10Hexes) {
            const children = getH3CellChildren(res10Hex, 11);
            for (const childHex of children) {
              migratedHexes.add(childHex);
            }
            migratedHexes.delete(res10Hex);
          }
          
          existingHexes.clear();
          migratedHexes.forEach(hex => existingHexes.add(hex));
        }
      }
      
      const currentSessionId = gpsHistoryService.getCurrentSessionId();
      const allSessions = gpsHistoryService.getAllSessions();
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      // ⭐⭐⭐ 方案 C：改為按 session 分組處理（避免跨 session 插值）
      const hexSet = new Set<string>(existingHexes);
      let totalSuccessCount = 0;
      let totalInterpolatedCount = 0;
      let totalPointsProcessed = 0;
      let sessionsProcessed = 0;
      let sessionsSkippedTooFar = 0;
      
      // 動態導入 H3 模組
      const h3Utils = require('../core/math/h3');
      const h3Module = h3Utils.getH3ModuleSync();
      const hasGridPathCells = h3Module && typeof h3Module.gridPathCells === 'function';
      
      // ⭐⭐⭐ 方案 B：限制插值距離（約 100-200 米）
      const MAX_INTERPOLATION_CELLS = 20;
      
      
      for (const session of allSessions) {
        // 排除當前會話
        if (session.sessionId === currentSessionId) {
          continue;
        }
        
        // 只處理過去 7 天且已結束的會話
        if (session.startTime < sevenDaysAgo || !session.endTime) {
          continue;
        }
        
        if (!session.points || session.points.length === 0) {
          continue;
        }
        
        // ⭐⭐⭐ 關鍵：每個 session 獨立處理，不跨 session 插值
        let lastHex: string | null = null;
        let sessionInterpolatedCount = 0;
        let sessionSkippedCount = 0;
        let sessionPointsCount = 0;
        
        for (const point of session.points) {
          try {
            // 驗證座標有效性
            if (!isFinite(point.latitude) || !isFinite(point.longitude) ||
                Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) {
              continue;
            }
            
            const currentHex = latLngToH3(point.latitude, point.longitude, H3_RESOLUTION);
            
            if (!currentHex || currentHex.length === 0) {
              continue;
            }
            
            sessionPointsCount++;
            
            // ⭐⭐⭐ 方案 B：插值前先檢查距離
            if (lastHex && lastHex !== currentHex && hasGridPathCells) {
              try {
                const pathCells = h3Module.gridPathCells(lastHex, currentHex);
                
                // 限制插值數量（避免不合理的遠距離填補）
                if (pathCells.length <= MAX_INTERPOLATION_CELLS) {
                  pathCells.forEach((cell: string) => {
                    hexSet.add(cell);
                    sessionInterpolatedCount++;
                  });
                  totalSuccessCount++;
                } else {
                  // 距離太遠，跳過插值（可能是 GPS 跳動或長時間暫停）
                  hexSet.add(currentHex);
                  totalSuccessCount++;
                  sessionSkippedCount++;
                }
              } catch (error) {
                // 插值失敗，只加當前格子
                hexSet.add(currentHex);
                totalSuccessCount++;
              }
            } else {
              // 第一個點或相同格子
              hexSet.add(currentHex);
              totalSuccessCount++;
            }
            
            lastHex = currentHex;
          } catch (error) {
          }
        }
        
        // ⭐⭐⭐ 換到下一個 session 時，重置 lastHex（關鍵！防止跨 session 插值）
        lastHex = null;
        
        totalPointsProcessed += sessionPointsCount;
        totalInterpolatedCount += sessionInterpolatedCount;
        sessionsProcessed++;
        
        if (sessionSkippedCount > 0) {
          sessionsSkippedTooFar++;
        }
        
      }
      
      // 更新 store
      set({ exploredHexes: hexSet });
      
      // 強制觸發 persist 保存
      useSessionStore.setState({ exploredHexes: hexSet });
      
    } catch (error) {
    }
  },
  
  /**
   * 在停止採集時，將當前會話的新 H3 合併到 exploredHexes
   */
  mergeCurrentSessionHexes: async () => {
    const state = get();
    const newHexesCount = state.currentSessionNewHexes.size;
    
    if (newHexesCount === 0) {
      
      // ⭐ 即使沒有新 H3，也要清除持久化數據（清理垃圾數據）
      try {
        await AsyncStorage.removeItem(CURRENT_SESSION_HEXES_KEY);
      } catch (error) {
      }
      
      return;
    }
    
    const beforeSize = state.exploredHexes.size;
    const mergedHexes = new Set(state.exploredHexes);
    state.currentSessionNewHexes.forEach(hex => mergedHexes.add(hex));
    const afterSize = mergedHexes.size;
    
    
    // ⭐ 單次原子更新，避免中間狀態
    set({ 
      exploredHexes: mergedHexes,
      currentSessionNewHexes: new Set<string>(), // 清空當前會話的新 H3
      lastKnownHex: null, // 重置最後已知位置
    });
    
    // ⭐ 清除 AsyncStorage 中的臨時持久化數據
    try {
      await AsyncStorage.removeItem(CURRENT_SESSION_HEXES_KEY);
    } catch (error) {
    }
    
    // ⭐ 短暫延遲確保 React 完成更新
    await new Promise(resolve => setTimeout(resolve, 50));
    
  },
  
  /**
   * 清空當前會話的新 H3（用於取消採集時）
   */
  clearCurrentSessionHexes: () => {
    const state = get();
    if (state.currentSessionNewHexes.size > 0) {
      set({ currentSessionNewHexes: new Set<string>() });
    }
  },
  
  /**
   * 🧪 測試功能：隨機刪除一半的歷史軌跡（H3 索引 + GPS 會話）
   * 用於測試開拓者紅利系統
   */
  testRandomDeleteHalfHistory: async () => {
    const state = get();
    const originalSize = state.exploredHexes.size;
    
    // 1. 刪除 H3 索引
    if (originalSize > 0) {
      const hexArray = Array.from(state.exploredHexes);
      const shuffled = hexArray.sort(() => Math.random() - 0.5);
      const keepCount = Math.floor(originalSize / 2);
      const newHexes = new Set(shuffled.slice(0, keepCount));
      
      set({ exploredHexes: newHexes });
      
    } else {
    }
    
    // 2. 刪除 GPS 會話（需要動態導入避免循環依賴）
    try {
      const { gpsHistoryService } = await import('../services/gpsHistory');
      const result = await gpsHistoryService.testRandomDeleteHalfSessions();
    } catch (error) {
    }
  },
    }),
    {
      name: 'solefood-session-storage', // 存儲鍵名
      
      // ⭐ 關鍵：自定義 storage 來處理 Set
      storage: createJSONStorage(() => AsyncStorage, {
        reviver: (key, value) => {
          // 讀檔時：如果看到 exploredHexes 或 currentSessionNewHexes，轉回 Set
          if (key === 'exploredHexes' || key === 'currentSessionNewHexes') {
            return value && Array.isArray(value) ? new Set(value) : new Set<string>();
          }
          return value;
        },
        replacer: (key, value) => {
          // 存檔時：如果值是 Set，轉成 Array
          if (value instanceof Set) {
            return Array.from(value);
          }
          return value;
        },
      }),
      
      // ⭐ 只持久化需要的字段（避免存儲過大的數據）
      partialize: (state) => ({
        exploredHexes: state.exploredHexes, // 只持久化 exploredHexes
        // 如果需要持久化其他字段，可以在這裡添加
        // 例如：totalDistance, estimatedValue 等
      }),
      
      // ⭐ 新增：監聽 hydration 完成
      onRehydrateStorage: () => (state) => {
        
        // ⭐ Hydration 完成後，立即恢復 currentSessionNewHexes
        restoreCurrentSessionHexes();
      },
    }
  )
);

// ⭐ 自動在 Store 初始化時恢復 currentSessionNewHexes（防止應用重新載入時數據丟失）
// 如果 persist middleware 尚未完成 hydration，這裡會先執行一次
// 然後 onRehydrateStorage 會在 hydration 完成後再執行一次（雙保險）
restoreCurrentSessionHexes();
