/**
 * GPS 歷史軌跡服務
 * Solefood MVP v9.0 Plus
 * 
 * 追蹤玩家移動軌跡，用於防作弊和視覺化
 */

import { LocationData } from './location';
import { saveData, loadData, STORAGE_KEYS } from '../utils/storage';

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
}

/**
 * GPS 歷史服務類
 */
class GPSHistoryService {
  private history: GPSHistoryPoint[] = [];
  private readonly MAX_HISTORY_POINTS = 1000; // 最多保存 1000 個點
  private readonly MIN_DISTANCE_THRESHOLD = 0.01; // 最小距離閾值（10m）
  private initialized: boolean = false;
  private saveCounter: number = 0; // 計數器，用於控制保存頻率

  /**
   * 初始化：從持久化存儲載入歷史
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const saved = await loadData<GPSHistoryPoint[]>(STORAGE_KEYS.GPS_HISTORY);
      if (saved && Array.isArray(saved)) {
        this.history = saved.slice(-this.MAX_HISTORY_POINTS); // 只保留最近的點
        console.log(`[GPSHistoryService] Loaded ${this.history.length} history points`);
      }
      this.initialized = true;
    } catch (error) {
      console.error('[GPSHistoryService] Failed to load GPS history:', error);
      this.initialized = true; // 即使失敗也標記為已初始化
    }
  }

  /**
   * 添加 GPS 點到歷史
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

    // 過濾太近的點（減少存儲空間）
    if (distance < this.MIN_DISTANCE_THRESHOLD && this.history.length > 0) {
      return;
    }

    const point: GPSHistoryPoint = {
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: location.timestamp,
      speed: location.speed,
      accuracy: location.accuracy,
      distance,
    };

    this.history.push(point);
    this.saveCounter++;

    // 限制歷史點數量
    if (this.history.length > this.MAX_HISTORY_POINTS) {
      this.history.shift(); // 移除最舊的點
    }

    // 異步保存（每 10 個點保存一次，減少 I/O）
    if (this.saveCounter >= 10) {
      this.saveCounter = 0;
      this.saveToStorage();
    }
  }

  /**
   * 獲取歷史軌跡
   * 
   * @param limit - 限制返回的點數（可選）
   * @returns GPS 歷史點數組
   */
  getHistory(limit?: number): GPSHistoryPoint[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  /**
   * 獲取最近 N 個點
   * 
   * @param count - 點數
   * @returns GPS 歷史點數組
   */
  getRecentPoints(count: number): GPSHistoryPoint[] {
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
    this.saveCounter = 0;
    await saveData(STORAGE_KEYS.GPS_HISTORY, []);
    console.log('[GPSHistoryService] GPS history cleared');
  }

  /**
   * 強制保存到持久化存儲
   */
  async forceSave(): Promise<void> {
    await this.saveToStorage();
  }

  /**
   * 保存到持久化存儲
   */
  private async saveToStorage(): Promise<void> {
    try {
      await saveData(STORAGE_KEYS.GPS_HISTORY, this.history);
    } catch (error) {
      console.error('[GPSHistoryService] Failed to save GPS history:', error);
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
