/**
 * 主遊戲畫面 - 戶外模式（採集地圖）
 * 使用「千層蛋糕法」逐步堆疊 UI
 * 
 * 第一步：建立最乾淨的地圖底層
 */

import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { RealTimeMap } from '../../src/components/map/RealTimeMap';
import { SimulatorMode } from '../../src/components/game/SimulatorMode';
import { DevDashboard } from '../../src/components/game/DevDashboard';
import { locationService } from '../../src/services/location';
import { gpsHistoryService } from '../../src/services/gpsHistory';
import { explorationService } from '../../src/services/exploration';
import { entropyEngine } from '../../src/core/entropy/engine';
import type { CollectionSession } from '../../src/services/gpsHistory';
import type { MovementInput } from '../../src/core/entropy/events';

export default function GameScreen() {
  const [isReady, setIsReady] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false); // 採集狀態
  const [showHistoryTrail, setShowHistoryTrail] = useState(false); // 是否顯示歷史軌跡
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null); // 選中的歷史會話ID
  const [allSessions, setAllSessions] = useState<CollectionSession[]>([]); // 所有歷史會話
  const [isSimulatorMode, setIsSimulatorMode] = useState(false); // 模式切換：false=戶外模式, true=模擬器模式
  const [showDevDashboard, setShowDevDashboard] = useState(true); // 開發者控制台顯示開關（默認開啟，用於測試）

  useEffect(() => {
    // 初始化服務並獲取位置
    const initialize = async () => {
      try {
        // 初始化服務
        await explorationService.initialize();
        await gpsHistoryService.initialize();
        
        // 請求位置權限並獲取當前位置
        const hasPermission = await locationService.checkPermissions();
        if (!hasPermission) {
          await locationService.requestPermissions();
        }
        
        // 獲取初始位置
        const location = await locationService.getCurrentLocation();
        if (location) {
          console.log('[GameScreen] Initial location:', location);
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
            <Text style={styles.modeLabel}>🌍 戶外模式</Text>
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
            <Text style={styles.modeLabel}>🎮 模擬器</Text>
            {/* 開發者控制台開關 */}
            <TouchableOpacity
              style={styles.devToggleButton}
              onPress={() => setShowDevDashboard(!showDevDashboard)}
            >
              <Text style={styles.devToggleText}>
                {showDevDashboard ? '🔧 隱藏' : '🔧 顯示'}
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
            }}
            onEndCollection={(type) => {
              gpsHistoryService.endSession(type);
              setIsCollecting(false);
              const sessions = gpsHistoryService.getAllSessions();
              setAllSessions(sessions);
              console.log(`[GameScreen] Ended collection session (simulator): ${type}`);
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
        <SafeAreaView style={styles.controlOverlay} pointerEvents="box-none">
          <View style={styles.controlContainer}>
            {!isCollecting ? (
              // 未採集：顯示開始採集按鈕、歷史軌跡按鈕和模擬器快捷按鈕
              <View style={styles.startButtonContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.startButton]}
                  onPress={() => {
                    const sessionId = gpsHistoryService.startSession();
                    console.log('[GameScreen] Started collection session:', sessionId);
                    setIsCollecting(true);
                  }}
                >
                  <Text style={styles.buttonText}>▶ 開始採集</Text>
                </TouchableOpacity>
                {allSessions.length > 0 && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.historyButton]}
                    onPress={() => {
                      // 載入所有歷史會話並打開彈窗
                      const sessions = gpsHistoryService.getAllSessions();
                      setAllSessions(sessions);
                      if (sessions.length > 0) {
                        setSelectedSessionId(sessions[0].sessionId);
                        setShowHistoryTrail(true);
                      }
                    }}
                  >
                    <Text style={styles.buttonText}>📜 歷史軌跡</Text>
                  </TouchableOpacity>
                )}
                {/* 模擬器快捷按鈕（戶外模式也可以快速打開模擬器測試） */}
                <TouchableOpacity
                  style={[styles.actionButton, styles.simulatorQuickButton]}
                  onPress={() => {
                    setIsSimulatorMode(true);
                    console.log('[GameScreen] Quick switch to simulator mode');
                  }}
                >
                  <Text style={styles.buttonText}>🎮 快速測試</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // 採集中：顯示結束選項
              <View style={styles.endButtonContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.endButton, styles.picnicButton]}
                  onPress={() => {
                    gpsHistoryService.endSession('picnic');
                    setIsCollecting(false);
                    // 重新載入會話列表
                    const sessions = gpsHistoryService.getAllSessions();
                    setAllSessions(sessions);
                    console.log('[GameScreen] Ended collection session: picnic');
                  }}
                >
                  <Text style={styles.buttonText}>🍽️ 就地野餐</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.endButton, styles.unloadButton]}
                  onPress={() => {
                    gpsHistoryService.endSession('unload');
                    setIsCollecting(false);
                    // 重新載入會話列表
                    const sessions = gpsHistoryService.getAllSessions();
                    setAllSessions(sessions);
                    console.log('[GameScreen] Ended collection session: unload');
                  }}
                >
                  <Text style={styles.buttonText}>🏪 餐廳卸貨</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
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
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2000, // 提高 zIndex，確保在 DevDashboard 上方
    pointerEvents: 'box-none',
  },
  modeSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.9)', // 提高背景不透明度，確保按鈕可見
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)', // 提高邊框可見度
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginHorizontal: 12,
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
  simulatorQuickButton: {
    backgroundColor: '#FF9800', // 橙色：快速測試按鈕
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
