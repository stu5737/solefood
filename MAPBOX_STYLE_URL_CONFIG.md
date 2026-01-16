# Mapbox 樣式 URL 配置指南

## 📁 檔案位置

**主要配置文件**：
```
src/config/mapbox.ts
```

**使用位置**：
```
src/components/map/MapboxRealTimeMap.tsx
```

---

## 🎯 當前配置

### 檔案：`src/config/mapbox.ts`

#### 早晨主題 (MORNING_THEME)
```typescript
export const MORNING_THEME = {
  name: '早晨',
  // ✅ 探索模式（無標籤，突出 H3）
  mapStyle: 'mapbox://styles/stu5737/cmkgbbnym000b01sr8qjhbeqz',
  
  // ✅ 導航模式（有標籤，方便找路）
  mapStyleWithLabels: 'mapbox://styles/mapbox/light-v11',
  // ...
};
```

#### 夜晚主題 (NIGHT_THEME)
```typescript
export const NIGHT_THEME = {
  name: '夜晚',
  // ✅ 探索模式（無標籤，突出 H3）
  mapStyle: 'mapbox://styles/stu5737/cmkgbbnym000b01sr8qjhbeqz',
  
  // ✅ 導航模式（有標籤，方便找路）
  mapStyleWithLabels: 'mapbox://styles/mapbox/dark-v11',
  // ...
};
```

---

## 🔧 如何更新 URL

### 步驟 1：在 Mapbox Studio 創建樣式

1. 前往 [Mapbox Studio](https://studio.mapbox.com/)
2. 創建或複製樣式
3. 獲取樣式 URL（格式：`mapbox://styles/USERNAME/STYLE_ID`）

### 步驟 2：更新配置文件

編輯 `src/config/mapbox.ts`：

#### 更新探索模式 URL（無標籤）
```typescript
// 早晨主題
mapStyle: 'mapbox://styles/stu5737/YOUR_EXPLORE_STYLE_ID',

// 夜晚主題
mapStyle: 'mapbox://styles/stu5737/YOUR_EXPLORE_STYLE_ID',
```

#### 更新導航模式 URL（有標籤）
```typescript
// 早晨主題
mapStyleWithLabels: 'mapbox://styles/stu5737/YOUR_NAVIGATE_STYLE_ID',

// 夜晚主題
mapStyleWithLabels: 'mapbox://styles/stu5737/YOUR_NAVIGATE_STYLE_ID',
```

---

## 📋 配置結構說明

### 探索模式（預設）
- **用途**：突出 H3 視覺效果，無標籤干擾
- **配置項**：`mapStyle`
- **當前值**：`mapbox://styles/stu5737/cmkgbbnym000b01sr8qjhbeqz`

### 導航模式
- **用途**：顯示路名和標籤，方便找路
- **配置項**：`mapStyleWithLabels`
- **當前值**：
  - 早晨：`mapbox://styles/mapbox/light-v11`
  - 夜晚：`mapbox://styles/mapbox/dark-v11`

---

## 🎨 建議的樣式配置

### 探索模式樣式（無標籤）
- 隱藏所有 `symbol` 圖層（標籤）
- 隱藏 POI（興趣點）
- 保留道路幾何形狀
- 使用深色或淺色背景（根據主題）

### 導航模式樣式（有標籤）
- 顯示所有標籤圖層
- 顯示 POI
- 顯示路名
- 使用 Mapbox 預設樣式或自定義樣式

---

## 🔄 切換邏輯

在 `MapboxRealTimeMap.tsx` 中：

```typescript
styleURL={
  timeTheme === 'morning' 
    ? (showLabels ? MORNING_THEME.mapStyleWithLabels : MORNING_THEME.mapStyle)
    : (showLabels ? NIGHT_THEME.mapStyleWithLabels : NIGHT_THEME.mapStyle)
}
```

**邏輯**：
- `showLabels = false` → 使用 `mapStyle`（探索模式）
- `showLabels = true` → 使用 `mapStyleWithLabels`（導航模式）

---

## 📝 快速更新模板

如果需要更新 URL，複製以下模板到 `src/config/mapbox.ts`：

```typescript
export const MORNING_THEME = {
  name: '早晨',
  // 探索模式（無標籤）
  mapStyle: 'mapbox://styles/stu5737/YOUR_EXPLORE_STYLE_ID',
  // 導航模式（有標籤）
  mapStyleWithLabels: 'mapbox://styles/stu5737/YOUR_NAVIGATE_STYLE_ID',
  // ...
};

export const NIGHT_THEME = {
  name: '夜晚',
  // 探索模式（無標籤）
  mapStyle: 'mapbox://styles/stu5737/YOUR_EXPLORE_STYLE_ID',
  // 導航模式（有標籤）
  mapStyleWithLabels: 'mapbox://styles/stu5737/YOUR_NAVIGATE_STYLE_ID',
  // ...
};
```

---

## ✅ 當前配置總結

| 模式 | 早晨主題 | 夜晚主題 |
|------|---------|---------|
| **探索模式**（無標籤） | `mapbox://styles/stu5737/cmkgbbnym000b01sr8qjhbeqz` | `mapbox://styles/stu5737/cmkgbbnym000b01sr8qjhbeqz` |
| **導航模式**（有標籤） | `mapbox://styles/mapbox/light-v11` | `mapbox://styles/mapbox/dark-v11` |

---

## 🚀 下一步

如果你在 Mapbox Studio 創建了新的樣式：

1. **探索模式樣式**（無標籤）：
   - 更新 `MORNING_THEME.mapStyle`
   - 更新 `NIGHT_THEME.mapStyle`

2. **導航模式樣式**（有標籤）：
   - 更新 `MORNING_THEME.mapStyleWithLabels`
   - 更新 `NIGHT_THEME.mapStyleWithLabels`

3. **測試**：
   - 重啟應用
   - 點擊標籤切換按鈕
   - 確認探索模式和導航模式都正常顯示
