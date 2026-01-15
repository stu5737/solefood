# 🌃 Solefood 賽博龐克地圖樣式指南

## 🎨 設計理念

Solefood 的地圖不是用來「導航」的，而是用來「冒險」的。我們的賽博龐克風格結合了：
- 🌆 **工業物流美學** - 深灰、金屬質感
- 🌌 **科幻氛圍** - 暗紫天空、橙色霧氣
- 🎮 **遊戲感** - 高對比度、清晰的視覺層次

---

## 🚀 快速開始

### 方法 A: 使用預設深色樣式（最簡單）

已經在 `src/config/mapbox.ts` 中配置：

```typescript
export const MAPBOX_STYLE_URL = 'mapbox://styles/mapbox/dark-v11';
```

這個樣式已經很接近賽博龐克風格了！

### 方法 B: 創建自定義樣式（完全控制）

1. 前往 [Mapbox Studio](https://studio.mapbox.com/)
2. 點擊「New style」
3. 選擇「Dark」作為基礎樣式
4. 按照下面的配置進行自定義

---

## 🎨 Solefood 賽博龐克配色方案

### 核心配色

```typescript
// 背景
background: '#0a0a0a'        // 純黑背景

// 建築物
building: '#1a1a2e'          // 深灰藍
buildingOpacity: 0.8         // 80% 不透明度

// 道路
roadPrimary: '#2a2a3e'       // 深紫灰（主要道路）
roadSecondary: '#1a1a2e'     // 更深（次要道路）
roadTertiary: '#0f0f1a'      // 幾乎黑（小路）

// 水體
water: '#0f1a2e'             // 深藍黑

// 綠地
park: '#1a2e1a'              // 深綠黑

// 天空
skyAtmosphere: '#2a1a3e'     // 暗紫色
skyHalo: '#ff6b35'           // 工業橙霧氣
```

### Solefood 專屬元素

```typescript
// H3 Hexes（歷史）
historyH3Fill: 'rgba(34, 139, 34, 0.15)'    // 深森林綠
historyH3Stroke: 'rgba(34, 139, 34, 0)'     // 無邊框

// H3 Hexes（實時）
realtimeH3Fill: 'rgba(52, 199, 89, 0.35)'   // 活力薄荷綠
realtimeH3Stroke: 'rgba(52, 199, 89, 0.5)'  // 半透明邊框

// GPS Trail
gpsTrail: 'rgba(255, 149, 0, 0.9)'          // 活力橙

// User Marker
userMarker: '#4285F4'                        // Google 藍
```

---

## 🛠️ Mapbox Studio 完整配置

### 步驟 1: 創建新樣式

1. 登入 [Mapbox Studio](https://studio.mapbox.com/)
2. 點擊「New style」
3. 選擇「Dark」模板
4. 命名為「Solefood Cyberpunk」

### 步驟 2: 配置背景

在左側圖層列表中，找到「Background」：

```json
{
  "id": "background",
  "type": "background",
  "paint": {
    "background-color": "#0a0a0a"
  }
}
```

### 步驟 3: 配置建築物（3D 擠出）

找到或創建「building-extrusion」圖層：

```json
{
  "id": "building-extrusion",
  "type": "fill-extrusion",
  "source": "composite",
  "source-layer": "building",
  "minzoom": 15,
  "paint": {
    "fill-extrusion-color": "#1a1a2e",
    "fill-extrusion-height": [
      "interpolate",
      ["linear"],
      ["zoom"],
      15,
      0,
      15.05,
      ["get", "height"]
    ],
    "fill-extrusion-base": [
      "interpolate",
      ["linear"],
      ["zoom"],
      15,
      0,
      15.05,
      ["get", "min_height"]
    ],
    "fill-extrusion-opacity": 0.8,
    "fill-extrusion-ambient-occlusion-intensity": 0.4
  }
}
```

### 步驟 4: 配置道路

找到道路圖層（通常有多個）：

```json
{
  "id": "road-primary",
  "type": "line",
  "source": "composite",
  "source-layer": "road",
  "filter": ["==", ["get", "class"], "primary"],
  "paint": {
    "line-color": "#2a2a3e",
    "line-width": [
      "interpolate",
      ["exponential", 1.5],
      ["zoom"],
      5,
      0.75,
      18,
      32
    ]
  }
}
```

### 步驟 5: 隱藏標籤（重要！）

找到所有 `symbol` 類型的圖層，將它們的可見性設為 `none`：

```json
{
  "id": "road-label",
  "type": "symbol",
  "layout": {
    "visibility": "none"  // 👈 隱藏路名
  }
}
```

或者在 `paint` 中設置：

```json
{
  "id": "road-label",
  "type": "symbol",
  "paint": {
    "text-opacity": 0  // 👈 完全透明
  }
}
```

### 步驟 6: 配置天空（關鍵！）

這是賽博龐克風格的靈魂：

```json
{
  "id": "sky",
  "type": "sky",
  "paint": {
    "sky-type": "atmosphere",
    "sky-atmosphere-color": "#2a1a3e",
    "sky-atmosphere-halo-color": "#ff6b35",
    "sky-atmosphere-sun": [0.0, 90.0],
    "sky-atmosphere-sun-intensity": 5,
    "sky-opacity": [
      "interpolate",
      ["linear"],
      ["zoom"],
      0,
      0,
      5,
      0.3,
      8,
      0.7
    ]
  }
}
```

### 步驟 7: 配置水體

```json
{
  "id": "water",
  "type": "fill",
  "source": "composite",
  "source-layer": "water",
  "paint": {
    "fill-color": "#0f1a2e"
  }
}
```

### 步驟 8: 發布樣式

1. 點擊右上角「Publish」
2. 確認發布
3. 複製樣式 URL（格式：`mapbox://styles/YOUR_USERNAME/YOUR_STYLE_ID`）
4. 貼到 `src/config/mapbox.ts`：

```typescript
export const MAPBOX_STYLE_URL = 'mapbox://styles/YOUR_USERNAME/YOUR_STYLE_ID';
```

---

## 🎬 完整 JSON 樣式（可直接導入）

如果你想跳過手動配置，可以直接使用這個完整的 JSON：

```json
{
  "version": 8,
  "name": "Solefood Cyberpunk",
  "metadata": {
    "mapbox:autocomposite": true
  },
  "sources": {
    "composite": {
      "url": "mapbox://mapbox.mapbox-streets-v8",
      "type": "vector"
    }
  },
  "layers": [
    {
      "id": "background",
      "type": "background",
      "paint": {
        "background-color": "#0a0a0a"
      }
    },
    {
      "id": "water",
      "type": "fill",
      "source": "composite",
      "source-layer": "water",
      "paint": {
        "fill-color": "#0f1a2e"
      }
    },
    {
      "id": "landuse-park",
      "type": "fill",
      "source": "composite",
      "source-layer": "landuse",
      "filter": ["==", ["get", "class"], "park"],
      "paint": {
        "fill-color": "#1a2e1a",
        "fill-opacity": 0.6
      }
    },
    {
      "id": "road-tertiary",
      "type": "line",
      "source": "composite",
      "source-layer": "road",
      "filter": ["==", ["get", "class"], "tertiary"],
      "paint": {
        "line-color": "#0f0f1a",
        "line-width": 2
      }
    },
    {
      "id": "road-secondary",
      "type": "line",
      "source": "composite",
      "source-layer": "road",
      "filter": ["==", ["get", "class"], "secondary"],
      "paint": {
        "line-color": "#1a1a2e",
        "line-width": 4
      }
    },
    {
      "id": "road-primary",
      "type": "line",
      "source": "composite",
      "source-layer": "road",
      "filter": ["==", ["get", "class"], "primary"],
      "paint": {
        "line-color": "#2a2a3e",
        "line-width": 6
      }
    },
    {
      "id": "building-extrusion",
      "type": "fill-extrusion",
      "source": "composite",
      "source-layer": "building",
      "minzoom": 15,
      "paint": {
        "fill-extrusion-color": "#1a1a2e",
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-base": ["get", "min_height"],
        "fill-extrusion-opacity": 0.8,
        "fill-extrusion-ambient-occlusion-intensity": 0.4
      }
    },
    {
      "id": "sky",
      "type": "sky",
      "paint": {
        "sky-type": "atmosphere",
        "sky-atmosphere-color": "#2a1a3e",
        "sky-atmosphere-halo-color": "#ff6b35",
        "sky-atmosphere-sun": [0.0, 90.0],
        "sky-atmosphere-sun-intensity": 5,
        "sky-opacity": 0.7
      }
    }
  ]
}
```

**使用方法**：
1. 在 Mapbox Studio 點擊「New style」
2. 選擇「Upload」
3. 上傳這個 JSON 文件
4. 發布並獲取樣式 URL

---

## 🎮 視覺效果預覽

### 白天 vs 夜晚

我們的賽博龐克風格是「永恆的夜晚」：
- 天空永遠是暗紫色
- 霧氣永遠是工業橙
- 沒有白天/黑夜切換

### 不同縮放層級

- **Zoom 15-16**：看到建築物輪廓
- **Zoom 17-18**：看到 3D 建築擠出（推薦）⭐
- **Zoom 19+**：過於接近，失去全局感

### 不同 Pitch 角度

- **0°**：傳統俯視圖（不推薦）
- **45°**：Pokémon GO 標準
- **65°**：Solefood 專屬（推薦）⭐
- **75°**：極端視角（建築物會很高）

---

## 🎨 進階自定義

### 動態建築物顏色

根據建築物高度改變顏色：

```json
{
  "fill-extrusion-color": [
    "interpolate",
    ["linear"],
    ["get", "height"],
    0,
    "#1a1a2e",
    50,
    "#2a2a4e",
    100,
    "#3a3a6e"
  ]
}
```

### 霧氣效果

增加遠處的霧氣：

```json
{
  "id": "fog",
  "type": "atmosphere",
  "paint": {
    "atmosphere-color": "#ff6b35",
    "atmosphere-halo-color": "#2a1a3e",
    "atmosphere-high-color": "#0a0a0a",
    "atmosphere-space-color": "#0a0a0a"
  }
}
```

### 發光道路

讓主要道路發光：

```json
{
  "id": "road-primary-glow",
  "type": "line",
  "source": "composite",
  "source-layer": "road",
  "filter": ["==", ["get", "class"], "primary"],
  "paint": {
    "line-color": "#ff6b35",
    "line-width": 12,
    "line-blur": 8,
    "line-opacity": 0.3
  }
}
```

---

## 📊 性能優化

### 減少圖層數量

只保留必要的圖層：
- ✅ 背景
- ✅ 水體
- ✅ 道路
- ✅ 建築物
- ✅ 天空
- ❌ 標籤（全部移除）
- ❌ POI（全部移除）
- ❌ 邊界（全部移除）

### 優化 3D 建築

```json
{
  "minzoom": 16,  // 只在 zoom 16+ 顯示 3D 建築
  "paint": {
    "fill-extrusion-opacity": [
      "interpolate",
      ["linear"],
      ["zoom"],
      16,
      0,
      16.5,
      0.8
    ]
  }
}
```

---

## 🎯 最終效果

使用這個賽博龐克樣式後，你的地圖會：
- 🌌 **永恆的夜晚氛圍**
- 🏙️ **3D 建築物擠出**
- 🌫️ **工業橙霧氣**
- 🛣️ **極簡道路網絡**
- 🚫 **零文字標籤**
- 🎮 **完美的遊戲感**

**這就是 Solefood 的世界！** 🚀

---

**版本**: v10.0  
**最後更新**: 2026-01-14  
**作者**: Cursor AI Assistant
