# Solefood MVP v8.7 - 測試指南

## 📋 前置要求

### 環境要求
- **Node.js**: >= 18.0.0
- **npm** 或 **yarn**
- **Expo CLI**: 最新版本
- **iOS Simulator** (macOS) 或 **Android Emulator** (可選)

### 檢查環境
```bash
node --version  # 應該 >= 18.0.0
npm --version
npx expo --version
```

---

## 🚀 快速開始

### 步驟 1: 初始化 Expo 項目（如果尚未初始化）

```bash
cd /Users/yumingliao/YML/solefoodmvp

# 如果還沒有 package.json，初始化項目
npx create-expo-app@latest . --template blank-typescript
```

### 步驟 2: 安裝依賴

```bash
# 安裝核心依賴
npm install zustand

# 安裝 Expo 相關依賴（如果需要）
npm install expo-location expo-status-bar

# 安裝開發依賴
npm install --save-dev @types/react @types/react-native typescript
```

### 步驟 3: 創建必要的配置文件

#### `package.json` 範例
```json
{
  "name": "solefoodmvp",
  "version": "8.7.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "react": "18.2.0",
    "react-native": "0.74.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.0",
    "typescript": "^5.1.0"
  }
}
```

#### `app.json` 範例
```json
{
  "expo": {
    "name": "Solefood MVP",
    "slug": "solefoodmvp",
    "version": "8.7.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "scheme": "solefood",
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

#### `tsconfig.json` 範例
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

### 步驟 4: 創建 Expo Router 配置

#### `app/_layout.tsx`
```typescript
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
```

#### `app/(tabs)/_layout.tsx`
```typescript
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: '遊戲',
          tabBarIcon: () => null,
        }}
      />
    </Tabs>
  );
}
```

---

## 🧪 測試步驟

### 1. 啟動開發服務器

```bash
npm start
# 或
npx expo start
```

### 2. 選擇運行平台

- **iOS**: 按 `i` 鍵或掃描 QR 碼（需要 Expo Go app）
- **Android**: 按 `a` 鍵或掃描 QR 碼（需要 Expo Go app）
- **Web**: 按 `w` 鍵（在瀏覽器中打開）

### 3. 測試調試控制台

#### 測試 1: 步行 100m
1. 點擊「步行 100m」按鈕
2. **預期結果**:
   - 體力減少約 1 點（0.1km × 10pts/km = 1pt）
   - 耐久度略微減少
   - 衛生值略微減少
   - 總距離增加 0.1km
   - 估算價值增加約 $0.002 USD

#### 測試 2: 快跑 500m
1. 點擊「快跑 500m」按鈕
2. **預期結果**:
   - 體力減少約 5 點（0.5km × 10pts/km = 5pts）
   - 耐久度減少更多（因為距離更長）
   - 衛生值減少更多（因為速度更快）
   - 總距離增加 0.5km
   - 估算價值增加約 $0.01 USD

#### 測試 3: 觸發 Ghost Mode
1. 連續點擊「快跑 500m」按鈕約 20 次（消耗 100 點體力）
2. **預期結果**:
   - 體力歸零
   - 彈出 Alert："您已進入靈魂模式！"
   - 顯示 Ghost Overlay 覆蓋層
   - 狀態信息顯示 "Ghost Mode: 啟用"

#### 測試 4: 觸發零容忍崩塌
1. 重置玩家狀態
2. 連續點擊「快跑 500m」按鈕約 200 次（消耗耐久度）
3. **預期結果**:
   - 耐久度歸零
   - 彈出 Alert："背包崩塌！"
   - DurabilityBar 顯示 "COLLAPSED"
   - 狀態信息顯示 "Immobilized: 已定身"
   - 容量變為 0

#### 測試 5: 重置功能
1. 點擊「重置玩家」按鈕
2. **預期結果**:
   - 體力恢復到 100
   - 耐久度恢復到 100
   - 衛生值恢復到 100
   - Ghost Mode 和 Immobilized 狀態解除
   - 彈出 Alert："重置完成"

---

## ✅ 驗證檢查清單

### 功能驗證
- [ ] StaminaBar 正確顯示體力值並有動畫效果
- [ ] DurabilityBar 正確顯示耐久度，0% 時顯示 "COLLAPSED"
- [ ] StatsPanel 正確顯示距離、速度、負重、估值
- [ ] GhostOverlay 在體力為 0 時正確顯示
- [ ] 調試按鈕正確觸發熵計算
- [ ] 事件監聽正確觸發 Alert
- [ ] 重置功能正確恢復狀態

### 邏輯驗證
- [ ] 體力消耗計算正確（1km = 10pts）
- [ ] 耐久度衰減計算正確
- [ ] 衛生值衰減計算正確
- [ ] 估值計算正確（50km = $1.00）
- [ ] 零容忍機制正確觸發
- [ ] Store 狀態同步正確

### UI 驗證
- [ ] 所有組件正確渲染
- [ ] 顏色變化正確（綠色/橙色/紅色）
- [ ] 動畫效果流暢
- [ ] 響應式布局正確
- [ ] 文字顯示正確

---

## 🐛 常見問題

### 問題 1: 模組找不到
**錯誤**: `Cannot find module '../../src/stores/playerStore'`

**解決方案**:
```bash
# 檢查文件路徑是否正確
ls -la src/stores/playerStore.ts

# 確保 TypeScript 配置正確
npx tsc --noEmit
```

### 問題 2: Zustand 未安裝
**錯誤**: `Cannot find module 'zustand'`

**解決方案**:
```bash
npm install zustand
```

### 問題 3: Expo Router 錯誤
**錯誤**: `Cannot find module 'expo-router'`

**解決方案**:
```bash
npm install expo-router
npx expo install expo-router
```

### 問題 4: 類型錯誤
**錯誤**: TypeScript 類型檢查失敗

**解決方案**:
```bash
# 檢查類型定義
npx tsc --noEmit

# 確保所有類型文件存在
ls -la src/types/
```

---

## 📊 測試數據記錄

### 測試記錄表

| 測試項目 | 預期結果 | 實際結果 | 狀態 |
|---------|---------|---------|------|
| 步行 100m | 體力 -1pt | | ⬜ |
| 快跑 500m | 體力 -5pt | | ⬜ |
| Ghost Mode | 覆蓋層顯示 | | ⬜ |
| 零容忍崩塌 | COLLAPSED 顯示 | | ⬜ |
| 重置功能 | 狀態恢復 | | ⬜ |

---

## 🎯 下一步

測試通過後，可以進行：

1. **GPS 整合**: 實現真實的 GPS 追蹤
2. **物品系統**: 實現物品拾取和庫存管理
3. **救援系統**: 實現廣告救援邏輯
4. **持久化**: 實現狀態持久化（AsyncStorage）
5. **後端整合**: 實現 API 通訊

---

**版本**: v8.7  
**最後更新**: 2024

