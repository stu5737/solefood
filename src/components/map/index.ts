/**
 * 地圖組件匯出
 * Solefood MVP v10.0 - Mapbox Edition
 */

import { MAP_ENGINE } from '../../config/features';

// 統一地圖組件（自動選擇引擎）⭐ 推薦使用
export { UnifiedMap, type UnifiedMapRef } from './UnifiedMap';

// v10.0 - Mapbox 版本（Pokémon GO 風格）
// ⚠️ 條件導出：僅在 MAP_ENGINE === 'mapbox' 時才導出，避免觸發原生代碼錯誤
// 如果需要直接使用 MapboxRealTimeMap，請從 './MapboxRealTimeMap' 直接導入
// export { MapboxRealTimeMap, type MapboxRealTimeMapRef } from './MapboxRealTimeMap';

// v9.0 - 舊版本（react-native-maps）
export { ExplorationMap } from './ExplorationMap';
export { RealTimeMap } from './RealTimeMap';
export { default as LivePath } from './LivePath';
export { TrailStatsPanel } from './TrailStatsPanel';
export { UserMarker } from './UserMarker';