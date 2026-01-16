# Mapbox 樣式更新問題排查指南

## 🐛 問題：在 Mapbox Studio 更新樣式後，應用沒有改變

### 可能原因

1. **Mapbox 樣式緩存**：Mapbox 會緩存樣式，更新後需要時間同步
2. **React Native 緩存**：應用可能緩存了舊的樣式
3. **樣式未發布**：在 Mapbox Studio 修改後需要點擊「發布」
4. **樣式 URL 未更新**：如果創建了新樣式，需要更新 URL

---

## ✅ 解決方案

### 方案 1：清除緩存並重啟（最簡單）

```bash
# 清除 Expo 緩存
rm -rf .expo
rm -rf node_modules/.cache

# 清除 Metro 緩存
npx expo start --clear

# 或完全重啟
npx expo run:ios --clear
```

### 方案 2：確認樣式已發布

1. 前往 [Mapbox Studio](https://studio.mapbox.com/)
2. 打開你的樣式：`cmkgbbnym000b01sr8qjhbeqz`
3. 確認右上角顯示「已發布」或點擊「發布」按鈕
4. 等待 1-2 分鐘讓 Mapbox 同步

### 方案 3：強制重新載入地圖

在 `MapboxRealTimeMap.tsx` 中，`key` prop 已經包含時間戳來強制重新載入：

```typescript
key={`map-${timeTheme}-${showLabels ? 'labels' : 'no-labels'}-${Date.now()}`}
```

**注意**：這會導致每次渲染都重新載入地圖，可能影響性能。建議只在需要時使用。

### 方案 4：添加樣式版本號（推薦）

在 `src/config/mapbox.ts` 中添加版本號：

```typescript
export const MORNING_THEME = {
  name: '早晨',
  // 添加版本號來強制刷新（每次更新樣式時遞增）
  mapStyleVersion: 'v2', // 更新樣式時改為 v3, v4...
  mapStyle: 'mapbox://styles/stu5737/cmkgbbnym000b01sr8qjhbeqz',
  // ...
};
```

然後在 `MapboxRealTimeMap.tsx` 中使用：

```typescript
key={`map-${timeTheme}-${showLabels ? 'labels' : 'no-labels'}-${MORNING_THEME.mapStyleVersion}`}
```

---

## 🔍 檢查清單

### 1. 確認樣式 URL 正確

檢查 `src/config/mapbox.ts`：
- [ ] URL 格式正確：`mapbox://styles/stu5737/cmkgbbnym000b01sr8qjhbeqz`
- [ ] 沒有多餘的空格或字符
- [ ] 樣式 ID 與 Mapbox Studio 中的一致

### 2. 確認樣式已發布

在 Mapbox Studio：
- [ ] 樣式顯示「已發布」狀態
- [ ] 如果修改後未發布，點擊「發布」按鈕
- [ ] 等待 1-2 分鐘讓 Mapbox 同步

### 3. 清除緩存

```bash
# 清除所有緩存
rm -rf .expo
rm -rf node_modules/.cache
rm -rf ios/build
rm -rf android/build

# 重啟應用
npx expo start --clear
```

### 4. 檢查控制台日誌

查看是否有錯誤：
```
[MapboxRealTimeMap] 樣式載入失敗: ...
```

---

## 🚀 快速修復步驟

### 步驟 1：確認樣式已發布
1. 打開 [Mapbox Studio](https://studio.mapbox.com/)
2. 確認樣式 `cmkgbbnym000b01sr8qjhbeqz` 已發布
3. 如果未發布，點擊「發布」

### 步驟 2：清除緩存
```bash
cd /Users/yumingliao/YML/solefoodmvp
rm -rf .expo
rm -rf node_modules/.cache
```

### 步驟 3：重啟應用
```bash
npx expo start --clear
# 或
npx expo run:ios --clear
```

### 步驟 4：強制刷新地圖
如果還是不行，可以暫時修改 `key` prop 來強制重新載入：

```typescript
// 在 MapboxRealTimeMap.tsx 中
key={`map-${timeTheme}-${showLabels ? 'labels' : 'no-labels'}-force-refresh-${Date.now()}`}
```

**注意**：這會導致每次渲染都重新載入，測試完後應該移除 `Date.now()`。

---

## 💡 最佳實踐

### 1. 使用樣式版本號

在配置文件中添加版本號，每次更新樣式時遞增：

```typescript
export const MAP_STYLE_VERSION = 'v1'; // 更新樣式時改為 v2, v3...

export const MORNING_THEME = {
  mapStyle: `mapbox://styles/stu5737/cmkgbbnym000b01sr8qjhbeqz?v=${MAP_STYLE_VERSION}`,
  // ...
};
```

### 2. 開發時使用時間戳（僅測試）

```typescript
// 僅在開發時使用，生產環境移除
const DEV_STYLE_VERSION = __DEV__ ? Date.now() : MAP_STYLE_VERSION;
```

### 3. 添加樣式載入監聽

```typescript
<Mapbox.MapView
  onDidFinishLoadingMap={() => {
    console.log('[Mapbox] ✅ 樣式載入完成');
  }}
  onDidFailLoadingMap={(error) => {
    console.error('[Mapbox] ❌ 樣式載入失敗:', error);
  }}
/>
```

---

## 🔧 進階：強制刷新機制

如果需要立即看到樣式更新，可以添加一個「強制刷新」按鈕：

```typescript
const [styleVersion, setStyleVersion] = useState(0);

// 在按鈕中
onPress={() => {
  setStyleVersion(prev => prev + 1);
  console.log('[Mapbox] 🔄 強制刷新樣式，版本:', styleVersion + 1);
}}

// 在 MapView 中
key={`map-${timeTheme}-${showLabels ? 'labels' : 'no-labels'}-v${styleVersion}`}
```

---

## 📝 常見問題

### Q: 為什麼更新樣式後看不到變化？
A: Mapbox 會緩存樣式，通常需要 1-5 分鐘才能同步。清除應用緩存並重啟可以強制刷新。

### Q: 樣式 URL 需要更新嗎？
A: 如果是在同一個樣式 ID 上修改，URL 不需要更新。如果創建了新樣式，需要更新 URL。

### Q: 如何確認樣式已更新？
A: 在 Mapbox Studio 的樣式預覽中查看，確認修改已保存並發布。

### Q: 清除緩存後還是沒變化？
A: 嘗試：
1. 完全關閉應用（雙擊 Home 鍵，滑掉應用）
2. 重新啟動應用
3. 等待 2-3 分鐘讓 Mapbox 同步
4. 檢查樣式 URL 是否正確

---

## ✅ 驗證步驟

1. **確認樣式已發布**：Mapbox Studio 顯示「已發布」
2. **清除緩存**：執行 `rm -rf .expo && rm -rf node_modules/.cache`
3. **重啟應用**：`npx expo start --clear`
4. **等待同步**：等待 1-2 分鐘
5. **檢查變化**：對比 Mapbox Studio 預覽和應用中的地圖

如果還是不行，請檢查：
- 樣式 URL 是否正確
- 是否有網絡連接問題
- Mapbox Access Token 是否有效
