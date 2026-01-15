# 🦆 測試模型：Khronos Duck

## ✅ 已切換到測試模型

現在使用官方公開的測試模型，可以立即驗證 3D 功能！

---

## 🎯 當前配置

**模型來源**：Khronos Group（glTF 官方組織）  
**模型 URL**：
```
https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb
```

**模型特點**：
- ✅ 公開可用（無需認證）
- ✅ 經典測試模型（鴨子）
- ✅ 小巧（約 100KB）
- ✅ 格式標準（glTF 2.0）

---

## 🚀 測試步驟

### 1. 重啟應用

```bash
# 停止當前 Expo（Ctrl+C）

# 清除緩存並重啟
npx expo start -c
```

### 2. 查看控制台

應該看到：

```
✅ [3D Model] 🦆 加載測試模型（Khronos Duck）...
✅ [3D Model] 📍 URL: https://raw.githubusercontent.com/...
✅ [3D Model] ✅ URL 檢查通過
✅ [3D Model] ✅ 3D 模型註冊成功！（測試模型）
```

### 3. 測試 3D 功能

1. **開始採集**：點擊主按鈕
2. **查看地圖**：你會看到一隻鴨子！🦆
3. **移動測試**：鴨子會跟隨方向旋轉
4. **縮放測試**：放大/縮小地圖，鴨子會調整大小
5. **模式切換**：測試 2D/3D 模式
6. **主題切換**：測試早晚主題

---

## 🎨 預期效果

### 外觀

- **模型**：一隻可愛的黃色鴨子
- **旋轉**：跟隨運動方向（就像箭頭游標）
- **縮放**：根據地圖 zoom level 動態調整
- **光照**：
  - 早上模式：較亮（emissiveStrength: 0.5）
  - 晚上模式：較暗（emissiveStrength: 0.2）

### 行為

- 移動時鴨子會指向運動方向
- 靜止時鴨子會指向手機朝向
- 3D 模式下有陰影效果
- 建築物會正確遮擋鴨子

---

## 🔄 切換回你的模型

等你的 GitHub 倉庫設為公開後：

### 方法 1：GitHub URL

```typescript
// 修改 MapboxRealTimeMap.tsx
const glbUrl = 'https://raw.githubusercontent.com/stu5737/solefood/main/assets/models/user-avator.glb';
```

### 方法 2：Cloudinary URL

如果你上傳到 Cloudinary：

```typescript
const glbUrl = 'https://res.cloudinary.com/你的雲名稱/raw/upload/v1234567890/user-avator.glb';
```

---

## 🐛 故障排除

### 問題 1：還是顯示箭頭

**可能原因**：
- 沒有重啟應用
- 沒有清除緩存
- 網絡問題

**解決**：
```bash
npx expo start -c
```

### 問題 2：鴨子太小/太大

**調整縮放**：

在 `MapboxRealTimeMap.tsx` 中找到：

```typescript
modelScale: [
  'interpolate',
  ['linear'],
  ['zoom'],
  15, [0.5, 0.5, 0.5],   // 縮小這個值 → 更小
  20, [1.5, 1.5, 1.5],   // 縮小這個值 → 更小
],
```

### 問題 3：鴨子方向不對

**和箭頭一樣的邏輯**：
- 移動時：跟隨運動方向（GPS heading）
- 靜止時：跟隨手機朝向（compass heading）

應該已經正確設定。

---

## 📊 性能對比

| 指標 | 箭頭游標 | 測試鴨子 | 你的模型 |
|------|----------|----------|----------|
| 文件大小 | < 1 KB | ~100 KB | 3.8 MB |
| 記憶體 | < 1 MB | ~5 MB | ~20 MB |
| 加載時間 | 即時 | < 0.5 秒 | 2-5 秒 |
| 視覺效果 | 簡單 | 可愛 | 專業 |

---

## 🎯 驗證清單

測試完成後，檢查這些功能：

- [ ] 鴨子正確顯示
- [ ] 移動時鴨子旋轉
- [ ] 2D/3D 模式都正常
- [ ] 早晚主題都正常
- [ ] 沒有性能問題
- [ ] 沒有錯誤日誌

---

## 🔜 下一步

### 選項 A：使用測試鴨子

如果你覺得鴨子很可愛，可以繼續使用！

### 選項 B：切換到你的模型

**步驟**：
1. 將你的 GitHub 倉庫設為公開
2. 等待 1-2 分鐘
3. 修改代碼中的 URL
4. 重啟應用

### 選項 C：嘗試其他官方模型

Khronos 還有很多測試模型：

**小飛機**（推薦）：
```
https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb
```

**機器人**：
```
https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/RobotExpressive/glTF-Binary/RobotExpressive.glb
```

**小狐狸**：
```
https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF-Binary/Fox.glb
```

只需替換 `glbUrl` 即可！

---

## 📚 更多資源

**Khronos 官方模型庫**：
https://github.com/KhronosGroup/glTF-Sample-Models/tree/master/2.0

**glTF 格式介紹**：
https://www.khronos.org/gltf/

**Mapbox 3D 模型文檔**：
https://docs.mapbox.com/ios/maps/api/

---

## 💡 小提示

### 如果你想自定義鴨子

可以下載模型並用 Blender 修改：

```bash
# 下載鴨子模型
curl -o duck.glb https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb

# 用 Blender 打開編輯
# 改變顏色、大小、添加配件等

# 上傳到你的 GitHub 或 Cloudinary
```

---

**現在重啟應用，看看你的鴨子游標吧！** 🦆✨
