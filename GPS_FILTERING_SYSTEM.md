# GPS 三層過濾漏斗系統 (3-Layer Filtering Funnel)

## 問題背景

GPS 飄移是 LBS (Location Based Service) 應用開發中最棘手的問題，會導致：

### 1. 微觀飄移 (Jitter)
- **症狀**：明明站在原地或走直線，GPS 卻像蒼蠅一樣亂飛
- **結果**：H3 地圖上留下像「散彈槍」打過一樣的雜亂點，路徑很醜
- **原因**：GPS 精度通常 5-20m，但 H3 Resolution 12 格子只有 11m

### 2. 宏觀飄移 (Teleport)
- **症狀**：突然飛到幾百公尺外再飛回來
- **結果**：地圖上出現一塊不相干的髒污
- **原因**：室內、高樓大廈間的訊號反射

---

## 解決方案：三層過濾漏斗

模仿運動軌跡 App (Nike Run Club, Strava) 的處理方式。

### 架構圖

```
原始 GPS 訊號
    ↓
┌─────────────────────────────────────────┐
│ 第一層：精度過濾 (Accuracy Gate)          │
│ 過濾 accuracy > 40m 的低精度訊號          │
└─────────────────────────────────────────┘
    ↓ (通過)
┌─────────────────────────────────────────┐
│ 第二層：速度過濾 (Teleport Protection)   │
│ 過濾速度 > 36 km/h 的瞬移噪點            │
└─────────────────────────────────────────┘
    ↓ (通過)
┌─────────────────────────────────────────┐
│ 第三層：平滑化窗口 (Smoothing Window)    │
│ 使用最近 5 個點的平均座標                │
└─────────────────────────────────────────┘
    ↓
平滑後的座標 → H3 轉換 → 穩定的軌跡
```

---

## 實施細節

### 第一層：精度過濾 (Accuracy Gate)

**目的**：過濾室內或高樓大廈間的嚴重反射訊號

**規則**：
```typescript
if (accuracy > 40m) {
  丟棄該點
}
```

**效果**：
- ✅ 過濾掉 GPS 告訴你「誤差範圍 100公尺」的垃圾訊號
- ✅ 這些點會畫在馬路對面的建築物裡，直接丟掉比畫錯好

**配置**：
```typescript
private readonly MAX_ACCURACY_THRESHOLD = 40; // 米
```

---

### 第二層：速度過濾 (Teleport Protection)

**目的**：過濾大幅度飄移（瞬移）

**規則**：
```typescript
if (速度 > 10 m/s && 距離 > 50m) {
  丟棄該點
}
```

**計算邏輯**：
```typescript
const timeDiff = (當前時間 - 上一點時間) / 1000; // 秒
const distance = Haversine(上一點, 當前點); // 米
const speed = distance / timeDiff; // m/s

if (speed > 10 && distance > 50) {
  // 你不可能一秒鐘跑 100 公尺，一定是雜訊
  丟棄
}
```

**效果**：
- ✅ 解決「瞬移」問題
- ✅ 10 m/s = 36 km/h（適合步行/跑步/騎車）
- ✅ 距離閾值 50m 避免微小跳動誤判

**配置**：
```typescript
private readonly MAX_SPEED_THRESHOLD = 10; // m/s (約 36 km/h)
private readonly MAX_JUMP_DISTANCE = 50; // 米
```

---

### 第三層：平滑化窗口 (Smoothing Window) ⭐ 關鍵！

**目的**：解決「同一條路徑畫得很雜」的問題

**規則**：
```typescript
// 不直接使用原始座標
const rawLat = location.latitude;
const rawLng = location.longitude;

// 建立緩衝區，保留最近 5 個點
locationBuffer.push({ lat: rawLat, lng: rawLng });
if (locationBuffer.length > 5) {
  locationBuffer.shift();
}

// 計算平均座標
const avgLat = sum(locationBuffer.map(p => p.lat)) / locationBuffer.length;
const avgLng = sum(locationBuffer.map(p => p.lng)) / locationBuffer.length;

// 使用平均座標進行 H3 轉換
const h3Index = latLngToH3(avgLat, avgLng);
```

**效果對比**：

#### 沒有平滑化：
```
原始 GPS: 左 → 右 → 左 → 右 → 左 → 右
H3 格子:  A → B → A → B → A → B
結果:     路徑寬、雜亂、像散彈槍
```

#### 有平滑化：
```
原始 GPS: 左 → 右 → 左 → 右 → 左 → 右
平滑後:   中 → 中 → 中 → 中 → 中 → 中
H3 格子:  A → A → A → A → A → A
結果:     路徑穩定、在中心線上、像筆觸
```

**配置**：
```typescript
private readonly SMOOTHING_BUFFER_SIZE = 5; // 保留最近 5 個點
```

---

## 代碼實施位置

### 文件：`src/services/gpsHistory.ts`

#### 1. 添加配置常量

```typescript
class GPSHistoryService {
  // ========== 🚀 GPS 三層過濾漏斗 ==========
  private readonly MAX_ACCURACY_THRESHOLD = 40; // 第一層
  private readonly MAX_SPEED_THRESHOLD = 10; // 第二層 (m/s)
  private readonly MAX_JUMP_DISTANCE = 50; // 第二層 (米)
  private readonly SMOOTHING_BUFFER_SIZE = 5; // 第三層
  
  private locationBuffer: Array<{ 
    latitude: number; 
    longitude: number; 
    timestamp: number 
  }> = [];
  
  private lastValidLocation: { 
    latitude: number; 
    longitude: number; 
    timestamp: number 
  } | null = null;
}
```

#### 2. 修改 `addPoint()` 方法

```typescript
addPoint(location: LocationData, distance: number = 0): void {
  // ... 現有檢查 ...
  
  // 第一層：精度過濾
  if (accuracy > this.MAX_ACCURACY_THRESHOLD) {
    console.log(`[GPS Filter] ❌ 第一層過濾：精度不足`);
    return;
  }
  
  // 第二層：速度過濾
  if (this.lastValidLocation) {
    const speed = calculateSpeed(...);
    if (speed > this.MAX_SPEED_THRESHOLD && distance > this.MAX_JUMP_DISTANCE) {
      console.log(`[GPS Filter] ❌ 第二層過濾：速度異常`);
      return;
    }
  }
  
  // 第三層：平滑化窗口
  this.locationBuffer.push({ latitude, longitude, timestamp });
  if (this.locationBuffer.length > this.SMOOTHING_BUFFER_SIZE) {
    this.locationBuffer.shift();
  }
  
  const avgLat = average(this.locationBuffer.map(p => p.latitude));
  const avgLng = average(this.locationBuffer.map(p => p.longitude));
  
  // 使用平滑後的座標
  const point = {
    latitude: avgLat,
    longitude: avgLng,
    // ...
  };
  
  // 更新最後有效位置（使用原始座標）
  this.lastValidLocation = { latitude, longitude, timestamp };
}
```

#### 3. 添加輔助方法

```typescript
private calculateDistanceMeters(
  lat1: number, lng1: number, 
  lat2: number, lng2: number
): number {
  // Haversine 公式
  const R = 6371000; // 地球半徑（米）
  // ...
  return distance;
}
```

---

## 測試與驗證

### 控制台日誌

啟動後會看到：
```
[GPS Filter] ✅ 三層過濾啟動：
  精度閾值=40m, 
  速度閾值=36.0km/h, 
  平滑窗口=5點
```

過濾時會看到：
```
[GPS Filter] ❌ 第一層過濾：精度不足 (accuracy=65.3m > 40m)，丟棄
[GPS Filter] ❌ 第二層過濾：速度異常 (speed=15.2m/s = 54.7km/h, dist=76.1m)，丟棄
```

### 測試場景

#### 場景 1：室內 GPS 飄移
- **測試**：進入建築物內，GPS 精度降低
- **預期**：accuracy > 40m 的點被過濾，不記錄

#### 場景 2：高樓大廈間瞬移
- **測試**：在高樓間走動，GPS 突然跳到遠處
- **預期**：速度異常的點被過濾，軌跡連續

#### 場景 3：同一條路重複走
- **測試**：在同一條路上來回走
- **預期**：平滑化後，H3 格子穩定在路徑中心，不會左右亂跳

---

## 配置調整建議

### 如果過濾太嚴格（丟失太多點）

```typescript
// 放寬精度閾值
private readonly MAX_ACCURACY_THRESHOLD = 60; // 從 40 改為 60

// 放寬速度閾值
private readonly MAX_SPEED_THRESHOLD = 15; // 從 10 改為 15 (54 km/h)
```

### 如果過濾太寬鬆（還是有雜點）

```typescript
// 收緊精度閾值
private readonly MAX_ACCURACY_THRESHOLD = 30; // 從 40 改為 30

// 收緊速度閾值
private readonly MAX_SPEED_THRESHOLD = 8; // 從 10 改為 8 (28.8 km/h)

// 增加平滑窗口
private readonly SMOOTHING_BUFFER_SIZE = 7; // 從 5 改為 7
```

### 針對不同使用場景

#### 步行模式（預設）
```typescript
MAX_SPEED_THRESHOLD = 10; // 36 km/h
SMOOTHING_BUFFER_SIZE = 5;
```

#### 跑步模式
```typescript
MAX_SPEED_THRESHOLD = 12; // 43.2 km/h
SMOOTHING_BUFFER_SIZE = 4; // 更快反應
```

#### 騎車模式
```typescript
MAX_SPEED_THRESHOLD = 20; // 72 km/h
SMOOTHING_BUFFER_SIZE = 3; // 更快反應
```

---

## 效果預期

### 修復前
- ❌ 路徑寬、雜亂，像散彈槍
- ❌ 出現遠距離噪點（瞬移）
- ❌ 同一條路每次走都記錄不同的 H3
- ❌ H3 地圖看起來很髒

### 修復後
- ✅ 路徑穩定、在中心線上，像筆觸
- ✅ 沒有遠距離噪點
- ✅ 同一條路走多次，H3 格子穩定
- ✅ H3 地圖清晰、美觀

---

## 注意事項

### 1. 冷啟動問題
- 前 5 個點（平滑窗口大小）可能還不夠穩定
- 建議：前 5 個點使用較寬鬆的過濾條件

### 2. 會話切換
- 每次 `startSession()` 和 `endSession()` 時，清空緩衝區
- 避免不同會話的數據混在一起

### 3. 性能影響
- 平滑化計算非常輕量（只是平均值）
- 對性能影響可忽略不計

### 4. 精度 vs 平滑度權衡
- 平滑窗口越大，軌跡越穩定，但反應越慢
- 建議：5 個點是最佳平衡點

---

## 參考資料

- Nike Run Club GPS 處理邏輯
- Strava GPS 平滑化算法
- Uber H3 最佳實踐
- GPS 精度標準（Android/iOS）

---

## 更新日誌

- **2026-01-16**：實施三層過濾漏斗系統
  - 第一層：精度過濾 (40m 閾值)
  - 第二層：速度過濾 (36 km/h 閾值)
  - 第三層：平滑化窗口 (5 點平均)
