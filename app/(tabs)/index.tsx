/**
 * 主遊戲畫面 - 戶外模式（採集地圖）
 * 使用「千層蛋糕法」逐步堆疊 UI
 * 
 * 第一步：建立最乾淨的地圖底層
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Text,
  SafeAreaView,
  Modal,
  ScrollView,
  Dimensions,
  Switch,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RealTimeMap } from '../../src/components/map/RealTimeMap';
import { SimulatorMode } from '../../src/components/game/SimulatorMode';
import { DevDashboard } from '../../src/components/game/DevDashboard';
import { TrailStatsPanel } from '../../src/components/map/TrailStatsPanel';
import { locationService } from '../../src/services/location';
import { gpsHistoryService } from '../../src/services/gpsHistory';
import { explorationService } from '../../src/services/exploration';
import { bgTrackingNotification } from '../../src/services/backgroundTrackingNotification';
import { entropyEngine } from '../../src/core/entropy/engine';
import { useSessionStore } from '../../src/stores/sessionStore';
import type { CollectionSession } from '../../src/services/gpsHistory';
import type { MovementInput } from '../../src/core/entropy/events';

// 創建動畫化的 TouchableOpacity 組件
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function GameScreen() {
  // 從 Store 獲取地圖模式和更新方法
  const updateExploredHexesFromHistory = useSessionStore((state) => state.updateExploredHexesFromHistory);
  
  const [isReady, setIsReady] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false); // 採集狀態
  const [showHistoryTrail, setShowHistoryTrail] = useState(false); // 是否顯示歷史軌跡
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null); // 選中的歷史會話ID
  const [allSessions, setAllSessions] = useState<CollectionSession[]>([]); // 所有歷史會話
  const [isSimulatorMode, setIsSimulatorMode] = useState(false); // 模式切換：false=戶外模式, true=模擬器模式
  const [showDevDashboard, setShowDevDashboard] = useState(true); // 開發者控制台顯示開關（默認開啟，用於測試）

  // 按鈕動畫值（scale: 1 -> 0.9）
  const scanButtonScale = useRef(new Animated.Value(1)).current;
  const historyButtonScale = useRef(new Animated.Value(1)).current;
  const unloadButtonScale = useRef(new Animated.Value(1)).current;
  const picnicButtonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 初始化服務並獲取位置
    const initialize = async () => {
      try {
        // 初始化服務
        await explorationService.initialize();
        await gpsHistoryService.initialize();
        
        // 初始化時更新已探索的 H3 六邊形（從7天歷史軌跡）
        updateExploredHexesFromHistory();
        
        // 請求位置權限並獲取當前位置
        const hasPermission = await locationService.checkPermissions();
        if (!hasPermission) {
          await locationService.requestPermissions();
        }
        
        // 獲取初始位置（如果失敗也繼續，因為 watchPositionAsync 會持續獲取）
        try {
          const location = await locationService.getCurrentLocation();
          if (location) {
            console.log('[GameScreen] Initial location:', location);
      } else {
            console.warn('[GameScreen] Failed to get initial location, but tracking will continue via watchPositionAsync');
          }
    } catch (error) {
          console.warn('[GameScreen] Error getting initial location:', error);
          // 繼續執行，因為 watchPositionAsync 會持續獲取位置
        }
        
        // 載入所有歷史會話
        const sessions = gpsHistoryService.getAllSessions();
        setAllSessions(sessions);
        
        setIsReady(true);
    } catch (error) {
        console.error('[GameScreen] Initialization error:', error);
        setIsReady(true); // 即使失敗也繼續，讓地圖顯示
      }
    };

    initialize();

    // 清理函數：組件卸載時，如果有活動會話，強制結束並保存
    return () => {
      if (gpsHistoryService.isSessionActive()) {
        console.warn('[GameScreen] Component unmounting with active session, ending session...');
        gpsHistoryService.endSession('picnic'); // 默認使用 picic 結束
        gpsHistoryService.forceSave(); // 強制保存
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* 狀態列 */}
      <StatusBar
        translucent={true}
        backgroundColor="transparent"
        barStyle="light-content"
      />

      {/* ========== 模式切換開關（頂部） ========== */}
      {isReady && (
        <SafeAreaView style={styles.modeSwitchContainer} pointerEvents="box-none">
          <View style={styles.modeSwitch}>
            <Text style={styles.modeLabel}>🌍</Text>
            <View style={styles.modeSwitchWrapper}>
              <Switch
                value={isSimulatorMode}
                onValueChange={(value) => {
                  setIsSimulatorMode(value);
                  // 切換模式時，如果正在採集，保持採集狀態
                }}
                trackColor={{ false: '#4CAF50', true: '#9C27B0' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#3e3e3e"
          />
        </View>
            <Text style={styles.modeLabel}>🎮</Text>
            {/* 開發者控制台開關（縮小版） */}
          <TouchableOpacity
              style={styles.devToggleButtonMini}
              onPress={() => setShowDevDashboard(!showDevDashboard)}
          >
              <Text style={styles.devToggleTextMini}>
                {showDevDashboard ? '🔧' : '⚙️'}
              </Text>
          </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {/* ========== 戶外模式：地圖顯示 ========== */}
      {isReady && !isSimulatorMode && (
        <View style={styles.mapWrapper}>
          <RealTimeMap
            showTrail={true}   // 顯示 GPS 軌跡
            height={undefined}
            isCollecting={isCollecting}  // 由按鈕控制
            selectedSessionId={selectedSessionId}
            showHistoryTrail={showHistoryTrail}
          />
          
          {/* 開發者控制台（浮在地圖上方，只在未查看歷史時顯示） */}
          {showDevDashboard && !showHistoryTrail && (
            <DevDashboard visible={showDevDashboard} />
          )}
        </View>
      )}

      {/* ========== 模擬器模式：模擬器界面 ========== */}
      {isReady && isSimulatorMode && (
        <>
          <SimulatorMode
            isCollecting={isCollecting}
            onStartCollection={() => {
              const sessionId = gpsHistoryService.startSession();
              console.log('[GameScreen] Started collection session (simulator):', sessionId);
              setIsCollecting(true);
              // 啟動背景定位通知
              bgTrackingNotification.startTracking();
            }}
            onEndCollection={(type) => {
              gpsHistoryService.endSession(type);
              setIsCollecting(false);
              const sessions = gpsHistoryService.getAllSessions();
              setAllSessions(sessions);
              console.log(`[GameScreen] Ended collection session (simulator): ${type}`);
              // 停止背景定位通知
              bgTrackingNotification.stopTracking();
            }}
          />
          
          {/* 開發者控制台（在模擬器模式下也顯示，浮在 SimulatorMode 上方） */}
          {showDevDashboard && (
            <View style={styles.devDashboardOverlay}>
              <DevDashboard visible={showDevDashboard} />
        </View>
          )}
        </>
      )}

      {/* ========== 採集控制按鈕層（只在戶外模式且未查看歷史時顯示） ========== */}
      {isReady && !isSimulatorMode && !showHistoryTrail && (
        <>
          {/* 左側功能工具列 */}
          <View style={styles.sideToolbar}>
            {allSessions.length > 0 && (
              <AnimatedTouchableOpacity
                style={[
                  styles.sideToolButton,
                  { transform: [{ scale: historyButtonScale }] }
                ]}
                onPressIn={() => {
                  Animated.spring(historyButtonScale, {
                    toValue: 0.9,
                    useNativeDriver: true,
                  }).start();
                }}
                onPressOut={() => {
                  Animated.spring(historyButtonScale, {
                    toValue: 1,
                    useNativeDriver: true,
                  }).start();
                }}
                onPress={() => {
                  const sessions = gpsHistoryService.getAllSessions();
                  setAllSessions(sessions);
                  if (sessions.length > 0) {
                    setSelectedSessionId(sessions[0].sessionId);
                    setShowHistoryTrail(true);
                  }
                }}
              >
                <Ionicons name="map-outline" size={24} color="#FFFFFF" />
              </AnimatedTouchableOpacity>
            )}
            {isCollecting && (
              <>
                <AnimatedTouchableOpacity
                  style={[
                    styles.sideToolButton,
                    styles.unloadToolButton,
                    { transform: [{ scale: unloadButtonScale }] }
                  ]}
                  onPressIn={() => {
                    Animated.spring(unloadButtonScale, {
                      toValue: 0.9,
                      useNativeDriver: true,
                    }).start();
                  }}
                  onPressOut={() => {
                    Animated.spring(unloadButtonScale, {
                      toValue: 1,
                      useNativeDriver: true,
                    }).start();
                  }}
                  onPress={() => {
                    gpsHistoryService.endSession('unload');
                    setIsCollecting(false);
                    const sessions = gpsHistoryService.getAllSessions();
                    setAllSessions(sessions);
                    console.log('[GameScreen] Ended collection session: unload');
                    // 停止背景定位通知
                    bgTrackingNotification.stopTracking();
                  }}
                >
                  <Ionicons name="car-outline" size={24} color="#FFFFFF" />
                </AnimatedTouchableOpacity>
                <AnimatedTouchableOpacity
                  style={[
                    styles.sideToolButton,
                    styles.picnicToolButton,
                    { transform: [{ scale: picnicButtonScale }] }
                  ]}
                  onPressIn={() => {
                    Animated.spring(picnicButtonScale, {
                      toValue: 0.9,
                      useNativeDriver: true,
                    }).start();
                  }}
                  onPressOut={() => {
                    Animated.spring(picnicButtonScale, {
                      toValue: 1,
                      useNativeDriver: true,
                    }).start();
                  }}
                  onPress={() => {
                    gpsHistoryService.endSession('picnic');
                    setIsCollecting(false);
                    const sessions = gpsHistoryService.getAllSessions();
                    setAllSessions(sessions);
                    console.log('[GameScreen] Ended collection session: picnic');
                    // 停止背景定位通知
                    bgTrackingNotification.stopTracking();
                  }}
                >
                  <Ionicons name="restaurant-outline" size={24} color="#FFFFFF" />
                </AnimatedTouchableOpacity>
              </>
            )}
          </View>

          {/* 底部中央主按鈕（Scanner） */}
          <View style={styles.scanButtonContainer}>
            <AnimatedTouchableOpacity
              style={[
                styles.scanButton,
                isCollecting && styles.scanButtonActive,
                { transform: [{ scale: scanButtonScale }] }
              ]}
              onPressIn={() => {
                Animated.spring(scanButtonScale, {
                  toValue: 0.9,
                  useNativeDriver: true,
                }).start();
              }}
              onPressOut={() => {
                Animated.spring(scanButtonScale, {
                  toValue: 1,
                  useNativeDriver: true,
                }).start();
              }}
              onPress={() => {
                if (!isCollecting) {
                  const sessionId = gpsHistoryService.startSession();
                  console.log('[GameScreen] Started collection session:', sessionId);
                  setIsCollecting(true);
                  // 啟動背景定位通知
                  bgTrackingNotification.startTracking();
                }
              }}
            >
              <Ionicons 
                name={isCollecting ? "stop-circle" : "radio-button-on"} 
                size={32} 
                color="#FFFFFF" 
              />
            </AnimatedTouchableOpacity>
        </View>
        </>
      )}

      {/* ========== 模擬器模式的採集控制按鈕 ========== */}
      {isReady && isSimulatorMode && (
        <SafeAreaView style={styles.controlOverlay} pointerEvents="box-none">
          <View style={styles.controlContainer}>
            {!isCollecting ? (
          <TouchableOpacity
                style={[styles.actionButton, styles.startButton]}
                onPress={() => {
                  const sessionId = gpsHistoryService.startSession();
                  console.log('[GameScreen] Started collection session (simulator):', sessionId);
                  setIsCollecting(true);
                  // 啟動背景定位通知
                  bgTrackingNotification.startTracking();
                }}
              >
                <Text style={styles.buttonText}>▶ 開始採集</Text>
          </TouchableOpacity>
            ) : (
              <View style={styles.endButtonContainer}>
          <TouchableOpacity
                  style={[styles.actionButton, styles.endButton, styles.picnicButton]}
                  onPress={() => {
                    gpsHistoryService.endSession('picnic');
                    setIsCollecting(false);
                    const sessions = gpsHistoryService.getAllSessions();
                    setAllSessions(sessions);
                    console.log('[GameScreen] Ended collection session (simulator): picnic');
                    // 停止背景定位通知
                    bgTrackingNotification.stopTracking();
                  }}
                >
                  <Text style={styles.buttonText}>🍽️ 就地野餐</Text>
          </TouchableOpacity>
          <TouchableOpacity
                  style={[styles.actionButton, styles.endButton, styles.unloadButton]}
                  onPress={() => {
                    gpsHistoryService.endSession('unload');
                    setIsCollecting(false);
                    const sessions = gpsHistoryService.getAllSessions();
                    setAllSessions(sessions);
                    console.log('[GameScreen] Ended collection session (simulator): unload');
                    // 停止背景定位通知
                    bgTrackingNotification.stopTracking();
                  }}
                >
                  <Text style={styles.buttonText}>🏪 餐廳卸貨</Text>
          </TouchableOpacity>
        </View>
            )}
          </View>
        </SafeAreaView>
      )}

      {/* 歷史軌跡彈窗（Modal） */}
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
                const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                const durationStr = session.duration 
                  ? `${Math.floor(session.duration / 60)}:${Math.floor(session.duration % 60).toString().padStart(2, '0')}`
                  : '進行中';
                return (
          <TouchableOpacity
                    key={session.sessionId}
                    style={[
                      styles.modalSessionItem,
                      selectedSessionId === session.sessionId && styles.modalSessionItemActive
                    ]}
                    onPress={() => {
                      setSelectedSessionId(session.sessionId);
                    }}
                  >
                    <Text style={styles.modalSessionDate}>{dateStr}</Text>
                    <Text style={styles.modalSessionInfo}>
                      {session.totalDistance.toFixed(2)} km · {durationStr}
                      {session.endType === 'picnic' ? ' · 🍽️ 就地野餐' : session.endType === 'unload' ? ' · 🏪 餐廳卸貨' : ''}
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
                  const session = allSessions.find(s => s.sessionId === selectedSessionId);
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
                  <RealTimeMap
                    showTrail={true}
                    height={Dimensions.get('window').height * 0.5} // 佔用一半螢幕高度
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
    backgroundColor: '#0A0A0A', // 深色背景
  },
  modeSwitchContainer: {
    position: 'absolute',
    top: 8,  // 稍微下移，避免完全貼邊
    left: 8,
    right: 8,
    zIndex: 2000, // 提高 zIndex，確保在 DevDashboard 上方
    pointerEvents: 'box-none',
  },
  modeSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',  // 改為左對齊，放在左側
    paddingVertical: 4,  // 減少 padding
    paddingHorizontal: 8,  // 減少 padding
    backgroundColor: 'rgba(0, 0, 0, 0.7)',  // 稍微透明
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  modeLabel: {
    fontSize: 10,  // 縮小字體
    fontWeight: '500',
    color: '#FFFFFF',
    marginHorizontal: 4,  // 減少間距
  },
  // 縮小的 Switch 樣式
  modeSwitchWrapper: {
    transform: [{ scale: 0.75 }],  // 縮小到 75%
  },
  // 開發者控制台開關（縮小版）
  devToggleButtonMini: {
    marginLeft: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  devToggleTextMini: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  mapWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#1A1A1A', // 深色地圖背景
  },
  // 左側功能工具列
  sideToolbar: {
    position: 'absolute',
    left: 16,
    bottom: 180, // 在羅盤按鈕上方
    flexDirection: 'column',
    gap: 12,
    zIndex: 1000,
  },
  sideToolButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  unloadToolButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.7)', // 半透明藍色
  },
  picnicToolButton: {
    backgroundColor: 'rgba(255, 152, 0, 0.7)', // 半透明橙色
  },
  // 底部中央主按鈕（Scanner）
  scanButtonContainer: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  scanButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFB300', // 黃色/橙色
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFB300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  scanButtonActive: {
    backgroundColor: '#F44336', // 紅色：停止採集
    shadowColor: '#F44336',
  },
  controlOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
  },
  controlContainer: {
    padding: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  startButtonContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 12,
    alignItems: 'center',
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButton: {
    backgroundColor: '#4CAF50', // 綠色：開始
  },
  historyButton: {
    backgroundColor: '#9C27B0', // 紫色：歷史軌跡
  },
  endButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 400,
    justifyContent: 'center',
  },
  endButton: {
    flex: 1,
    minWidth: 140,
  },
  picnicButton: {
    backgroundColor: '#FF9800', // 橙色：就地野餐
  },
  unloadButton: {
    backgroundColor: '#2196F3', // 藍色：餐廳卸貨
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  historyContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    padding: 16,
    maxHeight: 300,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeHistoryButton: {
    padding: 8,
  },
  closeHistoryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  historyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sessionList: {
    gap: 8,
  },
  sessionItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sessionItemActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderColor: '#4CAF50',
  },
  sessionDate: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  sessionInfo: {
    color: '#B0B0B0',
    fontSize: 12,
  },
  // 歷史軌跡彈窗樣式
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
  // 開發者控制台樣式
  devToggleButton: {
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  devToggleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  devDashboardOverlay: {
    position: 'absolute',
    top: 100, // 調整位置，確保不擋住頂部按鈕
    left: 16,
    right: 16,
    zIndex: 1000, // 低於頂部按鈕的 zIndex (2000)
    pointerEvents: 'box-none',
  },
});
