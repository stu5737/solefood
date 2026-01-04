# 安裝 Expo SDK 54 - 完整指南

## ✅ 已完成的配置

1. ✅ `package.json` - 已更新到 SDK 54 兼容版本
2. ✅ `.npmrc` - 已創建，設置 `legacy-peer-deps=true`

## 🚀 安裝步驟

### 步驟 1: 清除舊依賴

```bash
cd /Users/yumingliao/YML/solefoodmvp

# 清除所有舊的依賴和緩存
rm -rf node_modules
rm -rf .expo
rm -f package-lock.json
```

### 步驟 2: 安裝依賴（使用 legacy-peer-deps）

```bash
# 使用 --legacy-peer-deps 安裝所有依賴
npm install --legacy-peer-deps
```

`.npmrc` 文件已經設置了 `legacy-peer-deps=true`，所以 `npm install` 會自動使用這個選項。

### 步驟 3: 驗證安裝

```bash
# 檢查版本
npx expo --version
# 應該顯示 54.x.x

# 檢查關鍵包版本
npm list expo expo-router react react-native
```

### 步驟 4: 清除緩存並啟動

```bash
# 清除 Metro bundler 緩存
npx expo start --clear

# 或直接使用 Web 平台（最穩定）
npx expo start --web
```

---

## 📋 預期的版本

安裝完成後，應該看到：

- ✅ expo: ~54.0.0
- ✅ expo-router: ~6.0.21
- ✅ expo-constants: ~18.0.12
- ✅ expo-status-bar: ~3.0.9
- ✅ react: 19.1.0
- ✅ react-dom: 19.1.0
- ✅ react-native: 0.81.5
- ✅ @types/react: ~19.1.10
- ✅ typescript: ~5.9.2

---

## 🔧 如果安裝仍然失敗

### 方案 A: 使用 yarn（推薦替代方案）

```bash
# 安裝 yarn
npm install -g yarn

# 使用 yarn 安裝（yarn 對 peer dependencies 更寬鬆）
yarn install
```

### 方案 B: 強制安裝

```bash
npm install --legacy-peer-deps --force
```

### 方案 C: 逐個安裝關鍵包

```bash
npm install expo@~54.0.0 --legacy-peer-deps
npm install react@19.1.0 react-dom@19.1.0 --legacy-peer-deps
npm install react-native@0.81.5 --legacy-peer-deps
npm install expo-router@~6.0.21 --legacy-peer-deps
npm install --legacy-peer-deps
```

---

## ⚠️ React 19 注意事項

### 可能的破壞性變更

React 19 是較新版本，需要注意：

1. **TypeScript 類型**: 已更新 `@types/react` 到 `~19.1.10`
2. **組件 API**: 大部分 API 應該向後兼容
3. **Hooks**: 所有 Hooks 應該正常工作

### 如果遇到 React 19 兼容性問題

我們的代碼主要使用：
- ✅ Hooks (useState, useEffect) - 完全兼容
- ✅ Zustand - 完全兼容
- ✅ React Native 組件 - 完全兼容

應該不會有兼容性問題。

---

## 🎯 測試流程

### 1. 安裝完成後

```bash
npx expo start --web
```

### 2. 在瀏覽器中測試

- 打開 http://localhost:8081
- 測試調試控制台按鈕
- 驗證所有功能正常

### 3. 在 Expo Go 中測試

```bash
npx expo start
# 掃描 QR 碼，應該不再有版本錯誤
```

---

## 📝 故障排除

### 問題: npm install 仍然失敗

**解決**:
```bash
# 檢查 .npmrc 文件是否存在
cat .npmrc
# 應該顯示: legacy-peer-deps=true

# 如果沒有，手動創建
echo "legacy-peer-deps=true" > .npmrc
```

### 問題: TypeScript 錯誤

**解決**:
```bash
# 更新 TypeScript 類型
npm install --save-dev @types/react@~19.1.10 typescript@~5.9.2 --legacy-peer-deps
```

### 問題: Metro Bundler 錯誤

**解決**:
```bash
# 完全清除緩存
rm -rf .expo
rm -rf node_modules/.cache
npx expo start --clear
```

---

**現在執行**: `npm install --legacy-peer-deps` 應該可以成功安裝所有依賴！

