# Solefood MVP v8.7 - 架構設計文檔

## 1. 架構摘要：物理移動與數位熵的關係模型

### 核心概念
Solefood 是一個「Proof of Logistics」系統，其中**物理世界的移動**直接轉換為**數位世界的熵**（消耗與磨損）。

### 關係模型設計

#### 1.1 輸入層：GPS 追蹤系統
```
GPS Location Updates (實時)
    ↓
Distance Calculator (純函數)
    ↓
Movement Events (距離增量)
```

**關鍵設計點：**
- 使用 Expo Location API 追蹤位置變化
- 計算兩點之間的 Haversine 距離
- 產生「移動事件」：`{ distance: number, timestamp: number, speed: number }`

#### 1.2 轉換層：熵計算引擎
```
Movement Event
    ↓
Base Stamina Burn (1km = 10pts)
    ↓
Weight Penalty Calculation (CurrentWeight × Multiplier)
    ↓
Item Pickup Penalty (T1=3, T2=9, T3=30)
    ↓
Final Stamina Consumption
```

**同時觸發：**
- **Durability Decay**: 基於距離和重量（公式：`decay = distance × weightFactor`）
- **Hygiene Decay**: 基於時間和活動強度（公式：`decay = time × activityMultiplier`）

#### 1.3 狀態層：即時同步
```
Entropy Calculations
    ↓
State Store Updates (Zustand)
    ↓
UI Reactivity (React Native)
    ↓
Blocking Logic (Zero Tolerance Checks)
```

**零容忍機制：**
- `stamina === 0` → 觸發 Ghost Mode（禁用所有互動）
- `durability === 0` → 觸發 Backpack Collapse（Capacity = 0，禁用移動）

#### 1.4 救援層：廣告邏輯系統
```
Critical State Detected
    ↓
Rescue Matrix Evaluation
    ↓
Ad Availability Check (SessionState.caps)
    ↓
Ad Trigger → State Restoration
```

**救援矩陣：**
- **Pickup Fail**: Stamina 不足以拾取物品 → 觸發 Stamina Ad
- **Overload**: CurrentWeight > MaxWeight → 觸發 Capacity Ad
- **Death**: Stamina = 0 → 觸發 Revival Ad

### 數據流圖
```
[GPS] → [Distance] → [Stamina Burn] → [PlayerState]
                              ↓
                    [Durability/Hygiene Decay]
                              ↓
                    [Zero Tolerance Check]
                              ↓
                    [Ghost/Collapse State]
                              ↓
                    [Rescue Ad Trigger]
```

---

## 2. 目錄結構設計

### 2.1 整體架構
```
solefoodmvp/
├── app/                          # Expo Router (App Router)
│   ├── (tabs)/                   # 主要導航標籤
│   │   ├── index.tsx            # 主遊戲畫面
│   │   ├── inventory.tsx        # 背包/物品管理
│   │   └── stats.tsx            # 統計數據
│   ├── _layout.tsx              # Root Layout
│   └── rescue.tsx               # 救援/廣告畫面
│
├── src/
│   ├── core/                    # 核心業務邏輯
│   │   ├── math/                # 純數學函數（無副作用）
│   │   │   ├── distance.ts      # 距離計算（Haversine）
│   │   │   ├── stamina.ts       # Stamina 計算公式
│   │   │   ├── durability.ts    # Durability 衰減公式
│   │   │   ├── hygiene.ts       # Hygiene 衰減公式
│   │   │   ├── weight.ts        # 重量/容量計算
│   │   │   └── valuation.ts     # 估值計算（50km = $1）
│   │   │
│   │   ├── game/                # 遊戲邏輯（有狀態操作）
│   │   │   ├── movement.ts      # 移動事件處理
│   │   │   ├── pickup.ts        # 物品拾取邏輯
│   │   │   ├── rescue.ts        # 救援矩陣邏輯
│   │   │   └── validation.ts    # 狀態驗證（防作弊）
│   │   │
│   │   └── entropy/             # 熵計算引擎
│   │       ├── engine.ts        # 主熵引擎（協調所有衰減）
│   │       └── events.ts        # 熵事件類型定義
│   │
│   ├── stores/                  # Zustand 狀態管理
│   │   ├── playerStore.ts       # PlayerState
│   │   ├── inventoryStore.ts    # InventoryState
│   │   ├── sessionStore.ts      # SessionState
│   │   └── index.ts             # Store 匯出與組合
│   │
│   ├── services/                # 外部服務整合
│   │   ├── location.ts          # GPS 追蹤服務
│   │   ├── ads.ts               # 廣告服務（Ads as Logic）
│   │   └── api.ts               # 後端 API 通訊（未來）
│   │
│   ├── types/                   # TypeScript 類型定義
│   │   ├── player.ts            # Player 相關類型
│   │   ├── item.ts             # Item 相關類型
│   │   ├── session.ts          # Session 相關類型
│   │   └── index.ts            # 類型匯出
│   │
│   ├── components/              # React 組件
│   │   ├── game/               # 遊戲相關組件
│   │   │   ├── StaminaBar.tsx
│   │   │   ├── DurabilityBar.tsx
│   │   │   ├── WeightIndicator.tsx
│   │   │   └── GhostModeOverlay.tsx
│   │   ├── inventory/          # 物品相關組件
│   │   │   ├── ItemCard.tsx
│   │   │   └── BackpackView.tsx
│   │   └── rescue/             # 救援相關組件
│   │       └── AdRescueModal.tsx
│   │
│   └── utils/                  # 工具函數
│       ├── constants.ts        # 遊戲常數（T1/T2/T3 重量等）
│       ├── formatters.ts      # 格式化函數
│       └── validators.ts      # 驗證函數
│
├── assets/                     # 靜態資源
│   ├── images/
│   └── fonts/
│
├── package.json
├── tsconfig.json
├── app.json                    # Expo 配置
└── ARCHITECTURE.md             # 本文檔
```

### 2.2 設計原則

#### Math Logic (純函數) vs Game State (Stores)

**Math Logic (`src/core/math/`):**
- ✅ 純函數：相同輸入 → 相同輸出
- ✅ 無副作用：不修改外部狀態
- ✅ 可測試性：易於單元測試
- ✅ 可重用性：可在服務端驗證時重用

**Game State (`src/stores/`):**
- ✅ 狀態管理：使用 Zustand
- ✅ 副作用：可調用服務、觸發計算
- ✅ 響應式：自動更新 UI
- ✅ 持久化：可與 AsyncStorage 整合

**Game Logic (`src/core/game/`):**
- ✅ 業務邏輯：協調 Math 和 Stores
- ✅ 狀態轉換：處理遊戲事件
- ✅ 驗證邏輯：防作弊檢查

---

## 3. 核心狀態 Store 定義

### 3.1 PlayerState (玩家狀態)

**職責：** 追蹤玩家的核心物理屬性

```typescript
interface PlayerState {
  // 核心屬性
  stamina: number;           // 當前體力值（0-100）
  maxStamina: number;        // 最大體力值（預設 100）
  
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
  
  // Actions
  consumeStamina: (amount: number) => void;
  restoreStamina: (amount: number) => void;
  updateWeight: (weight: number) => void;
  decayDurability: (amount: number) => void;
  restoreDurability: (amount: number) => void;
  decayHygiene: (amount: number) => void;
  restoreHygiene: (amount: number) => void;
  checkZeroTolerance: () => void;  // 零容忍檢查
}
```

**關鍵公式：**
- `maxWeight = baseMaxWeight × (durability / 100)`
- `isGhost = stamina === 0`
- `isImmobilized = durability === 0`

---

### 3.2 InventoryState (物品狀態)

**職責：** 管理玩家的物品庫存

```typescript
interface Item {
  id: string;
  tier: 1 | 2 | 3;          // T1, T2, T3
  weight: number;            // T1=0.5kg, T2=1.5kg, T3=4.0kg
  value: number;            // 估值（未來）
  pickupCost: number;       // 拾取消耗：T1=3, T2=9, T3=30
  timestamp: number;        // 拾取時間
}

interface InventoryState {
  // 物品列表
  items: Item[];
  
  // 統計數據
  totalWeight: number;      // 總重量（自動計算）
  tierCount: {              // 各階層數量
    t1: number;
    t2: number;
    t3: number;
  };
  
  // 物品矩陣統計（85/14/1 分布）
  distribution: {
    t1Percentage: number;
    t2Percentage: number;
    t3Percentage: number;
  };
  
  // Actions
  addItem: (item: Item) => boolean;  // 返回是否成功（可能因超載失敗）
  removeItem: (itemId: string) => void;
  clearInventory: () => void;
  calculateTotalWeight: () => number;
  canPickup: (item: Item) => boolean;  // 檢查是否可以拾取（重量+體力）
}
```

**關鍵邏輯：**
- `totalWeight = sum(items.map(i => i.weight))`
- `canPickup = (currentWeight + item.weight <= maxWeight) && (stamina >= item.pickupCost)`

---

### 3.3 SessionState (會話狀態)

**職責：** 追蹤實時會話指標和救援可用性

```typescript
interface SessionState {
  // 移動指標
  totalDistance: number;        // 總移動距離（km）
  sessionDistance: number;      // 本會話距離（km）
  currentSpeed: number;         // 當前速度（km/h）
  lastLocation: {               // 最後已知位置
    latitude: number;
    longitude: number;
    timestamp: number;
  } | null;
  
  // 估值系統
  estimatedValue: number;       // 估算價值（50km = $1）
  
  // 救援系統（Ads as Logic）
  rescueAvailability: {
    staminaAd: {
      available: boolean;
      cap: number;              // 每日上限
      used: number;             // 已使用次數
    };
    capacityAd: {
      available: boolean;
      cap: number;
      used: number;
    };
    revivalAd: {
      available: boolean;
      cap: number;
      used: number;
    };
  };
  
  // 會話時間
  sessionStartTime: number;
  lastUpdateTime: number;
  
  // Actions
  updateDistance: (distance: number) => void;
  updateLocation: (location: { lat: number; lng: number }) => void;
  updateSpeed: (speed: number) => void;
  calculateValue: () => number;  // 基於距離計算價值
  triggerRescueAd: (type: 'stamina' | 'capacity' | 'revival') => boolean;
  resetSession: () => void;
}
```

**關鍵公式：**
- `estimatedValue = (totalDistance / 50) * 1.00` (USD)
- `rescueAvailability.staminaAd.available = used < cap`

---

## 4. 狀態同步機制

### 4.1 跨 Store 協調

使用 Zustand 的 `subscribeWithSelector` 實現跨 Store 響應：

```typescript
// 當 Inventory 變化時，自動更新 PlayerState.currentWeight
inventoryStore.subscribe(
  (state) => state.totalWeight,
  (totalWeight) => {
    playerStore.getState().updateWeight(totalWeight);
  }
);

// 當 PlayerState.stamina 變為 0 時，觸發 Ghost Mode
playerStore.subscribe(
  (state) => state.stamina,
  (stamina) => {
    if (stamina === 0) {
      playerStore.getState().checkZeroTolerance();
    }
  }
);
```

### 4.2 熵計算觸發

當 GPS 更新時：
1. `SessionState.updateDistance()` → 計算距離增量
2. 觸發 `entropyEngine.calculate()` → 計算所有衰減
3. 更新 `PlayerState`（Stamina, Durability, Hygiene）
4. 執行零容忍檢查
5. 如果觸發臨界狀態，顯示救援選項

---

## 5. 防作弊設計

### 5.1 數據結構設計

所有關鍵計算保留「原始數據」以便服務端驗證：

```typescript
interface MovementEvent {
  distance: number;
  timestamp: number;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  speed: number;
  // 未來可加入：GPS 精度、加速度計數據等
}
```

### 5.2 驗證檢查點

- **速度驗證**：`speed > MAX_HUMAN_SPEED` → 標記異常
- **距離驗證**：`distance > MAX_DISTANCE_PER_UPDATE` → 標記異常
- **時間驗證**：`timestamp` 必須單調遞增

---

## 6. 下一步實施計劃

1. ✅ 架構設計完成
2. ⏭️ 初始化 Expo 專案
3. ⏭️ 安裝依賴（Zustand, Expo Location, 等）
4. ⏭️ 實現核心 Math 函數
5. ⏭️ 實現三個核心 Store
6. ⏭️ 實現熵計算引擎
7. ⏭️ 實現 GPS 追蹤服務
8. ⏭️ 實現 UI 組件

---

**版本：** v8.7  
**最後更新：** 2024

