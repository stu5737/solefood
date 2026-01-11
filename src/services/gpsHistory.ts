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
  endType?: 'picnic' | 'unload'; // 結束類型：就地野餐 或 餐廳卸貨
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

  /**
   * 初始化：從持久化存儲載入歷史
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 載入所有歷史點（用於7天統計）
      const savedHistory = await loadData<GPSHistoryPoint[]>(STORAGE_KEYS.GPS_HISTORY);
      if (savedHistory && Array.isArray(savedHistory)) {
        const sevenDaysAgo = Date.now() - (this.HISTORY_DAYS * 24 * 60 * 60 * 1000);
        this.history = savedHistory.filter(point => point.timestamp >= sevenDaysAgo);
        console.log(`[GPSHistoryService] Loaded ${this.history.length} history points (last 7 days)`);
      }
      
      // 載入會話記錄
      const savedSessions = await loadData<CollectionSession[]>(STORAGE_KEYS.GPS_SESSIONS);
      if (savedSessions && Array.isArray(savedSessions)) {
        const sevenDaysAgo = Date.now() - (this.HISTORY_DAYS * 24 * 60 * 60 * 1000);
        savedSessions
          .filter(session => session.startTime >= sevenDaysAgo)
          .forEach(session => {
            this.sessions.set(session.sessionId, session);
          });
        console.log(`[GPSHistoryService] Loaded ${this.sessions.size} collection sessions`);
      }
      
      // 確保 appState 有初始值（在設置監聽器之前）
      if (!this.appState) {
        this.appState = AppState.currentState;
      }
      
      // 監聽 App 狀態變化
      AppState.addEventListener('change', (nextAppState) => {
        const wasBackground = this.appState && this.appState.match(/inactive|background/);
        const isNowForeground = nextAppState === 'active';
        
        if (wasBackground && isNowForeground) {
          console.log(`🟢 [GPSHistoryService] App entered FOREGROUND - Background points recorded: ${this.backgroundPointCount}`);
          this.backgroundPointCount = 0;
        } else if (nextAppState.match(/inactive|background/)) {
          console.log('🔴 [GPSHistoryService] App entered BACKGROUND - GPS recording should continue');
        }
        
        this.appState = nextAppState;
      });
      
      this.initialized = true;
    } catch (error) {
      console.error('[GPSHistoryService] Failed to load GPS history:', error);
      // 即使失敗也確保 appState 有值
      if (!this.appState) {
        this.appState = AppState.currentState;
      }
      this.initialized = true; // 即使失敗也標記為已初始化
    }
  }

  /**
   * 開始新的採集會話
   * 
   * @returns 會話 ID
   */
  startSession(): string {
    const sessionId = `session_${Date.now()}`;
    this.currentSessionId = sessionId;
    this.currentSessionPoints = [];
    
    const session: CollectionSession = {
      sessionId,
      startTime: Date.now(),
      points: [],
      totalDistance: 0,
    };
    
    this.sessions.set(sessionId, session);
    console.log('[GPSHistoryService] Started new collection session:', sessionId);
    return sessionId;
  }

  /**
   * 結束當前採集會話
   * 
   * @param endType - 結束類型：'picnic'（就地野餐）或 'unload'（餐廳卸貨）
   */
  endSession(endType: 'picnic' | 'unload'): void {
    if (!this.currentSessionId) {
      console.warn('[GPSHistoryService] No active session to end');
      return;
    }

    const session = this.sessions.get(this.currentSessionId);
    if (session) {
      session.endTime = Date.now();
      session.duration = (session.endTime - session.startTime) / 1000; // 轉換為秒
      session.endType = endType;
      session.points = [...this.currentSessionPoints];
      
      // 計算總距離
      session.totalDistance = this.currentSessionPoints.reduce((sum, point) => {
        return sum + (point.distance || 0);
      }, 0);
      
      console.log(`[GPSHistoryService] Ended session ${this.currentSessionId}, type: ${endType}, distance: ${session.totalDistance.toFixed(2)}km, duration: ${session.duration.toFixed(0)}s`);
      
      // 限制會話數量
      if (this.sessions.size > this.MAX_SESSIONS) {
        const oldestSessionId = Array.from(this.sessions.entries())
          .sort((a, b) => a[1].startTime - b[1].startTime)[0][0];
        this.sessions.delete(oldestSessionId);
      }
      
      this.saveSessions();
    }

    this.currentSessionId = null;
    this.currentSessionPoints = [];
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

    // 添加到當前會話
    this.currentSessionPoints.push(point);
    
    // 更新會話記錄
    const session = this.sessions.get(this.currentSessionId);
    if (session) {
      session.points.push(point);
      session.totalDistance += distance;
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

    // 異步保存（每 10 個點保存一次，減少 I/O）
    if (this.saveCounter >= 10) {
      this.saveCounter = 0;
      this.saveToStorage();
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
    this.history = [];
    this.sessions.clear();
    this.currentSessionId = null;
    this.currentSessionPoints = [];
    this.saveCounter = 0;
    await saveData(STORAGE_KEYS.GPS_HISTORY, []);
    await saveData(STORAGE_KEYS.GPS_SESSIONS, []);
    console.log('[GPSHistoryService] GPS history and sessions cleared');
  }

  /**
   * 強制保存到持久化存儲
   */
  async forceSave(): Promise<void> {
    await this.saveToStorage();
    await this.saveSessions();
  }

  /**
   * 保存歷史點到持久化存儲
   */
  private async saveToStorage(): Promise<void> {
    try {
      await saveData(STORAGE_KEYS.GPS_HISTORY, this.history);
    } catch (error) {
      console.error('[GPSHistoryService] Failed to save GPS history:', error);
    }
  }

  /**
   * 保存會話記錄到持久化存儲
   */
  private async saveSessions(): Promise<void> {
    try {
      const sessionsArray = Array.from(this.sessions.values());
      await saveData(STORAGE_KEYS.GPS_SESSIONS, sessionsArray);
    } catch (error) {
      console.error('[GPSHistoryService] Failed to save GPS sessions:', error);
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
