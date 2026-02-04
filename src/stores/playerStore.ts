/**
 * PlayerState Store
 * 管理玩家的核心物理屬性
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 本 Store 實現狀態管理層，使用核心數學函數確保邏輯一致性
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STAMINA, CAPACITY, HYGIENE, ZERO_TOLERANCE } from '../utils/constants';
import { calculateMaxCapacity } from '../core/math/weight';

const USER_CODE_KEY = '@solefood/user-code';

/**
 * PlayerState 介面定義
 */
interface PlayerState {
  // 核心屬性
  stamina: number;           // 當前體力值（0-100）
  maxStamina: number;         // 最大體力值（預設 100）
  
  // 容量系統
  currentWeight: number;     // 當前負重（kg）
  maxWeight: number;         // 最大容量（基於 Durability）
  baseMaxWeight: number;     // 基礎最大容量（10kg）
  
  // 耐久系統
  durability: number;        // 背包耐久度（0-100）
  maxDurability: number;    // 最大耐久度（100）
  
  // 衛生系統
  hygiene: number;          // 衛生值（0-100）
  maxHygiene: number;       // 最大衛生值（100）
  
  // 狀態標誌
  isGhost: boolean;         // Ghost Mode（Stamina = 0）
  isImmobilized: boolean;   // 無法移動（Durability = 0）

  // 錢包（$SOIL 代幣）
  balance: number;          // 當前餘額（卸貨收益會累加至此）

  // 用戶碼（留存／訪談用，系統產生並持久化）
  userCode: string | null;  // 例：SF-A1B2C3
}

/**
 * PlayerActions 介面定義
 */
interface PlayerActions {
  /**
   * 更新體力值
   * 自動限制在 0-100 範圍內
   * 如果體力為 0，自動設置 isGhost = true
   */
  updateStamina: (amount: number) => void;
  
  /**
   * 更新耐久度
   * 自動限制在 0-100 範圍內
   * 修改後立即執行 checkZeroTolerance()
   */
  updateDurability: (amount: number) => void;
  
  /**
   * 更新衛生值
   * 自動限制在 0-100 範圍內
   */
  updateHygiene: (amount: number) => void;
  
  /**
   * 零容忍檢查（關鍵方法）
   * 使用 calculateMaxCapacity 計算當前容量
   * 如果結果為 0，設置 isImmobilized = true
   */
  checkZeroTolerance: () => void;
  
  /**
   * 設置當前負重
   */
  setWeight: (weight: number) => void;
  
  /**
   * 獲取有效最大容量（階層閾值機制 + 臨時擴容）
   * 
   * 根據白皮書 v8.7：階層閾值（Forgiveness Mechanic）
   * - 耐久度 >= 90%：使用完整容量
   * - 耐久度 < 90%：容量降至 90%（警告機制）
   * 
   * 考慮臨時擴容：
   * - 如果啟用臨時擴容：基礎容量 × 1.5
   * - 然後應用 90% 閾值規則
   * 
   * @param isTempExpanded - 是否啟用臨時擴容（可選，默認為 false）
   * @returns 有效最大容量（kg）
   */
  getEffectiveMaxWeight: (isTempExpanded?: boolean) => number;

  /**
   * 增加餘額（卸貨收益等）
   * @param amount - 增加數量（$SOIL）
   */
  addBalance: (amount: number) => void;

  /** 取得或建立用戶碼（首次進入時產生並寫入 AsyncStorage，用於留存率與訪談辨識） */
  getOrCreateUserCode: () => Promise<string>;
}

type PlayerStore = PlayerState & PlayerActions;

const initialState: PlayerState = {
  stamina: STAMINA.MAX_STAMINA,
  maxStamina: STAMINA.MAX_STAMINA,
  currentWeight: 0,
  maxWeight: CAPACITY.BASE_MAX_WEIGHT,
  baseMaxWeight: CAPACITY.BASE_MAX_WEIGHT,
  durability: CAPACITY.MAX_DURABILITY,
  maxDurability: CAPACITY.MAX_DURABILITY,
  hygiene: HYGIENE.MAX_HYGIENE,
  maxHygiene: HYGIENE.MAX_HYGIENE,
  isGhost: false,
  isImmobilized: false,
  balance: 0,              // 初始 $SOIL 餘額
  userCode: null,          // 由 getOrCreateUserCode 填入
};

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  ...initialState,

  /**
   * 更新體力值
   * 
   * @param amount - 體力變化量（正數為增加，負數為減少）
   */
  updateStamina: (amount: number) => {
    set((state) => {
      // 計算新體力值，限制在 0-100 範圍內
      const newStamina = Math.max(
        ZERO_TOLERANCE.STAMINA_THRESHOLD,
        Math.min(state.maxStamina, state.stamina + amount)
      );
      
      // 如果體力為 0，設置 isGhost = true
      const isGhost = newStamina === ZERO_TOLERANCE.STAMINA_THRESHOLD;
      
      return {
        stamina: newStamina,
        isGhost,
      };
    });
    
    // 檢查零容忍
    get().checkZeroTolerance();
  },

  /**
   * 更新耐久度
   * 
   * @param amount - 耐久度變化量（正數為增加，負數為減少）
   * 
   * 重要：修改耐久度後，必須立即執行 checkZeroTolerance()
   */
  updateDurability: (amount: number) => {
    set((state) => {
      // 計算新耐久度值，限制在 0-100 範圍內
      const newDurability = Math.max(
        ZERO_TOLERANCE.DURABILITY_THRESHOLD,
        Math.min(state.maxDurability, state.durability + amount)
      );
      
      // 使用 calculateMaxCapacity 重新計算最大容量
      // 注意：這裡計算的是理論最大容量，實際有效容量由 getEffectiveMaxWeight 決定
      const newMaxWeight = calculateMaxCapacity(state.baseMaxWeight, newDurability);
      
      return {
        durability: newDurability,
        maxWeight: newMaxWeight,
      };
    });
    
    // 關鍵：修改耐久度後，立即執行零容忍檢查
    get().checkZeroTolerance();
  },

  /**
   * 更新衛生值
   * 
   * @param amount - 衛生值變化量（正數為增加，負數為減少）
   */
  updateHygiene: (amount: number) => {
    set((state) => {
      // 計算新衛生值，限制在 0-100 範圍內
      const newHygiene = Math.max(
        HYGIENE.MIN_HYGIENE,
        Math.min(state.maxHygiene, state.hygiene + amount)
      );
      
      return {
        hygiene: newHygiene,
      };
    });
  },

  /**
   * 零容忍檢查（關鍵方法）
   * 
   * 使用 calculateMaxCapacity 計算當前容量
   * 如果結果為 0，設置 isImmobilized = true（觸發背包崩塌）
   * 
   * 這個方法必須在每次修改 durability 後立即調用
   */
  checkZeroTolerance: () => {
    const state = get();
    
    // 使用 calculateMaxCapacity 計算當前容量
    const calculatedCapacity = calculateMaxCapacity(state.baseMaxWeight, state.durability);
    
    // 如果計算結果為 0，觸發零容忍崩塌
    if (calculatedCapacity === 0 && !state.isImmobilized) {
      set({
        isImmobilized: true,
        maxWeight: 0, // 強制設置容量為 0
      });
    } else if (calculatedCapacity > 0 && state.isImmobilized) {
      // 如果容量恢復，解除定身狀態
      set({
        isImmobilized: false,
        maxWeight: calculatedCapacity,
      });
    } else if (calculatedCapacity !== state.maxWeight) {
      // 同步 maxWeight 與計算結果
      set({
        maxWeight: calculatedCapacity,
      });
    }
    
    // Stamina = 0 → Ghost Mode
    if (state.stamina === ZERO_TOLERANCE.STAMINA_THRESHOLD && !state.isGhost) {
      set({ isGhost: true });
    } else if (state.stamina > ZERO_TOLERANCE.STAMINA_THRESHOLD && state.isGhost) {
      // 如果體力恢復，解除 Ghost Mode
      set({ isGhost: false });
    }
  },

  /**
   * 設置當前負重
   * 
   * @param weight - 新的負重值（kg）
   */
  setWeight: (weight: number) => {
    if (weight < 0) {
      throw new Error('Weight cannot be negative');
    }
    
    set({ currentWeight: weight });
  },
  
  /**
   * 獲取有效最大容量（十進位階梯制 + 臨時擴容）
   * 
   * 根據白皮書 v8.7：十進位階梯制（Progressive Decile Tier System）
   * - 90-100%: 1.0x (完美狀態)
   * - 80-89%: 0.9x (輕微磨損)
   * - 70-79%: 0.8x (中度磨損)
   * - ...
   * - 0-9%: 0.1x (幾近報廢)
   * 
   * 考慮臨時擴容：
   * - 如果啟用臨時擴容：基礎容量 × 1.5
   * - 然後應用十進位階梯制倍率
   * 
   * 此方法會自動從 sessionStore 獲取臨時擴容狀態，確保響應性
   * 
   * @returns 有效最大容量（kg）
   */
  getEffectiveMaxWeight: () => {
    const state = get();
    
    // 從 sessionStore 獲取臨時擴容狀態（動態獲取，確保響應性）
    // 使用 require 避免循環依賴
    const { useSessionStore } = require('./sessionStore');
    const sessionState = useSessionStore.getState();
    const isTempExpanded = sessionState.isTempExpanded || false;
    
    // 1. 計算增強後的基礎容量（考慮臨時擴容）
    const base = state.baseMaxWeight;
    const calculatedBase = isTempExpanded ? base * 1.5 : base;
    
    // 2. 應用十進位階梯制倍率
    const { getTieredMultiplier } = require('../core/math/tiered');
    const multiplier = getTieredMultiplier(state.durability);
    
    return calculatedBase * multiplier;
  },

  addBalance: (amount: number) => {
    set((state) => ({
      balance: Math.max(0, state.balance + amount),
    }));
  },

  getOrCreateUserCode: async () => {
    const existing = get().userCode;
    if (existing) return existing;
    try {
      const stored = await AsyncStorage.getItem(USER_CODE_KEY);
      if (stored) {
        set({ userCode: stored });
        return stored;
      }
      const code = 'SF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      await AsyncStorage.setItem(USER_CODE_KEY, code);
      set({ userCode: code });
      return code;
    } catch (e) {
      const fallback = 'SF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      set({ userCode: fallback });
      return fallback;
    }
  },
}));
