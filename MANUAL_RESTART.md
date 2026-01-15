# 🔄 手動重啟步驟（解決 GLB 加載問題）

## ✅ 緩存已清除完畢

現在需要**手動重啟** Metro bundler。

---

## 📋 完整步驟（按順序執行）

### 步驟 1：完全停止當前應用

在運行 Expo 的終端：

1. 按 **`Ctrl + C`**（停止 Expo）
2. 再按一次 **`Ctrl + C`**（確保完全停止）
3. 等待終端顯示命令提示符

---

### 步驟 2：清除所有緩存（已完成 ✅）

```bash
# 這一步已經完成，不需要再執行
rm -rf .expo node_modules/.cache
```

---

### 步驟 3：重新啟動（重要：必須加 -c）

在**專案目錄**執行：

```bash
cd /Users/yumingliao/YML/solefoodmvp
npx expo start -c
```

**重要參數：`-c` = 清除 Metro bundler 緩存**

---

### 步驟 4：等待 Metro 完全啟動

你應該看到：

```
Starting Metro Bundler
Bundling...
✓ Bundled successfully
```

---

### 步驟 5：重新加載應用

在設備/模擬器上：

- **iOS**: 搖晃設備 → 點擊 **"Reload"**
- **Android**: 按兩次 **R** 鍵
- **模擬器**: `Cmd + R` (iOS) / `R + R` (Android)

---

## 🎯 預期結果

重啟後，控制台應該顯示：

```
✅ [3D Model] 📦 開始加載模型...
✅ [3D Model] 📍 模型 URI: file://...
✅ [3D Model] ✅ 3D 模型註冊成功！
```

**不應該再看到 "Cannot find module" 錯誤**

---

## 🐛 如果還有錯誤

### 確認 Metro 使用了新配置

在 Metro 啟動日誌中查找：

```
Asset extensions: png, jpg, jpeg, ..., glb, gltf, bin
```

**如果沒有看到 `glb`**，說明配置沒有生效。

### 解決方案：完全重新安裝

```bash
# 1. 停止所有 Expo 進程（Ctrl+C）

# 2. 刪除 node_modules
cd /Users/yumingliao/YML/solefoodmvp
rm -rf node_modules

# 3. 重新安裝
npm install

# 4. 清除緩存並啟動
npx expo start -c
```

---

## 🔧 備選方案：使用靜態資源

如果 GLB 還是無法加載，可以改用靜態 URL：

### 修改代碼

打開 `src/components/map/MapboxRealTimeMap.tsx`，找到第 198 行附近：

```typescript
// 當前方式（可能有問題）
const asset = Asset.fromModule(require('../../assets/models/user-avator.glb'));

// 改成靜態路徑（備選）
const glbPath = '/Users/yumingliao/YML/solefoodmvp/assets/models/user-avator.glb';
```

---

## ⚡ 快速命令（複製貼上）

```bash
# 在運行 Expo 的終端按 Ctrl+C 停止

# 然後執行：
cd /Users/yumingliao/YML/solefoodmvp && npx expo start -c
```

---

## 📱 測試 3D 模型

重啟成功後：

1. 開始採集（點擊主按鈕）
2. 查看地圖上的游標
3. 移動時應該看到 3D 模型旋轉

---

## 💡 提示

- Metro bundler 必須完全停止後再重啟
- `-c` 參數不可省略
- 如果還有問題，可能需要重新安裝 node_modules
