/**
 * Mapbox 配置
 * Solefood v10.0 - 活力暖陽主題
 * 
 * 品牌精神：享受美食 × 享受運動 = 溫暖活力的生活態度
 */

// ⚠️ 重要：請在 .env 文件中設置你的 MAPBOX_ACCESS_TOKEN
// 或直接在這裡替換為你的 token
export const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || 'pk.eyJ1Ijoic3R1NTczNyIsImEiOiJjbDNnZTdqdGswcWFtM2NreWVsanAwM2EyIn0.uSN5Ylk5k1Zl3MwkH8HKTw';

/**
 * Mapbox 樣式 URL
 * 
 * 預設樣式：
 * - mapbox://styles/mapbox/dark-v11 (深色)
 * - mapbox://styles/mapbox/light-v11 (淺色)
 * - mapbox://styles/mapbox/streets-v12 (街道)
 * - mapbox://styles/mapbox/outdoors-v12 (戶外)
 * - mapbox://styles/mapbox/satellite-v9 (衛星)
 * 
 * 自定義樣式：
 * - 在 Mapbox Studio 創建後，使用 mapbox://styles/YOUR_USERNAME/YOUR_STYLE_ID
 */
export const MAPBOX_STYLE_URL = 'mapbox://styles/mapbox/dark-v11';

/**
 * Pokémon GO 風格攝影機配置
 */
export const CAMERA_CONFIG = {
  // 縮放層級（17.5 = 約 200-300m 可見範圍）
  zoomLevel: 17.5,
  
  // 傾斜角度（65° = Solefood 專屬極端傾斜）
  pitch: 65,
  
  // 動畫時長（ms）
  animationDuration: 300,
  
  // 跟隨模式
  followUserMode: 'course' as const, // 'normal' | 'compass' | 'course'
};

/**
 * 🎨 地圖標籤樣式配置
 * 用於控制路名、POI 等標籤的顯示
 */

/**
 * 極簡樣式（無標籤）- 用於探索模式
 * 隱藏所有文字標籤，突出 H3 視覺效果
 */
export const NO_LABELS_STYLE_JSON = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'hide-labels',
      type: 'symbol',
      layout: {
        'text-field': '',
        visibility: 'none',
      },
    },
  ],
  // 通過 metadata 標記這是覆蓋樣式
  metadata: {
    'mapbox:autocomposite': true,
  },
} as any;

/**
 * 幽靈標籤樣式（極淡標籤）- 高級選項
 * 標籤顏色極淡，不搶 H3 風采，但仔細看還能看見
 */
export const GHOST_LABELS_STYLE_JSON = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'ghost-labels',
      type: 'symbol',
      paint: {
        'text-color': '#dddddd', // 極淡灰色
        'text-halo-color': 'rgba(255, 255, 255, 0)',
        'text-halo-width': 0,
      },
    },
  ],
  metadata: {
    'mapbox:autocomposite': true,
  },
} as any;

/**
 * 🚀 Mapbox 樣式版本號（快速開發用）
 * 每次在 Mapbox Studio 更新樣式後，遞增此版本號即可強制刷新
 * 例如：v1 → v2 → v3...
 */
export const MAP_STYLE_VERSION = 'v5';

/**
 * 🎨 Solefood 品牌配色 - 雙主題系統
 * 核心理念：享受美食 × 享受運動 = 溫暖活力的生活態度
 */

/**
 * 🌅 早晨主題：「晨跑軌跡」
 * 論述：用腳步點亮城市的早晨，每一步都像朝陽升起
 * 色彩：活力橙 → 暖黃 → 金色陽光
 */
export const MORNING_THEME = {
  name: '早晨',
  // ✅ 使用自定義地圖樣式（無標籤，突出 H3）
  // 🚀 添加版本號強制刷新：每次更新樣式時，在文件頂部將 MAP_STYLE_VERSION 遞增
  mapStyle: `mapbox://styles/stu5737/cmkgi75b3000h01sr360cbqgv?v=${MAP_STYLE_VERSION}`, // 自定義樣式（探索模式）
  mapStyleWithLabels: `mapbox://styles/mapbox/light-v11?v=${MAP_STYLE_VERSION}`, // 導航模式：使用預設淺色樣式（有標籤）
  historyH3: {
    heatmapColor: [
      'interpolate', ['linear'], ['heatmap-density'],
      0, 'rgba(255, 180, 100, 0)',      // 完全透明
      0.1, 'rgba(255, 180, 100, 0.10)', // 淡淡的晨光（增強）
      0.3, 'rgba(255, 200, 120, 0.22)', // 暖黃色晨光（增強）
      0.6, 'rgba(255, 210, 140, 0.35)', // 明亮的朝陽（增強）
      1, 'rgba(255, 220, 150, 0.50)'    // 中心：金色陽光（增強到 50%）
    ] as any,
    fill: {
      color: 'rgba(255, 200, 120, 1)', // 暖黃色
      opacityRange: { max: 0.50, min: 0.10 }, // 早晨模式：更明顯的透明度範圍
    },
  },
  // ✅ 早晨模式下的 UI 元素顏色（深色系，在淺色地圖上可見）
  currentH3: {
    stroke: {
      color: 'rgba(255, 120, 50, 0.6)', // 深橙色邊框
      width: 2.5, // ✅ 線寬很粗（可愛風格）
      opacity: 0.2, // ✅ 透明度（從 0.05 改為 0.2）
      dasharray: [10, 2], // ✅ 虛線間隔很密（實線長，間隙短，可愛風格）
    },
  },
  gpsTrail: {
    color: 'rgba(255, 120, 50, 0.8)', // 深橙色軌跡
    width: 3,
  },
  userMarker: {
    arrow: {
      color: '#FF6B35', // 深橙色箭頭
      haloColor: 'rgba(255, 255, 255, 0.9)', // 白色光暈
      haloWidth: 3, // ✅ 縮小 25%（從 4 改為 3）
    },
  },
};

/**
 * 🌙 夜晚主題：「點亮城市」
 * 論述：夜晚的探索像燈光點亮城市街道
 * 色彩：溫暖米色（像麵包、米飯的顏色）
 */
export const NIGHT_THEME = {
  name: '夜晚',
  // ✅ 使用自定義地圖樣式（無標籤，突出 H3）
  // 🚀 添加版本號強制刷新：每次更新樣式時，在文件頂部將 MAP_STYLE_VERSION 遞增
  mapStyle: `mapbox://styles/stu5737/cmkgi75b3000h01sr360cbqgv?v=${MAP_STYLE_VERSION}`, // 自定義樣式（探索模式）
  mapStyleWithLabels: `mapbox://styles/mapbox/dark-v11?v=${MAP_STYLE_VERSION}`, // 導航模式：使用預設深色樣式（有標籤）
  historyH3: {
    heatmapColor: [
      'interpolate', ['linear'], ['heatmap-density'],
      0, 'rgba(255, 220, 177, 0)',      // 完全透明
      0.1, 'rgba(255, 220, 177, 0.08)', // 淡淡的燈光
      0.3, 'rgba(255, 220, 177, 0.18)', // 溫暖的燈光
      0.6, 'rgba(255, 220, 177, 0.30)', // 明亮的燈光
      1, 'rgba(255, 220, 177, 0.40)'    // 中心：溫暖燈光
    ] as any,
    fill: {
      color: 'rgba(255, 220, 177, 1)', // 溫暖米色
      opacityRange: { max: 0.40, min: 0.08 }, // 夜晚模式：柔和的透明度範圍
    },
  },
};

/**
 * 🎨 預設地圖主題配置
 */
export const MAP_THEME = {
  // === 地圖背景 ===
  background: '#1A1F2E', // 深灰藍（比純黑更柔和）
  
  // === H3 Hexes - 探索區域 ===
  historyH3: {
    // 已探索區域：溫暖米色（像麵包、米飯的顏色）
    fill: {
      color: 'rgba(255, 220, 177, 1)', // 溫暖米色 #FFDCB1
      opacityRange: { max: 0.35, min: 0.05 }, // ✅ 非線性漸層（平方）：中心35%非常明顯，邊緣5%很淡，7倍差異
    },
    stroke: {
      color: 'rgba(255, 200, 150, 1)',
      width: 0, // ✅ 無邊框
      opacity: 0,
    },
  },
  
  currentH3: {
    // 新探索區域：淡白色虛線（與游標同色系，融合設計）
    fill: {
      color: 'rgba(255, 255, 255, 1)',
      opacity: 0, // 完全中空
    },
    stroke: {
      color: 'rgba(255, 255, 255, 0.35)', // ✅ 半透明白色，與游標同色系
      width: 2.5, // ✅ 線寬很粗（可愛風格）
      opacity: 0.2, // ✅ 透明度（從 0.05 改為 0.2）
      dasharray: [10, 2], // ✅ 虛線間隔很密（實線長，間隙短，可愛風格）
    },
  },
  
  // === GPS Trail - 路徑軌跡 ===
  gpsTrail: {
    // 淡白色軌跡（與游標、新 H3 同色系）
    color: 'rgba(255, 255, 255, 0.6)', // ✅ 半透明白色
    width: 2.5,
    opacity: 1,
  },
  
  // === 用戶游標 - 導航箭頭 ===
  userMarker: {
    arrow: {
      symbol: '➤',
      // 純白色箭頭（與軌跡、新 H3 同色系，完全融合設計）
      color: '#FFFFFF', // 純白色
      haloColor: 'rgba(255, 255, 255, 0.8)', // ✅ 半透明白色光暈（避免暴露被遮蓋）
      haloWidth: 3, // ✅ 縮小 25%（從 4 改為 3）
      size: {
        mode3D: 40,
        mode2D: 36,
      },
    },
    shadow: {
      color: '#000000',
      opacity: 0.25,
      radius: 20,
      blur: 2,
    },
  },
  
  // === UI 元素 ===
  ui: {
    buttons: {
      mode3D: {
        // 活力橙（與新 H3 呼應）
        background: 'rgba(255, 107, 53, 0.95)', // #FF6B35
        border: 'rgba(255, 255, 255, 0.6)',
      },
      mode2D: {
        // 清新綠（與游標呼應）
        background: 'rgba(78, 205, 196, 0.95)', // #4ECDC4
        border: 'rgba(255, 255, 255, 0.6)',
      },
      text: '#FFFFFF',
      icon: '#FFFFFF',
      shadow: {
        color: '#000',
        opacity: 0.3,
      },
    },
  },
};

// 向後兼容：保留舊的 CYBERPUNK_COLORS（逐步淘汰）
export const CYBERPUNK_COLORS = {
  historyH3: {
    fill: MAP_THEME.historyH3.fill.color,
    stroke: MAP_THEME.historyH3.stroke.color,
  },
  realtimeH3: {
    fill: MAP_THEME.currentH3.fill.color,
    stroke: MAP_THEME.currentH3.stroke.color,
  },
  gpsTrail: MAP_THEME.gpsTrail.color,
  userMarker: MAP_THEME.userMarker.arrow.color,
};

/**
 * 地圖性能優化配置
 */
export const PERFORMANCE_CONFIG = {
  // 是否啟用 3D 建築
  enable3DBuildings: true,
  
  // 是否啟用天空層
  enableSky: true,
  
  // 是否顯示 Mapbox logo
  logoEnabled: false,
  
  // 是否顯示版權信息
  attributionEnabled: false,
  
  // 是否顯示羅盤
  compassEnabled: false,
  
  // 縮放控制
  zoomEnabled: true,
  scrollEnabled: true,
  pitchEnabled: true,
  rotateEnabled: true,
};
