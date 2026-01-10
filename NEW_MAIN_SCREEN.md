# 全新主畫面設計方案

## 問題診斷

根據當前代碼和用戶回饋，問題在於：
1. 地圖只顯示在上半部，中間有空白
2. SCAN/UNLOAD 按鈕被底部導航欄擋住

## 解決方案：使用模組化組件 + 純 StyleSheet

為了徹底解決問題，我創建了全新的模組化組件結構，使用純 StyleSheet（不依賴 NativeWind），確保：
- 地圖完全填充整個螢幕
- 所有 UI 元素正確懸浮在地圖上
- 按鈕不被擋住

## 新的組件結構

```
src/components/game/
  ├─ MapLayer.tsx          # 地圖背景層（完全填充）
  ├─ TopHUD.tsx            # 頂部資訊欄（體力、背包、距離、簽到）
  ├─ ActionButton.tsx      # 主要操作按鈕（SCAN/UNLOAD）
  └─ ... (其他現有組件)
```

## 使用方法

將 `app/(tabs)/index.tsx` 的戶外模式部分替換為：

```typescript
{isOutdoorMode ? (
  <View style={{ flex: 1, position: 'relative' }}>
    {/* Layer 0: 地圖背景（完全填充） */}
    <MapLayer
      isCollecting={isCollecting}
      startPoint={collectionStartPoint}
      endPoint={collectionEndPoint}
    />
    
    {/* Layer 1: 頂部 HUD */}
    <TopHUD
      onModeToggle={() => setIsOutdoorMode(!isOutdoorMode)}
      isOutdoorMode={isOutdoorMode}
      onInventoryPress={() => setShowInventory(!showInventory)}
      onStreakPress={() => { /* ... */ }}
    />
    
    {/* Layer 2: 主要操作按鈕 */}
    <ActionButton
      isCollecting={isCollecting}
      onPress={() => { /* ... */ }}
    />
    
    {/* Layer 3: 底部導航 Dock */}
    <BottomNavDock {...props} />
    
    {/* 其他懸浮元素 */}
  </View>
) : (
  // 開發模式
)}
```

## 關鍵修正點

1. **主容器使用 `flex: 1`** 而不是 `absoluteFillObject`
2. **地圖層使用明確的 absolute 定位** (`top: 0, left: 0, right: 0, bottom: 0`)
3. **移除所有中間的 flex 容器**，避免佔用空間
4. **ActionButton 根據安全區域動態計算位置**
