# 🎮 測試你的 3D 模型

## ✅ GitHub 倉庫已設為公開

現在可以測試你的 3D 模型了！

---

## 🔗 當前配置

**模型 URL**：
```
https://raw.githubusercontent.com/stu5737/solefood/main/assets/models/user-avator.glb
```

**文件大小**：3.8 MB

---

## 🚀 測試步驟

### 1. 重啟應用（必須清除緩存）

```bash
# 停止當前應用（Ctrl+C）

# 清除緩存並重啟
npx expo start -c
```

### 2. 查看控制台

**期望看到**：
```
✅ [3D Model] ✅ 3D 模型已啟用（使用你的 GLB）
✅ [3D Model] 📍 URL: https://raw.githubusercontent.com/...
```

---

## 🎯 兩種可能的結果

### 結果 A：成功！🎉

**如果你看到**：
- ✅ 你的 3D 模型顯示在地圖上
- ✅ 移動時模型旋轉
- ✅ 放大縮小時模型調整大小

**那麼**：
- 🎊 恭喜！3D 功能完美運作
- 🎨 可以進一步調整模型大小、光照等
- ✨ 可以嘗試早晚主題切換

---

### 結果 B：還是沒有顯示 ⚠️

**可能原因**：

#### 原因 1：ModelLayer 不支持

`@rnmapbox/maps` v10.2.10 可能真的不支持 `ModelLayer` 組件。

**驗證方法**：
- 控制台沒有錯誤
- 但也沒有 3D 模型
- 箭頭游標正常顯示

**解決方案**：
→ 選擇一個替代方案（見下方）

---

#### 原因 2：URL 還沒更新

GitHub CDN 需要 1-2 分鐘更新。

**解決方案**：
1. 等待 2 分鐘
2. 重啟應用
3. 在瀏覽器驗證 URL 可訪問：
   ```
   https://raw.githubusercontent.com/stu5737/solefood/main/assets/models/user-avator.glb
   ```

---

#### 原因 3：模型格式問題

3.8 MB 對於移動設備來說可能有點大。

**解決方案**：
- 進一步壓縮模型到 < 1 MB
- 使用線上工具：https://glb.ux3d.com/
- 或使用 Blender 重新導出

---

## 🔄 替代方案（如果 ModelLayer 不支持）

### 方案 A：升級到 @rnmapbox/maps v11+

檢查是否有支持 3D 模型的新版本：

```bash
npm show @rnmapbox/maps versions --json
```

如果有 v11+，可以嘗試升級。

---

### 方案 B：使用 Mapbox.MarkerView

將 3D 模型包裝在 React Native 視圖中：

```typescript
<Mapbox.MarkerView coordinate={[lng, lat]}>
  <View>
    {/* 使用 expo-gl 或其他 3D 庫 */}
  </View>
</Mapbox.MarkerView>
```

**優點**：
- ✅ 肯定能顯示
- ✅ 完全控制

**缺點**：
- ❌ 不會被建築物遮擋
- ❌ 沒有真實 3D 效果

---

### 方案 C：使用美化的 Emoji/SVG

使用增強版的 2D 游標：

**動態 Emoji**（根據速度）：
- 靜止：🚶
- 慢速：🚴
- 中速：🚗
- 高速：🏍️

**或自定義 SVG**：
- 專業設計
- 動畫效果
- 完美性能

---

## 📊 測試清單

完成測試後，檢查：

- [ ] 3D 模型是否顯示？
- [ ] 移動時模型是否旋轉？
- [ ] 2D/3D 模式切換是否正常？
- [ ] 早晚主題切換是否正常？
- [ ] 控制台是否有錯誤？
- [ ] 性能是否流暢？

---

## 🎨 如果成功，可以調整的參數

### 1. 模型大小

在 `MapboxRealTimeMap.tsx` 中找到：

```typescript
modelScale: [
  'interpolate',
  ['linear'],
  ['zoom'],
  15, [0.5, 0.5, 0.5],   // 調整這個值
  17, [1, 1, 1],         // 調整這個值
  20, [1.5, 1.5, 1.5]    // 調整這個值
],
```

**建議**：
- 如果太小：增加數值（例如 `[2, 2, 2]`）
- 如果太大：減少數值（例如 `[0.3, 0.3, 0.3]`）

---

### 2. 光照強度

```typescript
modelEmissiveStrength: timeTheme === 'morning' ? 0.5 : 0.2,
```

**建議**：
- 更亮：增加數值（例如 `0.8` / `0.5`）
- 更暗：減少數值（例如 `0.3` / `0.1`）

---

### 3. 旋轉角度

如果模型朝向不對，可以調整：

```typescript
modelRotation: [
  0,  // pitch (俯仰角)
  0,  // roll (滾轉角)
  ['get', 'rotation'] + 90  // yaw (偏航角) + 偏移量
],
```

---

### 4. 環境光遮蔽

```typescript
modelAmbientOcclusionIntensity: 0.5,
```

**建議**：
- 更明顯陰影：增加（例如 `0.8`）
- 更柔和：減少（例如 `0.2`）

---

## 💬 測試後告訴我

### 如果成功：
> "看到我的 3D 模型了！🎮"

然後告訴我：
- 需要調整大小嗎？
- 需要調整光照嗎？
- 需要調整旋轉角度嗎？

### 如果失敗：
> "還是沒有顯示 😢"

然後選擇：
- **A** - 升級 Mapbox（1-2 小時）
- **B** - 使用 MarkerView（1 小時）
- **C** - 使用美化的 Emoji/SVG（10 分鐘）

---

## 🔍 調試技巧

### 檢查 URL 是否可訪問

在瀏覽器打開：
```
https://raw.githubusercontent.com/stu5737/solefood/main/assets/models/user-avator.glb
```

應該會下載一個 3.8 MB 的文件。

### 檢查控制台

尋找任何關於 `[3D Model]` 的訊息，包括警告和錯誤。

### 檢查性能

如果模型太大，可能導致：
- 🐌 地圖卡頓
- 📱 記憶體不足
- ⏳ 加載時間長

解決方案：壓縮模型到 < 1 MB。

---

**現在重啟應用測試吧！** 🚀✨

```bash
npx expo start -c
```

---

## 📚 相關文檔

- `3D_MODEL_LIMITATION.md` - 詳細技術分析
- `ARROW_CURSOR_IMPROVEMENTS.md` - 替代方案
- `TEST_MODEL_DUCK.md` - 測試模型經驗
