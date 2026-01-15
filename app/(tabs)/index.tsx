/**
 * 主遊戲畫面 - Pokémon GO 風格 v9.0 Plus
 * 完整狀態機 + 磁吸系統 + 零教學 UI
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Modal,
  ScrollView,
  Dimensions,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { UnifiedMap } from '../../src/components/map';
import {
  BackpackCard,
  TopStaminaBar,
  MainActionButton,
  FloatingTextSystem,
  useFloatingText,
  RescueModal,
  LeftToolbar,
  DevDashboard,
} from '../../src/components/game';
import type { GameState } from '../../src/components/game';
import type { RescueType } from '../../src/components/game';
import { TrailStatsPanel } from '../../src/components/map/TrailStatsPanel';
import { locationService } from '../../src/services/location';
import { gpsHistoryService } from '../../src/services/gpsHistory';
import { explorationService } from '../../src/services/exploration';
import { bgTrackingNotification } from '../../src/services/backgroundTrackingNotification';
import { backgroundLocationService } from '../../src/services/BackgroundLocationService';
import { magnetSystem } from '../../src/systems/MagnetSystem';
import type { MagnetSystemCallbacks } from '../../src/systems/MagnetSystem';
import { useSessionStore } from '../../src/stores/sessionStore';
import { usePlayerStore } from '../../src/stores/playerStore';
import { useInventoryStore } from '../../src/stores/inventoryStore';
import type { CollectionSession } from '../../src/services/gpsHistory';
import type { Item } from '../../src/types/item';

export default function GameScreenV9Plus() {
  // 從 Store 獲取狀態
  const updateExploredHexesFromHistory = useSessionStore(
    (state) => state.updateExploredHexesFromHistory
  );
  const stamina = usePlayerStore((state) => state.stamina);
  const durability = usePlayerStore((state) => state.durability);
  const effectiveMaxWeight = usePlayerStore((state) => state.getEffectiveMaxWeight());
  const totalWeight = useInventoryStore((state) => state.totalWeight);
  const items = useInventoryStore((state) => state.items);

  // 基礎狀態
  const [isReady, setIsReady] = useState(false);
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [showDevDashboard, setShowDevDashboard] = useState(true);

  // 歷史軌跡狀態
  const [showHistoryTrail, setShowHistoryTrail] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [allSessions, setAllSessions] = useState<CollectionSession[]>([]);

  // 救援彈窗狀態
  const [rescueModalVisible, setRescueModalVisible] = useState(false);
  const [rescueType, setRescueType] = useState<RescueType>('Adrenaline');
  const [rescueTitle, setRescueTitle] = useState('');
  const [rescueDesc, setRescueDesc] = useState('');
  const [rescueReward, setRescueReward] = useState('');
  const [pendingItem, setPendingItem] = useState<Item | null>(null);

  // 飄字系統
  const { texts: floatingTexts, showFloatingText, removeText } = useFloatingText();

  // 背包滿倉檢測
  const isBackpackFull = totalWeight >= effectiveMaxWeight * 0.95; // 95% 即視為滿倉

  // 可消耗物品數量（T1 + T2）
  const consumableCount = items.filter((item) => item.tier === 1 || item.tier === 2).length;

  // ========== 初始化 ==========
  useEffect(() => {
    const initialize = async () => {
      try {
        // 初始化服務
        await explorationService.initialize();
        await gpsHistoryService.initialize();

        // 等待數據載入
        await new Promise((resolve) => setTimeout(resolve, 500));

        // 更新 exploredHexes
        await updateExploredHexesFromHistory();

        // 強制保存
        try {
          await gpsHistoryService.forceSave();
          console.log('[GameScreen] ✅ 初始化完成');
        } catch (error) {
          console.error('[GameScreen] ❌ 強制保存失敗:', error);
        }

        // 請求位置權限
        const hasPermission = await locationService.checkPermissions();
        if (!hasPermission) {
          await locationService.requestPermissions();
        }

        // 獲取初始位置
        try {
          const location = await locationService.getCurrentLocation();
          if (location) {
            console.log('[GameScreen] 初始位置:', location);
          }
        } catch (error) {
          console.warn('[GameScreen] 獲取初始位置失敗:', error);
        }

        // 載入歷史會話
        const sessions = gpsHistoryService.getAllSessions();
        setAllSessions(sessions);

        // 初始化磁吸系統
        const magnetCallbacks: MagnetSystemCallbacks = {
          onT3Encounter: handleT3Encounter,
          onStaminaShortage: handleStaminaShortage,
          onBackpackFullT2: handleBackpackFullT2,
          onNormalPickup: handleNormalPickup,
          onItemIgnored: handleItemIgnored,
          showFloatingText: showFloatingText,
        };
        magnetSystem.initialize(magnetCallbacks);

        setIsReady(true);
      } catch (error) {
        console.error('[GameScreen] 初始化錯誤:', error);
        setIsReady(true);
      }
    };

    initialize();

    // 清理函數
    return () => {
      if (gpsHistoryService.isSessionActive()) {
        console.warn('[GameScreen] 組件卸載，結束會話...');
        (async () => {
          await gpsHistoryService.endSession('picnic');
          gpsHistoryService.forceSave();
        })();
      }

      // 停止磁吸系統
      magnetSystem.stop();
    };
  }, []);

  // ========== 狀態機邏輯 ==========

  /**
   * 開始採集
   */
  const handleStartShift = async () => {
    // 檢查 1: 零容忍 - 耐久度
    if (durability <= 0) {
      Alert.alert('背包已損毀', '負重能力歸零。請先維修。', [
        { text: '確定', style: 'cancel' },
      ]);
      return;
    }
    
    // 檢查 2: 零容忍 - 體力
    if (stamina <= 0) {
      setRescueType('GhostRevival');
      setRescueTitle('靈魂模式');
      setRescueDesc('體力耗盡！觀看廣告復活？');
      setRescueReward('恢復 30 體力');
      setRescueModalVisible(true);
      return;
    }
    
    // 通過檢查 - 開始採集
    await startCollection();
  };

  const startCollection = async () => {
    // 清空之前會話的新 H3
    const store = useSessionStore.getState();
    if (store.clearCurrentSessionHexes) {
      store.clearCurrentSessionHexes();
    }

    const sessionId = await gpsHistoryService.startSession();
    console.log('[GameScreen] 🚀 開始採集:', sessionId);

    setGameState('COLLECTING');

    // 啟動背景服務
    bgTrackingNotification.startTracking();
    await backgroundLocationService.startBackgroundTracking();

    // 啟動磁吸系統
    magnetSystem.start();

    showFloatingText('🎯 開始探索！', '#4CAF50');
  };

  /**
   * 卸貨
   */
  const handleUnload = async () => {
    console.log('[GameScreen] 🚗 卸貨...');

    setGameState('UNLOADING');

    // 停止磁吸系統
    magnetSystem.stop();

    // 停止背景服務
    bgTrackingNotification.stopTracking();
    await backgroundLocationService.stopBackgroundTracking();

    // 結束會話
    await gpsHistoryService.endSession('unload');

    // 更新歷史會話
    const sessions = gpsHistoryService.getAllSessions();
    setAllSessions(sessions);

    // 顯示卸貨結算彈窗（這裡可以擴展）
    showFloatingText('💰 卸貨完成！', '#2196F3');

    // 重置狀態
    setGameState('IDLE');
  };

  /**
   * 野餐
   */
  const handlePicnic = async () => {
    console.log('[GameScreen] 🍽️ 野餐...');

    setGameState('PICNIC');

    // 停止磁吸系統
    magnetSystem.stop();

    // 停止背景服務
    bgTrackingNotification.stopTracking();
    await backgroundLocationService.stopBackgroundTracking();

    // 結束會話
    await gpsHistoryService.endSession('picnic');

    // 更新歷史會話
    const sessions = gpsHistoryService.getAllSessions();
    setAllSessions(sessions);

    // 計算體力恢復（示例邏輯）
    const recoveredStamina = Math.min(30, 100 - stamina);
    usePlayerStore.getState().updateStamina(recoveredStamina);

    showFloatingText(`+${recoveredStamina} ⚡`, '#4CAF50');

    // 重置狀態
    setGameState('IDLE');
  };

  // ========== 磁吸系統回調 ==========

  const handleT3Encounter = useCallback((item: Item) => {
    console.log('[GameScreen] 🟣 T3 遭遇:', item);
    setPendingItem(item);
    setRescueType('Adrenaline'); // T3 不需要廣告，但使用相同彈窗
    setRescueTitle('🟣 發現皇室純糖！');
    setRescueDesc(`消耗 30 體力拾取\n價值: ${item.value} $SOLE`);
    setRescueReward('');
    // 這裡應該顯示一個特殊的確認彈窗，而非救援彈窗
    // 暫時使用 Alert
      Alert.alert(
      '🟣 發現皇室純糖！',
      `消耗 30 體力拾取\n價值: ${item.value} $SOLE`,
      [
        {
          text: '取消',
            style: 'cancel',
            onPress: () => {
            magnetSystem.handleAdCancel(item);
            },
          },
          {
          text: '拾取',
          onPress: async () => {
            const success = await magnetSystem.confirmT3Pickup(item);
            if (success) {
              showFloatingText('🟣 皇室純糖！', '#9C27B0');
            } else {
              showFloatingText('拾取失敗', '#F44336');
            }
            },
          },
        ]
      );
  }, [showFloatingText]);

  const handleStaminaShortage = useCallback((item: Item) => {
    console.log('[GameScreen] 💉 體力不足:', item);
    setPendingItem(item);
    setRescueType('Adrenaline');
    setRescueTitle('體力不足');
    setRescueDesc(`需要 ${item.pickupCost} 體力\n觀看廣告 +30 體力並自動拾取？`);
    setRescueReward('+30 體力');
    setRescueModalVisible(true);
  }, []);

  const handleBackpackFullT2 = useCallback((item: Item) => {
    console.log('[GameScreen] 📦 背包已滿 (T2):', item);
    setPendingItem(item);
    setRescueType('TempExpansion');
    setRescueTitle('背包已滿');
    setRescueDesc('發現 T2 翡翠晶糖\n觀看廣告啟用 +50% 臨時空間？');
    setRescueReward('+50% 容量');
    setRescueModalVisible(true);
  }, []);

  const handleNormalPickup = useCallback((item: Item) => {
    console.log('[GameScreen] ✅ 正常拾取:', item);
    const tierName = item.tier === 1 ? '琥珀糖' : item.tier === 2 ? '翡翠晶糖' : '皇室純糖';
    const tierColor = item.tier === 1 ? '#FFC107' : item.tier === 2 ? '#4CAF50' : '#9C27B0';
    showFloatingText(`+1 ${tierName}`, tierColor);
    showFloatingText(`-${item.pickupCost} ⚡`, '#FF9800', 45, 55);
  }, [showFloatingText]);

  const handleItemIgnored = useCallback((item: Item, reason: string) => {
    console.log('[GameScreen] ❌ 物品被忽略:', item, reason);
    showFloatingText('已放棄物品', '#888');
  }, [showFloatingText]);

  // ========== 救援廣告處理 ==========

  const handleAdSuccess = async () => {
    console.log('[GameScreen] 📺 廣告成功:', rescueType);

    if (rescueType === 'GhostRevival') {
      // 靈魂復活
      usePlayerStore.getState().updateStamina(30);
      showFloatingText('+30 ⚡', '#4CAF50');
      setRescueModalVisible(false);
      // 復活後可以開始採集
      await startCollection();
    } else if (rescueType === 'Adrenaline' || rescueType === 'TempExpansion') {
      // 腎上腺素或臨時擴容
      await magnetSystem.handleAdSuccess(
        rescueType === 'Adrenaline' ? 'Adrenaline' : 'TempExpansion',
        pendingItem || undefined
      );
      setRescueModalVisible(false);
      setPendingItem(null);
    }
  };

  const handleAdCancel = () => {
    console.log('[GameScreen] ❌ 用戶取消廣告');

    if (pendingItem) {
      magnetSystem.handleAdCancel(pendingItem);
      setPendingItem(null);
    }

    setRescueModalVisible(false);
  };

  // ========== 工具欄功能 ==========

  const handleShowHistory = () => {
    const sessions = gpsHistoryService.getAllSessions();
    setAllSessions(sessions);
    if (sessions.length > 0) {
      setSelectedSessionId(sessions[0].sessionId);
      setShowHistoryTrail(true);
    }
  };

  const handleRecenterMap = () => {
    // 這裡應該觸發地圖重新定位
    console.log('[GameScreen] 📍 重新定位');
    showFloatingText('📍 重新定位', '#2196F3');
  };

  const handleQuickConsume = () => {
    // 快速食用第一個 T1 物品
    const t1Item = items.find((item) => item.tier === 1);
    if (t1Item) {
      useInventoryStore.getState().consumeItem(t1Item.id);
      showFloatingText('+5 ⚡', '#4CAF50');
    }
  };

  // ========== 渲染 ==========

  return (
    <View style={styles.container}>
      {/* 狀態列 */}
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* 地圖層（全屏） */}
      {isReady && (
        <View style={styles.mapWrapper}>
          <UnifiedMap
            isCollecting={gameState === 'COLLECTING'}
            selectedSessionId={selectedSessionId}
            showHistoryTrail={showHistoryTrail}
          />
        </View>
      )}

      {/* ========== 頂部狀態欄 ========== */}
      {isReady && !showHistoryTrail && (
        <SafeAreaView style={styles.topBarContainer} pointerEvents="box-none">
          <TopStaminaBar onSettingsPress={() => setShowDevDashboard(!showDevDashboard)} />
        </SafeAreaView>
      )}

      {/* ========== 右下角背包卡片 ========== */}
      {isReady && !showHistoryTrail && (
        <View style={styles.backpackContainer} pointerEvents="box-none">
          <BackpackCard onPress={() => console.log('打開背包詳情')} />
        </View>
      )}

      {/* ========== 左側工具欄 ========== */}
      {isReady && !showHistoryTrail && (
        <View style={styles.leftToolbarContainer} pointerEvents="box-none">
          <LeftToolbar
            sessionCount={allSessions.length}
            consumableCount={consumableCount}
            isCollecting={gameState === 'COLLECTING'}
            followMode="NONE"
            onShowHistory={handleShowHistory}
            onRecenterMap={handleRecenterMap}
            onQuickConsume={handleQuickConsume}
          />
        </View>
      )}

      {/* ========== 底部主按鈕 ========== */}
      {isReady && !showHistoryTrail && (
        <View style={styles.bottomActionContainer} pointerEvents="box-none">
          <MainActionButton
            gameState={gameState}
            isBackpackFull={isBackpackFull}
            onStartShift={handleStartShift}
            onUnload={handleUnload}
            onPicnic={handlePicnic}
          />
        </View>
      )}

      {/* ========== 開發者控制台 ========== */}
      {isReady && showDevDashboard && !showHistoryTrail && (
        <DevDashboard visible={showDevDashboard} />
      )}

      {/* ========== 飄字系統 ========== */}
      <FloatingTextSystem texts={floatingTexts} onRemove={removeText} />

      {/* ========== 救援彈窗 ========== */}
      <RescueModal
        visible={rescueModalVisible}
        type={rescueType}
        title={rescueTitle}
        desc={rescueDesc}
        reward={rescueReward}
        onAdSuccess={handleAdSuccess}
        onCancel={handleAdCancel}
      />

      {/* ========== 歷史軌跡彈窗 ========== */}
      <Modal
        visible={showHistoryTrail}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowHistoryTrail(false);
          setSelectedSessionId(null);
        }}
      >
        <View style={styles.modalContainer}>
          <SafeAreaView style={styles.modalSafeArea}>
            {/* 彈窗標題欄 */}
            <View style={styles.modalHeader}>
          <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowHistoryTrail(false);
                  setSelectedSessionId(null);
                }}
              >
                <Text style={styles.modalCloseText}>✕ 關閉</Text>
          </TouchableOpacity>
              <Text style={styles.modalTitle}>歷史軌跡 ({allSessions.length})</Text>
        </View>

            {/* 會話列表 */}
            <ScrollView style={styles.modalSessionList}>
              {allSessions.map((session) => {
                const date = new Date(session.startTime);
                const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date
                  .getHours()
                  .toString()
                  .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                const durationStr = session.duration
                  ? `${Math.floor(session.duration / 60)}:${Math.floor(session.duration % 60)
                      .toString()
                      .padStart(2, '0')}`
                  : '進行中';
                return (
          <TouchableOpacity
                    key={session.sessionId}
                    style={[
                      styles.modalSessionItem,
                      selectedSessionId === session.sessionId && styles.modalSessionItemActive,
                    ]}
                    onPress={() => {
                      setSelectedSessionId(session.sessionId);
                    }}
                  >
                    <Text style={styles.modalSessionDate}>{dateStr}</Text>
                    <Text style={styles.modalSessionInfo}>
                      {session.totalDistance.toFixed(2)} km · {durationStr}
                      {session.endType === 'picnic'
                        ? ' · 🍽️ 就地野餐'
                        : session.endType === 'unload'
                        ? ' · 🏪 餐廳卸貨'
                        : ''}
                    </Text>
          </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 地圖區域（顯示選中的歷史軌跡） */}
            {selectedSessionId && (
              <>
                {/* 軌跡統計面板 */}
                {(() => {
                  const session = allSessions.find((s) => s.sessionId === selectedSessionId);
                  if (session && session.points && session.points.length > 0) {
                    return (
                      <View style={styles.modalStatsContainer}>
                        <TrailStatsPanel trail={session.points} />
        </View>
                    );
                  }
                  return null;
                })()}

                <View style={styles.modalMapContainer}>
                  <UnifiedMap
                    isCollecting={false}
                    selectedSessionId={selectedSessionId}
                    showHistoryTrail={true}
                  />
          </View>
              </>
            )}
          </SafeAreaView>
          </View>
      </Modal>
          </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0A0A0A',
  },
  mapWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#1A1A1A',
  },
  // ========== UI 容器 ==========
  topBarContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 2000,
    pointerEvents: 'box-none',
  },
  backpackContainer: {
    position: 'absolute',
    bottom: 140,
    right: 12,
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  leftToolbarContainer: {
    position: 'absolute',
    left: 12,
    bottom: 140,
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  bottomActionContainer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  // ========== 歷史軌跡彈窗樣式 ==========
  modalContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalSessionList: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 16,
  },
  modalSessionItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalSessionItemActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  modalSessionDate: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSessionInfo: {
    color: '#B0B0B0',
    fontSize: 14,
  },
  modalStatsContainer: {
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalMapContainer: {
    height: Dimensions.get('window').height * 0.5,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
});
