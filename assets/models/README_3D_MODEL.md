# 🎮 3D 用戶游標模型使用指南

## 📦 準備 GLB 模型文件

### 1. 將你的 GLB 文件放置到此目錄

```
/Users/yumingliao/YML/solefoodmvp/assets/models/
└── user-avatar.glb  ← 你的 3D 模型文件
```

---

## ✅ 啟用 3D 模型功能

### 2. 取消註冊代碼的註解

打開文件：`src/components/map/MapboxRealTimeMap.tsx`

找到以下代碼段（約在第 190-220 行）：

```typescript
// ========== 3D 模型註冊 ==========
useEffect(() => {
  const register3DModel = async () => {
    if (!mapRef.current) {
      console.log('[3D Model] ⏳ 等待地圖初始化...');
      return;
    }

    try {
      // TODO: 請先將你的 GLB 文件放到 assets/models/user-avatar.glb
      // 暫時註解掉，等文件準備好後取消註解
      
      /* ← 刪除這行
      console.log('[3D Model] 📦 開始加載模型...');
      const asset = Asset.fromModule(require('../../assets/models/user-avatar.glb'));
      await asset.downloadAsync();
      
      console.log('[3D Model] 📍 模型 URI:', asset.localUri || asset.uri);
      
      // 註冊模型到 Mapbox
      await mapRef.current.addModel('user-avatar-model', asset.localUri || asset.uri);
      
      setIs3DModelReady(true);
      console.log('[3D Model] ✅ 3D 模型註冊成功！');
      */ ← 刪除這行
```

**移除 `/*` 和 `*/` 這兩行**，使代碼生效。

---

## 🎨 模型製作建議

### 推薦規格

| 屬性 | 建議值 |
|------|--------|
| **格式** | `.glb`（glTF Binary） |
| **文件大小** | < 1 MB |
| **多邊形數** | < 10,000 三角面 |
| **材質** | Simple/Unlit（避免複雜 PBR） |
| **朝向** | 正面朝 +Y 軸 |
| **尺寸** | 約 1-2 單位高度 |

### Blender 導出設置

如果你使用 Blender：

1. 選擇 `File → Export → glTF 2.0 (.glb)`
2. **Format**: glTF Binary (.glb)
3. **Include**:
   - ✅ Selected Objects
   - ✅ Apply Modifiers
   - ✅ Compression
4. **Geometry**:
   - ✅ UVs
   - ✅ Normals
   - ❌ Vertex Colors（如不需要）
5. **Transform**:
   - ✅ +Y Up

---

## 🔧 模型優化工具

### 使用 gltf-pipeline 壓縮模型

```bash
# 安裝工具
npm install -g gltf-pipeline

# 基礎壓縮（減少 50-70% 大小）
gltf-pipeline -i user-avatar.glb -o user-avatar-optimized.glb -d

# Draco 壓縮（更小，但可能不相容所有平台）
gltf-pipeline -i user-avatar.glb -o user-avatar-draco.glb --draco.compressionLevel=10
```

---

## 🎯 測試步驟

### 3. 測試 3D 模型

1. 確保 GLB 文件已放置到 `assets/models/user-avatar.glb`
2. 取消註冊代碼的註解
3. 重新啟動應用：`npx expo start`
4. 查看控制台日誌：
   ```
   [3D Model] 📦 開始加載模型...
   [3D Model] 📍 模型 URI: file://...
   [3D Model] ✅ 3D 模型註冊成功！
   ```
5. 在地圖上應該看到你的 3D 模型替代箭頭游標

---

## 🐛 故障排除

### 問題 1：模型不顯示

**檢查清單**：
- [ ] GLB 文件是否正確放置
- [ ] 是否取消註冊代碼的註解
- [ ] 控制台是否顯示「✅ 3D 模型註冊成功」
- [ ] `is3DModelReady` 狀態是否為 `true`

**調試代碼**：
```typescript
// 在 MapboxRealTimeMap.tsx 中添加
console.log('[Debug] is3DModelReady:', is3DModelReady);
console.log('[Debug] userModelGeoJson:', userModelGeoJson);
```

### 問題 2：模型方向不對

調整 `modelRotation` 的 yaw 軸偏移：

```typescript
modelRotation: [
  0,  
  0,  
  ['get', 'rotation'] + 180  // 旋轉 180°
],
```

### 問題 3：模型太大或太小

調整 `modelScale`：

```typescript
modelScale: [
  'interpolate',
  ['linear'],
  ['zoom'],
  15, [0.3, 0.3, 0.3],   // 縮小到 30%
  17, [0.5, 0.5, 0.5],   // 50%
  20, [0.8, 0.8, 0.8]    // 80%
],
```

### 問題 4：性能問題

1. **減少多邊形數**：使用 Blender 的 Decimate Modifier
2. **簡化材質**：移除不必要的貼圖
3. **降低更新頻率**：調整 `useMemo` 的依賴項

---

## 📚 進階配置

### 根據速度動態縮放

```typescript
modelScale: [
  'interpolate',
  ['linear'],
  ['get', 'speed'],
  0, [0.8, 0.8, 0.8],    // 靜止：小
  5, [1, 1, 1],          // 慢速：正常
  15, [1.3, 1.3, 1.3]    // 快速：大（動感）
]
```

### 根據時間主題調整光照

```typescript
modelEmissiveStrength: timeTheme === 'morning' ? 0.8 : 0.3,
```

### 添加自定義動畫

如果你的 GLB 包含動畫軌道，可以在模型加載後播放：

```typescript
// 需要額外的動畫控制代碼
```

---

## ✨ 效果預覽

- **2D 模式**：模型保持直立
- **3D 模式（65° 傾斜）**：模型完美整合到 3D 場景
- **旋轉**：根據運動方向自動旋轉
- **縮放**：根據 zoom level 動態調整大小
- **光照**：自動接收場景光照和陰影
- **遮擋**：會被 3D 建築遮擋（真實感）

---

## 🎉 完成！

現在你的地圖有了專屬的 3D 游標了！

如有問題，請查看控制台日誌或參考 Mapbox ModelLayer 文檔。
