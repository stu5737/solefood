/**
 * 遊戲常數定義
 * Solefood MVP v8.7 (Final Consolidated Edition)
 */

// 估值系統
export const VALUATION = {
  KM_PER_DOLLAR: 50,        // 50km = $1.00 USD
  DOLLAR_PER_KM: 0.02,      // $0.02 per km
  SOLE_PER_DOLLAR: 10000,   // 10,000 $SOLE = $1.00 USD (手搖飲指數)
} as const;

// Stamina 系統
export const STAMINA = {
  BURN_PER_KM: 10,          // 1km = 10pts burn (每 100m = 1pt)
  BURN_PER_100M: 1,         // 每 100 公尺消耗 1 點
  MAX_STAMINA: 100,         // 最大體力值
  MIN_STAMINA: 0,           // 最小體力值
  AUTO_CONSUME_THRESHOLD: 50, // 自動進食觸發閾值 (50%)
  AD_RESTORE: 30,           // 廣告恢復體力值
} as const;

// 物品系統
export const ITEM_WEIGHTS = {
  T1: 0.5,                  // T1 琥珀粗糖重量 (kg)
  T2: 1.5,                  // T2 翡翠晶糖重量 (kg)
  T3: 4.0,                  // T3 皇室純糖重量 (kg)
} as const;

export const ITEM_PICKUP_COSTS = {
  T1: 3,                    // T1 拾取消耗
  T2: 9,                    // T2 拾取消耗
  T3: 30,                   // T3 拾取消耗
} as const;

export const ITEM_VALUES = {
  T1: 10,                   // T1 基礎價值 ($SOLE)
  T2: 50,                   // T2 基礎價值 ($SOLE)
  T3: 500,                  // T3 基礎價值 ($SOLE)
} as const;

export const ITEM_CONSUME_RESTORE = {
  T1: 5,                    // T1 食用恢復體力 (+5, 續航 500m)
  T2: 15,                   // T2 食用恢復體力 (+15, 續航 1.5km)
  T3: 100,                  // T3 食用恢復體力 (+100, 瞬間回滿)
} as const;

// 物品分布（85/14/1）
export const ITEM_DISTRIBUTION = {
  T1_PERCENTAGE: 85,        // Day 1 基礎機率
  T2_PERCENTAGE: 14,        // Day 1 基礎機率
  T3_PERCENTAGE: 1,         // Day 1 基礎機率
  PATHFINDER_T2_BONUS: 10,  // 開拓者紅利：T2 機率 +10%
  DEEP_ZONE_T3_MULTIPLIER: 2, // 深層領域：T3 機率翻倍 (1% → 2%)
} as const;

// 容量系統
export const CAPACITY = {
  BASE_MAX_WEIGHT: 10,      // 基礎最大容量 (kg)
  MAX_DURABILITY: 100,      // 最大耐久度
  MIN_DURABILITY: 0,        // 最小耐久度
  EXPANSION_UNIT: 2.0,     // 每次擴容增加 2.0kg
} as const;

// 衛生系統
export const HYGIENE = {
  MAX_HYGIENE: 100,         // 最大衛生值
  MIN_HYGIENE: 0,           // 最小衛生值
  CONTAMINATION: {
    T1: 0.2,                // T1 造成 -0.2% 汙染
    T2: 0.6,                // T2 造成 -0.6% 汙染
    T3: 1.0,                // T3 造成 -1.0% 汙染
  },
  CLEAN_COST_PER_PERCENT: 2, // 清潔費：每 1% 汙染 = 2 $SOLE
} as const;

// 卸貨系統
export const UNLOADING = {
  STAMINA_COST_PER_KG: 2,  // 每卸下 1.0kg 消耗 2 點體力
} as const;

// 變現倍率矩陣
export const PAYOUT_MATRIX = {
  NORMAL: 1.0,              // M Normal: 自己搬 (1.0x)
  PORTER: 2.0,              // M Ad: 請人搬 (2.0x, 看廣告)
  DATA: 10.0,               // M Info: 店家搬 (10.0x, 拍照上傳)
} as const;

// 救援廣告系統
export const RESCUE_ADS = {
  ADRENALINE: {             // 腎上腺素救援
    CAP: 5,                 // 每日上限
    RESTORE: 30,            // 恢復體力
  },
  PORTER: {                 // 搬運工救援
    CAP: Infinity,          // 無上限（每次卸貨都可觸發）
  },
  LEAVE: {                  // 休假救援
    CAP: 3,                 // 最多連續 3 天
  },
  GHOST: {                  // 靈魂救援
    CAP: 5,                 // 每日上限
    RESTORE: 30,            // 恢復體力
    DISTANCE_THRESHOLD: 1.0, // 需當日累積里程 > 1.0km
  },
} as const;

// 零容忍閾值
export const ZERO_TOLERANCE = {
  STAMINA_THRESHOLD: 0,     // Stamina = 0 → Ghost Mode
  DURABILITY_THRESHOLD: 0,   // Durability = 0 → Immobilized (完全定身)
} as const;

// 速度限制（防作弊）
export const ANTI_CHEAT = {
  MAX_HUMAN_SPEED: 50,      // 最大人類速度 (km/h)
  MAX_DISTANCE_PER_UPDATE: 1, // 每次更新的最大距離 (km)
} as const;

// 背包擴容定價（階梯式）
export const EXPANSION_PRICING = {
  BEGINNER: {               // 新手期 (10kg ~ 20kg)
    MIN_WEIGHT: 10,
    MAX_WEIGHT: 20,
    COST_PER_UNIT: 100,     // 每 +2kg = 100 $SOLE
  },
  GROWTH: {                 // 成長期 (20kg ~ 30kg)
    MIN_WEIGHT: 20,
    MAX_WEIGHT: 30,
    COST_PER_UNIT: 500,     // 每 +2kg = 500 $SOLE
  },
  MASTER: {                 // 完全體 (30kg+)
    MIN_WEIGHT: 30,
    MAX_WEIGHT: Infinity,
    COST_PER_UNIT: 1000,    // 每 +2kg = 1000 $SOLE
  },
} as const;

// 重裝稅（動態維修費）
export const HEAVY_DUTY_TAX = {
  BASE_COST_PER_POINT: 5,   // 新手背包：修 1 點 = 5 $SOLE
  MULTIPLIER_PER_10KG: 1,   // 每 10kg 增加 1 倍
  // 計算公式：cost = BASE_COST_PER_POINT × (1 + (baseMaxWeight - 10) / 10)
} as const;

// 每日幸運梯度
export const LUCK_GRADIENT = {
  BASE_T2_RATE: 14,         // Day 1 基礎 T2 機率 (%)
  MAX_BONUS: 15,            // 最大加成 (Day 30)
  MAX_DAYS: 30,             // 最大天數
  // 公式：T2_Rate = BASE_T2_RATE + (day / MAX_DAYS) × MAX_BONUS
} as const;

// 開拓者紅利
export const PATHFINDER = {
  MEMORY_DAYS: 7,           // 記憶衰退天數（7 天未踏足）
  T2_BONUS: 10,             // T2 機率額外 +10%
} as const;

// 深層領域 (Deep Zone)
export const DEEP_ZONE = {
  TRIGGER_DISTANCE: 9.0,    // 9km 視覺心理戰觸發
  BREAKTHROUGH_DISTANCE: 10.0, // 10km 突破點
  T3_MULTIPLIER: 2,         // T3 機率翻倍
} as const;

// 廣告解鎖門檻（防刷機制）
export const AD_UNLOCK_THRESHOLDS = {
  FIRST: 1.0,               // 第 1 個廣告：需當日累積里程 > 1.0km
  SECOND: 2.0,              // 第 2 個廣告：需當日累積里程 > 2.0km
  // 以此類推...
} as const;

