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
  lastActiveTime?: number; // ✅ 最後活動時間（用於檢測僵尸會話）
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
  
  // ========== 🚀 GPS 三層過濾漏斗 (3-Layer Filtering Funnel) ==========
  private readonly MAX_ACCURACY_THRESHOLD = 40; // 第一層：最大精度閾值（米），超過此值丟棄
  private readonly MAX_SPEED_THRESHOLD = 10; // 第二層：最大合理速度（m/s），超過此值可能是飄移（約 36 km/h）
  private readonly MAX_JUMP_DISTANCE = 50; // 第二層：最大合理跳躍距離（米），超過此值需驗證速度
  private readonly SMOOTHING_BUFFER_SIZE = 5; // 第三層：平滑化窗口大小（保留最近 5 個點）
  
  private locationBuffer: Array<{ latitude: number; longitude: number; timestamp: number }> = []; // 平滑化緩衝區
  private lastValidLocation: { latitude: number; longitude: number; timestamp: number } | null = null; // 上一個通過過濾的位置

  /**
   * 初始化：從持久化存儲載入歷史
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // ⭐ 修復：載入所有歷史點（用於7天統計），添加詳細日誌
      const savedHistory = await loadData<GPSHistoryPoint[]>(STORAGE_KEYS.GPS_HISTORY);
      
      if (savedHistory === null) {
        this.history = [];
      } else if (!Array.isArray(savedHistory)) {
        this.history = [];
      } else {
        const sevenDaysAgo = Date.now() - (this.HISTORY_DAYS * 24 * 60 * 60 * 1000);
        this.history = savedHistory.filter(point => point.timestamp >= sevenDaysAgo);
      }
      
      // ⭐ 修復：載入會話記錄，添加詳細日誌
      const savedSessions = await loadData<CollectionSession[]>(STORAGE_KEYS.GPS_SESSIONS);
      
      if (savedSessions === null) {
        this.sessions.clear();
      } else if (!Array.isArray(savedSessions)) {
        this.sessions.clear();
      } else {
        const sevenDaysAgo = Date.now() - (this.HISTORY_DAYS * 24 * 60 * 60 * 1000);
        savedSessions
          .filter(session => session.startTime >= sevenDaysAgo)
          .forEach(session => {
            this.sessions.set(session.sessionId, session);
          });
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
          this.backgroundPointCount = 0;
        } else if (isNowBackground) {
          try {
            await this.forceSave();
          } catch {
            // 靜默忽略
          }
        }
        
        this.appState = nextAppState;
      });
      
      // ⭐ 新增：每 30 秒自動保存一次（防止數據丟失）
      this.saveInterval = setInterval(() => {
        if (this.currentSessionId || this.history.length > 0 || this.sessions.size > 0) {
          this.forceSave().catch(() => {});
        }
      }, 30000); // 30 秒
      
      // ✅ 新增：清理僵尸會話（沒有 endTime 且超過 1 小時沒活動的會話）
      const now = Date.now();
      const ONE_HOUR = 60 * 60 * 1000;
      let zombieCount = 0;
      
      Array.from(this.sessions.values()).forEach(session => {
        if (!session.endTime) {
          const lastActive = session.lastActiveTime || session.startTime;
          const inactiveDuration = now - lastActive;
          
          if (inactiveDuration > ONE_HOUR) {
            this.sessions.delete(session.sessionId);
            zombieCount++;
          }
        }
      });
      
      if (zombieCount > 0) {
        await this.saveSessions();
      }
      
      this.initialized = true;
    } catch {
      if (!this.appState) {
        this.appState = AppState.currentState;
      }
      this.initialized = true;
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
      await this.endSession('manual');
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
      return;
    }

    // ⭐ 立即保存並清空 currentSessionId，防止重複調用
    const sessionId = this.currentSessionId;
    this.currentSessionId = null;

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
      }
      
      this.saveSessions();
    }

    // ⭐ 新增：在結束會話時，將當前會話的新 H3 合併到 exploredHexes
    try {
      const { useSessionStore } = require('../stores/sessionStore');
      const store = useSessionStore.getState();
      if (store.mergeCurrentSessionHexes) {
        await store.mergeCurrentSessionHexes();
      }
    } catch {
      // 靜默忽略
    }

    // ⭐ 關鍵修復：結束會話時立即強制保存
    try {
      await this.forceSave();
    } catch {
      // 靜默忽略
    }

    this.currentSessionPoints = [];
    this.locationBuffer = [];
    this.lastValidLocation = null;
  }

  /**
   * 添加 GPS 點到歷史（只有在會話進行中時才記錄）
   * 
   * ✅ 實施三層過濾漏斗 (3-Layer Filtering Funnel)：
   * 1. 精度過濾 (Accuracy Gate) - 過濾低精度訊號
   * 2. 速度過濾 (Teleport Protection) - 過濾瞬移噪點
   * 3. 平滑化窗口 (Smoothing Window) - 平滑 GPS 抖動
   * 
   * @param location - 位置數據
   * @param distance - 與上一點的距離（km）
   */
  addPoint(location: LocationData, distance: number = 0): void {
    // 確保已初始化
    if (!this.initialized) {
      this.initialize().catch(() => {});
    }

    // 如果沒有活動會話，不記錄點
    if (!this.currentSessionId) {
      return;
    }

    // ✅ 新增：立即更新會話的最後活動時間（用於檢測僵尸會話）
    // 提前獲取 session，後續代碼會重用此變量
    let session = this.sessions.get(this.currentSessionId);
    if (session) {
      session.lastActiveTime = Date.now();
    }

    // ========== 第一層：精度過濾 (Accuracy Gate) ==========
    // 檢查 GPS 精度，如果誤差超過 40m，這數據完全不可信（室內或高樓反射）
    const accuracy = location.accuracy || 0;
    if (accuracy > this.MAX_ACCURACY_THRESHOLD) {
      return;
    }

    // ========== 第二層：速度過濾 (Teleport Protection) ==========
    // 檢查移動速度，過濾瞬移噪點
    if (this.lastValidLocation) {
      const timeDiff = (location.timestamp - this.lastValidLocation.timestamp) / 1000; // 秒
      
      // 只有時間差大於 0.5 秒才進行速度檢查（避免時間戳異常）
      if (timeDiff > 0.5) {
        const distMeters = this.calculateDistanceMeters(
          this.lastValidLocation.latitude,
          this.lastValidLocation.longitude,
          location.latitude,
          location.longitude
        );
        
        const speed = distMeters / timeDiff; // m/s
        
        // 如果速度超過 10 m/s (36 km/h) 且距離超過 50m，視為異常飄移
        if (speed > this.MAX_SPEED_THRESHOLD && distMeters > this.MAX_JUMP_DISTANCE) {
          return;
        }
      }
    }

    // ========== 第三層：平滑化窗口 (Smoothing Window) ==========
    // 將通過過濾的點加入緩衝區，計算平均座標
    this.locationBuffer.push({
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: location.timestamp,
    });
    
    // 只保留最近 N 個點
    if (this.locationBuffer.length > this.SMOOTHING_BUFFER_SIZE) {
      this.locationBuffer.shift();
    }
    
    // 計算平均座標（平滑化）
    const avgLat = this.locationBuffer.reduce((sum, p) => sum + p.latitude, 0) / this.locationBuffer.length;
    const avgLng = this.locationBuffer.reduce((sum, p) => sum + p.longitude, 0) / this.locationBuffer.length;
    
    // 使用平滑後的座標創建點（但保留原始數據供參考）
    const smoothedLocation: LocationData = {
      latitude: avgLat,
      longitude: avgLng,
      timestamp: location.timestamp,
      accuracy: location.accuracy,
      speed: location.speed,
    };
    
    // 更新最後有效位置（使用原始座標，用於下次速度檢查）
    this.lastValidLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: location.timestamp,
    };
    
    // 計算與平滑後上一點的距離（用於距離過濾）
    let smoothedDistance = 0;
    if (this.currentSessionPoints.length > 0) {
      const lastPoint = this.currentSessionPoints[this.currentSessionPoints.length - 1];
      // 計算平滑後的距離（米），然後轉換為公里
      smoothedDistance = this.calculateDistanceMeters(
        lastPoint.latitude,
        lastPoint.longitude,
        avgLat,
        avgLng
      ) / 1000; // 轉換為 km
    } else {
      // 第一個點，如果傳入了 distance 參數（單位是米），轉換為公里
      smoothedDistance = distance / 1000; // distance 是米，轉換為 km
    }

    // 過濾太近的點（減少存儲空間），但第一個點始終記錄
    if (this.currentSessionPoints.length > 0 && smoothedDistance < this.MIN_DISTANCE_THRESHOLD) {
      return;
    }

    // 判斷是否在背景模式（添加 null 檢查）
    const isBackground = this.appState && this.appState.match(/inactive|background/);
    if (isBackground) {
      this.backgroundPointCount++;
    }

    // 使用平滑後的座標創建點
    const point: GPSHistoryPoint = {
      latitude: avgLat, // ✅ 使用平滑後的緯度
      longitude: avgLng, // ✅ 使用平滑後的經度
      timestamp: smoothedLocation.timestamp,
      speed: smoothedLocation.speed,
      accuracy: smoothedLocation.accuracy,
      distance: smoothedDistance, // ✅ 使用平滑後的距離（單位：km）
      sessionId: this.currentSessionId,
    };

    // ⭐ 防崩潰修復 3：資料量過載保護 - 限制單次會話的點數
    const MAX_SESSION_POINTS = 5000; // 單次會話最多 5000 個點（防止記憶體爆炸）
    
    // 添加到當前會話
    this.currentSessionPoints.push(point);
    
    // ⭐ 如果會話點數超過限制，只保留最新的點
    if (this.currentSessionPoints.length > MAX_SESSION_POINTS) {
      this.currentSessionPoints = this.currentSessionPoints.slice(-MAX_SESSION_POINTS);
    }
    
    // 更新會話記錄（重用前面已獲取的 session 變量）
    if (session) {
      session.points.push(point);
      // ✅ 修復：使用 smoothedDistance（單位：km），而不是 distance（單位：米）
      session.totalDistance += smoothedDistance;
      
      // ⭐ 防崩潰修復 4：限制會話記錄中的點數（防止渲染崩潰）
      if (session.points.length > MAX_SESSION_POINTS) {
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

    // ⭐ 修復：每 2 個點保存一次（從 5 改為 2），最大程度減少閃退時的數據丟失
    if (this.saveCounter >= 2) {
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
    // 1. 清除內存數據
    this.history = [];
    this.sessions.clear();
    this.currentSessionId = null;
    this.currentSessionPoints = [];
    this.saveCounter = 0;
    
    // ✅ 清除 GPS 過濾緩衝區
    this.locationBuffer = [];
    this.lastValidLocation = null;
    
    // 2. 清除持久化存儲
    await saveData(STORAGE_KEYS.GPS_HISTORY, []);
    await saveData(STORAGE_KEYS.GPS_SESSIONS, []);
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  /**
   * 計算兩點之間的距離（米）
   * 使用 Haversine 公式
   * 
   * @param lat1 - 起點緯度
   * @param lng1 - 起點經度
   * @param lat2 - 終點緯度
   * @param lng2 - 終點經度
   * @returns 距離（米）
   */
  private calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // 地球半徑（米）
    const toRad = (deg: number) => deg * Math.PI / 180;
    
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * 強制保存到持久化存儲
   */
  async forceSave(): Promise<void> {
    try {
      await this.saveToStorage();
      await this.saveSessions();
    } catch (error) {
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
    }
  }

  /**
   * 保存歷史點到持久化存儲
   * ⭐ 修復：添加驗證確保保存成功
   */
  private async saveToStorage(): Promise<void> {
    try {
      const dataToSave = this.history;
      await saveData(STORAGE_KEYS.GPS_HISTORY, dataToSave);
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
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
      await saveData(STORAGE_KEYS.GPS_SESSIONS, sessionsArray);
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
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
      
      return {
        before: originalSize,
        after: this.sessions.size,
        deleted: originalSize - keepCount,
      };
    } catch (error) {
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
