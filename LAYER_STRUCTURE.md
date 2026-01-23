# 📊 MapboxRealTimeMap 圖層結構分析

## 當前圖層順序（從下到上）

### JSX 渲染順序：
1. **Models 註冊** (506-518) - 不是圖層，只是註冊模型
2. **Camera** (521-536) - 攝影機控制
3. **歷史 H3 HeatmapLayer** (539-584) ⬅️ **沒有 sortKey**
   - Layer ID: `history-h3-heatmap`
   - 類型: `HeatmapLayer`
   - 用途: 顯示歷史探索過的區域（迷霧效果）

4. **GPS Trail LineLayer** (587-605)
   - Layer ID: `gps-trail-line`
   - 類型: `LineLayer`
   - `lineSortKey: 3` ⬅️ **排序值 3**

5. **Current H3 LineLayer** (607-630)
   - Layer ID: `current-h3-stroke`
   - 類型: `LineLayer`
   - `lineSortKey: 5` ⬅️ **排序值 5**

6. **User Marker SymbolLayer** (632-679)
   - Layer ID: `user-marker-top`
   - 類型: `SymbolLayer`
   - `symbolSortKey: 99999` ⬅️ **排序值 99999（最高）**

7. **3D Model ModelLayer** (682-725) ⬅️ **問題所在**
   - Layer ID: `user-3d-model-layer`
   - 類型: `ModelLayer`
   - **沒有 sortKey 屬性**

## 🐛 問題分析

### 為什麼 3D Model 在歷史 H3 下面？

1. **ModelLayer 不支持 sortKey**：
   - `ModelLayer` 不像 `LineLayer` 或 `SymbolLayer` 有 `sortKey` 屬性
   - 它依賴 JSX 渲染順序來決定層級

2. **JSX 順序影響**：
   - 雖然 3D Model 在 JSX 中位於歷史 H3 **之後**，但可能因為：
     - HeatmapLayer 的渲染特性
     - Mapbox GL 的圖層管理機制
     - 導致 3D Model 被歷史 H3 覆蓋

## ✅ 解決方案

### 方案 1：調整 JSX 順序（推薦）
將 3D Model 放在歷史 H3 **之後**但**在 GPS Trail 之前**，確保它在正確的層級。

### 方案 2：檢查 HeatmapLayer 的 opacity
降低歷史 H3 的透明度，讓 3D Model 能透過顯示。

### 方案 3：使用 `aboveLayerID`（如果 ModelLayer 支持）
嘗試將 ModelLayer 放在指定圖層之上。

## 📋 理想的圖層順序（從下到上）

1. **歷史 H3 HeatmapLayer** (最底層，背景)
2. **GPS Trail LineLayer** (lineSortKey: 3)
3. **Current H3 LineLayer** (lineSortKey: 5)
4. **3D Model ModelLayer** ⬅️ **應該在這裡**
5. **User Marker SymbolLayer** (symbolSortKey: 99999) (最上層)
