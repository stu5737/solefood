# 地圖標籤切換功能實施指南

## 🎯 功能說明

實現了「地圖標籤切換」功能，讓用戶可以在**探索模式**（無標籤，突出 H3）和**導航模式**（顯示標籤，方便找路）之間切換。

## ✅ 已實施的部分

### 1. UI 按鈕
- ✅ 添加了標籤切換按鈕（右上角）
- ✅ 按鈕顯示「探索」/「導航」狀態
- ✅ 預設為「探索模式」（隱藏標籤）

### 2. 狀態管理
- ✅ 添加了 `showLabels` 狀態（預設 `false`）
- ✅ 通過 `key` prop 強制重新渲染地圖

## ⚠️ Mapbox 限制

Mapbox 的預設樣式（`dark-v11`, `light-v11`）不支持直接隱藏標籤。要實現這個功能，需要：

### 選項 1：在 Mapbox Studio 創建自定義樣式（推薦）

1. 前往 [Mapbox Studio](https://studio.mapbox.com/)
2. 創建兩個自定義樣式：
   - **探索模式樣式**：基於 `dark-v11` 或 `light-v11`，隱藏所有標籤圖層
   - **導航模式樣式**：基於 `dark-v11` 或 `light-v11`，顯示所有標籤圖層

3. 在樣式中：
   - 選擇所有 `symbol` 類型的圖層
   - 將 `visibility` 設為 `none`（探索模式）或 `visible`（導航模式）

4. 發布樣式後，獲取樣式 URL：
   ```
   mapbox://styles/YOUR_USERNAME/EXPLORE_STYLE_ID
   mapbox://styles/YOUR_USERNAME/NAVIGATE_STYLE_ID
   ```

5. 更新 `src/config/mapbox.ts`：
   ```typescript
   export const MORNING_THEME = {
     mapStyle: 'mapbox://styles/YOUR_USERNAME/MORNING_EXPLORE_STYLE_ID',
     mapStyleWithLabels: 'mapbox://styles/YOUR_USERNAME/MORNING_NAVIGATE_STYLE_ID',
     // ...
   };
   
   export const NIGHT_THEME = {
     mapStyle: 'mapbox://styles/YOUR_USERNAME/NIGHT_EXPLORE_STYLE_ID',
     mapStyleWithLabels: 'mapbox://styles/YOUR_USERNAME/NIGHT_NAVIGATE_STYLE_ID',
     // ...
   };
   ```

6. 更新 `MapboxRealTimeMap.tsx`：
   ```typescript
   styleURL={
     timeTheme === 'morning' 
       ? (showLabels ? MORNING_THEME.mapStyleWithLabels : MORNING_THEME.mapStyle)
       : (showLabels ? NIGHT_THEME.mapStyleWithLabels : NIGHT_THEME.mapStyle)
   }
   ```

### 選項 2：使用樣式覆蓋（進階）

如果不想創建自定義樣式，可以使用樣式覆蓋功能，但這需要完整的樣式 JSON 定義，較為複雜。

## 🎨 設計說明

### 按鈕設計
- **位置**：右上角（與其他控制按鈕分開）
- **探索模式**（預設）：
  - 灰色背景
  - `map-outline` 圖標
  - 文字：「探索」
- **導航模式**：
  - 綠色背景
  - `map` 圖標
  - 文字：「導航」

### 用戶體驗
- **預設**：探索模式（無標籤），突出 H3 視覺效果
- **切換**：點擊按鈕切換到導航模式（顯示標籤），方便找路
- **狀態**：按鈕顏色和圖標會反映當前狀態

## 📝 下一步

1. **創建自定義樣式**（選項 1）：
   - 在 Mapbox Studio 創建探索模式和導航模式樣式
   - 更新配置文件使用新的樣式 URL

2. **或者使用樣式覆蓋**（選項 2）：
   - 實現樣式覆蓋邏輯
   - 動態修改標籤圖層的可見性

## 🔧 臨時解決方案

在創建自定義樣式之前，按鈕已經添加，但切換功能需要自定義樣式才能完全生效。

目前可以：
1. 使用按鈕切換狀態（UI 已實現）
2. 等待自定義樣式創建完成後，更新配置文件

## 💡 進階選項：幽靈標籤

如果覺得「完全關掉」太激進，可以創建「幽靈標籤」樣式：
- 標籤顏色設為極淡灰色（`#dddddd`）
- 去掉文字描邊
- 平時幾乎看不見，但仔細看還能看見路名

這樣既不會搶 H3 的風采，又保留了定位功能。
