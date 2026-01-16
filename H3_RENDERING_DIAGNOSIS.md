# H3 渲染問題診斷報告

## 問題描述

用戶報告：
- **症狀**：卸貨後，歷史H3會消失
- **數據不一致**：Dashboard顯示"Explored"，但地圖不顯示H3
- **頻繁損壞**：每次改動地圖設計就會出問題
- **嚴重性**：比之前更嚴重

## 根本原因

### 1. **數據源不一致**

歷史H3的渲染依賴於 **`historySessions`** （來自 `gpsHistoryService.getAllSessions()`），而不是 `exploredHexes`（來自 `sessionStore`）。

```typescript
// MapboxRealTimeMap.tsx 第 446-469 行
const historyH3GeoJson = useMemo(() => {
  const allPoints: GPSHistoryPoint[] = [];
  historySessions.forEach(session => {  // ❌ 使用 historySessions
    if (session.points) {
      allPoints.push(...session.points);
    }
  });
  // ...
}, [actualMapMode, historySessions, calculateSessionH3GeoJson]);
```

**問題**：
- `exploredHexes` 由 `mergeCurrentSessionHexes()` 更新
- `historySessions` 由 `loadHistorySessions()` 從 `gpsHistoryService` 讀取
- 這兩個數據源可能不同步！

### 2. **異步操作的競態條件**

執行流程：

```
1. 用戶點擊"卸貨"
2. gpsHistoryService.endSession('unload')
   ├─ session.endTime = Date.now()
   ├─ session.points = [...currentSessionPoints]
   ├─ this.sessions.set(sessionId, session)
   ├─ await mergeCurrentSessionHexes() ✅ 更新 exploredHexes
   ├─ await this.forceSave() ✅ 保存到 AsyncStorage
   └─ this.currentSessionPoints = []

3. MapboxRealTimeMap useEffect 檢測到 isCollecting = false
   ├─ await setTimeout(1000) ⏱️ 延遲 1 秒
   ├─ const allSessions = gpsHistoryService.getAllSessions()
   └─ setHistorySessions(sessions)

4. historyH3GeoJson 重新計算
   └─ 使用 historySessions 生成 GeoJSON
```

**競態條件**：
- `loadHistorySessions()` 在延遲 1 秒後執行
- 但 `getAllSessions()` 返回的會話可能還沒有正確的 `points` 數據
- 或者 `forceSave()` 還沒有完全寫入 `this.sessions` 的內存狀態

### 3. **內存狀態與持久化狀態不同步**

```typescript
// gpsHistory.ts 第 196-293 行
async endSession(endType) {
  const sessionId = this.currentSessionId;
  this.currentSessionId = null;  // ✅ 立即清空
  
  const session = this.sessions.get(sessionId);  // ❓ 從 Map 獲取
  if (session) {
    session.endTime = Date.now();
    session.points = [...this.currentSessionPoints];  // ✅ 複製點數據
    this.sessions.set(sessionId, session);  // ✅ 更新 Map
    
    // ❓ 但 this.currentSessionPoints 被清空了
    this.currentSessionPoints = [];
  }
  
  await this.forceSave();  // ✅ 保存到 AsyncStorage
}
```

**問題**：
- `this.currentSessionPoints` 在 `endSession()` 的最後被清空
- 如果 `loadHistorySessions()` 在 `forceSave()` 完成之前執行，會話的 `points` 可能為空
- 或者會話還沒有被正確添加到 `this.sessions`

### 4. **依賴項不可靠**

```typescript
}, [isCollecting, exploredHexes.size]); // ❌ exploredHexes.size 不可靠
```

`exploredHexes` 是一個 `Set`，Zustand 的狀態管理對於 `Set` 的變化檢測可能不準確。如果 `Set` 的引用沒有改變（雖然內容變了），`exploredHexes.size` 可能不會觸發重新渲染。

### 5. **為什麼改動地圖設計就會壞掉？**

因為：
- H3渲染邏輯（`historyH3GeoJson`）依賴於 `historySessions`
- 地圖樣式（顏色、透明度等）也在同一個 `useMemo` 中計算
- 任何修改都可能意外影響數據流

## 解決方案

### 核心原則

1. **單一數據源**：歷史H3應該只基於 `exploredHexes`，不要使用 `historySessions`
2. **邏輯與樣式分離**：H3數據生成與樣式配置完全分離
3. **確保數據一致性**：在會話結束時，確保所有數據源同步

### 實施步驟

#### 步驟 1：修改歷史H3數據源

將 `historyH3GeoJson` 改為基於 `exploredHexes` 而不是 `historySessions`：

**優點**：
- `exploredHexes` 由 `mergeCurrentSessionHexes()` 直接更新
- 不依賴於 `gpsHistoryService` 的內存狀態或 AsyncStorage 寫入
- 數據一致性由 `sessionStore` 保證

#### 步驟 2：創建獨立的 H3 渲染模塊

將 H3 渲染邏輯完全隔離到 `src/utils/h3Renderer.ts`：

```typescript
// 只負責：exploredHexes -> GeoJSON
// 不包含任何樣式邏輯
export function generateH3GeoJson(hexes: Set<string>): FeatureCollection {
  // ...
}
```

#### 步驟 3：確保 sessionStore 的 exploredHexes 持久化

使用 Zustand 的 `persist` middleware，確保 `exploredHexes` 正確持久化和恢復。

#### 步驟 4：移除對 historySessions 的依賴

只在 **歷史軌跡模式**（`HISTORY`）時使用 `historySessions`，在 **遊戲模式**（`GAME`）時只使用 `exploredHexes`。

## 風險評估

### 當前風險
- **數據丟失**：如果 `forceSave()` 失敗，會話數據可能丟失
- **不一致性**：`exploredHexes` 和 `historySessions` 可能永久不同步
- **用戶體驗**：歷史H3消失會讓用戶困惑

### 解決後的風險
- **遷移風險**：改變數據源需要確保向後兼容
- **性能**：直接從 `Set` 生成 GeoJSON 可能比從 GPS 點生成更快（因為不需要重複計算 H3）

## 下一步

實施完整的修復方案：
1. 創建 `src/utils/h3Renderer.ts`（隔離渲染邏輯）
2. 修改 `MapboxRealTimeMap.tsx` 使用新的渲染模塊
3. 確保 `exploredHexes` 正確持久化
4. 添加數據同步驗證
5. 測試並確認修復效果
