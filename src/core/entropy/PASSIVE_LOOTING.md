# 被動真空拾取機制

## 📋 機制說明

### 舊機制（Pokemon GO 風格）
- 用戶移動 → 看到物品在地圖上 → 點擊拾取

### 新機制（Death Stranding / 被動風格）
- 用戶移動 → 系統自動累積距離 → 每 100m 自動 RNG 拾取物品
- **用戶不需要看屏幕**，物品自動"真空"進入背包

---

## 🔧 技術實現

### 1. 距離累積器 (`pendingDistance`)

```typescript
private pendingDistance: number = 0;
```

**目的**: GPS 更新是細粒度的（例如 0.02km, 0.05km），需要累積到 0.1km 才觸發拾取。

**邏輯**:
```typescript
// 每次 processMovement 時累積
this.pendingDistance += input.distance;
```

### 2. 解析循環

```typescript
const LOOT_TRIGGER_DISTANCE = 0.1; // 100m = 0.1km

while (this.pendingDistance >= LOOT_TRIGGER_DISTANCE) {
  this.pendingDistance -= LOOT_TRIGGER_DISTANCE;
  this.processLootEvent(currentTime);
}
```

**處理場景**:
- 快速移動：一次輸入 0.5km → 觸發 5 次拾取事件
- GPS 漂移：一次輸入 0.3km → 觸發 3 次拾取事件
- 正常移動：多次小距離更新 → 累積到 0.1km 觸發

### 3. RNG 與自動拾取邏輯

#### RNG 決定物品階層
```typescript
rollItemTier(): ItemTier
```
- 85% T1（琥珀粗糖）
- 14% T2（翡翠晶糖）
- 1% T3（皇室純糖）

#### 自動檢查與拾取
```typescript
processLootEvent(timestamp: number)
```

**流程**:
1. 檢查 Ghost Mode / Immobilized → 如果失敗，發射 `loot_failed`
2. RNG 決定階層
3. 創建物品對象
4. 調用 `inventory.canPickup(item)` 檢查：
   - 容量：`currentWeight + item.weight <= maxWeight`
   - 體力：`stamina >= item.pickupCost`
5. **成功**: 
   - 調用 `inventory.addItem(item)`（自動消耗體力）
   - 發射 `loot_success` 事件
6. **失敗**: 
   - 不添加物品
   - 發射 `loot_intercept` 事件（用於顯示救援選項）

---

## 📊 事件系統

### 新增事件類型

1. **`loot_success`** - 拾取成功
   ```typescript
   {
     tier: 1 | 2 | 3,
     success: true,
     itemId: string
   }
   ```

2. **`loot_failed`** - 拾取失敗（Ghost Mode / Immobilized）
   ```typescript
   {
     tier: 1 | 2 | 3,
     success: false,
     reason: 'ghost_mode' | 'immobilized'
   }
   ```

3. **`loot_intercept`** - 拾取攔截（超載或體力不足）
   ```typescript
   {
     tier: 1 | 2 | 3,
     success: false,
     reason: 'overload' | 'insufficient_stamina',
     itemId: string
   }
   ```

---

## 🎮 遊戲體驗

### 優勢

1. **無需看屏幕**: 用戶可以專注於移動，物品自動拾取
2. **流暢體驗**: 不需要點擊操作，減少摩擦
3. **被動收益**: 移動即收益，符合 Death Stranding 的設計哲學

### 拾取頻率

- **每 100m 一次拾取機會**
- **1km = 10 次拾取機會**
- **預期分布**: 8.5 個 T1, 1.4 個 T2, 0.1 個 T3（平均）

---

## 🔍 測試場景

### 場景 1: 正常移動
```
輸入: 0.05km → 累積到 0.05km（未觸發）
輸入: 0.03km → 累積到 0.08km（未觸發）
輸入: 0.04km → 累積到 0.12km → 觸發 1 次拾取，剩餘 0.02km
```

### 場景 2: 快速移動
```
輸入: 0.5km → 累積到 0.5km → 觸發 5 次拾取，剩餘 0.0km
```

### 場景 3: 超載情況
```
pendingDistance = 0.1km
RNG 決定: T3 (4.0kg)
檢查: currentWeight + 4.0 > maxWeight → 失敗
結果: 發射 loot_intercept 事件（reason: 'overload'）
```

### 場景 4: 體力不足
```
pendingDistance = 0.1km
RNG 決定: T3 (需要 30 體力)
檢查: stamina < 30 → 失敗
結果: 發射 loot_intercept 事件（reason: 'insufficient_stamina'）
```

---

## 📝 使用範例

### 監聽拾取事件

```typescript
import { entropyEngine } from './core/entropy/engine';

// 監聽拾取成功
entropyEngine.on('loot_success', (event) => {
  const { tier, itemId } = event.data as LootResult;
  console.log(`拾取成功: T${tier} 物品 (${itemId})`);
  // 顯示 UI toast: "獲得 T1 琥珀粗糖！"
});

// 監聽拾取攔截
entropyEngine.on('loot_intercept', (event) => {
  const { tier, reason } = event.data as LootResult;
  if (reason === 'overload') {
    // 顯示救援選項：呼叫搬運工
  } else if (reason === 'insufficient_stamina') {
    // 顯示救援選項：注射腎上腺素
  }
});
```

---

## ⚠️ 注意事項

1. **基礎移動消耗持續發生**: 體力消耗不依賴拾取，持續發生
2. **拾取消耗額外體力**: 每次成功拾取會額外消耗體力（T1=3, T2=9, T3=30）
3. **零容忍檢查**: 體力或耐久度歸零時，拾取會自動失敗
4. **防作弊保留**: 所有防作弊檢查（速度、距離）仍然有效

---

**版本**: v8.7  
**最後更新**: 2024

