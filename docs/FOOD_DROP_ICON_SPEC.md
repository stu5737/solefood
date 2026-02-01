# 🍽️ Solefood 美食卸貨圖標設計規範

M2E + 深色 Mapbox 地圖 + Q 版風格，兼顧 **遊戲性**、**清晰度**、**效能**。

---

## 1. 核心視覺策略：高對比「果凍感」

| 項目 | 說明 |
|------|------|
| **容器化** | 文字放在膠囊/圓角矩形內，不裸放 |
| **材質** | 霧面光澤 (Matte Pop)、邊緣輕微反光 |
| **厚度** | 底部硬陰影，像浮在地圖上的 3D 物件 |
| **配色** | 地圖深灰/黑 → 圖標亮色（螢光橘、萊姆綠、糖果粉） |
| **文字** | **深色**（深藍 #1a1a2e、深紫），**避免亮底白字**（對比不足） |

---

## 2. Mapbox 技術：動態文字氣泡

- **icon-text-fit**: `both`（寬高隨文字伸縮）
- **icon-text-fit-padding**: `[10, 20, 10, 20]`（上下左右留白）
- **SymbolLayer**: `icon-image` = 氣泡底圖，`text-field` = 餐廳名稱（可混 Emoji）

底圖建議：九宮格 (9-slice) 氣泡，圓角不變形、只拉伸中間。

---

## 3. 遊戲化狀態區分

| 狀態 | 視覺 | 說明 |
|------|------|------|
| **未探索 (unvisited)** | 飽和度高、有陰影、體積大 | 像等待被打開的寶箱 |
| **範圍內 (in_range)** | 放大或外框發光 (Pulse) | 50m 內可卸貨的提示 |
| **已完成 (completed)** | 灰色、扁平或小勾勾 | 地圖清理感 (Map Completionism) |

實作時可依 `state` 屬性切換 `textColor` / `iconSize` / 圖示。

---

## 4. Solefood 具體建議

- **造型**：外送訂單插牌、略傾 5° 票券 (Ticket)，上寫餐廳名
- **裝飾**：文字左側極簡 Emoji（🍜🍱🥤☕🍔），Mapbox `text-field` 可混 Emoji
- **字體**：圓體 (Rounded) 中文字型，避免黑體/明體破壞 Q 版感

---

## 5. 程式常數位置

- **設計常數**：`src/config/mapbox.ts` → `FOOD_DROP_ICON`
- **地圖使用**：`src/components/map/MapboxRealTimeMap.tsx` → 範例餐廳 SymbolLayer

後續可依 `state`（unvisited / in_range / completed）擴充樣式與動效。
