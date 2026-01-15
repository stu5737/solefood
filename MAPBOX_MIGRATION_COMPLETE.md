# 🎉 Mapbox 遷移完成！Solefood v10.0 - Pokémon GO 風格

## ✅ 已完成的工作

### 1. 套件安裝
- ✅ 安裝 `@rnmapbox/maps` v11.x
- ✅ 自動配置 Expo 插件

### 2. 核心組件創建
- ✅ `MapboxRealTimeMap.tsx` - 完整的 Mapbox 地圖組件
- ✅ `UnifiedMap.tsx` - 統一地圖組件（自動選擇引擎）
- ✅ `src/config/mapbox.ts` - Mapbox 配置文件
- ✅ `src/config/features.ts` - 功能開關

### 3. Pokémon GO 風格實現
- ✅ **65° 傾斜視角**（Pitch）
- ✅ **車頭朝上模式**（Course Up）
- ✅ **動態攝影機跟隨**
- ✅ **H3 Hexes 渲染**（歷史 + 實時）
- ✅ **GPS Trail 渲染**
- ✅ **用戶位置標記**

### 4. 賽博龐克配色
- ✅ 深灰藍建築（#1a1a2e）
- ✅ 暗紫色天空（#2a1a3e）
- ✅ 工業橙霧氣（#ff6b35）
- ✅ 完整配色系統

### 5. 文檔
- ✅ `MAPBOX_SETUP_GUIDE.md` - 完整設置指南
- ✅ `MAPBOX_MIGRATION_COMPLETE.md` - 本文檔

---

## 🚀 如何啟用 Mapbox

### 步驟 1: 獲取 Mapbox Token

1. 前往 https://account.mapbox.com/auth/signup/
2. 註冊免費帳號（50,000 次地圖加載/月）
3. 創建 Access Token
4. 複製 token（格式：`pk.ey...`）

### 步驟 2: 配置 Token

打開 `src/config/mapbox.ts`，將你的 token 貼到第 11 行：

```typescript
export const MAPBOX_ACCESS_TOKEN = 'pk.YOUR_ACTUAL_TOKEN_HERE';
```

### 步驟 3: 啟用 Mapbox 引擎

打開 `src/config/features.ts`，將第 16 行改為：

```typescript
export const MAP_ENGINE: 'mapbox' | 'react-native-maps' = 'mapbox'; // 👈 改這裡
```

### 步驟 4: 重新編譯

```bash
# iOS（推薦）
npx expo run:ios --no-build-cache

# Android
npx expo run:android --no-build-cache
```

**⏳ 預計時間**：5-8 分鐘（首次編譯）

### 步驟 5: 在模擬器中測試

編譯完成後，你會看到：
- ✅ 65° 傾斜視角
- ✅ 地圖隨你轉向
- ✅ 3D 建築（如果有）
- ✅ 深色賽博龐克風格

---

## 📱 使用方式

### 方法 A: 使用 UnifiedMap（推薦）

在你的主畫面中，將 `RealTimeMap` 替換為 `UnifiedMap`：

```typescript
// 舊版本
import { RealTimeMap } from '../../src/components/map/RealTimeMap';

<RealTimeMap
  showTrail={true}
  isCollecting={isCollecting}
  selectedSessionId={selectedSessionId}
  showHistoryTrail={showHistoryTrail}
/>

// 新版本（自動選擇引擎）
import { UnifiedMap } from '../../src/components/map';

<UnifiedMap
  showTrail={true}
  isCollecting={isCollecting}
  selectedSessionId={selectedSessionId}
  showHistoryTrail={showHistoryTrail}
/>
```

**優勢**：
- 自動根據 `src/config/features.ts` 選擇引擎
- 如果 Mapbox 載入失敗，自動回退到 react-native-maps
- 無需修改其他代碼

### 方法 B: 直接使用 MapboxRealTimeMap

```typescript
import { MapboxRealTimeMap } from '../../src/components/map';

<MapboxRealTimeMap
  showTrail={true}
  isCollecting={isCollecting}
  selectedSessionId={selectedSessionId}
  showHistoryTrail={showHistoryTrail}
/>
```

---

## 🎨 自定義配置

### 調整傾斜角度

打開 `src/config/mapbox.ts`，修改第 33 行：

```typescript
export const CAMERA_CONFIG = {
  zoomLevel: 17.5,
  pitch: 65,  // 👈 調整這裡（0-85）
  // ...
};
```

**建議值**：
- 45° - Pokémon GO 標準
- 60° - 更有沉浸感
- 65° - Solefood 專屬（當前值）⭐
- 70° - 極端視角

### 調整縮放層級

```typescript
export const CAMERA_CONFIG = {
  zoomLevel: 17.5,  // 👈 調整這裡（15-20）
  // ...
};
```

**建議值**：
- 17.5 - 約 200-300m 可見範圍（當前值）⭐
- 18.0 - 更近（約 150m）
- 17.0 - 更遠（約 400m）

### 切換地圖樣式

```typescript
// src/config/mapbox.ts
export const MAPBOX_STYLE_URL = 'mapbox://styles/mapbox/dark-v11'; // 深色
// 或
export const MAPBOX_STYLE_URL = 'mapbox://styles/mapbox/streets-v12'; // 街道
// 或
export const MAPBOX_STYLE_URL = 'mapbox://styles/mapbox/satellite-v9'; // 衛星
```

---

## 🔄 如何切換回舊地圖

如果遇到問題，可以隨時切換回 react-native-maps：

打開 `src/config/features.ts`，將第 16 行改為：

```typescript
export const MAP_ENGINE: 'mapbox' | 'react-native-maps' = 'react-native-maps';
```

然後在模擬器中按 `Cmd + R` 重新載入即可。

---

## 📊 功能對比

| 功能 | react-native-maps | Mapbox |
|------|-------------------|--------|
| **Pitch（傾斜）** | ❌ 不支持 | ✅ 0-85° |
| **3D 建築** | ❌ | ✅ |
| **自定義天空** | ❌ | ✅ |
| **車頭朝上** | 部分支持 | ✅ 完整支持 |
| **性能** | 中等 | 高 ✅ |
| **自定義樣式** | 有限 | 完全自定義 ✅ |
| **免費額度** | 無限 | 50K/月 |
| **Pokémon GO 風格** | ❌ 無法實現 | ✅ 完美實現 |

---

## 🐛 常見問題

### Q1: 地圖顯示空白或黑屏

**原因**：Token 未設置或無效

**解決方案**：
1. 檢查 `src/config/mapbox.ts` 中的 token
2. 確保 token 以 `pk.` 開頭
3. 確認 token 沒有過期
4. 檢查網絡連接

### Q2: 編譯失敗 "Mapbox not found"

**解決方案**：
```bash
# 清除並重新安裝
rm -rf node_modules ios/Pods
npm install
cd ios && pod install && cd ..
npx expo run:ios --no-build-cache
```

### Q3: 地圖沒有傾斜視角

**原因**：可能在某些舊模擬器上不支持

**解決方案**：
1. 在真機上測試
2. 或使用較新的模擬器（iPhone 14+）

### Q4: 性能不佳

**解決方案**：
在 `src/config/mapbox.ts` 中調整：

```typescript
export const PERFORMANCE_CONFIG = {
  enable3DBuildings: false,  // 關閉 3D 建築
  enableSky: false,          // 關閉天空層
};
```

---

## 📂 新增檔案清單

```
solefoodmvp/
├── src/
│   ├── config/
│   │   ├── mapbox.ts ✨ 新增
│   │   └── features.ts ✨ 新增
│   │
│   └── components/map/
│       ├── MapboxRealTimeMap.tsx ✨ 新增
│       ├── UnifiedMap.tsx ✨ 新增
│       └── index.ts (已更新)
│
├── MAPBOX_SETUP_GUIDE.md ✨ 新增
└── MAPBOX_MIGRATION_COMPLETE.md ✨ 新增（本文檔）
```

---

## 🎯 下一步

### 立即可做
1. ✅ 獲取 Mapbox Token
2. ✅ 配置 Token
3. ✅ 啟用 Mapbox 引擎
4. ✅ 重新編譯並測試

### 短期優化
- [ ] 調整 Pitch 角度（測試不同值）
- [ ] 優化 H3 Hexes 渲染性能
- [ ] 添加更多視覺效果

### 長期計劃
- [ ] 創建完整的賽博龐克自定義樣式（Mapbox Studio）
- [ ] 添加動態天氣效果
- [ ] 整合 3D 節點模型
- [ ] 添加路徑規劃功能

---

## 🎊 總結

你現在擁有：
- ✅ **完整的 Pokémon GO 風格地圖**（65° 傾斜視角）
- ✅ **靈活的引擎切換系統**（Mapbox ↔ react-native-maps）
- ✅ **賽博龐克配色方案**
- ✅ **完整的文檔和配置**

**只需 4 個步驟即可啟用：**
1. 獲取 Mapbox Token
2. 配置到 `src/config/mapbox.ts`
3. 在 `src/config/features.ts` 啟用 Mapbox
4. 重新編譯（`npx expo run:ios --no-build-cache`）

**準備好體驗真正的 Pokémon GO 風格地圖了嗎？** 🚀

---

**版本**: v10.0  
**完成日期**: 2026-01-14  
**狀態**: ✅ 核心功能完成，等待 Token 配置和測試
