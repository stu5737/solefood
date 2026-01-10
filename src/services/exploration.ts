/**
 * 區域探索追蹤服務
 * Solefood MVP v9.0 Plus
 * 
 * 管理已探索區域（Gray Zone）的狀態
 */

import { latLngToH3, H3_RESOLUTION } from '../core/math/h3';
import { saveData, loadData, STORAGE_KEYS } from '../utils/storage';

/**
 * 已探索區域記錄
 */
export interface ExploredRegion {
  h3Index: string;           // H3 網格 ID
  firstExplored: number;     // 首次探索時間戳
  lastVisited: number;       // 最後造訪時間戳
  visitCount: number;        // 造訪次數
}

/**
 * 探索服務類
 */
class ExplorationService {
  private exploredRegions: Map<string, ExploredRegion> = new Map();
  private readonly MEMORY_DAYS = 7; // 7 天未踏足判定為 Gray Zone
  private initialized: boolean = false;

  /**
   * 初始化：從持久化存儲載入已探索區域
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const saved = await loadData<ExploredRegion[]>(STORAGE_KEYS.EXPLORED_REGIONS);
      if (saved && Array.isArray(saved)) {
        saved.forEach((region) => {
          this.exploredRegions.set(region.h3Index, region);
        });
        console.log(`[ExplorationService] Loaded ${this.exploredRegions.size} explored regions`);
      }
      this.initialized = true;
    } catch (error) {
      console.error('[ExplorationService] Failed to load explored regions:', error);
      this.initialized = true; // 即使失敗也標記為已初始化，避免重複嘗試
    }
  }

  /**
   * 記錄玩家造訪區域
   * 
   * @param latitude - 緯度
   * @param longitude - 經度
   * @returns H3 網格 ID
   */
  recordVisit(latitude: number, longitude: number): string {
    // 確保已初始化
    if (!this.initialized) {
      console.warn('[ExplorationService] Not initialized, initializing now...');
      this.initialize().catch(console.error);
    }

    const h3Index = latLngToH3(latitude, longitude, H3_RESOLUTION);
    
    if (!h3Index) {
      console.warn('[ExplorationService] Failed to generate H3 index');
      return '';
    }

    const now = Date.now();

    const existing = this.exploredRegions.get(h3Index);
    if (existing) {
      // 更新已探索區域
      existing.lastVisited = now;
      existing.visitCount += 1;
    } else {
      // 新探索區域
      this.exploredRegions.set(h3Index, {
        h3Index,
        firstExplored: now,
        lastVisited: now,
        visitCount: 1,
      });
      console.log(`[ExplorationService] New region explored: ${h3Index}`);
    }

    // 異步保存（不阻塞主線程）
    this.saveToStorage();

    return h3Index;
  }

  /**
   * 檢查區域是否為 Gray Zone（未探索或 7 天未踏足）
   * 
   * @param h3Index - H3 網格 ID
   * @returns 是否為 Gray Zone
   */
  isGrayZone(h3Index: string): boolean {
    if (!h3Index) {
      return true; // 無效的 H3 ID 視為未探索
    }

    const region = this.exploredRegions.get(h3Index);
    
    if (!region) {
      // 未探索區域 = Gray Zone
      return true;
    }

    // 檢查是否超過 7 天未踏足
    const daysSinceLastVisit = (Date.now() - region.lastVisited) / (1000 * 60 * 60 * 24);
    return daysSinceLastVisit > this.MEMORY_DAYS;
  }

  /**
   * 檢查區域是否為開拓者區域（Gray Zone）
   * 
   * @param latitude - 緯度
   * @param longitude - 經度
   * @returns 是否為開拓者區域
   */
  isPathfinderZone(latitude: number, longitude: number): boolean {
    const h3Index = latLngToH3(latitude, longitude, H3_RESOLUTION);
    return this.isGrayZone(h3Index);
  }

  /**
   * 獲取已探索區域列表
   * 
   * @returns 已探索區域數組
   */
  getExploredRegions(): ExploredRegion[] {
    return Array.from(this.exploredRegions.values());
  }

  /**
   * 從GPS歷史點計算7天內的H3區域統計
   * 用於在地圖上顯示綠色正方形提示已探索區域
   * 
   * @param historyPoints - 7天內的GPS歷史點
   * @returns 區域統計 Map (H3索引 -> 訪問次數)
   */
  calculateRegionStats(historyPoints: Array<{ latitude: number; longitude: number; timestamp: number }>): Map<string, number> {
    const regionStats = new Map<string, number>();
    const sevenDaysAgo = Date.now() - (this.MEMORY_DAYS * 24 * 60 * 60 * 1000);
    
    historyPoints
      .filter(point => point.timestamp >= sevenDaysAgo)
      .forEach(point => {
        const h3Index = latLngToH3(point.latitude, point.longitude, H3_RESOLUTION);
        if (h3Index) {
          const count = regionStats.get(h3Index) || 0;
          regionStats.set(h3Index, count + 1);
        }
      });
    
    return regionStats;
  }

  /**
   * 獲取7天內訪問頻繁的區域（用於綠色正方形顯示）
   * 
   * @param historyPoints - 7天內的GPS歷史點
   * @param minVisits - 最少訪問次數閾值（默認1次）
   * @returns 區域統計數組（按訪問次數排序）
   */
  getFrequentlyVisitedRegions(
    historyPoints: Array<{ latitude: number; longitude: number; timestamp: number }>,
    minVisits: number = 1
  ): Array<{ h3Index: string; visitCount: number }> {
    const stats = this.calculateRegionStats(historyPoints);
    const regions: Array<{ h3Index: string; visitCount: number }> = [];
    
    stats.forEach((visitCount, h3Index) => {
      if (visitCount >= minVisits) {
        regions.push({ h3Index, visitCount });
      }
    });
    
    // 按訪問次數降序排序
    return regions.sort((a, b) => b.visitCount - a.visitCount);
  }

  /**
   * 獲取已探索區域數量
   */
  getExploredCount(): number {
    return this.exploredRegions.size;
  }

  /**
   * 獲取特定區域的探索記錄
   * 
   * @param h3Index - H3 網格 ID
   * @returns 探索記錄或 null
   */
  getRegion(h3Index: string): ExploredRegion | null {
    return this.exploredRegions.get(h3Index) || null;
  }

  /**
   * 保存到持久化存儲
   */
  private async saveToStorage(): Promise<void> {
    try {
      const regions = Array.from(this.exploredRegions.values());
      await saveData(STORAGE_KEYS.EXPLORED_REGIONS, regions);
    } catch (error) {
      console.error('[ExplorationService] Failed to save explored regions:', error);
    }
  }

  /**
   * 清除所有探索記錄（調試用）
   */
  async clearAll(): Promise<void> {
    this.exploredRegions.clear();
    await saveData(STORAGE_KEYS.EXPLORED_REGIONS, []);
    console.log('[ExplorationService] All exploration records cleared');
  }
}

/**
 * 導出單例實例
 */
export const explorationService = new ExplorationService();

/**
 * 導出類（用於測試）
 */
export { ExplorationService };
