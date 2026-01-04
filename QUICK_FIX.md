# 快速修復指南

## 🚨 PlatformConstants 錯誤 - 立即修復

### 步驟 1: 安裝缺失的依賴

```bash
cd /Users/yumingliao/YML/solefoodmvp

# 安裝必要的 Expo 模組
npx expo install expo-constants expo-status-bar
npx expo install react-native-safe-area-context react-native-screens

# 確保所有依賴版本兼容
npx expo install --fix
```

### 步驟 2: 清除緩存

```bash
# 清除 Metro bundler 緩存
npx expo start --clear

# 如果還是不行，清除所有緩存
rm -rf node_modules
rm -rf .expo
npm install
```

### 步驟 3: 重新啟動

```bash
# 使用 Web 平台測試（最穩定）
npx expo start --web

# 或使用 Expo Go（在手機上）
npx expo start
```

---

## ✅ 推薦測試順序

### 1. Web 平台（最簡單，無原生模組問題）

```bash
npx expo start --web
```

按 `w` 鍵在瀏覽器中打開，可以測試所有邏輯功能。

### 2. Expo Go（真實移動環境）

1. 在手機上安裝 Expo Go app
2. 運行 `npx expo start`
3. 掃描 QR 碼

### 3. 開發構建（僅當需要自定義原生模組時）

---

## 🔍 如果問題仍然存在

### 檢查項目結構

確保以下文件存在：
- ✅ `package.json`
- ✅ `app.json`
- ✅ `app/_layout.tsx`
- ✅ `app/(tabs)/_layout.tsx`
- ✅ `app/(tabs)/index.tsx`

### 檢查依賴版本

```bash
# 查看已安裝的版本
npm list expo expo-router expo-constants

# 應該看到類似：
# expo@51.0.0
# expo-router@3.5.0
# expo-constants@16.0.0
```

### 完全重置（最後手段）

```bash
# 備份你的代碼！
# 然後執行：

rm -rf node_modules
rm -rf .expo
rm package-lock.json
npm install
npx expo install --fix
npx expo start --clear
```

---

**提示**: 如果使用 Web 平台測試，可以跳過所有原生模組問題，專注測試遊戲邏輯！

