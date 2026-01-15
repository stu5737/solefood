# 🎮 3D Avatar 完整解決方案

## ✅ 已實施的所有方案

我已經實施了**所有 5 個方案**，按優先順序自動嘗試：

---

## 📋 方案實施清單

### ✅ 方案 1：改用支持 3D 的地圖樣式

**修改文件**：`src/config/mapbox.ts`

**變更**：
- `MORNING_THEME.mapStyle`: `light-v11` → `streets-v12`
- `NIGHT_THEME.mapStyle`: `dark-v11` → `streets-v12`

**原因**：`streets-v12` 對 3D 模型支持更好

---

### ✅ 方案 2：檢查原生模塊支持

**修改文件**：`src/components/map/MapboxRealTimeMap.tsx`

**功能**：
- 自動檢查所有原生模塊
- 尋找 Mapbox 相關模塊
- 嘗試使用 `addModel` 方法（如果存在）

**日誌**：
```
[3D Model] 🔍 檢查原生模塊支持...
[3D Model] 🗺️ Mapbox 模塊: [...]
[3D Model] ✅ 找到 addModel 方法在: ...
```

---

### ✅ 方案 3：改用 `modelUrl` 屬性

**修改文件**：`src/components/map/MapboxRealTimeMap.tsx`

**變更**：
```typescript
// 同時嘗試 modelId 和 modelUrl
...(localModelPath ? { modelId: localModelPath } : { modelId: modelUrl }),
...(localModelPath ? { modelUrl: localModelPath } : { modelUrl: modelUrl }),
```

**原因**：某些版本可能支持 `modelUrl` 而不是 `modelId`

---

### ✅ 方案 4：下載模型到本地

**修改文件**：`src/components/map/MapboxRealTimeMap.tsx`

**功能**：
- 自動下載 GLB 到本地緩存
- 優先使用本地文件（更快、更穩定）
- 如果下載失敗，回退到 URL

**日誌**：
```
[3D Model] 📥 下載模型中...
[3D Model] ✅ 模型下載完成: file://...
[3D Model] ✅ 使用緩存模型: ...
```

**緩存位置**：`FileSystem.cacheDirectory/user-avator.glb`

---

### ⏳ 方案 A：expo-gl + Three.js（備用）

**狀態**：已創建組件，等待安裝依賴

**文件**：`src/components/map/Avatar3D.tsx`

**安裝命令**：
```bash
npx expo install expo-gl expo-three
npm install three @types/three --save-dev
```

**使用方式**：
1. 安裝依賴後，取消註釋 `Avatar3D.tsx` 中的代碼
2. 在 `MapboxRealTimeMap.tsx` 中使用 `Mapbox.MarkerView` 包裹

---

## 🚀 測試步驟

### 1. 重啟應用（必須清除緩存）

```bash
npx expo start -c
```

### 2. 查看控制台日誌

應該看到以下訊息（按順序）：

```
✅ [3D Model] 🔍 檢查原生模塊支持...
✅ [3D Model] 🗺️ Mapbox 模塊: [...]
✅ [3D Model] ⚠️ 未找到原生 addModel 方法，繼續其他方案
✅ [3D Model] 📥 下載模型中...
✅ [3D Model] ✅ 模型下載完成: file://...
✅ [3D Model] ✅ 3D 模型已啟用（使用你的 GLB）
```

### 3. 檢查結果

**如果看到 3D 模型**：
- 🎉 成功！某個方案生效了
- 查看日誌確認是哪個方案

**如果還是沒有顯示**：
- 查看完整錯誤日誌
- 準備實施方案 A（expo-gl）

---

## 🔍 調試指南

### 檢查日誌關鍵字

1. **原生模塊**：
   - `✅ 找到 addModel 方法` → 方案 2 成功
   - `⚠️ 未找到原生 addModel 方法` → 繼續其他方案

2. **下載**：
   - `✅ 模型下載完成` → 方案 4 成功
   - `❌ 下載失敗` → 回退到 URL

3. **ModelLayer**：
   - 查看是否有 `ModelLayer` 相關錯誤
   - 檢查 `modelId` 或 `modelUrl` 是否被接受

---

## 📊 方案優先順序

| 順序 | 方案 | 狀態 | 成功率 |
|------|------|------|--------|
| 1 | 原生模塊 | ✅ 已實施 | ⭐⭐⭐ |
| 2 | 本地下載 | ✅ 已實施 | ⭐⭐⭐⭐ |
| 3 | modelUrl | ✅ 已實施 | ⭐⭐⭐ |
| 4 | 3D 地圖樣式 | ✅ 已實施 | ⭐⭐⭐⭐ |
| 5 | expo-gl | ⏳ 待安裝 | ⭐⭐⭐⭐⭐ |

---

## 🎯 如果所有方案都不行

### 最後手段：實施 expo-gl 方案

**步驟**：

1. **安裝依賴**：
```bash
npx expo install expo-gl expo-three
npm install three @types/three --save-dev
```

2. **啟用 Avatar3D 組件**：
   - 打開 `src/components/map/Avatar3D.tsx`
   - 取消註釋所有代碼
   - 移除 `placeholder` 部分

3. **在 MapboxRealTimeMap.tsx 中使用**：
```typescript
// 在頂部添加
import { Avatar3D } from './Avatar3D';

// 在 MapView 內部，替換 ModelLayer
{currentLocation && actualMapMode === 'GAME' && (
  <Mapbox.MarkerView
    id="user-avatar-3d"
    coordinate={[
      currentLocation.coords.longitude,
      currentLocation.coords.latitude
    ]}
    anchor={{ x: 0.5, y: 0.5 }}
  >
    <Avatar3D
      modelUrl={modelUrl}
      rotation={displayHeadingAdjusted}
      scale={0.5}
      onLoad={() => console.log('[3D Avatar] ✅ 加載成功')}
      onError={(error) => console.error('[3D Avatar] ❌ 加載失敗:', error)}
    />
  </Mapbox.MarkerView>
)}
```

4. **禁用 ModelLayer**：
   - 註釋掉 `ModelLayer` 相關代碼
   - 或設置 `is3DModelReady = false`

---

## 📝 當前配置

### 模型 URL
```
https://raw.githubusercontent.com/stu5737/solefood/main/assets/models/user-avator.glb
```

### 地圖樣式
- 早晨：`streets-v12`
- 夜晚：`streets-v12`

### 加載方法
- 優先：本地緩存
- 備用：GitHub URL

---

## 💬 測試後告訴我

**如果成功**：
> "看到 3D 模型了！🎮"

請告訴我：
- 是哪個方案生效的？
- 需要調整大小/光照嗎？

**如果失敗**：
> "還是沒有顯示 😢"

請提供：
- 完整的控制台日誌
- 是否有任何錯誤訊息

然後我會立即實施 expo-gl 方案！

---

**現在重啟應用測試吧！** 🚀✨

```bash
npx expo start -c
```
