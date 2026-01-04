# 升級到 Expo SDK 54 指南

## 🚀 快速升級步驟

### 步驟 1: 升級 Expo SDK

```bash
cd /Users/yumingliao/YML/solefoodmvp

# 方法 1: 使用 expo upgrade（推薦）
npx expo upgrade 54

# 方法 2: 手動安裝最新版本
npx expo install expo@latest
npx expo install --fix
```

### 步驟 2: 更新所有依賴

```bash
# 確保所有 Expo 相關包版本兼容
npx expo install --fix

# 這會自動更新：
# - expo-router
# - expo-constants
# - expo-status-bar
# - react-native-safe-area-context
# - react-native-screens
# 等所有相關依賴
```

### 步驟 3: 清除緩存並重新安裝

```bash
# 清除 node_modules
rm -rf node_modules
rm -rf .expo
rm -f package-lock.json

# 重新安裝
npm install

# 清除 Metro 緩存
npx expo start --clear
```

### 步驟 4: 驗證升級

```bash
# 檢查版本
npx expo --version
# 應該顯示 54.x.x

# 檢查 package.json 中的版本
cat package.json | grep '"expo"'
# 應該顯示 "expo": "~54.0.0"
```

---

## 📋 SDK 54 主要變更

### 依賴版本對照

| 包名 | SDK 51 | SDK 54 |
|------|--------|--------|
| expo | ~51.0.0 | ~54.0.0 |
| expo-router | ~3.5.0 | ~4.0.0 |
| expo-constants | ~16.0.2 | ~17.0.0 |
| expo-status-bar | ~1.12.1 | ~2.0.0 |
| react | 18.2.0 | 18.3.1 |
| react-native | 0.74.5 | 0.76.0 |
| react-native-safe-area-context | 4.10.5 | 4.12.0 |
| react-native-screens | 3.31.1 | 4.4.0 |

### 可能的破壞性變更

1. **expo-router**: 從 v3 升級到 v4，可能有 API 變更
2. **React Native**: 從 0.74 升級到 0.76，可能有組件 API 變更
3. **TypeScript**: 可能需要更新類型定義

---

## ✅ 升級後驗證

### 1. 檢查編譯錯誤

```bash
npx tsc --noEmit
```

### 2. 測試 Web 平台

```bash
npx expo start --web
```

### 3. 測試 Expo Go

```bash
npx expo start
# 掃描 QR 碼，應該不再有版本錯誤
```

---

## 🔧 如果遇到問題

### 問題 1: 依賴衝突

```bash
# 強制重新安裝所有依賴
rm -rf node_modules package-lock.json
npm install
npx expo install --fix
```

### 問題 2: TypeScript 錯誤

```bash
# 更新類型定義
npm install --save-dev @types/react@latest @types/react-native@latest
npx tsc --noEmit
```

### 問題 3: Metro Bundler 錯誤

```bash
# 清除所有緩存
npx expo start --clear
rm -rf .expo
```

---

## 📝 替代方案

如果升級遇到太多問題，可以：

### 方案 A: 使用 Web 平台（不需要 Expo Go）

```bash
npx expo start --web
```

### 方案 B: 使用 iOS 模擬器（不需要 Expo Go）

```bash
npx expo start --ios
```

### 方案 C: 降級 Expo Go（不推薦，iOS 不支持）

Android 可以安裝舊版 Expo Go，但 iOS 只能使用最新版本。

---

**建議**: 使用 `npx expo upgrade 54` 自動處理所有依賴升級，這是最安全的方式。

