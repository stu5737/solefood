# ⚠️ 模型文件損壞修復指南

## ❌ 當前錯誤

**錯誤訊息**：
```
index out of bounds, make sure the model is valid
```

**問題分析**：
- 模型文件可能**在簡化過程中損壞**
- 文件大小已減少（296 KB），但模型結構可能不完整
- Mapbox 無法正確解析模型

---

## ✅ 解決方案

### 方案 1：重新簡化模型（推薦）✨

#### 使用 Blender 重新簡化（最可靠）

**步驟 1：打開原始模型**

1. 下載**原始模型**（3.8 MB 版本）
2. 用 Blender 打開：
   - File → Import → glTF 2.0 (.glb/.gltf)
   - 選擇原始 `user-avator.glb`

**步驟 2：使用 Decimate Modifier**

1. 選中模型（點擊模型）
2. 進入 Edit Mode（按 `Tab`）
3. 選擇所有頂點（按 `A`）
4. 進入 Modifier 面板（扳手圖標）
5. 添加 `Decimate` Modifier
6. 設置 `Ratio` 為 `0.15`（減少到 15%，比之前更保守）
7. 點擊 `Apply`

**步驟 3：檢查模型**

1. 進入 Edit Mode
2. 查看右下角信息：
   - **Faces**（面數）應該 < 10000
   - **Vertices**（頂點數）應該 < 10000

**步驟 4：導出**

1. File → Export → glTF 2.0 (.glb/.gltf)
2. 選擇 `glTF Binary (.glb)`
3. **重要**：勾選以下選項：
   - ✅ Include selected objects
   - ✅ Apply Modifiers
   - ✅ UVs
   - ✅ Normals
   - ✅ Materials
4. 導出為新文件

**步驟 5：驗證導出的模型**

1. 用 glTF Viewer 測試：https://gltf-viewer.donmccurdy.com/
2. 上傳導出的 GLB
3. 確認模型能正常顯示
4. 檢查文件大小（應該 < 1 MB）

---

### 方案 2：使用不同的簡化工具

#### 使用 MeshLab（專業工具）

1. **下載 MeshLab**：https://www.meshlab.net/
2. **打開模型**：File → Import Mesh
3. **簡化**：Filters → Remeshing, Simplification and Reconstruction → Quadric Edge Collapse Decimation
4. **設置**：
   - Target number of faces: 5000
   - Quality threshold: 0.3
5. **導出**：File → Export Mesh as → glTF 2.0

---

### 方案 3：使用 Remesh 而不是 Decimate

如果 Decimate 導致損壞，嘗試 Remesh：

1. 在 Blender 中選中模型
2. 添加 `Remesh` Modifier（不是 Decimate）
3. 設置 `Octree Depth` 為 `6` 或 `7`
4. 點擊 `Apply`
5. 導出

---

## 🔍 驗證模型是否有效

### 在導出前檢查

1. **在 Blender 中預覽**：
   - 確認模型看起來正常
   - 沒有缺失的部分
   - 沒有奇怪的變形

2. **用 glTF Viewer 測試**：
   - 網址：https://gltf-viewer.donmccurdy.com/
   - 上傳導出的 GLB
   - 確認能正常顯示

3. **檢查文件大小**：
   - 應該 < 1 MB
   - 但不要太小（< 100 KB 可能太簡化了）

---

## 📊 目標規格

| 項目 | 目標 | 檢查 |
|------|------|------|
| **文件大小** | 200 KB - 800 KB | ✅ |
| **索引數** | < 20000 | ⚠️ 需要檢查 |
| **面數** | < 10000 | ⚠️ 需要檢查 |
| **模型完整性** | 能正常顯示 | ✅ 必須 |

---

## 🚀 重新上傳步驟

### 1. 重新簡化模型

使用 Blender 或 MeshLab 重新簡化，確保模型完整。

### 2. 驗證模型

用 glTF Viewer 測試，確認模型正常。

### 3. 上傳到 GitHub

```bash
# 替換文件
cp user-avator-fixed.glb assets/models/user-avator.glb

# 提交
git add assets/models/user-avator.glb
git commit -m "Fix 3D model: re-export with proper settings"
git push
```

### 4. 清除緩存並重啟

```bash
rm -rf .expo
rm -rf node_modules/.cache
npx expo run:ios
```

---

## 💡 簡化技巧

### 避免損壞的建議

1. **不要過度簡化**：
   - `Ratio` 不要 < 0.1（至少保留 10%）
   - 建議使用 0.15-0.2（保留 15-20%）

2. **檢查模型結構**：
   - 確保所有部分都選中
   - 確保沒有分離的組件

3. **使用正確的導出設置**：
   - 勾選所有必要的選項
   - 使用 glTF Binary 格式

4. **測試導出的模型**：
   - 在導出後立即用 glTF Viewer 測試
   - 確認沒有錯誤

---

## 🎯 如果還是不行

### 備用方案：使用 expo-gl + Three.js

如果模型一直有問題，可以考慮：
- 使用 expo-gl + Three.js（不受 Mapbox 限制）
- 或暫時使用 2D 箭頭游標

---

**現在用 Blender 重新簡化模型，確保導出設置正確！** 🔧✨
