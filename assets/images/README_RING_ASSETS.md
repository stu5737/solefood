# 圓環儀表板素材說明

## 檔案位置
請將生成的素材圖放在此目錄下。

## 需要的素材

### 1. `ring_base.png` - 圓環底盤

#### 規格
- **尺寸**: 80x80px（或更高解析度，例如 160x160 @2x）
- **形狀**: 完美圓形
- **背景**: 透明或深色半透明

#### 視覺內容
- 深色、半透明的黑色玻璃材質
- 作為圓環的背景容器
- 可以有一些微妙的內部陰影或邊緣效果

#### 生成 Prompt
```
[Asset Generation] A perfect circle UI element. Dark, semi-transparent black glass material.
- Size: 80x80px (or 160x160 for @2x)
- Shape: Perfect circle
- Material: Dark, semi-transparent black glass
- Style: Mobile game GUI, clean, vector-like 3D
- Background: Transparent or solid black for easy cropping
- Purpose: Serves as the background container for a circular gauge
```

---

### 2. `ring_glass_overlay.png` - 玻璃覆蓋圖

#### 規格
- **尺寸**: 80x80px（或更高解析度，例如 160x160 @2x）
- **形狀**: 完美圓形
- **背景**: 透明（Alpha 通道）

#### 視覺內容（關鍵）
1. **外框**: 厚實的白色/灰色塑料邊框（2-3px 寬），帶有光澤
2. **頂部高光**: 強烈的白色反射高光（模擬玻璃表面反射）
   - 位置：左上角
   - 形狀：弧形高光
   - 強度：明顯但不刺眼
3. **內部陰影**: 輕微的內部陰影，增加深度感
4. **中心透明**: **關鍵** - 圓環的中心部分必須完全透明（Alpha = 0），讓底下的填充圓弧透出來
5. **無填充**: 圓環內部是空的，只有邊框、高光和陰影

#### 生成 Prompt
```
[Asset Generation] A perfect circle UI element. Transparent glass lens with glossy plastic border.

[Visuals]
1. Thick, glossy, jelly-like plastic border (Neutral White/Grey, 2-3px width) around the outer edge
2. Strong white reflection/glare on the top left glass surface (simulating light source from top-left)
3. Subtle inner shadow along the bottom edge for depth
4. **CRUCIAL**: The center of the circle is **completely transparent** (alpha channel = 0). No fill, no color in the center - just the border, highlights, and shadows.
5. No text, no icons, no fill inside. Just the empty glass shell with border, highlights, and shadows.

[Shape]
- Perfect circle
- Size: 80x80px (or 160x160 for @2x)

[Background]
Completely transparent (alpha = 0) in the center. Solid black (#000000) around the edges for easy background removal.

[Style]
- Mobile game GUI
- Clean, vector-like 3D
- Glassmorphism/Jelly texture
- Cyberpunk-lite aesthetic
- Isometric lighting from top-left
```

---

## 使用方式

1. 生成兩張素材圖
2. 將檔案命名為：
   - `ring_base.png`
   - `ring_glass_overlay.png`
3. 放在 `assets/images/` 目錄下
4. 組件會自動載入並使用這些素材

## 備註

- 如果素材不存在，組件會優雅降級（使用純色背景）
- 建議使用 @2x 或 @3x 解析度以適配高解析度螢幕
- 素材應該去背（透明背景）以便正確疊加
