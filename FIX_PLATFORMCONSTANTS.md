# 修復 PlatformConstants 錯誤

## 🚨 問題說明

這個錯誤表示 Expo 無法找到 `PlatformConstants` 原生模組。通常發生在：
- 使用自定義開發構建但沒有正確配置
- Expo SDK 版本不匹配
- 原生代碼沒有正確編譯

## ✅ 解決方案（按優先順序）

### 方案 1: 使用 Web 平台（最簡單，推薦）

Web 平台不需要任何原生模組，可以立即測試所有邏輯：

```bash
npx expo start --web
```

然後按 `w` 鍵在瀏覽器中打開。

**優點**:
- ✅ 不需要原生模組
- ✅ 可以測試所有遊戲邏輯
- ✅ 調試最方便
- ✅ 啟動最快

### 方案 2: 使用 Expo Go（真實移動環境）

如果要在真實手機上測試：

1. **在手機上安裝 Expo Go**
   - iOS: App Store 搜索 "Expo Go"
   - Android: Google Play 搜索 "Expo Go"

2. **啟動開發服務器**
   ```bash
   npx expo start
   ```

3. **掃描 QR 碼**
   - 在 Expo Go app 中掃描終端顯示的 QR 碼
   - 或使用 "Enter URL manually" 輸入顯示的 URL

**注意**: Expo Go 已經包含了所有必要的原生模組，不需要額外配置。

### 方案 3: 檢查並修復依賴

如果必須使用 iOS 模擬器：

```bash
# 1. 確保使用正確的 Expo SDK 版本
npx expo install --fix

# 2. 安裝所有必要的依賴
npx expo install expo-constants expo-status-bar
npx expo install react-native-safe-area-context react-native-screens

# 3. 清除所有緩存
rm -rf node_modules
rm -rf .expo
rm -f package-lock.json

# 4. 重新安裝
npm install

# 5. 清除 Metro 緩存啟動
npx expo start --clear
```

### 方案 4: 創建開發構建（僅當需要自定義原生模組時）

如果以上方案都不行，可能需要創建開發構建：

```bash
# iOS
npx expo prebuild
npx expo run:ios

# Android
npx expo prebuild
npx expo run:android
```

**注意**: 這需要 Xcode (macOS) 或 Android Studio。

---

## 🎯 推薦測試流程

### 階段 1: 邏輯測試（使用 Web）

```bash
npx expo start --web
```

測試內容：
- ✅ 熵計算引擎
- ✅ Store 狀態管理
- ✅ UI 組件渲染
- ✅ 調試控制台功能
- ✅ 事件監聽

### 階段 2: 移動環境測試（使用 Expo Go）

```bash
npx expo start
# 在手機上掃描 QR 碼
```

測試內容：
- ✅ 觸摸交互
- ✅ 響應式布局
- ✅ 性能表現

### 階段 3: 原生功能測試（開發構建）

僅當需要 GPS、相機等原生功能時才需要。

---

## 🔍 診斷步驟

### 檢查當前環境

```bash
# 檢查 Expo 版本
npx expo --version

# 檢查已安裝的包
npm list expo expo-router expo-constants

# 檢查項目配置
cat app.json
```

### 檢查錯誤來源

錯誤訊息顯示：
- `Bridgeless mode: true` - 使用新的架構
- `TurboModule interop: false` - TurboModule 互操作關閉
- `NotFound: ["PlatformConstants"]` - 找不到 PlatformConstants

這通常意味著：
1. 使用自定義開發構建但原生代碼沒有正確編譯
2. 或者應該使用 Expo Go（已包含所有模組）

---

## 💡 快速決策樹

```
遇到 PlatformConstants 錯誤？
│
├─ 只是想測試邏輯？
│  └─ 使用 Web: npx expo start --web ✅
│
├─ 想在真實手機上測試？
│  └─ 使用 Expo Go: npx expo start (掃描 QR) ✅
│
└─ 需要自定義原生模組？
   └─ 創建開發構建: npx expo prebuild && npx expo run:ios
```

---

## 📝 臨時解決方案

如果以上都不行，可以創建一個不依賴原生模組的簡化版本：

1. 暫時移除 `expo-status-bar` 的使用
2. 使用純 React Native 組件
3. 在 Web 平台測試

---

**建議**: 先使用 **Web 平台** 測試所有邏輯功能，這是最快且最穩定的方式！

