# 故障排除指南

## PlatformConstants TurboModule 錯誤

### 錯誤訊息
```
TurboModuleRegistry.getEnforcing(...): 'PlatformConstants' could not be found
```

### 解決方案

#### 方案 1: 安裝必要的 Expo 依賴（推薦）

```bash
# 安裝核心 Expo 模組
npx expo install expo-constants expo-status-bar

# 安裝 Expo Router 依賴
npx expo install react-native-safe-area-context react-native-screens

# 清除緩存並重新安裝
rm -rf node_modules
npm install

# 清除 Expo 緩存
npx expo start --clear
```

#### 方案 2: 使用 Expo Go（最簡單）

如果使用自定義開發構建遇到問題，可以使用 Expo Go：

1. 在手機上安裝 **Expo Go** app
2. 運行 `npx expo start`
3. 掃描 QR 碼在 Expo Go 中打開

#### 方案 3: 清除所有緩存

```bash
# 清除 Metro bundler 緩存
npx expo start --clear

# 清除 watchman（如果安裝了）
watchman watch-del-all

# 清除 npm 緩存
npm cache clean --force

# 刪除 node_modules 並重新安裝
rm -rf node_modules
npm install
```

#### 方案 4: 檢查 Expo SDK 版本兼容性

確保所有 Expo 包使用兼容的版本：

```bash
# 檢查已安裝的 Expo 包版本
npm list | grep expo

# 使用 expo install 確保版本兼容
npx expo install --fix
```

#### 方案 5: 使用 Web 平台測試（臨時方案）

如果 iOS/Android 有問題，可以先在 Web 上測試：

```bash
npx expo start --web
```

Web 平台不需要原生模組，可以測試大部分邏輯。

---

## 其他常見問題

### 問題 2: 模組找不到

**錯誤**: `Cannot find module 'expo-router'`

**解決**:
```bash
npx expo install expo-router
```

### 問題 3: TypeScript 錯誤

**錯誤**: 類型定義找不到

**解決**:
```bash
npm install --save-dev @types/react @types/react-native
npx tsc --noEmit
```

### 問題 4: Metro Bundler 錯誤

**錯誤**: Metro bundler 無法啟動

**解決**:
```bash
# 重置 Metro bundler
npx expo start --clear

# 或手動清除
rm -rf .expo
rm -rf node_modules/.cache
```

---

## 推薦的測試流程

### 1. 先測試 Web 平台（最穩定）

```bash
npx expo start --web
```

優點：
- 不需要原生模組
- 啟動最快
- 可以測試所有邏輯

### 2. 然後測試 Expo Go

```bash
npx expo start
# 掃描 QR 碼在 Expo Go 中打開
```

優點：
- 真實的移動環境
- 不需要構建原生代碼

### 3. 最後使用開發構建

如果需要自定義原生模組，才需要開發構建。

---

**版本**: v8.7  
**最後更新**: 2024

