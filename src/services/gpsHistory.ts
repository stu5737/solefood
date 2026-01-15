/**
 * GPS 歷史軌跡服務
 * Solefood MVP v9.0 Plus
 * 
 * 追蹤玩家移動軌跡，用於防作弊和視覺化
 */

import { LocationData } from './location';
import { saveData, loadData, STORAGE_KEYS } from '../utils/storage';
import { AppState, AppStateStatus } from 'react-native';

/**
 * GPS 歷史點
 */
export interface GPSHistoryPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed?: number;
  accuracy?: number;
  distance?: number; // 與上一點的距離（km）
  sessionId?: string; // 採集會話 ID
}

/**
 * 採集會話記錄
 */
export interface CollectionSession {
  sessionId: string; // 會話 ID（時間戳）
  startTime: number; // 開始時間戳
  endTime?: number; // 結束時間戳（如果還在進行中則為 undefined）
  points: GPSHistoryPoint[]; // 本次會話的所有點
  totalDistance: number; // 總距離（km）
  duration?: number; // 持續時間（秒）
  endType?: 'picnic' | 'unload' | 'manual'; // 結束類型：就地野餐、餐廳卸貨 或 手動停止
}

/**
 * GPS 歷史服務類
 */
class GPSHistoryService {
  private history: GPSHistoryPoint[] = []; // 所有歷史點（保留用於7天歷史統計）
  private sessions: Map<string, CollectionSession> = new Map(); // 按會話分組的記錄
  private currentSessionId: string | null = null; // 當前進行中的會話 ID
  private currentSessionPoints: GPSHistoryPoint[] = []; // 當前會話的點
  private readonly MAX_HISTORY_POINTS = 10000; // 最多保存 10000 個點（用於7天統計）
  private readonly MAX_SESSIONS = 100; // 最多保存 100 個會話
  private readonly MIN_DISTANCE_THRESHOLD = 0.01; // 最小距離閾值（10m）
  private readonly HISTORY_DAYS = 7; // 保留 7 天的歷史
  private initialized: boolean = false;
  private saveCounter: number = 0; // 計數器，用於控制保存頻率
  private backgroundPointCount: number = 0; // 背景模式下記錄的點數
  private appState: AppStateStatus = AppState.currentState; // App 狀態
  private saveInterval: NodeJS.Timeout | null = null; // ⭐ 新增：定期保存定時器

  /**
   * 初始化：從持久化存儲載入歷史
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[GPSHistoryService] Already initialized, skipping...');
      return;
    }

    try {
      // ⭐ 修復：載入所有歷史點（用於7天統計），添加詳細日誌
      const savedHistory = await loadData<GPSHistoryPoint[]>(STORAGE_KEYS.GPS_HISTORY);
      
      if (savedHistory === null) {
        console.warn('[GPSHistoryService] ⚠️  No saved history found in storage');
        this.history = [];
      } else if (!Array.isArray(savedHistory)) {
        console.error('[GPSHistoryService] ❌ Saved history is not an array:', typeof savedHistory);
        this.history = [];
      } else {
        console.log(`[GPSHistoryService] 📦 Loaded ${savedHistory.length} total history points from storage`);
        const sevenDaysAgo = Date.now() - (this.HISTORY_DAYS * 24 * 60 * 60 * 1000);
        this.history = savedHistory.filter(point => point.timestamp >= sevenDaysAgo);
        console.log(`[GPSHistoryService] ✅ Loaded ${this.history.length} history points (last 7 days)`);
      }
      
      // ⭐ 修復：載入會話記錄，添加詳細日誌
      const savedSessions = await loadData<CollectionSession[]>(STORAGE_KEYS.GPS_SESSIONS);
      
      if (savedSessions === null) {
        console.warn('[GPSHistoryService] ⚠️  No saved sessions found in storage');
        this.sessions.clear();
      } else if (!Array.isArray(savedSessions)) {
        console.error('[GPSHistoryService] ❌ Saved sessions is not an array:', typeof savedSessions);
        this.sessions.clear();
      } else {
        console.log(`[GPSHistoryService] 📦 Loaded ${savedSessions.length} total sessions from storage`);
        const sevenDaysAgo = Date.now() - (this.HISTORY_DAYS * 24 * 60 * 60 * 1000);
        let loadedCount = 0;
        savedSessions
          .filter(session => session.startTime >= sevenDaysAgo)
          .forEach(session => {
            this.sessions.set(session.sessionId, session);
            loadedCount++;
          });
        console.log(`[GPSHistoryService] ✅ Loaded ${loadedCount} collection sessions (last 7 days)`);
      }
      
      // 確保 appState 有初始值（在設置監聽器之前）
      if (!this.appState) {
        this.appState = AppState.currentState;
      }
      
      // ⭐ 修復：監聽 App 狀態變化，在進入背景時強制保存
      AppState.addEventListener('change', async (nextAppState) => {
        const wasBackground = this.appState && this.appState.match(/inactive|background/);
        const isNowForeground = nextAppState === 'active';
        const isNowBackground = nextAppState.match(/inactive|background/);
        
        if (wasBackground && isNowForeground) {
          console.log(`🟢 [GPSHistoryService] App entered FOREGROUND - Background points recorded: ${this.backgroundPointCount}`);
          this.backgroundPointCount = 0;
        } else if (isNowBackground) {
          // ⭐ 關鍵修復：進入背景時強制保存
          console.log(`🔴 [GPSHistoryService] App entering BACKGROUND - Force saving data...`);
          try {
            await this.forceSave();
            console.log(`✅ [GPSHistoryService] Data saved successfully before background`);
          } catch (error) {
            console.error(`❌ [GPSHistoryService] Failed to save before background:`, error);
          }
        }
        
        this.appState = nextAppState;
      });
      
      // ⭐ 新增：每 30 秒自動保存一次（防止數據丟失）
      this.saveInterval = setInterval(() => {
        if (this.currentSessionId || this.history.length > 0 || this.sessions.size > 0) {
          this.forceSave().catch((error) => {
            console.error('[GPSHistoryService] Periodic save failed:', error);
          });
          console.log('[GPSHistoryService] ⏰ Periodic save triggered');
        }
      }, 30000); // 30 秒
      
      this.initialized = true;
      console.log('[GPSHistoryService] ✅ Initialization completed successfully');
    } catch (error) {
      console.error('[GPSHistoryService] ❌ Failed to initialize:', error);
      // 即使失敗也確保 appState 有值
      if (!this.appState) {
        this.appState = AppState.currentState;
      }
      // ⭐ 關鍵：即使失敗也標記為已初始化，避免無限重試
      this.initialized = true;
      console.log('[GPSHistoryService] ⚠️  Marked as initialized despite errors');
    }
  }

  /**
   * 開始新的採集會話
   * 
   * ⭐ 防崩潰修復：確保先清理舊的會話數據，避免資料堆積
   * 
   * @returns 會話 ID
   */
  async startSession(): Promise<string> {
    // ⭐ 防崩潰修復 1：如果已有活躍會話，先結束它（防止會話堆積）
    if (this.currentSessionId) {
      console.warn('[GPSHistoryService] ⚠️  發現殘留的會話，先清理:', this.currentSessionId);
      await this.endSession('manual'); // 使用 'manual' 標記為手動清理
    }
    
    // ⭐ 防崩潰修復 2：確保 currentSessionPoints 為空陣列（防止資料疊加）
    this.currentSessionPoints = [];
    
    const sessionId = `session_${Date.now()}`;
    this.currentSessionId = sessionId;
    
    const session: CollectionSession = {
      sessionId,
      startTime: Date.now(),
      points: [],
      totalDistance: 0,
    };
    
    this.sessions.set(sessionId, session);
    console.log('[GPSHistoryService] ✅ Started new collection session:', sessionId);
    return sessionId;
  }

  /**
   * 結束當前採集會話
   * 
   * ⭐ 防崩潰修復：確保完全清理會話數據，防止記憶體洩漏
   * ⭐ 防重複調用：立即清空 currentSessionId，防止同一會話被多次結束
   * 
   * @param endType - 結束類型：'picnic'（就地野餐）、'unload'（餐廳卸貨）或 'manual'（手動停止）
   */
  async endSession(endType: 'picnic' | 'unload' | 'manual'): Promise<void> {
    // ⭐ 防重複調用檢查：如果沒有活動會話，直接返回
    if (!this.currentSessionId) {
      console.log('[GPSHistoryService] ⚠️ No active session to end, skipping... (可能已被結束)');
      return;
    }

    // ⭐ 立即保存並清空 currentSessionId，防止重複調用
    const sessionId = this.currentSessionId;
    this.currentSessionId = null;
    
    console.log(`[GPSHistoryService] 🔄 Ending session: ${sessionId}, type: ${endType}`);

    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = Date.now();
      session.duration = (session.endTime - session.startTime) / 1000; // 轉換為秒
      session.endType = endType;
      session.points = [...this.currentSessionPoints];
      
      // 計算總距離
      session.totalDistance = this.currentSessionPoints.reduce((sum, point) => {
        return sum + (point.distance || 0);
      }, 0);
      
      console.log(`[GPSHistoryService] ✅ Ended session ${sessionId}, type: ${endType}, distance: ${session.totalDistance.toFixed(2)}km, duration: ${session.duration.toFixed(0)}s, points: ${session.points.length}`);
      
      // ⭐ 修復：確保會話的點都被加入 history（用於 H3 渲染）
      if (session.points.length > 0) {
        const sevenDaysAgo = Date.now() - (this.HISTORY_DAYS * 24 * 60 * 60 * 1000);
        let addedCount = 0;
        
        // 將會話的點加入 history（如果還沒加入）
        for (const point of session.points) {
          if (point.timestamp >= sevenDaysAgo) {
            // 檢查是否已存在（避免重複）- 使用更寬鬆的匹配條件
            const exists = this.history.some(p => 
              Math.abs(p.timestamp - point.timestamp) < 1000 && // 1秒內
              Math.abs(p.latitude - point.latitude) < 0.0001 && // 約11公尺
              Math.abs(p.longitude - point.longitude) < 0.0001
            );
            
            if (!exists) {
              this.history.push(point);
              addedCount++;
            }
          }
        }
        
        if (addedCount > 0) {
          console.log(`[GPSHistoryService] ✅ Added ${addedCount} points from session to history`);
          
          // 清理超過7天的歷史
          this.history = this.history.filter(p => p.timestamp >= sevenDaysAgo);
          
          // 限制歷史點數量
          if (this.history.length > this.MAX_HISTORY_POINTS) {
            this.history = this.history.slice(-this.MAX_HISTORY_POINTS);
          }
        }
      }
      
      // 限制會話數量
      if (this.sessions.size > this.MAX_SESSIONS) {
        const oldestSessionId = Array.from(this.sessions.entries())
          .sort((a, b) => a[1].startTime - b[1].startTime)[0][0];
        this.sessions.delete(oldestSessionId);
        console.log(`[GPSHistoryService] Removed oldest session: ${oldestSessionId}`);
      }
      
      this.saveSessions();
    }

    // ⭐ 新增：在結束會話時，將當前會話的新 H3 合併到 exploredHexes
    try {
      const { useSessionStore } = require('../stores/sessionStore');
      const store = useSessionStore.getState();
      if (store.mergeCurrentSessionHexes) {
        await store.mergeCurrentSessionHexes();
        console.log('[GPSHistoryService] ✅ Merged current session new hexes into exploredHexes');
      }
    } catch (error) {
      console.warn('[GPSHistoryService] Failed to merge current session hexes:', error);
    }

    // ⭐ 關鍵修復：結束會話時立即強制保存
    try {
      await this.forceSave();
      console.log('[GPSHistoryService] ✅ Force saved after session end');
    } catch (error) {
      console.error('[GPSHistoryService] ❌ Failed to force save after session end:', error);
    }

    // ⭐ 防崩潰修復：清理會話點數據（currentSessionId 已在方法開頭清空）
    this.currentSessionPoints = [];
    
    console.log('[GPSHistoryService] 🧹 會話狀態已完全清理');
  }

  /**
   * 添加 GPS 點到歷史（只有在會話進行中時才記錄）
   * 
   * @param location - 位置數據
   * @param distance - 與上一點的距離（km）
   */
  addPoint(location: LocationData, distance: number = 0): void {
    // 確保已初始化
    if (!this.initialized) {
      console.warn('[GPSHistoryService] Not initialized, initializing now...');
      this.initialize().catch(console.error);
    }

    // 如果沒有活動會話，不記錄點
    if (!this.currentSessionId) {
      return;
    }

    // 過濾太近的點（減少存儲空間），但第一個點始終記錄
    if (this.currentSessionPoints.length > 0 && distance < this.MIN_DISTANCE_THRESHOLD) {
      return;
    }

    // 判斷是否在背景模式（添加 null 檢查）
    const isBackground = this.appState && this.appState.match(/inactive|background/);
    if (isBackground) {
      this.backgroundPointCount++;
      // 每 20 個背景點記錄一次日誌
      if (this.backgroundPointCount % 20 === 0 || this.backgroundPointCount === 1) {
        const timeStr = new Date(location.timestamp).toLocaleTimeString();
        console.log(`📝 [BG-Record] ${timeStr} | Recorded GPS point #${this.backgroundPointCount} | Session: ${this.currentSessionId} | Total points: ${this.currentSessionPoints.length + 1}`);
      }
    }

    const point: GPSHistoryPoint = {
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: location.timestamp,
      speed: location.speed,
      accuracy: location.accuracy,
      distance,
      sessionId: this.currentSessionId,
    };

    // ⭐ 防崩潰修復 3：資料量過載保護 - 限制單次會話的點數
    const MAX_SESSION_POINTS = 5000; // 單次會話最多 5000 個點（防止記憶體爆炸）
    
    // 添加到當前會話
    this.currentSessionPoints.push(point);
    
    // ⭐ 如果會話點數超過限制，只保留最新的點
    if (this.currentSessionPoints.length > MAX_SESSION_POINTS) {
      console.warn(`[GPSHistoryService] ⚠️  會話點數超過限制 (${this.currentSessionPoints.length} > ${MAX_SESSION_POINTS})，只保留最新 ${MAX_SESSION_POINTS} 個點`);
      this.currentSessionPoints = this.currentSessionPoints.slice(-MAX_SESSION_POINTS);
    }
    
    // 更新會話記錄
    const session = this.sessions.get(this.currentSessionId);
    if (session) {
      session.points.push(point);
      session.totalDistance += distance;
      
      // ⭐ 防崩潰修復 4：限制會話記錄中的點數（防止渲染崩潰）
      if (session.points.length > MAX_SESSION_POINTS) {
        console.warn(`[GPSHistoryService] ⚠️  會話記錄點數超過限制，只保留最新 ${MAX_SESSION_POINTS} 個點`);
        session.points = session.points.slice(-MAX_SESSION_POINTS);
      }
    }

    // 添加到7天歷史（用於H3統計）
    const sevenDaysAgo = Date.now() - (this.HISTORY_DAYS * 24 * 60 * 60 * 1000);
    this.history.push(point);
    
    // 清理超過7天的歷史
    this.history = this.history.filter(p => p.timestamp >= sevenDaysAgo);
    
    // 限制歷史點數量
    if (this.history.length > this.MAX_HISTORY_POINTS) {
      this.history = this.history.slice(-this.MAX_HISTORY_POINTS);
    }

    this.saveCounter++;

    // ⭐ 修復：每 5 個點保存一次（而不是 10 個），減少數據丟失風險
    if (this.saveCounter >= 5) {
      this.saveCounter = 0;
      this.saveToStorage();
      this.saveSessions(); // ⭐ 同時保存會話
    }
  }

  /**
   * 獲取當前會話的軌跡
   * 
   * @returns 當前會話的 GPS 點數組
   */
  getCurrentSessionTrail(): GPSHistoryPoint[] {
    return [...this.currentSessionPoints];
  }

  /**
   * 獲取指定會話的軌跡
   * 
   * @param sessionId - 會話 ID
   * @returns 會話的 GPS 點數組
   */
  getSessionTrail(sessionId: string): GPSHistoryPoint[] {
    const session = this.sessions.get(sessionId);
    return session ? [...session.points] : [];
  }

  /**
   * 獲取所有歷史軌跡（用於7天統計，不包含當前會話）
   * 
   * @returns GPS 歷史點數組
   */
  getHistoryPoints(): GPSHistoryPoint[] {
    return [...this.history];
  }

  /**
   * 獲取所有會話記錄
   * 
   * @returns 會話記錄數組（按時間倒序）
   */
  getAllSessions(): CollectionSession[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * 獲取當前活動會話 ID
   * 
   * @returns 會話 ID 或 null
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * 檢查是否有活動會話
   * 
   * @returns 是否有活動會話
   */
  isSessionActive(): boolean {
    return this.currentSessionId !== null;
  }

  /**
   * 獲取最近 N 天的歷史點（用於H3統計）
   * 
   * @param days - 天數（默認7天）
   * @returns GPS 歷史點數組
   */
  getHistoryPointsByDays(days: number = this.HISTORY_DAYS): GPSHistoryPoint[] {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    return this.history.filter(point => point.timestamp >= cutoffTime);
  }

  /**
   * 獲取最近的 N 個點（優先從當前會話獲取，如果不足則從歷史獲取）
   * 
   * @param count - 要獲取的點數（默認1）
   * @returns GPS 歷史點數組（按時間倒序，最新的在前）
   */
  getRecentPoints(count: number = 1): GPSHistoryPoint[] {
    // 優先從當前會話獲取
    if (this.currentSessionPoints.length > 0) {
      const recentFromSession = this.currentSessionPoints.slice(-count);
      if (recentFromSession.length >= count) {
        return recentFromSession;
      }
      // 如果當前會話點不足，從歷史補足
      const remaining = count - recentFromSession.length;
      const recentFromHistory = this.history.slice(-remaining);
      return [...recentFromHistory, ...recentFromSession];
    }
    
    // 如果沒有當前會話，從歷史獲取
    return this.history.slice(-count);
  }

  /**
   * 獲取歷史點數量
   */
  getHistoryCount(): number {
    return this.history.length;
  }

  /**
   * 清除歷史（調試用）
   */
  async clearHistory(): Promise<void> {
    console.log('[GPSHistoryService] 🗑️ Clearing all history and sessions...');
    
    // 1. 清除內存數據
    this.history = [];
    this.sessions.clear();
    this.currentSessionId = null;
    this.currentSessionPoints = [];
    this.saveCounter = 0;
    
    // 2. 清除持久化存儲
    await saveData(STORAGE_KEYS.GPS_HISTORY, []);
    await saveData(STORAGE_KEYS.GPS_SESSIONS, []);
    
    // 3. 等待並驗證清除成功
    await new Promise(resolve => setTimeout(resolve, 300));
    const verifyHistory = await loadData<GPSHistoryPoint[]>(STORAGE_KEYS.GPS_HISTORY);
    const verifySessions = await loadData<CollectionSession[]>(STORAGE_KEYS.GPS_SESSIONS);
    
    console.log('[GPSHistoryService] ✅ GPS history and sessions cleared', {
      historyPoints: verifyHistory?.length || 0,
      sessions: verifySessions?.length || 0,
    });
  }

  /**
   * 強制保存到持久化存儲
   */
  async forceSave(): Promise<void> {
    try {
      await this.saveToStorage();
      await this.saveSessions();
      console.log('[GPSHistoryService] ✅ Force save completed');
    } catch (error) {
      console.error('[GPSHistoryService] ❌ Force save failed:', error);
      throw error;
    }
  }
  
  /**
   * ⭐ 新增：清理定時器（用於 App 關閉時）
   */
  destroy(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
      console.log('[GPSHistoryService] Periodic save interval cleared');
    }
  }

  /**
   * 保存歷史點到持久化存儲
   * ⭐ 修復：添加驗證確保保存成功
   */
  private async saveToStorage(): Promise<void> {
    try {
      const dataToSave = this.history;
      console.log(`[GPSHistoryService] 💾 Saving ${dataToSave.length} history points to storage...`);
      await saveData(STORAGE_KEYS.GPS_HISTORY, dataToSave);
      
      // ⭐ 新增：驗證保存是否成功（延遲一下確保寫入完成）
      // 注意：驗證邏輯僅用於日誌，不影響應用運行
      await new Promise(resolve => setTimeout(resolve, 200));
      const verifyData = await loadData<GPSHistoryPoint[]>(STORAGE_KEYS.GPS_HISTORY);
      if (verifyData && Array.isArray(verifyData)) {
        const diff = Math.abs(verifyData.length - dataToSave.length);
        if (diff === 0) {
          console.log(`[GPSHistoryService] ✅ Verified: ${verifyData.length} points saved successfully`);
        } else {
          // 只記錄警告，不報錯（可能是並發更新或 AsyncStorage 延遲）
          console.warn(`[GPSHistoryService] ⚠️  Verification: expected ${dataToSave.length}, got ${verifyData.length} (diff: ${diff})`);
        }
      } else {
        console.warn(`[GPSHistoryService] ⚠️  Verification: data is not an array or null`);
      }
    } catch (error) {
      console.error('[GPSHistoryService] ❌ Failed to save GPS history:', error);
      // ⭐ 關鍵：保存失敗時拋出異常，讓調用者知道
      throw error;
    }
  }

  /**
   * 保存會話記錄到持久化存儲
   * ⭐ 修復：添加驗證確保保存成功
   */
  private async saveSessions(): Promise<void> {
    try {
      const sessionsArray = Array.from(this.sessions.values());
      console.log(`[GPSHistoryService] 💾 Saving ${sessionsArray.length} sessions to storage...`);
      await saveData(STORAGE_KEYS.GPS_SESSIONS, sessionsArray);
      
      // ⭐ 新增：驗證保存是否成功（延遲一下確保寫入完成）
      // 注意：驗證邏輯僅用於日誌，不影響應用運行
      await new Promise(resolve => setTimeout(resolve, 200));
      const verifyData = await loadData<CollectionSession[]>(STORAGE_KEYS.GPS_SESSIONS);
      if (verifyData && Array.isArray(verifyData)) {
        const diff = Math.abs(verifyData.length - sessionsArray.length);
        if (diff === 0) {
          console.log(`[GPSHistoryService] ✅ Verified: ${verifyData.length} sessions saved successfully`);
        } else {
          // 只記錄警告，不報錯（可能是並發更新或 AsyncStorage 延遲）
          console.warn(`[GPSHistoryService] ⚠️  Verification: expected ${sessionsArray.length}, got ${verifyData.length} (diff: ${diff})`);
        }
      } else {
        console.warn(`[GPSHistoryService] ⚠️  Verification: data is not an array or null`);
      }
    } catch (error) {
      console.error('[GPSHistoryService] ❌ Failed to save GPS sessions:', error);
      // ⭐ 關鍵：保存失敗時拋出異常，讓調用者知道
      throw error;
    }
  }
  
  /**
   * 🧪 測試功能：隨機刪除一半的歷史會話
   * 用於測試開拓者紅利系統
   */
  async testRandomDeleteHalfSessions(): Promise<{ before: number; after: number; deleted: number }> {
    const originalSize = this.sessions.size;
    
    if (originalSize === 0) {
      console.log('[GPSHistoryService] 🧪 No sessions to delete');
      return { before: 0, after: 0, deleted: 0 };
    }
    
    // 將 Map 轉換為數組，隨機打亂順序
    const sessionsArray = Array.from(this.sessions.entries());
    const shuffled = sessionsArray.sort(() => Math.random() - 0.5);
    
    // 保留前一半
    const keepCount = Math.floor(originalSize / 2);
    const toKeep = shuffled.slice(0, keepCount);
    
    // 清空並重新填充
    this.sessions.clear();
    toKeep.forEach(([id, session]) => {
      this.sessions.set(id, session);
    });
    
    // 同時更新 history 數組（刪除被刪除會話的所有點）
    const keptSessionIds = new Set(toKeep.map(([id]) => id));
    const originalHistorySize = this.history.length;
    this.history = this.history.filter(point => 
      !point.sessionId || keptSessionIds.has(point.sessionId)
    );
    
    // 保存到持久化存儲
    try {
      await this.saveToStorage();
      await this.saveSessions();
      
      console.log('[GPSHistoryService] 🧪 測試：隨機刪除歷史會話', {
        原始會話數: originalSize,
        刪除會話數: originalSize - keepCount,
        保留會話數: keepCount,
        當前會話數: this.sessions.size,
        原始歷史點數: originalHistorySize,
        當前歷史點數: this.history.length,
      });
      
      return {
        before: originalSize,
        after: this.sessions.size,
        deleted: originalSize - keepCount,
      };
    } catch (error) {
      console.error('[GPSHistoryService] ❌ Failed to save after deletion:', error);
      throw error;
    }
  }
}

/**
 * 導出單例實例
 */
export const gpsHistoryService = new GPSHistoryService();

/**
 * 導出類（用於測試）
 */
export { GPSHistoryService };
