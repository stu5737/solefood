/**
 * 功能開關配置
 * Solefood v10.0
 */

/**
 * 地圖引擎選擇
 * 
 * - 'mapbox': 使用 Mapbox（支持 Pitch、3D 建築、賽博龐克風格）
 * - 'react-native-maps': 使用 react-native-maps（舊版本，穩定但功能有限）
 * 
 * ⚠️ 使用 Mapbox 前請確保：
 * 1. 已在 src/config/mapbox.ts 設置 MAPBOX_ACCESS_TOKEN
 * 2. 已重新編譯原生代碼（npx expo run:ios --no-build-cache）
 */
// ✅ 使用 Mapbox 作為地圖引擎（支持 Pitch、3D 建築、賽博龐克風格）
export const MAP_ENGINE: 'mapbox' | 'react-native-maps' = 'mapbox'; // ✅ 使用 Mapbox

/**
 * 是否啟用 Pokémon GO 風格（僅 Mapbox 支持）
 */
export const ENABLE_POKEMON_GO_STYLE = true;

/**
 * 是否啟用賽博龐克風格（僅 Mapbox 支持）
 */
export const ENABLE_CYBERPUNK_STYLE = true;

/**
 * 是否顯示地圖引擎切換按鈕（開發模式）
 */
export const SHOW_MAP_ENGINE_TOGGLE = true;
