# 3D 模型動態縮放限制

## 問題診斷

經過詳細測試和日誌分析，確認 **`@rnmapbox/maps` v10.2.10 的 `ModelLayer` 不支持動態 `modelScale` 屬性**。

## 測試結果

### ✅ 功能正常部分
- Zoom 事件正常觸發（`onCameraChanged`）
- Scale 計算正確（[2.0, 2.0, 2.0] ↔ [2.2, 2.2, 2.2]）
- Key 強制重繪觸發
- 所有 React 狀態更新正確
- ModelLayer 重新創建正確

### ❌ 問題
- **模型大小不會改變**
- 即使 `modelScale` 屬性值更新，Mapbox 也不會應用新的縮放值
- 即使通過 `key` 屬性強制重新創建 ModelLayer，縮放仍然不變

## 日誌證據

```
LOG  [3D Model] 🎥 Zoom Changed: 17 -> 18 (實際 zoom: 18.17)
LOG  [3D Model] 📏 New Scale: [2, 2, 2]
LOG  [3D Model] 🔧 即將在 150ms 後更新 Key，觸發重繪...
LOG  [3D Model] 🔑 ModelLayer Key 已更新為: user-3d-model-layer-18
LOG  [3D Model] ✅ ModelLayer 將被強制重繪，最終 Scale: [2, 2, 2]
LOG  [3D Model] 🎯 注意觀察模型大小是否改變！
```

**結果**：模型大小沒有改變

## 原因分析

`@rnmapbox/maps` v10.2.10 的 `ModelLayer` 實現可能：
1. 在初始化時鎖定 `modelScale` 值
2. 不監聽 `modelScale` 屬性的變化
3. 內部緩存了模型的縮放值，不會重新讀取

這是該版本的已知限制。

## 解決方案

### 選項 1：升級到 v11+（推薦）

`@rnmapbox/maps` v11+ 可能支持動態 `modelScale`。

**步驟**：
```bash
# 檢查可用版本
npm show @rnmapbox/maps versions --json

# 升級到 v11（如果可用）
npm install @rnmapbox/maps@^11.0.0

# 重新構建原生代碼
cd ios && pod install && cd ..
npx expo prebuild --clean
npx expo run:ios
```

**風險**：可能有破壞性變更，需要測試所有地圖功能。

### 選項 2：使用固定大小（簡單）

放棄動態縮放，使用固定的模型大小：

```typescript
modelScale: [2.2, 2.2, 2.2] // 固定大小，與箭頭一致
```

**優點**：簡單、穩定
**缺點**：無法根據 zoom 調整大小

### 選項 3：改用 SymbolLayer + Icon（替代方案）

如果動態縮放很重要，可以改用 `SymbolLayer` 搭配 2D icon，並使用 `iconSize` 屬性動態調整：

```typescript
<Mapbox.SymbolLayer
  id="user-marker-icon"
  style={{
    iconImage: 'avatar-icon',
    iconSize: [
      'interpolate',
      ['linear'],
      ['zoom'],
      15, 0.8,
      17, 1.0,
      20, 1.5
    ], // ✅ SymbolLayer 支持動態 iconSize
    iconRotate: ['get', 'rotation'],
  }}
/>
```

**優點**：支持動態縮放，性能更好
**缺點**：失去 3D 效果，需要 2D icon 素材

### 選項 4：接受現狀（暫時）

保留現有代碼，模型大小固定為 [2.2, 2.2, 2.2]（與箭頭一致），等待未來升級。

**優點**：不需要修改代碼
**缺點**：無法實現與箭頭相同比例的縮放效果

## 建議

1. **短期**：使用選項 2（固定大小），保持模型與箭頭一致
2. **中期**：測試 `@rnmapbox/maps` v11 是否支持動態 modelScale
3. **長期**：如果 v11 不支持，考慮改用 SymbolLayer

## 當前配置

目前模型使用測試模型（Duck.glb），縮放值設定為：
- 計算邏輯：根據 zoom tier 計算（2.0 - 2.3 倍）
- 實際效果：固定大小（約 2.2 倍）

## 參考

- `@rnmapbox/maps` v10.2.10 文檔
- Mapbox GL JS ModelLayer 限制
- React Native Bridge 屬性更新機制
