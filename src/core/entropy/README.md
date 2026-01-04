# 熵計算引擎使用指南

## 概述

熵計算引擎（Entropy Engine）是 Solefood MVP v8.7 的核心邏輯層，負責連接**輸入（移動）**與**狀態（Stores）**。

## 架構位置

```
src/core/entropy/
├── engine.ts      # 熵計算引擎核心實現
├── events.ts      # 事件類型定義
├── index.ts       # 模組匯出
└── README.md      # 本文檔
```

## 核心功能

### 1. 處理移動事件

熵引擎接收移動輸入，自動計算所有衰減並更新狀態：

```typescript
import { entropyEngine } from './core/entropy/engine';
import type { MovementInput } from './core/entropy/events';

const input: MovementInput = {
  distance: 1.0,        // 移動 1km
  speed: 5.0,          // 速度 5km/h
  timestamp: Date.now(),
};

const result = entropyEngine.processMovement(input);
```

### 2. 自動計算衰減

引擎會自動計算三種衰減：

- **體力消耗（Stamina Burn）**
  - 基礎：1km = 10pts
  - 重量懲罰：負重越高，消耗越大
  
- **耐久度衰減（Durability Decay）**
  - 基於距離和當前負重
  - 自動觸發零容忍檢查
  
- **衛生值衰減（Hygiene Decay）**
  - 基於時間和活動強度
  - 速度越快，衰減越快

### 3. 自動狀態同步

引擎會自動更新以下 Store：

- `PlayerStore` - 體力、耐久度、衛生值
- `SessionStore` - 距離、估值

### 4. 事件系統

監聽臨界狀態事件：

```typescript
// 體力耗盡
entropyEngine.on('stamina_depleted', (event) => {
  // 顯示救援選項
});

// 耐久度歸零
entropyEngine.on('durability_zero', (event) => {
  // 顯示緊急維修選項
});

// 衛生值過低
entropyEngine.on('hygiene_low', (event) => {
  // 提醒玩家清潔
});
```

## 數據流

```
GPS Location Update
    ↓
MovementInput { distance, speed, timestamp }
    ↓
[EntropyEngine.processMovement]
    ↓
[計算體力消耗] → calculateMovementBurn()
    ↓
[計算耐久度衰減] → calculateDecay()
    ↓
[計算衛生值衰減] → calculateHygieneDecay()
    ↓
[更新 PlayerStore]
    ├── updateStamina(-staminaBurn)
    ├── updateDurability(-durabilityDecay) → checkZeroTolerance()
    └── updateHygiene(-hygieneDecay)
    ↓
[更新 SessionStore]
    └── addDistance(distance) → calculateValue()
    ↓
[檢查臨界狀態] → 觸發事件
    ↓
EntropyResult
```

## 防作弊機制

引擎內建防作弊檢查：

- **距離驗證**：檢測異常距離（> 1km/update）
- **速度驗證**：檢測異常速度（> 50km/h）
- **時間戳驗證**：確保時間戳有效

## 最佳實踐

### 1. 定期調用

在 GPS 追蹤服務中，每次位置更新時調用：

```typescript
// 在 location service 中
function onLocationUpdate(location: Location) {
  const input: MovementInput = {
    distance: calculateDistance(lastLocation, location),
    speed: calculateSpeed(lastLocation, location, timeDiff),
    timestamp: Date.now(),
  };
  
  entropyEngine.processMovement(input);
}
```

### 2. 錯誤處理

```typescript
try {
  const result = entropyEngine.processMovement(input);
  // 處理結果
} catch (error) {
  console.error('熵計算失敗:', error);
  // 處理錯誤
}
```

### 3. 事件監聽

在應用啟動時註冊事件監聽器：

```typescript
// 在 App.tsx 或遊戲初始化時
useEffect(() => {
  const handleStaminaDepleted = (event: EntropyEvent) => {
    // 顯示救援 UI
    showRescueModal('stamina');
  };
  
  entropyEngine.on('stamina_depleted', handleStaminaDepleted);
  
  return () => {
    entropyEngine.off('stamina_depleted', handleStaminaDepleted);
  };
}, []);
```

## 測試

### 單元測試範例

```typescript
import { EntropyEngine } from './core/entropy/engine';
import { usePlayerStore } from './stores/playerStore';

describe('EntropyEngine', () => {
  let engine: EntropyEngine;
  
  beforeEach(() => {
    engine = new EntropyEngine();
    usePlayerStore.getState().resetPlayer();
  });
  
  it('should calculate stamina burn correctly', () => {
    const input = {
      distance: 1.0,
      speed: 5.0,
      timestamp: Date.now(),
    };
    
    const result = engine.processMovement(input);
    expect(result.staminaBurn).toBe(10); // 1km = 10pts
  });
  
  it('should trigger zero tolerance when durability reaches 0', () => {
    // 設置耐久度為 1
    usePlayerStore.getState().updateDurability(-99);
    
    const input = {
      distance: 1.0,
      speed: 5.0,
      timestamp: Date.now(),
    };
    
    engine.processMovement(input);
    
    const playerState = usePlayerStore.getState();
    expect(playerState.isImmobilized).toBe(true);
  });
});
```

## 注意事項

1. **單例模式**：全局只有一個引擎實例，無需手動創建
2. **自動同步**：所有狀態更新都是自動的，無需手動調用
3. **零容忍檢查**：修改耐久度後會自動觸發，無需手動調用
4. **事件清理**：記得在組件卸載時移除事件監聽器

## 相關文檔

- [架構設計文檔](../../ARCHITECTURE.md)
- [數學函數文檔](../math/README.md)
- [狀態管理文檔](../../stores/README.md)

---

**版本**: v8.7 (Final Consolidated Edition)  
**最後更新**: 2024

