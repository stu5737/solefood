# 修復缺少資源文件和依賴

## 🚨 問題說明

1. **缺少資源文件**: `./assets/icon.png` 不存在
2. **缺少依賴**: `expo-linking` 未安裝

## ✅ 解決方案

### 步驟 1: 安裝缺失的依賴

```bash
cd /Users/yumingliao/YML/solefoodmvp

# 安裝 expo-linking
npm install expo-linking@~7.0.0 --legacy-peer-deps

# 或使用 expo install 確保版本兼容
npx expo install expo-linking --legacy-peer-deps
```

### 步驟 2: 創建資源文件

#### 選項 A: 使用默認資源（快速測試）

暫時移除資源文件引用，使用默認配置：

```json
// 在 app.json 中暫時註釋掉或移除 icon 和 splash
```

#### 選項 B: 創建簡單的資源文件（推薦）

創建基本的資源文件：

```bash
# 創建 assets 目錄（已完成）
mkdir -p assets

# 使用 ImageMagick 或線上工具創建簡單的圖標
# 或者暫時使用占位符
```

#### 選項 C: 使用 Expo 默認資源

更新 `app.json` 使用 Expo 的默認資源：

```json
{
  "expo": {
    "icon": "./assets/icon.png",  // 暫時註釋掉
    "splash": {
      // 暫時註釋掉或使用默認
    }
  }
}
```

### 步驟 3: 臨時解決方案（最快）

暫時簡化 `app.json`，移除資源文件引用：

```json
{
  "expo": {
    "name": "Solefood MVP",
    "slug": "solefoodmvp",
    "version": "8.7.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "scheme": "solefood",
    "plugins": ["expo-router"]
  }
}
```

這樣可以立即啟動，之後再添加圖標。

---

## 🎯 快速修復命令

```bash
# 1. 安裝 expo-linking
npm install expo-linking@~7.0.0 --legacy-peer-deps

# 2. 清除緩存
rm -rf .expo node_modules/.cache

# 3. 重新啟動
npx expo start --clear
```

---

## 📝 創建資源文件（可選）

如果需要圖標，可以使用：

1. **線上工具**: 
   - https://www.favicon-generator.org/
   - https://realfavicongenerator.net/

2. **創建簡單圖標**:
   - 使用任何圖像編輯工具創建 1024x1024 的 PNG
   - 保存為 `assets/icon.png`

3. **使用 Expo 工具**:
   ```bash
   npx expo install @expo/image-utils
   ```

---

**建議**: 先安裝 `expo-linking`，然後暫時簡化 `app.json` 移除資源文件引用，這樣可以立即啟動測試。

