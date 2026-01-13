/**
 * 持久化存儲工具
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 使用 Expo SecureStore 進行安全存儲
 * 如果 SecureStore 不可用，則使用 AsyncStorage 作為後備
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 存儲鍵名常量
 */
const STORAGE_KEYS = {
  PLAYER_STATE: 'player_state',
  INVENTORY: 'inventory',
  SESSION: 'session',
  LUCK_GRADIENT: 'luck_gradient',
  DEEP_ZONE: 'deep_zone',
  PATHFINDER: 'pathfinder',
  GOLDEN_MIST_NODES: 'golden_mist_nodes',
  PENDING_ENCOUNTER: 'pending_encounter',
  LAST_DAILY_RESET: 'last_daily_reset',
  DAILY_DISTANCE: 'daily_distance',
  EXPLORED_REGIONS: 'explored_regions',  // 已探索區域
  GPS_HISTORY: 'gps_history',            // GPS 歷史軌跡（7天內的所有點）
  GPS_SESSIONS: 'gps_sessions',          // GPS 採集會話記錄
  EXPLORED_HEXES: 'explored_hexes',      // ⭐ 已探索的 H3 六邊形（持久化）
} as const;

/**
 * 檢查 SecureStore 是否可用
 */
async function isSecureStoreAvailable(): Promise<boolean> {
  try {
    await SecureStore.isAvailableAsync();
    return true;
  } catch {
    return false;
  }
}

/**
 * 安全存儲數據
 * 
 * 注意：SecureStore 有 2048 字節的限制
 * 對於大數據（如 GPS 歷史），自動使用 AsyncStorage
 */
export async function saveData<T>(key: string, data: T): Promise<void> {
  try {
    const jsonData = JSON.stringify(data);
    // 估算 UTF-8 字節大小：每個字符約 1-4 字節，JSON 通常使用 ASCII，保守估算為 length * 2
    // 這比實際 UTF-8 大小更保守，但足夠用於判斷是否超過 SecureStore 限制
    const estimatedByteSize = jsonData.length * 2;
    const SECURE_STORE_MAX_SIZE = 2048; // SecureStore 的最大大小（字節）
    
    // 如果數據超過 SecureStore 限制，直接使用 AsyncStorage
    if (estimatedByteSize > SECURE_STORE_MAX_SIZE) {
      await AsyncStorage.setItem(key, jsonData);
      return;
    }
    
    const useSecureStore = await isSecureStoreAvailable();
    
    if (useSecureStore) {
      await SecureStore.setItemAsync(key, jsonData);
    } else {
      await AsyncStorage.setItem(key, jsonData);
    }
  } catch (error) {
    console.error(`[Storage] Failed to save ${key}:`, error);
    throw error;
  }
}

/**
 * 安全讀取數據
 * 
 * ⭐ 修復：優先從 AsyncStorage 讀取（因為大數據會存在這裡）
 * 如果 AsyncStorage 沒有數據，再嘗試 SecureStore
 */
export async function loadData<T>(key: string): Promise<T | null> {
  try {
    const useSecureStore = await isSecureStoreAvailable();
    let jsonData: string | null = null;
    let source: 'SecureStore' | 'AsyncStorage' | null = null;
    
    // ⭐ 修復：先嘗試從 AsyncStorage 讀取（因為大數據會存在這裡）
    // 如果 AsyncStorage 有數據，優先使用它
    try {
      jsonData = await AsyncStorage.getItem(key);
      if (jsonData) {
        source = 'AsyncStorage';
        console.log(`[Storage] ✅ Loaded ${key} from AsyncStorage (${jsonData.length} bytes)`);
      }
    } catch (asyncError) {
      console.warn(`[Storage] Failed to load ${key} from AsyncStorage:`, asyncError);
    }
    
    // 如果 AsyncStorage 沒有數據，再嘗試 SecureStore
    if (!jsonData && useSecureStore) {
      try {
        jsonData = await SecureStore.getItemAsync(key);
        if (jsonData) {
          source = 'SecureStore';
          console.log(`[Storage] ✅ Loaded ${key} from SecureStore (${jsonData.length} bytes)`);
        }
      } catch (secureError) {
        console.warn(`[Storage] Failed to load ${key} from SecureStore:`, secureError);
      }
    }
    
    if (!jsonData) {
      console.log(`[Storage] ⚠️  No data found for key: ${key}`);
      return null;
    }
    
    const parsed = JSON.parse(jsonData) as T;
    console.log(`[Storage] ✅ Successfully parsed ${key} from ${source}`);
    return parsed;
  } catch (error) {
    console.error(`[Storage] ❌ Failed to load ${key}:`, error);
    return null;
  }
}

/**
 * 刪除數據
 */
export async function removeData(key: string): Promise<void> {
  try {
    const useSecureStore = await isSecureStoreAvailable();
    
    if (useSecureStore) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.error(`[Storage] Failed to remove ${key}:`, error);
    throw error;
  }
}

/**
 * 清空所有數據
 */
export async function clearAllData(): Promise<void> {
  try {
    const useSecureStore = await isSecureStoreAvailable();
    
    if (useSecureStore) {
      // SecureStore 不支持批量刪除，需要逐個刪除
      for (const key of Object.values(STORAGE_KEYS)) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch {
          // 忽略不存在的鍵
        }
      }
    } else {
      await AsyncStorage.clear();
    }
  } catch (error) {
    console.error('[Storage] Failed to clear all data:', error);
    throw error;
  }
}

/**
 * 導出存儲鍵名
 */
export { STORAGE_KEYS };
