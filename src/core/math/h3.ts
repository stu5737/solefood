/**
 * H3 網格系統工具模組
 * Solefood MVP v9.0 Plus
 * 
 * 使用 Uber H3 進行地理空間網格化
 */

// 使用動態導入以避免 React Native 兼容性問題
// 在 React Native 中，h3-js 可能無法正常工作，因此使用降級實現
let h3Module: any = null;
let h3LoadAttempted: boolean = false;

// 降級實現（當 h3-js 無法加載時使用）
const fallbackH3Module = {
  latLngToCell: (lat: number, lng: number, res: number) => {
    // 簡單的網格 ID 生成（基於座標的哈希）
    // 這不是真正的 H3，但可以作為臨時替代方案
    const gridSize = Math.pow(10, res);
    const latGrid = Math.floor((lat + 90) * gridSize);
    const lngGrid = Math.floor((lng + 180) * gridSize);
    return `fallback_${res}_${latGrid}_${lngGrid}`;
  },
  cellToLatLng: (h3Index: string) => {
    // 從降級 ID 中解析座標
    const parts = h3Index.split('_');
    if (parts.length === 4 && parts[0] === 'fallback') {
      const res = parseInt(parts[1]);
      const gridSize = Math.pow(10, res);
      const lat = (parseInt(parts[2]) / gridSize) - 90;
      const lng = (parseInt(parts[3]) / gridSize) - 180;
      return [lat, lng];
    }
    return [0, 0];
  },
  cellToBoundary: (h3Index: string) => {
    // 降級實現：從 H3 ID 解析中心點並創建一個簡單的六邊形
    const parts = h3Index.split('_');
    if (parts.length === 4 && parts[0] === 'fallback') {
      const res = parseInt(parts[1]);
      const gridSize = Math.pow(10, res);
      const lat = (parseInt(parts[2]) / gridSize) - 90;
      const lng = (parseInt(parts[3]) / gridSize) - 180;
      
      // 根據解析度調整六邊形大小
      const size = res >= 11 ? 0.0006 : res >= 10 ? 0.0012 : res >= 9 ? 0.0025 : 0.005;
      
      // 創建六邊形（6個頂點）
      const angleStep = (2 * Math.PI) / 6;
      const boundary: Array<[number, number]> = [];
      for (let i = 0; i < 6; i++) {
        const angle = i * angleStep;
        const latOffset = size * Math.cos(angle);
        const lngOffset = size * Math.sin(angle) / Math.cos(lat * Math.PI / 180);
        boundary.push([lat + latOffset, lng + lngOffset]);
      }
      return boundary;
    }
    return [];
  },
  getResolution: () => H3_RESOLUTION,
  getBaseCellNumber: () => 0,
  cellToChildren: (h3Index: string, resolution: number) => {
    // 降級實現：從 Res 10 轉換為 Res 11
    // 一個 Res 10 格子包含 7 個 Res 11 格子（H3 的父子關係）
    const parts = h3Index.split('_');
    if (parts.length === 4 && parts[0] === 'fallback') {
      const currentRes = parseInt(parts[1]);
      if (currentRes === resolution - 1) {
        // 如果目標分辨率比當前分辨率高 1，則生成 7 個子格子
        const gridSize = Math.pow(10, currentRes);
        const lat = (parseInt(parts[2]) / gridSize) - 90;
        const lng = (parseInt(parts[3]) / gridSize) - 180;
        
        // 生成 7 個子格子（中心 + 6 個方向）
        const childSize = 0.0003; // Res 11 的子格子偏移量（約為 Res 10 的 1/2）
        const children: string[] = [];
        
        // 中心格子
        const childGridSize = Math.pow(10, resolution);
        const centerLatGrid = Math.floor((lat + 90) * childGridSize);
        const centerLngGrid = Math.floor((lng + 180) * childGridSize);
        children.push(`fallback_${resolution}_${centerLatGrid}_${centerLngGrid}`);
        
        // 6 個方向的子格子（簡化實現，使用固定偏移）
        const offsets = [
          [childSize, 0],
          [childSize * 0.5, childSize * 0.866],
          [-childSize * 0.5, childSize * 0.866],
          [-childSize, 0],
          [-childSize * 0.5, -childSize * 0.866],
          [childSize * 0.5, -childSize * 0.866],
        ];
        
        for (const [latOffset, lngOffset] of offsets) {
          const childLat = lat + latOffset;
          const childLng = lng + lngOffset / Math.cos(lat * Math.PI / 180);
          const childLatGrid = Math.floor((childLat + 90) * childGridSize);
          const childLngGrid = Math.floor((childLng + 180) * childGridSize);
          children.push(`fallback_${resolution}_${childLatGrid}_${childLngGrid}`);
        }
        
        return children;
      }
    }
    // 如果不是 fallback 格式或分辨率不匹配，返回空數組
    return [];
  },
};

async function getH3Module() {
  if (!h3Module && !h3LoadAttempted) {
    h3LoadAttempted = true;
    try {
      // 嘗試異步導入
      h3Module = await import('h3-js');
      console.log('[H3] Successfully loaded h3-js module');
    } catch (error) {
      console.warn('[H3] Failed to load h3-js module asynchronously, using fallback:', error);
      h3Module = fallbackH3Module;
    }
  }
  return h3Module || fallbackH3Module;
}

// 同步版本的導入（用於非異步場景）
// 在 React Native 中，我們直接使用降級實現，避免 require 導致的編碼錯誤
function getH3ModuleSync() {
  // 如果已經成功加載，返回已加載的模組
  if (h3Module && h3Module !== fallbackH3Module) {
    return h3Module;
  }
  
  // 否則使用降級實現（避免在 React Native 中觸發 require 錯誤）
  // 注意：這意味著在 React Native 中，我們將使用簡化的網格系統
  if (!h3LoadAttempted) {
    // 標記為已嘗試，但不在同步函數中實際加載（避免編碼錯誤）
    h3LoadAttempted = true;
    // 異步嘗試加載（不阻塞）
    getH3Module().catch(() => {
      // 如果異步加載也失敗，保持使用降級實現
    });
  }
  
  return fallbackH3Module;
}

/**
 * H3 解析度配置
 * 
 * 解析度越高，網格越小，精度越高
 * - Resolution 9: ~0.1 km² (~174m 邊長)
 * - Resolution 10: ~0.05 km² (~66m 邊長，推薦用於走路遊戲)
 * - Resolution 11: ~0.01 km² (~25m 邊長，高精度)
 */
export const H3_RESOLUTION = 11; // Res 11: 邊長約 25m，更符合人行/跑步的探索尺度（約四線道馬路寬度）

/**
 * 將 GPS 座標轉換為 H3 網格 ID
 * 
 * @param latitude - 緯度
 * @param longitude - 經度
 * @param resolution - H3 解析度（可選，默認為 H3_RESOLUTION）
 * @returns H3 網格 ID (string)
 */
export function latLngToH3(
  latitude: number,
  longitude: number,
  resolution: number = H3_RESOLUTION
): string {
  try {
    const h3 = getH3ModuleSync();
    // 降級實現總是提供 latLngToCell，所以這個檢查應該不會觸發
    // 但為了安全起見，我們仍然檢查
    if (!h3 || typeof h3.latLngToCell !== 'function') {
      console.warn('[H3] h3-js module not available, using fallback');
      // 直接使用降級實現
      return fallbackH3Module.latLngToCell(latitude, longitude, resolution);
    }
    const h3Index = h3.latLngToCell(latitude, longitude, resolution);
    return h3Index || '';
  } catch (error) {
    console.error('[H3] Failed to convert lat/lng to H3:', error);
    // 發生錯誤時使用降級實現
    try {
      return fallbackH3Module.latLngToCell(latitude, longitude, resolution);
    } catch (fallbackError) {
      console.error('[H3] Fallback also failed:', fallbackError);
      return '';
    }
  }
}

/**
 * 將 H3 網格 ID 轉換為中心座標
 * 
 * @param h3Index - H3 網格 ID
 * @returns 中心座標 { latitude, longitude }
 */
export function h3ToLatLng(h3Index: string): { latitude: number; longitude: number } | null {
  try {
    const h3 = getH3ModuleSync();
    if (!h3 || !h3.cellToLatLng) {
      console.warn('[H3] h3-js module not available');
      return null;
    }
    const [lat, lng] = h3.cellToLatLng(h3Index);
    return { latitude: lat, longitude: lng };
  } catch (error) {
    console.error('[H3] Failed to convert H3 to lat/lng:', error);
    return null;
  }
}

/**
 * 獲取 H3 網格的邊界座標（用於繪製多邊形）
 * 
 * @param h3Index - H3 網格 ID
 * @returns 邊界座標陣列 [[lat, lng], ...]
 */
export function getH3CellBoundary(h3Index: string): Array<[number, number]> {
  try {
    const h3 = getH3ModuleSync();
    if (!h3 || !h3.cellToBoundary) {
      console.warn('[H3] cellToBoundary not available, using fallback');
      return fallbackH3Module.cellToBoundary(h3Index);
    }
    const boundary = h3.cellToBoundary(h3Index);
    return boundary || [];
  } catch (error) {
    console.error('[H3] Failed to get cell boundary:', error);
    // 發生錯誤時使用降級實現
    try {
      return fallbackH3Module.cellToBoundary(h3Index);
    } catch (fallbackError) {
      console.error('[H3] Fallback also failed:', fallbackError);
      return [];
    }
  }
}

/**
 * 獲取 H3 網格的解析度
 * 
 * @param h3Index - H3 網格 ID
 * @returns 解析度 (0-15)
 */
export function getH3Resolution(h3Index: string): number {
  try {
    const h3 = getH3ModuleSync();
    if (!h3 || !h3.getResolution) {
      console.warn('[H3] h3-js module not available');
      return H3_RESOLUTION;
    }
    return h3.getResolution(h3Index);
  } catch (error) {
    console.error('[H3] Failed to get resolution:', error);
    return H3_RESOLUTION;
  }
}

/**
 * 驗證 H3 網格 ID 是否有效
 * 
 * @param h3Index - H3 網格 ID
 * @returns 是否有效
 */
export function isValidH3Index(h3Index: string): boolean {
  try {
    const h3 = getH3ModuleSync();
    if (!h3 || !h3.getBaseCellNumber) {
      return false;
    }
    h3.getBaseCellNumber(h3Index);
    return true;
  } catch (error) {
    return false;
  }
}
