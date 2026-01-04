# 修復依賴衝突問題

## 🚨 問題說明

升級到 Expo SDK 54 時遇到依賴衝突，主要是因為：
- React 19 是較新的版本
- 某些包可能還不完全支持 React 19
- npm 的依賴解析器過於嚴格

## ✅ 解決方案

### 方案 1: 使用 --legacy-peer-deps（推薦）

已創建 `.npmrc` 文件，現在可以正常安裝：

```bash
cd /Users/yumingliao/YML/solefoodmvp

# 清除舊依賴
rm -rf node_modules package-lock.json

# 使用 legacy-peer-deps 安裝
npm install --legacy-peer-deps

# 然後使用 expo install 確保版本兼容
npx expo install --fix --legacy-peer-deps
```

### 方案 2: 手動安裝每個包

```bash
# 按順序安裝，讓 npm 自動解決依賴
npm install expo@~54.0.0 --legacy-peer-deps
npm install expo-constants@~18.0.12 --legacy-peer-deps
npm install expo-router@~6.0.21 --legacy-peer-deps
npm install expo-status-bar@~3.0.9 --legacy-peer-deps
npm install react@19.1.0 react-dom@19.1.0 --legacy-peer-deps
npm install react-native@0.81.5 --legacy-peer-deps
npm install react-native-safe-area-context@~5.6.0 --legacy-peer-deps
npm install react-native-screens@~4.16.0 --legacy-peer-deps
npm install react-native-web@^0.21.0 --legacy-peer-deps
npm install zustand@^4.5.0 --legacy-peer-deps
```

### 方案 3: 使用 yarn（如果 npm 持續有問題）

```bash
# 安裝 yarn（如果還沒有）
npm install -g yarn

# 使用 yarn 安裝（yarn 對 peer dependencies 更寬鬆）
yarn install
```

---

## 🔍 驗證安裝

安裝完成後，驗證版本：

```bash
# 檢查 Expo 版本
npx expo --version

# 檢查已安裝的包版本
npm list expo expo-router react react-native
```

應該看到：
- expo: 54.x.x
- expo-router: 6.x.x
- react: 19.1.0
- react-native: 0.81.5

---

## 🚀 啟動應用

```bash
# 清除緩存並啟動
npx expo start --clear

# 或使用 Web 平台（最穩定）
npx expo start --web
```

---

## ⚠️ 注意事項

### React 19 的變更

React 19 是較新的版本，可能有一些破壞性變更：

1. **TypeScript 類型**: 需要更新 `@types/react` 到 `~19.1.10`
2. **組件 API**: 某些組件 API 可能有變更
3. **Hooks**: 大部分 Hooks 應該向後兼容

### 如果遇到 React 19 兼容性問題

可以暫時降級到 React 18（但這可能與 SDK 54 不完全兼容）：

```bash
npm install react@18.3.1 react-dom@18.3.1 --legacy-peer-deps
```

但這不是推薦方案，因為 SDK 54 設計為與 React 19 配合使用。

---

## 📝 已創建的文件

1. `.npmrc` - 設置 `legacy-peer-deps=true`，允許更寬鬆的依賴解析

---

**建議**: 使用 `npm install --legacy-peer-deps` 安裝，這是最簡單的解決方案。

