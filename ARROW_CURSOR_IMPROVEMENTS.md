# ✨ 箭頭游標改進方案

## ✅ 現況

3D 模型功能已禁用（`@rnmapbox/maps` v10 不支持），繼續使用箭頭游標：**`➤`**

---

## 🎨 改進選項

### 選項 1：更換 Emoji 圖標（最簡單）

#### A. 交通工具系列

```typescript
// 汽車（適合送貨主題）
textField: '🚗'  // 或 '🚙'、'🚕'

// 自行車（環保主題）
textField: '🚴'  // 或 '🚲'

// 摩托車（快速送貨）
textField: '🏍️'  // 或 '🛵'

// 步行（健康主題）
textField: '🏃'  // 或 '🚶'

// 滑板（年輕活力）
textField: '🛹'
```

#### B. 方向指示系列

```typescript
// 箭頭變體
textField: '▶️'  // 或 '⏩'、'➡️'

// 三角形
textField: '🔺'  // 或 '🔻'

// 定位圖標
textField: '📍'  // 或 '📌'
```

#### C. 遊戲風格

```typescript
// 太空船（科技感）
textField: '🚀'

// 飛機
textField: '✈️'

// 遊戲手柄（遊戲化）
textField: '🎮'
```

---

### 選項 2：動態 Emoji（根據速度切換）

```typescript
// 在 MapboxRealTimeMap.tsx 中
const getUserIcon = (speed: number) => {
  if (speed < 0.5) return '🚶'; // 靜止/步行
  if (speed < 3) return '🚴';   // 慢速移動
  if (speed < 8) return '🚗';   // 中速移動
  return '🏍️';                  // 高速移動
};

// 使用
textField: getUserIcon(currentSpeed)
```

---

### 選項 3：增強視覺效果（保持 ➤）

#### A. 加大尺寸

```typescript
textSize: 24  // 從 18 增加到 24
```

#### B. 更明亮的顏色

```typescript
// 早上模式
textColor: '#FF3B30'  // 鮮豔紅色
textHaloColor: 'rgba(255, 255, 255, 1.0)'  // 完全不透明白色

// 晚上模式
textColor: '#00D4FF'  // 霓虹藍色
textHaloColor: 'rgba(0, 212, 255, 0.5)'  // 藍色光暈
```

#### C. 更粗的光暈

```typescript
textHaloWidth: 5  // 從 3 增加到 5
```

#### D. 添加動畫效果（脈動）

```typescript
// 在 useMemo 中添加時間戳
const pulseAnimation = Math.sin(Date.now() / 500) * 0.2 + 1; // 0.8 - 1.2

// 動態調整大小
textSize: 18 * pulseAnimation
```

---

### 選項 4：自定義 SVG 圖標（最專業）

使用 `Mapbox.SymbolLayer` + 自定義圖片：

#### 步驟

1. **創建 SVG 圖標**

```svg
<!-- assets/icons/custom-cursor.svg -->
<svg width="40" height="40" viewBox="0 0 40 40">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FF6B35;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#F7931E;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- 外圈光暈 -->
  <circle cx="20" cy="20" r="18" fill="rgba(255,107,53,0.2)" />
  <!-- 內圈 -->
  <circle cx="20" cy="20" r="12" fill="url(#grad)" />
  <!-- 方向箭頭 -->
  <path d="M20 8 L28 20 L20 16 L12 20 Z" fill="white" />
</svg>
```

2. **在代碼中使用**

```typescript
import customCursor from '../../assets/icons/custom-cursor.svg';

// 在 useEffect 中註冊圖標
useEffect(() => {
  mapRef.current?.images?.addImage('custom-cursor', customCursor);
}, []);

// 在 SymbolLayer 中使用
<Mapbox.SymbolLayer
  style={{
    iconImage: 'custom-cursor',
    iconSize: 1,
    iconRotate: ['get', 'heading'],
    iconRotationAlignment: 'map',
  }}
/>
```

---

## 🎯 推薦方案

### 🥇 方案 A：更換 Emoji（立即可用）

**推薦圖標**：`🚗`（汽車）

**理由**：
- ✅ 符合送貨主題
- ✅ 方向清晰
- ✅ 0 修改成本
- ✅ 視覺友好

**實施**：只需修改一行代碼！

```typescript
textField: '🚗'  // 替換 '➤'
```

---

### 🥈 方案 B：動態 Emoji（有趣互動）

**效果**：
- 靜止時：🚶
- 慢速：🚴
- 中速：🚗
- 高速：🏍️

**理由**：
- ✅ 視覺反饋更豐富
- ✅ 增加遊戲感
- ✅ 用戶能感知速度變化
- ⚠️ 需要 10 行代碼

---

### 🥉 方案 C：增強當前箭頭

**修改**：
- 加大尺寸（18 → 24）
- 更亮顏色
- 更粗光暈（3 → 5）

**理由**：
- ✅ 保持簡潔
- ✅ 視覺更明顯
- ✅ 專業感
- ⚠️ 需要 5 行代碼

---

## 📊 方案對比

| 方案 | 難度 | 時間 | 視覺效果 | 遊戲感 | 性能 | 推薦度 |
|------|------|------|----------|--------|------|--------|
| A. 換 Emoji | ⭐ | 1 分鐘 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| B. 動態 Emoji | ⭐⭐ | 5 分鐘 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| C. 增強箭頭 | ⭐⭐ | 5 分鐘 | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| D. 自定義 SVG | ⭐⭐⭐⭐ | 30 分鐘 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🎨 配色建議（配合主題）

### 早上模式

```typescript
// 溫暖活力
textColor: '#FF6B35'        // 活力橙
textHaloColor: 'rgba(255, 255, 255, 1.0)'  // 純白光暈
```

### 晚上模式

```typescript
// 霓虹科技
textColor: '#00D4FF'        // 霓虹藍
textHaloColor: 'rgba(0, 212, 255, 0.5)'    // 藍色光暈
```

或

```typescript
// 溫暖柔和
textColor: '#FFD700'        // 金色
textHaloColor: 'rgba(255, 215, 0, 0.3)'    // 金色光暈
```

---

## 💬 你想要哪個方案？

**快速選擇**：

- **A** - 換成 🚗（1 分鐘）
- **B** - 動態 Emoji（5 分鐘）
- **C** - 增強箭頭（5 分鐘）
- **D** - 自定義 SVG（30 分鐘）
- **保持現狀** - 不修改

或者你也可以：
- **混合方案**：例如 A + C（換 Emoji 並增強效果）
- **自訂建議**：告訴我你想要什麼風格

---

## 🚀 立即實施

告訴我你的選擇，我可以：
1. ✅ 立即修改代碼
2. ✅ 測試效果
3. ✅ 提供完整的配色方案

---

**等你的決定！** 🎨✨
