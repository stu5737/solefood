# 🔧 GPS 位置追蹤修復指南

## ❌ 當前錯誤

**錯誤訊息**：
```
[MapboxRealTimeMap] 位置追蹤失敗: Error: Calling the 'getCurrentPositionAsync' function has failed
→ Caused by: Cannot obtain current location
→ Caused by: The operation couldn't be completed. (kCLErrorDomain error 0.)
```

**問題分析**：
- 這是 iOS 模擬器的 GPS 權限問題
- **不影響 3D 模型本身**，只是需要 GPS 位置才能顯示模型
- `kCLErrorDomain error 0` 表示位置服務無法獲取位置

---

## ✅ 解決方案

### 方案 1：在 iOS 模擬器中設置自定義位置（推薦）✨

#### 步驟 1：打開模擬器

確保 iOS 模擬器正在運行。

#### 步驟 2：設置自定義位置

1. 在模擬器菜單欄：**Features → Location → Custom Location...**
2. 輸入經緯度（例如）：
   - **Latitude**: `37.7749`（舊金山）
   - **Longitude**: `-122.4194`
3. 點擊 **OK**

#### 步驟 3：選擇位置服務

在模擬器菜單欄：**Features → Location → Apple**

這樣模擬器就會使用你設置的自定義位置。

---

### 方案 2：在 Info.plist 中檢查權限

確保 `Info.plist` 中有位置權限說明：

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>我們需要您的位置來顯示地圖和遊戲功能</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>我們需要您的位置來追蹤您的運動軌跡</string>
```

---

### 方案 3：在真機上測試

如果模擬器有問題，可以在真機上測試：

1. 連接 iPhone/iPad
2. 運行 `npx expo run:ios`
3. 允許位置權限

---

## 🎯 為什麼需要 GPS 位置？

3D 模型需要 `currentLocation` 才能顯示：

```typescript
const userModelGeoJson = useMemo(() => {
  if (!currentLocation) {
    return null; // ❌ 沒有位置，模型不顯示
  }
  // ...
}, [currentLocation]);
```

**所以**：
- ✅ 模型本身沒問題（已簡化並上傳）
- ✅ 模型加載沒問題（沒有索引錯誤）
- ⚠️ 只是需要 GPS 位置才能顯示

---

## 📊 診斷清單

### 檢查 1：是否有 currentLocation？

查看控制台，應該看到：
```
✅ [3D Model] ✅ userModelGeoJson 生成: { coordinates: [...], ... }
```

如果看到：
```
⚠️ [3D Model] ⚠️ userModelGeoJson: 無 currentLocation
```
→ 需要設置 GPS 位置

---

### 檢查 2：是否在遊戲模式？

確保 `actualMapMode === 'GAME'`：
- 開始採集（點擊主按鈕）
- 確認地圖模式是 GAME

---

### 檢查 3：模型是否加載成功？

查看控制台，不應該看到：
```
❌ Could not load model: No support for indices over: 65535
```

如果沒有這個錯誤，模型應該已經加載成功。

---

## 🚀 快速測試步驟

### 1. 設置模擬器位置

1. 模擬器菜單：**Features → Location → Custom Location...**
2. 輸入：`37.7749, -122.4194`（舊金山）
3. 選擇：**Features → Location → Apple**

### 2. 重啟應用

```bash
npx expo run:ios
```

### 3. 開始採集

點擊主按鈕開始採集，這樣會：
- 獲取 GPS 位置
- 生成 `userModelGeoJson`
- 顯示 3D 模型

---

## 💡 預期結果

設置 GPS 位置後，應該看到：

```
✅ [LocationService] Location tracking started
✅ [3D Model] ✅ userModelGeoJson 生成: { coordinates: [..., ...], rotation: ..., speed: ... }
```

然後 3D 模型應該會在地圖上顯示！

---

## 🔍 如果還是沒有顯示

### 檢查 1：模型是否真的加載？

查看控制台，確認沒有模型加載錯誤。

### 檢查 2：模型是否太小？

如果模型加載成功但看不到，可能是太小了。告訴我，我可以調整 `modelScale`。

### 檢查 3：模型是否在視野外？

確保地圖縮放和位置正確，模型應該在你的位置附近。

---

**現在設置模擬器位置，然後重啟應用測試！** 🚀✨
