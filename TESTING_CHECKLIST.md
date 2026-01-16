# H3 渲染修復 - 測試清單

## 準備工作

- [x] 清除緩存（`.expo`, `node_modules/.cache`）
- [ ] 重啟應用：`npx expo run:ios`
- [ ] 設置模擬器 GPS 位置（Features → Location → Custom Location）

---

## 測試 1：基本 H3 渲染

### 步驟
1. 啟動應用
2. 開始採集
3. 移動到新區域（模擬器設置自定義位置）
4. 觀察地圖

### 預期結果
- [ ] 看到中空白框（currentH3）
- [ ] 控制台顯示：`[MapboxRealTimeMap] ✅ historyH3GeoJson 已生成（基於 exploredHexes）`
- [ ] 沒有錯誤日誌

---

## 測試 2：卸貨後 H3 穩定性（核心測試）

### 步驟
1. 繼續採集，走到新區域
2. 點擊"卸貨"按鈕
3. **立即觀察地圖**

### 預期結果
- [ ] 歷史H3**不會消失**（迷霧效果）
- [ ] 控制台顯示：
  ```
  [MapboxRealTimeMap] ✅ historyH3GeoJson 已生成（基於 exploredHexes）
  [驗證] 數據一致性檢查: { ... }
  [驗證] ✅ 數據一致性正常
  ```
- [ ] 沒有 `⚠️ historyH3GeoJson 為空` 的警告

---

## 測試 3：再次採集時的探索判定

### 步驟
1. 點擊"開始採集"
2. 經過剛才走過的區域（歷史H3）
3. 觀察 Dashboard 和地圖

### 預期結果
- [ ] Dashboard 顯示 "Explored"（不是 "Pathfinder"）
- [ ] **不生成新的 currentH3**（中空白框）
- [ ] 控制台顯示：`你曾經探索過這個區域（所以沒有開拓者紅利）`

---

## 測試 4：快速卸貨/採集循環（壓力測試）

### 步驟
1. 採集 → 卸貨 → 採集 → 卸貨（快速重複 5 次）
2. 每次卸貨後觀察地圖

### 預期結果
- [ ] 每次卸貨後，歷史H3都正確顯示
- [ ] 沒有 H3 消失的情況
- [ ] 控制台沒有數據不一致警告

---

## 測試 5：數據一致性自動修復

### 步驟
1. 如果在測試過程中看到：
   ```
   [驗證] ⚠️ 發現數據不一致，自動修復中...
   ```
2. 觀察後續日誌和地圖

### 預期結果
- [ ] 控制台顯示：`[驗證] ✅ 數據已修復`
- [ ] 歷史H3正確顯示
- [ ] 再次卸貨/採集循環，不再出現不一致

---

## 測試 6：修改地圖樣式（穩定性測試）

### 步驟
1. 修改 `src/config/mapbox.ts` 中的 `NIGHT_THEME.historyH3.fill.opacityRange.max`
2. 從 `0.4` 改為 `0.6`
3. 重啟應用
4. 開始採集 → 卸貨

### 預期結果
- [ ] 歷史H3正確顯示（透明度更高）
- [ ] 沒有 H3 消失的情況
- [ ] 控制台沒有錯誤

---

## 測試 7：切換早晚主題

### 步驟
1. 點擊地圖上的主題切換按鈕（☀️/🌙）
2. 觀察地圖變化

### 預期結果
- [ ] 地圖背景正確切換（light-v11 ↔ dark-v11）
- [ ] 歷史H3顏色正確切換
- [ ] 沒有 H3 消失的情況

---

## 測試 8：應用重啟後的持久化

### 步驟
1. 採集並卸貨
2. 完全關閉應用（iOS：雙擊 Home 鍵，滑掉應用）
3. 重新啟動應用
4. 觀察地圖

### 預期結果
- [ ] 歷史H3正確顯示（從 AsyncStorage 恢復）
- [ ] 控制台顯示：
  ```
  [SessionStore] ✅ Hydration completed { exploredHexesCount: X }
  [MapboxRealTimeMap] ✅ historyH3GeoJson 已生成（基於 exploredHexes）
  ```

---

## 關鍵日誌檢查

### 正常情況應該看到：
```
✅ [MapboxRealTimeMap] ✅ historyH3GeoJson 已生成（基於 exploredHexes）: {
     hexesCount: X,
     featuresCount: X,
     stats: { ... }
   }

✅ [驗證] 數據一致性檢查: {
     exploredHexesCount: X,
     sessionH3sCount: X,
     missingInExplored: 0
   }

✅ [驗證] ✅ 數據一致性正常
```

### 不應該看到：
```
❌ [MapboxRealTimeMap] ⚠️ historyH3GeoJson 為空
❌ [驗證] ⚠️ 有 H3 在 historySessions 但不在 exploredHexes
❌ TypeError: Cannot read property 'features' of null
```

---

## 測試結果

### 通過標準
- [ ] 所有 8 個測試全部通過
- [ ] 沒有出現 H3 消失的情況
- [ ] 控制台沒有錯誤或警告（除了自動修復日誌）
- [ ] 修改地圖樣式不影響 H3 渲染

### 如果測試失敗
1. 記錄失敗的測試編號
2. 複製控制台日誌
3. 截圖地圖狀態
4. 報告給開發者

---

## 完成後

如果所有測試通過：
- [ ] 標記 TODO #5 為 completed
- [ ] 可以刪除舊的診斷文件
- [ ] 可以開始使用新的 H3 渲染系統

如果有測試失敗：
- [ ] 查看 `H3_RENDERING_DIAGNOSIS.md` 了解問題原因
- [ ] 查看 `H3_RENDERING_FIX_FINAL.md` 了解修復方案
- [ ] 聯繫開發者進行進一步調試
