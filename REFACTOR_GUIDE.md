# 主畫面重構指南

## 問題診斷

當前問題：
1. 地圖只顯示在上半部，中間有空白
2. SCAN/UNLOAD 按鈕被底部導航欄擋住

根本原因：
- UI 懸浮層使用了 `absoluteFillObject`，可能與地圖容器衝突
- 中間可能有隱藏的 View 佔用空間
- MapView 組件可能沒有正確填充父容器

## 解決方案：完全重構為圖層式布局

### 新的組件結構（已創建）

```
src/components/game/
  ├─ MapLayer.tsx          # 地圖背景層（完全填充）
  ├─ TopHUD.tsx            # 頂部資訊欄
  ├─ ActionButton.tsx      # 主要操作按鈕
```

### 新的主畫面結構（給 Cursor 的指令）

請將 `app/(tabs)/index.tsx` 的戶外模式部分（第 1189-1394 行）完全替換為以下代碼：

```typescript
{isOutdoorMode ? (
  <View style={{ flex: 1, position: 'relative', backgroundColor: 'transparent' }}>
    {/* 狀態列：透明 */}
    <StatusBar 
      translucent={true}
      backgroundColor="transparent"
      barStyle="light-content"
    />

    {/* ========== Layer 0: 地圖背景（完全填充，不佔用布局空間）========== */}
    <MapLayer
      isCollecting={isCollecting}
      startPoint={collectionStartPoint}
      endPoint={collectionEndPoint}
      followUser={isCollecting}
      showTrail={isCollecting}
    />

    {/* ========== Layer 1: 頂部 HUD（懸浮）========== */}
    <TopHUD
      onModeToggle={() => setIsOutdoorMode(!isOutdoorMode)}
      isOutdoorMode={isOutdoorMode}
      onInventoryPress={() => setShowInventory(!showInventory)}
      onStreakPress={() => {
        Alert.alert(
          '連續簽到',
          `當前連續簽到：${sessionState.luckGradient.streak} 天\nT2 掉落率加成：+${sessionState.luckGradient.t2Bonus.toFixed(1)}%`
        );
      }}
    />

    {/* ========== Layer 2: 地圖覆蓋層（迷霧和開拓者狀態）========== */}
    <MapOverlay
      totalDistance={sessionState.totalDistance}
      isPathfinder={sessionState.pathfinder.isPathfinder}
      isInDeepZone={sessionState.deepZone.isInDeepZone}
      sessionDistance={sessionState.sessionDistance}
    />

    {/* ========== Layer 3: 右側懸浮按鈕組 ========== */}
    <RightSideActions
      onCameraPress={() => { Alert.alert('相機功能', '拍照記錄地標功能（待實現）'); }}
      onRescuePress={async () => {
        const canWatchAd = sessionState.triggerRescue('adrenaline');
        if (!canWatchAd) {
          Alert.alert('廣告上限已達', '您已達到今日廣告救援上限。');
          return;
        }
        Alert.alert('觀看廣告', '即將播放 30 秒廣告恢復體力...', [{ text: '確定' }]);
        await new Promise(resolve => setTimeout(resolve, 1000));
        playerState.restoreStamina(50);
      }}
      showRescue={playerState.stamina < 30}
    />

    {/* ========== Layer 4: 主要操作按鈕（SCAN / UNLOAD）========== */}
    <ActionButton
      isCollecting={isCollecting}
      onPress={() => {
        if (isCollecting) {
          setUnloadModalVisible(true);
        } else {
          handleToggleCollection();
        }
      }}
    />

    {/* ========== Layer 5: 底部導航 Dock ========== */}
    <BottomNavDock
      onMapPress={() => { Alert.alert('地圖功能', '地圖視圖（待實現）'); }}
      onBagPress={() => setShowInventory(!showInventory)}
      onRepairPress={() => { Alert.alert('維修功能', '背包維修功能（待實現）'); }}
      onStreakPress={() => {
        Alert.alert(
          '連續簽到',
          `當前連續簽到：${sessionState.luckGradient.streak} 天\nT2 掉落率加成：+${sessionState.luckGradient.t2Bonus.toFixed(1)}%`
        );
      }}
      onProfilePress={() => { Alert.alert('個人資料', '個人資料頁面（待實現）'); }}
      badgeCounts={{
        bag: inventoryState.items.length,
        streak: sessionState.luckGradient.streak,
      }}
    />

    {/* ========== Layer 6: 提示文字（懸浮在地圖上）========== */}
    {!isCollecting && (
      <View style={{
        position: 'absolute',
        bottom: 280,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 25,
        pointerEvents: 'none',
      }}>
        <View style={{
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#06B6D4',
        }}>
          <Text style={{
            fontSize: 16,
            color: '#FFF',
            fontWeight: '600',
            textAlign: 'center',
            fontFamily: 'monospace',
          }}>
            點擊「SCAN」按鈕開始採集
          </Text>
        </View>
      </View>
    )}

    {/* ========== Layer 7: 拾取通知卡片 ========== */}
    {lastPickedItem && (
      <Animated.View 
        style={{
          position: 'absolute',
          bottom: 200,
          left: 16,
          right: 16,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: 'rgba(6, 182, 212, 0.5)',
          zIndex: 30,
          opacity: pickupNotificationOpacity,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 48, marginRight: 16 }}>
            {lastPickedItem.tier === 1 ? '🍞' : lastPickedItem.tier === 2 ? '🥩' : '💎'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#FFF',
              fontFamily: 'monospace',
              marginBottom: 4,
            }}>
              {lastPickedItem.tier === 1 ? 'T1 琥珀粗糖' : lastPickedItem.tier === 2 ? 'T2 翡翠晶糖' : 'T3 皇室純糖'}
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#D1D5DB',
              fontFamily: 'monospace',
            }}>
              重量: +{lastPickedItem.weight} kg | 價值: ${lastPickedItem.value}
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#D1D5DB',
              fontFamily: 'monospace',
            }}>
              衛生影響: -{calculateContamination(lastPickedItem.tier).toFixed(1)}%
            </Text>
          </View>
        </View>
      </Animated.View>
    )}
  </View>
) : (
  // 開發模式（保持不變）
)}
```

## 關鍵修正點

1. **主容器**：使用 `flex: 1` 和 `position: 'relative'`
2. **地圖層**：使用 `MapLayer` 組件，內部使用絕對定位完全填充
3. **所有 UI 元素**：使用絕對定位懸浮，不佔用布局空間
4. **移除中間容器**：不再使用 `absoluteFillObject` 包裹 UI 元素
5. **ActionButton**：根據安全區域動態計算位置，確保在 Dock 上方

## 組件說明

### MapLayer.tsx
- 純粹的地圖顯示組件
- 使用絕對定位，完全填充父容器
- 內部 RealTimeMap 使用 `absoluteFillObject`

### TopHUD.tsx
- 頂部資訊欄，顯示核心數據
- 使用絕對定位，適配安全區域
- 橫向排列：模式切換、體力、背包、距離、簽到

### ActionButton.tsx
- 主要操作按鈕（SCAN/UNLOAD）
- 使用絕對定位，動態計算底部位置
- 確保在 BottomNavDock 上方，不被擋住
