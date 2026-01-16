# 📊 H3 數據來源與判定邏輯分析

## 🎯 三個核心數據來源

### 1. 歷史H3繪製來源數據（History H3）

**數據來源**：`historySessions`（來自 `gpsHistoryService`）

**定義**：
```typescript
// src/services/gpsHistory.ts
interface CollectionSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  points: GPSHistoryPoint[]; // 本次會話的所有 GPS 點
  totalDistance: number;
  // ...
}
```

**生成邏輯**：
```typescript
// src/components/map/MapboxRealTimeMap.tsx
const historyH3GeoJson = useMemo(() => {
  if (actualMapMode !== 'GAME') return null;
  
  // 1. 收集所有歷史會話的 GPS 點
  const allPoints: GPSHistoryPoint[] = [];
  historySessions.forEach(session => {
    if (session.points) {
      allPoints.push(...session.points);
    }
  });

  // 2. 將 GPS 點轉換為 H3 索引
  // 3. 計算地理中心
  // 4. 計算每個 H3 的距離和透明度（迷霧效果）
  const result = calculateSessionH3GeoJson(allPoints);
  
  return result;
}, [actualMapMode, historySessions, calculateSessionH3GeoJson]);
```

**特點**：
- ✅ 來源：過去 7 天內的所有**已結束的會話**
- ✅ 數據：`gpsHistoryService.getAllSessions()` → `historySessions`
- ✅ 用途：繪製**歷史探索區域**（迷霧效果）
- ✅ 更新時機：會話結束後保存，下次啟動時載入

---

### 2. CurrentH3 判別比對數據來源

**數據來源**：`exploredHexes` + `currentSessionNewHexes`（來自 `sessionStore`）

**定義**：
```typescript
// src/stores/sessionStore.ts
interface SessionState {
  exploredHexes: Set<string>;           // 已探索的 H3 索引（歷史 + 已結算的會話）
  currentSessionNewHexes: Set<string>;   // 當前會話新發現的 H3（採集時不顯示，結算後才合併）
  lastKnownHex: string | null;          // 上一個 H3 格子（用於路徑補間）
}
```

**判定邏輯**：
```typescript
// src/stores/sessionStore.ts - discoverNewHex()
discoverNewHex: (hexIndex: string) => {
  const { lastKnownHex, exploredHexes, currentSessionNewHexes } = state;
  
  // 1. 檢查是否為新探索的區域
  const isHistorical = exploredHexes.has(hexIndex);           // 是否在歷史記錄中
  const isCurrentSession = currentSessionNewHexes.has(hexIndex); // 是否在當前會話中
  
  if (!isHistorical && !isCurrentSession) {
    // ✅ 新探索的 H3（Gray Zone）
    newCurrentSessionHexes.add(hexIndex);
    hasNewDiscoveries = true;
  }
  
  return {
    hasNewDiscovery: hasNewDiscoveries,
    isGrayZone: !isHistorical && !isCurrentSession,
    // ...
  };
}
```

**生成邏輯**：
```typescript
// src/components/map/MapboxRealTimeMap.tsx
const currentSessionH3GeoJson = useMemo(() => {
  if (!isCollecting || currentSessionNewHexes.size === 0) return null;

  // 將 currentSessionNewHexes 轉換為 GeoJSON
  const hexArray = Array.from(currentSessionNewHexes);
  const features = hexArray.map(h3Index => {
    const coord = h3ToLatLng(h3Index);
    const circleCoords = getLowPolyCircle(lat, lng, 20, 8);
    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [circleCoords] },
    };
  });
  
  return { type: 'FeatureCollection', features };
}, [isCollecting, currentSessionNewHexes, getLowPolyCircle]);
```

**特點**：
- ✅ 來源：`sessionStore.exploredHexes` + `sessionStore.currentSessionNewHexes`
- ✅ 用途：判斷是否為**新探索的區域**（Gray Zone）
- ✅ 更新時機：
  - `exploredHexes`：會話結束時合併 `currentSessionNewHexes`
  - `currentSessionNewHexes`：採集過程中實時更新

---

### 3. 歷史軌跡（GPS Trail）

**數據來源**：`gpsHistoryService.getCurrentSessionTrail()`

**定義**：
```typescript
// src/services/gpsHistory.ts
getCurrentSessionTrail(): GPSHistoryPoint[] {
  return [...this.currentSessionPoints]; // 當前會話的所有 GPS 點
}
```

**生成邏輯**：
```typescript
// src/components/map/MapboxRealTimeMap.tsx
const gpsTrailGeoJson = useMemo(() => {
  if (!isCollecting || !gpsHistoryService.isSessionActive()) {
    return null;
  }

  // 1. 獲取當前會話的 GPS 點
  const currentSessionPoints = gpsHistoryService.getCurrentSessionTrail();
  if (!currentSessionPoints || currentSessionPoints.length < 2) {
    return null;
  }

  // 2. 去掉最後一個點（當前位置），避免覆蓋游標
  const trailPoints = currentSessionPoints.slice(0, -1);
  
  // 3. 轉換為 LineString
  const coordinates = trailPoints.map(point => [point.longitude, point.latitude]);
  
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates,
      },
    }],
  };
}, [isCollecting, currentLocation]);
```

**特點**：
- ✅ 來源：`gpsHistoryService.currentSessionPoints`（當前會話的 GPS 點）
- ✅ 用途：繪製**當前會話的移動軌跡**（線條）
- ✅ 更新時機：每次 GPS 位置更新時實時更新

---

## 🔄 數據流程圖

```
┌─────────────────────────────────────────────────────────────┐
│                     GPS 位置更新                              │
│              (Location.watchPositionAsync)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌───────────────────────────────┐
        │   gpsHistoryService           │
        │   - addPoint()                │
        │   - currentSessionPoints[]    │
        └───────────┬───────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐    ┌──────────────────────┐
│ GPS Trail     │    │ sessionStore         │
│ (歷史軌跡)     │    │ - discoverNewHex()   │
│               │    │ - currentSessionNew   │
│ LineString    │    │   Hexes[]            │
└───────────────┘    └──────────┬───────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
        ┌──────────────────────┐  ┌──────────────────────┐
        │ CurrentH3            │  │ HistoryH3           │
        │ (新探索區域)          │  │ (歷史探索區域)        │
        │                       │  │                      │
        │ currentSessionNew     │  │ historySessions      │
        │ Hexes[]               │  │ (過去7天會話)        │
        │                       │  │                      │
        │ Polygon (邊框)        │  │ Point (迷霧效果)     │
        └──────────────────────┘  └──────────────────────┘
```

---

## 📋 數據對比表

| 項目 | 歷史H3 | CurrentH3 | 歷史軌跡 |
|------|--------|-----------|----------|
| **數據來源** | `historySessions` | `exploredHexes` + `currentSessionNewHexes` | `currentSessionPoints` |
| **服務** | `gpsHistoryService` | `sessionStore` | `gpsHistoryService` |
| **數據類型** | `CollectionSession[]` | `Set<string>` (H3索引) | `GPSHistoryPoint[]` |
| **時間範圍** | 過去 7 天 | 所有歷史 + 當前會話 | 當前會話 |
| **更新時機** | 會話結束後 | 實時（採集時） | 實時（GPS更新） |
| **繪製方式** | Heatmap (Point) | FillLayer (Polygon) | LineLayer (LineString) |
| **視覺效果** | 迷霧效果（漸層） | 邊框（中空） | 線條軌跡 |
| **用途** | 顯示歷史探索區域 | 顯示新探索區域 | 顯示移動路徑 |

---

## 🔍 判定邏輯詳解

### CurrentH3 判定邏輯

```typescript
// 判斷是否為新探索的區域
const isHistorical = exploredHexes.has(hexIndex);           // 1. 檢查歷史記錄
const isCurrentSession = currentSessionNewHexes.has(hexIndex); // 2. 檢查當前會話

if (!isHistorical && !isCurrentSession) {
  // ✅ 新探索的 H3（Gray Zone）
  // → 添加到 currentSessionNewHexes
  // → 顯示為 CurrentH3（邊框）
  // → 觸發 Pathfinder Bonus
}
```

**判定流程**：
1. 檢查 `exploredHexes`：是否在歷史記錄中？
2. 檢查 `currentSessionNewHexes`：是否在當前會話中？
3. 如果兩者都沒有 → **新探索的區域**（Gray Zone）

---

### 數據合併邏輯

```typescript
// 會話結束時
mergeCurrentSessionHexes: async () => {
  // 1. 將 currentSessionNewHexes 合併到 exploredHexes
  state.currentSessionNewHexes.forEach(hex => {
    mergedHexes.add(hex);
  });
  
  // 2. 清空 currentSessionNewHexes
  set({ 
    exploredHexes: mergedHexes,
    currentSessionNewHexes: new Set<string>(),
  });
}
```

**合併時機**：
- 會話結束時（停止採集）
- 合併後，`currentSessionNewHexes` 的 H3 會變成歷史記錄

---

## ⚠️ 潛在問題

### 問題 1：數據不一致

**情況**：
- `historySessions` 的 H3 可能不在 `exploredHexes` 中
- 導致歷史H3顯示，但判定為新探索區域

**原因**：
- `historySessions` 來自 GPS 點轉換
- `exploredHexes` 來自 `discoverNewHex()` 判定
- 兩者可能不完全一致

**解決方案**：
- 使用 `updateExploredHexesFromHistory()` 同步數據

---

### 問題 2：CurrentH3 不顯示

**情況**：
- `currentSessionNewHexes` 有數據，但地圖上不顯示

**原因**：
- `isCollecting` 為 false
- `currentSessionNewHexes.size === 0`

**檢查**：
```typescript
console.log('[Debug] CurrentH3 狀態:', {
  isCollecting,
  currentSessionNewHexesSize: currentSessionNewHexes.size,
  hasGeoJson: !!currentSessionH3GeoJson,
});
```

---

### 問題 3：歷史軌跡不顯示

**情況**：
- GPS 點有更新，但軌跡不顯示

**原因**：
- `isCollecting` 為 false
- `gpsHistoryService.isSessionActive()` 為 false
- GPS 點數 < 2

**檢查**：
```typescript
console.log('[Debug] GPS Trail 狀態:', {
  isCollecting,
  isSessionActive: gpsHistoryService.isSessionActive(),
  pointsCount: gpsHistoryService.getCurrentSessionTrail().length,
});
```

---

## 🎯 總結

### 三個數據來源的關係

1. **歷史H3**：顯示過去探索過的區域（迷霧效果）
   - 來源：`historySessions`（GPS 點轉換）
   - 用途：視覺化歷史探索

2. **CurrentH3**：顯示當前會話新探索的區域（邊框）
   - 來源：`currentSessionNewHexes`（判定結果）
   - 用途：標記新探索區域

3. **歷史軌跡**：顯示當前會話的移動路徑（線條）
   - 來源：`currentSessionPoints`（GPS 點）
   - 用途：視覺化移動軌跡

### 判定邏輯

- **新探索區域** = `!exploredHexes.has(hex) && !currentSessionNewHexes.has(hex)`
- **歷史區域** = `exploredHexes.has(hex)`
- **當前會話區域** = `currentSessionNewHexes.has(hex)`

---

**現在邏輯應該清楚了！** 📊✨
