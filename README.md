# Solefood MVP v8.7

**Web3 Move-to-Earn Logistics Simulator**

一個基於 React Native (Expo) 和 TypeScript 的「Proof of Logistics」遊戲，其中物理世界的移動直接轉換為數位世界的熵（消耗與磨損）。

---

## 📋 專案概述

Solefood 不是一個簡單的計步應用。它是一個「Proof of Logistics」系統，玩家扮演數位搬運工，攜帶物品（重量）會增加體力消耗。系統採用**赤字經濟模型**，玩家必須消耗戰利品或觀看廣告才能生存。

### 核心概念

- **物理移動** → **數位熵**：GPS 追蹤的距離轉換為 Stamina、Durability、Hygiene 的衰減
- **零容忍機制**：Stamina = 0 → Ghost Mode（無法互動）；Durability = 0 → Backpack Collapse（無法移動）
- **廣告即邏輯**：廣告不是單純的 UI 覆蓋層，而是功能性的狀態修改器
- **防作弊設計**：所有計算保留原始數據，便於服務端驗證

---

## 🏗️ 架構設計

### 目錄結構

```
solefoodmvp/
├── app/                    # Expo Router (App Router)
├── src/
│   ├── core/              # 核心業務邏輯
│   │   ├── math/          # 純數學函數（無副作用）
│   │   ├── game/          # 遊戲邏輯（有狀態操作）
│   │   └── entropy/       # 熵計算引擎
│   ├── stores/            # Zustand 狀態管理
│   ├── services/          # 外部服務整合
│   ├── types/             # TypeScript 類型定義
│   ├── components/        # React 組件
│   └── utils/             # 工具函數
└── ARCHITECTURE.md        # 詳細架構文檔
```

### 核心狀態 Store

#### 1. PlayerState (`src/stores/playerStore.ts`)
管理玩家的核心物理屬性：
- Stamina（體力）
- Durability（耐久度）
- Hygiene（衛生值）
- Weight/Capacity（重量/容量）
- Ghost Mode / Immobilized 狀態

#### 2. InventoryState (`src/stores/inventoryStore.ts`)
管理物品庫存：
- 物品列表（T1/T2/T3）
- 總重量計算
- 階層統計（85/14/1 分布）
- 拾取驗證邏輯

#### 3. SessionState (`src/stores/sessionStore.ts`)
追蹤實時會話指標：
- 距離/速度追蹤
- 估值計算（50km = $1）
- 救援廣告可用性

---

## 🎮 遊戲規則（v8.7）

### 估值系統
- **50km ≈ $1.00 USD**

### Stamina 系統
- **1km = 10pts burn**
- 拾取物品額外消耗：T1=3, T2=9, T3=30
- **Stamina = 0** → Ghost Mode（無法互動）

### 物品系統
- **T1**: 0.5kg（拾取消耗 3pts）
- **T2**: 1.5kg（拾取消耗 9pts）
- **T3**: 4.0kg（拾取消耗 30pts）
- 分布：85% T1, 14% T2, 1% T3

### 零容忍機制
- **Durability = 0** → Backpack Collapse
  - Capacity 變為 0
  - 玩家無法移動

### 維護系統
- **Hygiene 衰減** → 降低收益
- **Durability 衰減** → 降低容量

### 救援矩陣
玩家可以觸發特定廣告來拯救：
- **Pickup Fail** → Stamina Ad
- **Overload** → Capacity Ad
- **Death** → Revival Ad

---

## 🚀 快速開始

### 安裝依賴

```bash
npm install
# 或
yarn install
```

### 運行專案

```bash
npx expo start
```

### 開發環境

- **Node.js**: >= 18
- **Expo**: Latest
- **TypeScript**: >= 5.0

---

## 📦 核心依賴

- `zustand` - 狀態管理
- `expo-location` - GPS 追蹤
- `expo-ads` - 廣告整合（未來）
- `react-native` - UI 框架

---

## 🔧 開發原則

### Math Logic vs Game State

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

---

## 📝 狀態同步機制

### 跨 Store 協調

當 GPS 更新時：
1. `SessionState.updateDistance()` → 計算距離增量
2. 觸發熵計算引擎 → 計算所有衰減
3. 更新 `PlayerState`（Stamina, Durability, Hygiene）
4. 執行零容忍檢查
5. 如果觸發臨界狀態，顯示救援選項

### 零容忍檢查

- `stamina === 0` → 觸發 Ghost Mode
- `durability === 0` → 觸發 Backpack Collapse

---

## 🛡️ 防作弊設計

### 數據結構
所有關鍵計算保留「原始數據」以便服務端驗證：
- GPS 座標
- 時間戳
- 速度數據
- 距離增量

### 驗證檢查點
- **速度驗證**：`speed > MAX_HUMAN_SPEED` → 標記異常
- **距離驗證**：`distance > MAX_DISTANCE_PER_UPDATE` → 標記異常
- **時間驗證**：`timestamp` 必須單調遞增

---

## 📚 文檔

詳細架構設計請參考：[ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 📄 許可證

[待定]

---

**版本：** v8.7  
**最後更新：** 2024

