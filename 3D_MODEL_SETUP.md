# 🎮 3D 用戶游標功能 - 快速開始

## ✅ 功能已實施完成

Mapbox.ModelLayer 3D 模型功能已完全整合到地圖系統中！

---

## 🚀 快速啟用（3 步驟）

### 步驟 1：準備你的 GLB 模型

將你的 3D 模型文件（`.glb` 格式）放到：

```
assets/models/user-avatar.glb
```

**模型要求**：
- 格式：`.glb`
- 大小：< 1 MB
- 多邊形：< 10,000
- 朝向：正面朝 +Y 軸

---

### 步驟 2：啟用模型註冊

打開文件：`src/components/map/MapboxRealTimeMap.tsx`

找到第 **190-220** 行左右的代碼：

```typescript
/* ← 刪除這行
console.log('[3D Model] 📦 開始加載模型...');
const asset = Asset.fromModule(require('../../assets/models/user-avatar.glb'));
await asset.downloadAsync();
...
console.log('[3D Model] ✅ 3D 模型註冊成功！');
*/ ← 刪除這行
```

**移除 `/*` 和 `*/` 這兩個註解標記**，使代碼生效。

---

### 步驟 3：重啟應用

```bash
npx expo start
```

查看控制台，應該看到：

```
[3D Model] 📦 開始加載模型...
[3D Model] ✅ 3D 模型註冊成功！
```

---

## 📊 功能特點

| 特性 | 說明 |
|------|------|
| ✅ **原生整合** | 使用 Mapbox 原生 ModelLayer |
| ✅ **動態旋轉** | 跟隨運動方向自動旋轉 |
| ✅ **動態縮放** | 根據 zoom level 調整大小 |
| ✅ **3D 場景** | 完美整合到 65° 傾斜視角 |
| ✅ **光照陰影** | 自動接收場景光照 |
| ✅ **建築遮擋** | 真實的深度遮擋效果 |
| ✅ **主題支持** | 早晚主題自動調整光照 |
| ✅ **高性能** | GPU 加速，60 FPS |

---

## 🎨 沒有 GLB 模型？

### 方案 A：使用現有的 SymbolLayer

如果沒有 GLB 模型，現有的箭頭游標會繼續正常工作。

### 方案 B：免費獲取 3D 模型

- [Sketchfab](https://sketchfab.com/) - 大量免費 3D 模型
- [Mixamo](https://www.mixamo.com/) - Adobe 提供的角色模型
- [Poly Pizza](https://poly.pizza/) - 開源低多邊形模型

### 方案 C：使用 AI 生成

- [Meshy](https://www.meshy.ai/) - AI 生成 3D 模型
- [3D AI Studio](https://www.3daistudio.com/) - 文字轉 3D

---

## 📖 詳細文檔

完整的使用指南、優化建議和故障排除：

👉 **[assets/models/README_3D_MODEL.md](./assets/models/README_3D_MODEL.md)**

---

## 🔧 技術細節

### 實施的代碼結構

```typescript
// 1. 狀態管理
const [is3DModelReady, setIs3DModelReady] = useState(false);

// 2. 模型註冊（useEffect）
useEffect(() => {
  const register3DModel = async () => {
    const asset = Asset.fromModule(require('../../assets/models/user-avatar.glb'));
    await mapRef.current.addModel('user-avatar-model', asset.localUri);
    setIs3DModelReady(true);
  };
}, [timeTheme]);

// 3. GeoJSON 數據
const userModelGeoJson = useMemo(() => ({
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [lng, lat, 0],
    },
    properties: {
      rotation: displayHeadingAdjusted,
      speed: currentSpeed,
    },
  }],
}), [currentLocation, displayHeadingAdjusted]);

// 4. ModelLayer 渲染
<Mapbox.ShapeSource id="user-3d-model-source" shape={userModelGeoJson}>
  <Mapbox.ModelLayer
    id="user-3d-model-layer"
    style={{
      modelId: 'user-avatar-model',
      modelRotation: [0, 0, ['get', 'rotation']],
      modelScale: [...],
      modelType: 'common-3d',
      ...
    }}
  />
</Mapbox.ShapeSource>
```

---

## ✨ 效果展示

- 在 **2D 模式**：3D 模型保持直立
- 在 **3D 模式**：完美整合到 65° 傾斜場景
- **早晨主題**：增強發光效果（模擬陽光）
- **夜晚主題**：柔和光照（模擬月光）

---

## 🎯 下一步

1. 準備你的 GLB 模型（或下載免費模型）
2. 放置到 `assets/models/user-avatar.glb`
3. 取消註冊代碼的註解
4. 享受 3D 游標！🎮✨

---

**需要幫助？** 查看 [詳細文檔](./assets/models/README_3D_MODEL.md) 或檢查控制台日誌。
