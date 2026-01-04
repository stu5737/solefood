/**
 * Game 相關類型定義
 * Solefood MVP v8.7 (Final Consolidated Edition)
 */

import { ItemTier } from './item';

/**
 * 變現倍率類型
 */
export type PayoutMode = 'normal' | 'porter' | 'data';

/**
 * 變現倍率矩陣
 */
export interface PayoutMatrix {
  mode: PayoutMode;
  multiplier: number;      // 1.0x, 2.0x, 10.0x
  staminaCost: number;     // 體力消耗（0 表示免除）
  requiresAd: boolean;      // 是否需要觀看廣告
  requiresPhoto: boolean;  // 是否需要拍照上傳
}

/**
 * 卸貨選項
 */
export interface UnloadOption {
  mode: PayoutMode;
  label: string;
  description: string;
  staminaCost: number;
  payoutMultiplier: number;
  available: boolean;
}

/**
 * 救援類型
 */
export type RescueType = 'adrenaline' | 'porter' | 'leave' | 'ghost';

/**
 * 救援選項
 */
export interface RescueOption {
  type: RescueType;
  label: string;
  description: string;
  cost: 'ad' | 'item' | 'none';
  effect: string;
  available: boolean;
}

/**
 * 開拓者狀態
 */
export interface PathfinderState {
  isPathfinder: boolean;           // 是否為開拓者區域
  lastVisited: number | null;      // 最後造訪時間戳
  h3Grid: string;                   // H3 網格 ID
}

/**
 * 深層領域狀態
 */
export interface DeepZoneState {
  isInDeepZone: boolean;           // 是否在深層領域
  sessionDistance: number;          // 本會話距離
  t3Multiplier: number;            // T3 機率倍率
}

/**
 * 每日幸運梯度
 */
export interface LuckGradient {
  streak: number;                  // 連續簽到天數
  t2Bonus: number;                 // T2 機率加成 (%)
  lastActiveDate: string;          // 最後活躍日期 (YYYY-MM-DD)
  leaveDaysUsed: number;           // 已使用的休假天數
}

/**
 * 金霧節點（L2 社群懸賞層）
 */
export interface GoldenMistNode {
  nodeId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  poiId: string;                   // POI 識別碼
  dataAge: number;                 // 數據年齡（天）
  isAvailable: boolean;             // 是否可進行 M Info
  cooldownUntil: number | null;     // 冷卻到期時間戳
}

/**
 * 物品拾取攔截狀態
 */
export interface PickupInterception {
  isIntercepted: boolean;          // 是否被攔截
  reason: 'stamina' | 'overload' | null; // 攔截原因
  item: {
    tier: ItemTier;
    weight: number;
    value: number;
    pickupCost: number;
  } | null;
  rescueOptions: RescueOption[];    // 救援選項
}

/**
 * 自動進食配置
 */
export interface AutoConsumeConfig {
  enabled: boolean;                 // 是否啟用
  threshold: number;                // 觸發閾值（體力百分比）
  priority: ItemTier[];             // 優先順序（T1 > T2）
}

