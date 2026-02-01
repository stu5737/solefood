/**
 * 餐廳（美食卸貨點）設定
 * 與地圖標註、靠近卸貨 UI 共用
 */

export interface RestaurantPoint {
  id: string;
  coord: [number, number]; // [lng, lat] GeoJSON 順序
  title: string;
  emoji?: string;
}

/** 判定「在餐廳卸貨範圍內」的距離（米）— 卸貨／拍照用 20m */
export const NEAR_RESTAURANT_RADIUS_M = 20;

/**
 * 便利商店資料來源：
 * - 'overpass'：全台 7-ELEVEN 座標（taiwan_711_restaurants.json）
 * - 'ecpay'：全台綠界門市（ecpay_convenience_stores.json，多品牌）
 * - 'merged'：merged_convenience_stores.json（需先執行 scripts/merge_store_sources.py）
 * - 'auto'：優先綠界，失敗則 7-Eleven
 * 改動後需重啟 Metro（npx expo start --clear）並重新載入 App 才會生效
 */
export const RESTAURANT_DATA_SOURCE: 'ecpay' | 'overpass' | 'auto' | 'merged' = 'overpass';

/**
 * 餐廳點位改由 store 載入（useRestaurantStore.restaurantPoints）
 * 請在 API 或本地資料載入後呼叫 setRestaurantPoints(points)
 */
