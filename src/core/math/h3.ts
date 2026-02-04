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

// ⭐ H3 解析度對應的實際邊長（度）
// 基於 H3 官方規格：Resolution 11 的六邊形邊長約 25 米 = 0.000225 度（在赤道附近）
const H3_EDGE_LENGTH_DEGREES: Record<number, number> = {
  9: 0.001,     // ~111m
  10: 0.0005,   // ~55m
  11: 0.000225, // ~25m (實際值，符合 H3 Res 11 規格)
  12: 0.0001,   // ~11m
};

// 降級實現（當 h3-js 無法加載時使用）
const fallbackH3Module = {
  latLngToCell: (lat: number, lng: number, res: number) => {
    // ⭐ 改進：使用統一的網格原點，確保相鄰格子對齊
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
    // ⭐ 添加空值檢查
    if (!h3Index || typeof h3Index !== 'string') {
      return [];
    }
    
    // ⭐ 需求 2：改進六邊形邊界計算，確保邊接邊對齊（像蜂巢一樣）
    const parts = h3Index.split('_');
    if (parts.length === 4 && parts[0] === 'fallback') {
      const res = parseInt(parts[1]);
      const gridSize = Math.pow(10, res);
      
      // ⭐ 關鍵改進：使用網格中心點（確保相鄰格子完美對齊）
      const latGrid = parseInt(parts[2]);
      const lngGrid = parseInt(parts[3]);
      
      // 計算網格中心點（而不是解析的座標）
      const lat = (latGrid + 0.5) / gridSize - 90;
      const lng = (lngGrid + 0.5) / gridSize - 180;
      
      // ⭐ 修復：使用實際的 H3 邊長，而不是計算的 cellSize
      // H3 Resolution 11 的六邊形邊長約 25 米 = 0.000225 度
      // 如果沒有對應的邊長，則根據解析度計算（每降低一級，邊長增加約 2 倍）
      const edgeLength = H3_EDGE_LENGTH_DEGREES[res] || (0.000225 / Math.pow(2, 11 - res));
      
      // 正六邊形：外接圓半徑 = 邊長
      const radius = edgeLength;
      
      // ⭐ 改進：使用正確的起始角度（確保六邊形方向一致）
      // H3 六邊形通常從 30 度開始，讓六邊形有一個頂點向上
      const startAngle = Math.PI / 6; // 30 度
      
      // 創建六邊形（6個頂點）
      const angleStep = (2 * Math.PI) / 6;
      const boundary: Array<[number, number]> = [];
      
      for (let i = 0; i < 6; i++) {
        const angle = startAngle + i * angleStep;
        
        // ⭐ 關鍵：考慮緯度對經度的影響（確保在不同緯度下六邊形大小一致）
        const latOffset = radius * Math.cos(angle);
        const lngOffset = radius * Math.sin(angle) / Math.cos(lat * Math.PI / 180);
        
        const finalLat = lat + latOffset;
        const finalLng = lng + lngOffset;
        
        boundary.push([finalLat, finalLng]);
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
  gridPathCells: (startHex: string, endHex: string) => {
    // ⭐ 降級實現：在兩個 H3 格子之間進行線性插值
    // 這個函數用於填補 GPS 軌跡點之間的 H3 格子，確保連續性
    try {
      // 獲取起點和終點的座標
      const startCoords = fallbackH3Module.cellToLatLng(startHex);
      const endCoords = fallbackH3Module.cellToLatLng(endHex);
      
      if (!startCoords || !endCoords) {
        return [startHex, endHex];
      }
      
      const [startLat, startLng] = startCoords;
      const [endLat, endLng] = endCoords;
      
      // 計算兩點之間的距離（使用簡化的歐幾里得距離）
      const latDiff = endLat - startLat;
      const lngDiff = endLng - startLng;
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
      
      // 如果距離太小，直接返回起點和終點
      if (distance < 0.0001) {
        return [startHex, endHex];
      }
      
      // 計算需要多少個插值點（基於 H3 Resolution 11 的格子大小）
      // Res 11 的格子邊長約 0.000225 度，我們每 0.0001 度插入一個點
      const numSteps = Math.ceil(distance / 0.0001);
      
      // 限制插值點數量，避免性能問題
      const maxSteps = Math.min(numSteps, 100);
      
      // 使用 Set 來存儲唯一的 H3 格子
      const hexSet = new Set<string>();
      hexSet.add(startHex);
      
      // 在起點和終點之間進行線性插值
      for (let i = 1; i < maxSteps; i++) {
        const t = i / maxSteps;
        const interpLat = startLat + latDiff * t;
        const interpLng = startLng + lngDiff * t;
        
        // 將插值點轉換為 H3 格子
        const interpHex = fallbackH3Module.latLngToCell(interpLat, interpLng, H3_RESOLUTION);
        hexSet.add(interpHex);
      }
      
      hexSet.add(endHex);
      
      // 返回唯一的 H3 格子陣列
      return Array.from(hexSet);
    } catch {
      return [startHex, endHex];
    }
  },
};

async function getH3Module() {
  if (!h3Module && !h3LoadAttempted) {
    h3LoadAttempted = true;
    try {
      // 嘗試異步導入
      h3Module = await import('h3-js');
    } catch {
      h3Module = fallbackH3Module;
    }
  }
  return h3Module || fallbackH3Module;
}

// 同步版本的導入（用於非異步場景）
// 在 React Native 中，我們直接使用降級實現，避免 require 導致的編碼錯誤
export function getH3ModuleSync() {
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
      return fallbackH3Module.latLngToCell(latitude, longitude, resolution);
    }
    const h3Index = h3.latLngToCell(latitude, longitude, resolution);
    return h3Index || '';
  } catch {
    try {
      return fallbackH3Module.latLngToCell(latitude, longitude, resolution);
    } catch {
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
      // ⭐ 降級方案：如果 h3-js 不可用，使用 fallback 實現
      if (h3Index && h3Index.startsWith('fallback_')) {
        const [lat, lng] = fallbackH3Module.cellToLatLng(h3Index);
        return { latitude: lat, longitude: lng };
      }
      return null;
    }
    const [lat, lng] = h3.cellToLatLng(h3Index);
    return { latitude: lat, longitude: lng };
  } catch (error) {
    // ⭐ 降級方案：發生錯誤時，嘗試使用 fallback 實現
    if (h3Index && h3Index.startsWith('fallback_')) {
      try {
        const [lat, lng] = fallbackH3Module.cellToLatLng(h3Index);
        return { latitude: lat, longitude: lng };
      } catch {
        return null;
      }
    }
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
  // ⭐ 添加空值檢查
  if (!h3Index || typeof h3Index !== 'string') {
    return [];
  }
  
  try {
    const h3 = getH3ModuleSync();
    if (!h3 || !h3.cellToBoundary) {
      return fallbackH3Module.cellToBoundary(h3Index);
    }
    const boundary = h3.cellToBoundary(h3Index);
    return boundary || [];
  } catch {
    try {
      return fallbackH3Module.cellToBoundary(h3Index);
    } catch {
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
      return H3_RESOLUTION;
    }
    return h3.getResolution(h3Index);
  } catch {
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

/**
 * 計算兩個 H3 格子之間的路徑（填補中間的格子）
 * 使用 H3 的 gridPathCells 方法
 * 
 * @param startHex 起始 H3 索引
 * @param endHex 結束 H3 索引
 * @returns 路徑上所有 H3 格子的陣列（包含起點和終點）
 */
export function getH3GridPath(
  startHex: string,
  endHex: string
): string[] {
  try {
    const h3 = getH3ModuleSync();
    
    // 檢查是否支持 gridPathCells
    if (h3 && typeof h3.gridPathCells === 'function') {
      return h3.gridPathCells(startHex, endHex);
    }
    
    // 降級方案：使用 fallback 模組的線性插值實現
    return fallbackH3Module.gridPathCells(startHex, endHex);
  } catch {
    try {
      return fallbackH3Module.gridPathCells(startHex, endHex);
    } catch {
      return [startHex, endHex];
    }
  }
}

/**
 * 獲取 H3 格子的子格子（用於分辨率轉換）
 */
export function getH3CellChildren(h3Index: string, childResolution: number): string[] {
  try {
    const h3 = getH3ModuleSync();
    
    // 使用 fallbackH3Module 的 cellToChildren 方法
    if (h3 && typeof h3.cellToChildren === 'function') {
      return h3.cellToChildren(h3Index, childResolution);
    }
    
    return [h3Index];
  } catch {
    return [h3Index];
  }
}
