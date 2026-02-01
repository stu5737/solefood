/**
 * 餐廳（美食卸貨點）Store
 * 地圖標註來源，改由 API / 真實資料載入
 *
 * 使用方式：
 * 1. 在 App 啟動或進入遊戲時呼叫載入（例如在 app/(tabs)/index.tsx 的 useEffect）
 * 2. API 回傳後：useRestaurantStore.getState().setRestaurantPoints(points)
 * 3. 資料格式：RestaurantPoint[]，每筆需 id, coord: [lng, lat], title, 可選 emoji
 */

import { create } from 'zustand';
import type { RestaurantPoint } from '../config/restaurants';

interface RestaurantState {
  /** 餐廳點位列表（地圖標註 + 卸貨範圍判斷） */
  restaurantPoints: RestaurantPoint[];
  /** 設定餐廳列表（由 API 或本地資料載入後呼叫） */
  setRestaurantPoints: (points: RestaurantPoint[]) => void;
  /** 載入中（可選，供 UI 顯示 loading） */
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useRestaurantStore = create<RestaurantState>((set) => ({
  restaurantPoints: [],
  setRestaurantPoints: (points) => set({ restaurantPoints: points }),
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
}));
