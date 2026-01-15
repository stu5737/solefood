# 🔧 3D 模型優化指南

## ❌ 當前問題

**錯誤訊息**：
```
Could not load model: No support for indices over: 65535(actual 248575)
```

**問題分析**：
- Mapbox 限制：最多 65535 個索引
- 你的模型：248575 個索引（超出 3.8 倍）
- 原因：模型太複雜（面數太多）

---

## ✅ 解決方案

### 方案 1：簡化模型（推薦）✨

使用 Blender 或其他 3D 軟體簡化模型：

#### 步驟 1：安裝 Blender

下載：https://www.blender.org/download/

#### 步驟 2：打開模型

1. 打開 Blender
2. File → Import → glTF 2.0 (.glb/.gltf)
3. 選擇你的 `user-avator.glb`

#### 步驟 3：簡化模型

**方法 A：使用 Decimate Modifier（推薦）**

1. 選中模型（點擊模型）
2. 進入 Edit Mode（按 `Tab`）
3. 選擇所有頂點（按 `A`）
4. 進入 Modifier 面板（扳手圖標）
5. 添加 `Decimate` Modifier
6. 設置 `Ratio` 為 `0.1`（減少到 10%）
7. 點擊 `Apply`

**方法 B：使用 Remesh Modifier**

1. 選中模型
2. 添加 `Remesh` Modifier
3. 設置 `Octree Depth` 為 `6` 或 `7`（越小越簡單）
4. 點擊 `Apply`

#### 步驟 4：檢查面數

1. 進入 Edit Mode
2. 查看右下角信息，確認面數 < 65535
3. 目標：面數 < 20000（安全範圍）

#### 步驟 5：導出

1. File → Export → glTF 2.0 (.glb/.gltf)
2. 選擇 `glTF Binary (.glb)`
3. 導出為新文件（例如 `user-avator-simplified.glb`）

---

### 方案 2：使用線上工具（快速）⚡

#### 工具 1：glTF Transform

網址：https://gltf-transform.donmccurdy.com/

**步驟**：
1. 上傳你的 `user-avator.glb`
2. 添加 `simplify` 操作
3. 設置 `ratio: 0.1`（減少到 10%）
4. 點擊 `Process`
5. 下載簡化後的模型

#### 工具 2：Three.js Editor

網址：https://threejs.org/editor/

**步驟**：
1. 上傳模型
2. 選中模型
3. 使用 `Simplify` 工具
4. 導出為 GLB

---

### 方案 3：使用低多邊形版本（最快）🚀

如果你有原始模型文件（.blend, .fbx, .obj），可以：

1. 在建模軟體中創建低多邊形版本
2. 目標：< 10000 個面
3. 導出為 GLB

---

## 📊 目標規格

| 項目 | 限制 | 建議 | 你的模型 |
|------|------|------|----------|
| **索引數** | ≤ 65535 | < 20000 | 248575 ❌ |
| **面數** | - | < 10000 | ~83000 ❌ |
| **文件大小** | - | < 1 MB | 3.8 MB ⚠️ |

---

## 🎯 推薦流程

### 快速測試（5 分鐘）

1. 使用 **glTF Transform** 線上工具
2. 設置 `ratio: 0.1`
3. 下傳簡化後的模型
4. 替換 GitHub 上的文件
5. 重啟應用測試

### 專業優化（30 分鐘）

1. 使用 **Blender** 打開模型
2. 使用 `Decimate` Modifier
3. 調整到合適的面數
4. 檢查視覺效果
5. 導出並測試

---

## 🔍 檢查模型複雜度

### 在 Blender 中檢查

1. 選中模型
2. 進入 Edit Mode（`Tab`）
3. 查看右下角：
   - **Vertices**（頂點數）
   - **Edges**（邊數）
   - **Faces**（面數）

### 目標值

- **頂點數**：< 10000
- **面數**：< 10000
- **索引數**：< 20000（安全範圍）

---

## 💡 優化技巧

### 1. 移除不必要的細節

- 移除內部不可見的面
- 簡化裝飾性細節
- 減少紋理解析度

### 2. 使用 LOD（細節層級）

- 創建多個版本（高/中/低）
- 根據距離切換
- 目前先用低多邊形版本

### 3. 優化紋理

- 壓縮紋理圖片
- 減少紋理大小
- 使用 JPEG 而不是 PNG

---

## 🚀 實施步驟

### 步驟 1：簡化模型

選擇一個方法：
- **快速**：使用 glTF Transform 線上工具
- **專業**：使用 Blender

### 步驟 2：上傳到 GitHub

```bash
# 替換文件
cp user-avator-simplified.glb assets/models/user-avator.glb

# 提交
git add assets/models/user-avator.glb
git commit -m "Simplify 3D model for Mapbox compatibility"
git push
```

### 步驟 3：測試

```bash
npx expo run:ios
```

應該看到：
```
✅ [3D Model] ✅ 模型加載成功
```

---

## ⚠️ 如果簡化後還是太大

### 選項 A：進一步簡化

- 將 `ratio` 改為 `0.05`（減少到 5%）
- 或使用 `Remesh` 創建更簡單的版本

### 選項 B：使用替代方案

- 使用 expo-gl + Three.js（不受索引限制）
- 或使用 2D 圖標（箭頭/emoji）

---

## 📚 參考資源

- **Blender 教程**：https://www.blender.org/support/tutorials/
- **glTF 規範**：https://www.khronos.org/gltf/
- **Mapbox 文檔**：https://docs.mapbox.com/

---

**現在開始簡化模型吧！** 🎨✨
