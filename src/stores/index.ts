/**
 * Store 匯出與組合
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 狀態管理層的核心匯出
 */

export { usePlayerStore } from './playerStore';
export { useInventoryStore } from './inventoryStore';
export { useSessionStore } from './sessionStore';

/**
 * 跨 Store 通信模式說明：
 * 
 * 1. inventoryStore.addItem() 使用 usePlayerStore.getState() 訪問 playerStore
 * 2. 這是 Zustand 推薦的模式，允許 Store 之間進行狀態查詢
 * 3. 避免循環依賴：inventoryStore → playerStore（單向）
 * 
 * 如果需要響應式更新，可以使用 subscribe：
 * 
 * ```typescript
 * usePlayerStore.subscribe(
 *   (state) => state.maxWeight,
 *   (maxWeight) => {
 *     // 當 maxWeight 變化時執行某些操作
 *   }
 * );
 * ```
 */

