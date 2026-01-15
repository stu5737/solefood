# 🗺️ Mapbox 設置指南 - Solefood v10.0

## 📋 概述

Solefood v10.0 引入了完整的 **Pokémon GO 風格地圖**，使用 Mapbox 實現：
- ✅ 65° 傾斜視角（Pitch）
- ✅ 車頭朝上模式（Course Up）
- ✅ 3D 建築擠出
- ✅ 賽博龐克天空
- ✅ 完整性能優化

---

## 🚀 快速開始

### 步驟 1: 獲取 Mapbox Access Token

1. 前往 [Mapbox 註冊頁面](https://account.mapbox.com/auth/signup/)
2. 註冊免費帳號（免費額度：50,000 次地圖加載/月）
3. 登入後前往 [Access Tokens 頁面](https://account.mapbox.com/access-tokens/)
4. 點擊「Create a token」創建新的 token
5. 複製你的 token（格式：`pk.ey...`）

### 步驟 2: 配置 Access Token

打開 `src/config/mapbox.ts`，將你的 token 貼到這裡：

```typescript
export const MAPBOX_ACCESS_TOKEN = 'pk.YOUR_MAPBOX_TOKEN_HERE';
```

**或者**創建 `.env` 文件（推薦）：

```bash
# .env
MAPBOX_ACCESS_TOKEN=pk.YOUR_ACTUAL_TOKEN_HERE
```

### 步驟 3: 重新編譯原生代碼

因為 Mapbox 是原生模組，需要重新編譯：

```bash
# iOS
npx expo run:ios --no-build-cache

# Android
npx expo run:android --no-build-cache
```

**⏳ 預計時間**：首次編譯約 5-8 分鐘

### 步驟 4: 在主畫面使用

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

## 🎮 Pokémon GO 風格配置

所有配置都在 `src/config/mapbox.ts` 中：

### 攝影機配置

```typescript
export const CAMERA_CONFIG = {
  zoomLevel: 17.5,           // 縮放層級（17.5 = 約 200-300m 可見範圍）
  pitch: 65,                 // 傾斜角度（65° = Solefood 專屬極端傾斜）
  animationDuration: 300,    // 動畫時長（ms）
  followUserMode: 'course',  // 車頭朝上模式
};
```

### 調整傾斜角度

- **45°** - Pokémon GO 標準
- **60°** - 更有沉浸感
- **65°** - Solefood 專屬（推薦）⭐
- **70°** - 極端視角（可能太低）

### 賽博龐克配色

```typescript
export const CYBERPUNK_COLORS = {
  building: {
    color: '#1a1a2e',      // 深灰藍建築
    opacity: 0.8,
  },
  sky: {
    atmosphereColor: '#2a1a3e',  // 暗紫色天空
    haloColor: '#ff6b35',        // 工業橙霧氣
    opacity: 0.7,
  },
  // ... H3 和 GPS Trail 顏色
};
```

---

## 🎨 自定義地圖樣式（進階）

### 使用 Mapbox Studio

1. 前往 [Mapbox Studio](https://studio.mapbox.com/)
2. 點擊「New style」創建新樣式
3. 選擇「Dark」作為基礎樣式
4. 自定義：
   - 隱藏路名標籤
   - 調整建築物顏色
   - 設置天空顏色
   - 添加霧氣效果

5. 發布樣式後，複製樣式 URL（格式：`mapbox://styles/YOUR_USERNAME/YOUR_STYLE_ID`）

6. 在 `src/config/mapbox.ts` 中更新：

```typescript
export const MAPBOX_STYLE_URL = 'mapbox://styles/YOUR_USERNAME/YOUR_STYLE_ID';
```

### Solefood 賽博龐克樣式範例

```json
{
  "version": 8,
  "name": "Solefood Cyberpunk",
  "layers": [
    {
      "id": "background",
      "type": "background",
      "paint": {
        "background-color": "#0a0a0a"
      }
    },
    {
      "id": "building-extrusion",
      "type": "fill-extrusion",
      "source": "composite",
      "source-layer": "building",
      "paint": {
        "fill-extrusion-color": "#1a1a2e",
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-opacity": 0.8
      }
    },
    {
      "id": "sky",
      "type": "sky",
      "paint": {
        "sky-type": "atmosphere",
        "sky-atmosphere-color": "#2a1a3e",
        "sky-atmosphere-halo-color": "#ff6b35",
        "sky-opacity": 0.7
      }
    }
  ]
}
```

---

## 🐛 常見問題

### Q1: 地圖顯示空白或黑屏

**原因**：Access Token 未設置或無效

**解決方案**：
1. 檢查 `src/config/mapbox.ts` 中的 token
2. 確保 token 以 `pk.` 開頭
3. 確認 token 沒有過期

### Q2: 地圖沒有傾斜視角

**原因**：可能在模擬器中，某些模擬器不支持 3D 渲染

**解決方案**：
1. 在真機上測試
2. 或調整 `pitch` 到較小的值（如 45°）

### Q3: 編譯失敗 "Mapbox not found"

**原因**：原生模組未正確安裝

**解決方案**：
```bash
# 清除快取並重新安裝
rm -rf node_modules ios/Pods
npm install
cd ios && pod install && cd ..
npx expo run:ios --no-build-cache
```

### Q4: 地圖性能不佳

**解決方案**：
1. 在 `src/config/mapbox.ts` 中調整性能配置：
```typescript
export const PERFORMANCE_CONFIG = {
  enable3DBuildings: false,  // 關閉 3D 建築
  enableSky: false,          // 關閉天空層
};
```

2. 減少 H3 Hexes 數量
3. 降低 GPS Trail 更新頻率

---

## 📊 功能對比

| 功能 | react-native-maps | Mapbox |
|------|-------------------|--------|
| Pitch（傾斜） | ❌ | ✅ 0-85° |
| 3D 建築 | ❌ | ✅ |
| 自定義天空 | ❌ | ✅ |
| 車頭朝上 | 部分 | ✅ 完整 |
| 性能 | 中 | 高 ✅ |
| 自定義樣式 | 有限 | 完全自定義 ✅ |
| 免費額度 | 無限 | 50K/月 |

---

## 🎯 下一步

### 短期優化
- [ ] 調整 Pitch 角度（測試 45°-70°）
- [ ] 優化 H3 Hexes 渲染性能
- [ ] 添加更多視覺效果（粒子、光暈）

### 長期計劃
- [ ] 創建完整的賽博龐克自定義樣式
- [ ] 添加動態天氣效果（雨、霧）
- [ ] 整合 3D 節點模型（交易所）
- [ ] 添加路徑規劃功能

---

## 📞 支援

如有問題：
1. 查看 [Mapbox 官方文檔](https://docs.mapbox.com/ios/maps/guides/)
2. 查看 [@rnmapbox/maps 文檔](https://github.com/rnmapbox/maps)
3. 查看本專案的 `V9_PLUS_IMPLEMENTATION_GUIDE.md`

---

**版本**: v10.0  
**最後更新**: 2026-01-14  
**狀態**: ✅ 核心功能完成，等待 Access Token 配置
