# 膠囊玻璃覆蓋圖素材說明

## 檔案位置
請將生成的 `capsule_glass_overlay.png` 放在此目錄下。

## 素材規格要求

### 尺寸
- **寬度**: 180px（或更高解析度，例如 360px @2x）
- **高度**: 40px（或更高解析度，例如 80px @2x）
- **形狀**: 水平膠囊狀（兩端圓形）

### 視覺內容
1. **外框**: 亮紅色邊框（2-3px 寬），帶有輕微的光暈效果
2. **頂部高光**: 強烈的白色反射高光（模擬玻璃質感）
3. **內部陰影**: 輕微的內部陰影，增加深度感
4. **中心透明**: **關鍵** - 膠囊的中心部分必須完全透明（Alpha = 0），讓底下的液體條透出來

### 生成 Prompt（給 AI 圖片生成工具）

```
[Asset Generation] A strictly frontal, flat view of a UI element asset. A horizontal capsule-shaped "Glass Container Overlay".

[Visuals]
1. Thick, bright red (#FF0000), glossy plastic border (2-3px width) with subtle glow/halo effect.
2. Inside the border, there is a strong white reflection/glare on the top half (simulating glass surface reflection).
3. Subtle inner shadow along the bottom edge for depth.
4. **CRUCIAL**: The center of the capsule is **completely transparent** (alpha channel = 0). No fill, no color, just the border and highlights.
5. No text, no icons, no liquid inside. Just the empty glass shell with border, highlights, and shadows.

[Shape]
- Horizontal pill/capsule shape
- Rounded ends (semicircular)
- Width: 180px, Height: 40px (or 360x80 for @2x)

[Background]
Solid black (#000000) for easy background removal and transparency detection.

[Style]
- 2.5D Q-Version aesthetic
- Glassmorphism/Jelly texture
- Cyberpunk-lite neon glow
```

## 使用方式

生成素材後，將檔案命名為 `capsule_glass_overlay.png` 並放在此目錄下。

組件會自動載入並使用此素材作為頂層覆蓋圖。
