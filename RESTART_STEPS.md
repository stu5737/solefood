# 🔄 Metro Bundler 重啟步驟

## ⚠️ 重要問題

你的 GLB 文件太大了：**15.8 MB**

推薦大小：**< 1 MB**（最多 5 MB）

---

## 📋 完整重啟步驟

### 步驟 1：停止當前應用

在終端按 **`Ctrl + C`** 停止 Expo

### 步驟 2：清除所有緩存

```bash
cd /Users/yumingliao/YML/solefoodmvp

# 清除 Metro bundler 緩存
rm -rf .expo

# 清除 node_modules 緩存（如果需要）
rm -rf node_modules/.cache

# 清除 watchman 緩存
watchman watch-del-all
```

### 步驟 3：重新啟動（清除緩存）

```bash
npx expo start -c
```

**`-c` 參數會清除 Metro bundler 緩存**

### 步驟 4：重新加載應用

- **iOS**: 搖晃設備 → 點擊 "Reload"
- **Android**: 按兩次 R 鍵
- **模擬器**: Cmd+R (iOS) / R+R (Android)

---

## 🔧 壓縮 GLB 文件（推薦）

你的文件太大了（15.8 MB），建議壓縮到 1 MB 以下：

### 方法 A：使用 gltf-pipeline（推薦）

```bash
# 安裝工具
npm install -g gltf-pipeline

# 壓縮模型（可減少 70-90% 大小）
cd /Users/yumingliao/YML/solefoodmvp/assets/models
gltf-pipeline -i user-avator.glb -o user-avator-compressed.glb -d

# 使用 Draco 壓縮（更小）
gltf-pipeline -i user-avator.glb -o user-avator-compressed.glb --draco.compressionLevel=10
```

### 方法 B：使用在線工具

1. 打開 https://gltf.report/
2. 上傳你的 `user-avator.glb`
3. 點擊 "Compress"
4. 下載壓縮後的文件

### 方法 C：使用 Blender（如果你有源文件）

1. 打開 Blender
2. 減少多邊形數量：
   - 選擇模型 → Modifiers → Decimate
   - Ratio: 0.1-0.3（減少到 10-30%）
3. 簡化材質：移除不必要的貼圖
4. 重新導出為 GLB

---

## 📊 壓縮後效果預期

| 原始大小 | 壓縮後 | 效果 |
|---------|--------|------|
| 15.8 MB | ~1-2 MB | 減少 85-90% |

---

## ✅ 驗證步驟

壓縮完成後：

1. **替換文件**
   ```bash
   mv user-avator-compressed.glb user-avator.glb
   ```

2. **重啟 Metro**
   ```bash
   npx expo start -c
   ```

3. **查看控制台**
   ```
   [3D Model] 📦 開始加載模型...
   [3D Model] ✅ 3D 模型註冊成功！
   ```

---

## 🐛 如果還有問題

### 檢查文件大小

```bash
ls -lh assets/models/user-avator.glb
```

應該顯示 < 2 MB

### 檢查文件格式

```bash
file assets/models/user-avator.glb
```

應該顯示包含 "glTF"

### 查看完整錯誤訊息

在終端查找：

```
[3D Model] ❌ 模型註冊失敗: ...
```

---

## 🎯 快速命令（複製貼上）

```bash
# 停止當前應用（Ctrl+C）

# 清除緩存並重啟
cd /Users/yumingliao/YML/solefoodmvp && rm -rf .expo && npx expo start -c
```

---

## ⚡ 臨時解決方案（如果壓縮不方便）

如果現在不方便壓縮，可以暫時禁用 3D 模型：

```typescript
// 在 MapboxRealTimeMap.tsx 中找到並註解掉
/*
const asset = Asset.fromModule(require('../../assets/models/user-avator.glb'));
await asset.downloadAsync();
...
*/
```

然後使用原來的箭頭游標，等壓縮後再啟用。
