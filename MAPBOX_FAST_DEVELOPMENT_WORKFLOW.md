# Mapbox 樣式快速開發流程

## 🚀 快速開發流程（5 分鐘內看到變化）

### 方法 1：添加版本號強制刷新（推薦）

#### 步驟 1：在配置文件中添加版本號

編輯 `src/config/mapbox.ts`：

```typescript
// 在文件頂部添加
export const MAP_STYLE_VERSION = 'v1'; // 每次更新樣式時遞增：v2, v3, v4...

export const MORNING_THEME = {
  name: '早晨',
  // 添加版本號到 URL（強制刷新）
  mapStyle: `mapbox://styles/stu5737/cmkgbbnym000b01sr8qjhbeqz?v=${MAP_STYLE_VERSION}`,
  mapStyleWithLabels: `mapbox://styles/mapbox/light-v11?v=${MAP_STYLE_VERSION}`,
  // ...
};

export const NIGHT_THEME = {
  name: '夜晚',
  // 添加版本號到 URL（強制刷新）
  mapStyle: `mapbox://styles/stu5737/cmkgbbnym000b01sr8qjhbeqz?v=${MAP_STYLE_VERSION}`,
  mapStyleWithLabels: `mapbox://styles/mapbox/dark-v11?v=${MAP_STYLE_VERSION}`,
  // ...
};
```

#### 步驟 2：更新樣式時的操作流程

1. **在 Mapbox Studio 修改樣式**
2. **點擊「發布」**
3. **回到代碼**：將 `MAP_STYLE_VERSION` 從 `v1` 改為 `v2`
4. **保存文件**：應用會自動重新載入（Hot Reload）
5. **立即看到變化**：不需要清除緩存或重啟

**優點**：
- ✅ 最快：只需改一個數字
- ✅ 不需要清除緩存
- ✅ 不需要重啟應用
- ✅ Hot Reload 自動生效

---

### 方法 2：添加開發模式強制刷新按鈕

#### 步驟 1：添加刷新狀態

在 `MapboxRealTimeMap.tsx` 中：

```typescript
const [styleRefreshKey, setStyleRefreshKey] = useState(0);
```

#### 步驟 2：在 MapView 中使用

```typescript
<Mapbox.MapView
  key={`map-${timeTheme}-${showLabels ? 'labels' : 'no-labels'}-refresh-${styleRefreshKey}`}
  // ...
/>
```

#### 步驟 3：添加刷新按鈕（僅開發模式）

```typescript
{__DEV__ && (
  <TouchableOpacity
    style={styles.devRefreshButton}
    onPress={() => {
      setStyleRefreshKey(prev => prev + 1);
      console.log('[Dev] 🔄 強制刷新地圖樣式');
    }}
  >
    <Text>🔄 刷新樣式</Text>
  </TouchableOpacity>
)}
```

**優點**：
- ✅ 一鍵刷新，不需要改代碼
- ✅ 僅在開發模式顯示
- ✅ 立即看到變化

---

### 方法 3：使用時間戳（僅開發模式）

在 `MapboxRealTimeMap.tsx` 中：

```typescript
// 僅在開發模式使用時間戳
const devStyleVersion = __DEV__ ? Date.now() : 'stable';

<Mapbox.MapView
  key={`map-${timeTheme}-${showLabels ? 'labels' : 'no-labels'}-${devStyleVersion}`}
  // ...
/>
```

**優點**：
- ✅ 每次渲染都刷新（開發時）
- ✅ 生產環境自動使用穩定版本
- ✅ 不需要手動操作

**缺點**：
- ⚠️ 可能影響性能（僅開發模式）

---

## 📋 完整快速開發流程

### 日常開發流程（推薦）

```
1. 在 Mapbox Studio 修改樣式
   ↓
2. 點擊「發布」
   ↓
3. 在 src/config/mapbox.ts 中將 MAP_STYLE_VERSION 從 v1 改為 v2
   ↓
4. 保存文件（Hot Reload 自動生效）
   ↓
5. 立即看到變化（1-2 秒內）
```

### 如果需要完全刷新

```
1. 在 Mapbox Studio 修改樣式
   ↓
2. 點擊「發布」
   ↓
3. 在 DevDashboard 點擊「🔄 刷新樣式」按鈕
   ↓
4. 立即看到變化
```

---

## 🛠️ 實施建議

### 方案 A：版本號（最簡單，推薦）

**實施時間**：2 分鐘
**使用時間**：每次更新樣式時改一個數字

### 方案 B：開發模式按鈕（最方便）

**實施時間**：5 分鐘
**使用時間**：點擊按鈕即可

### 方案 C：時間戳（最自動）

**實施時間**：1 分鐘
**使用時間**：自動刷新，但可能影響性能

---

## 🎯 推薦組合

**最佳實踐**：
- **開發時**：使用方案 A（版本號）+ 方案 B（刷新按鈕）
- **生產環境**：只使用方案 A（版本號）

這樣既有快速刷新，又不會影響生產環境性能。
