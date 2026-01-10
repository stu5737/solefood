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
 */
export async function saveData<T>(key: string, data: T): Promise<void> {
  try {
    const jsonData = JSON.stringify(data);
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
 */
export async function loadData<T>(key: string): Promise<T | null> {
  try {
    const useSecureStore = await isSecureStoreAvailable();
    let jsonData: string | null;
    
    if (useSecureStore) {
      jsonData = await SecureStore.getItemAsync(key);
    } else {
      jsonData = await AsyncStorage.getItem(key);
    }
    
    if (!jsonData) {
      return null;
    }
    
    return JSON.parse(jsonData) as T;
  } catch (error) {
    console.error(`[Storage] Failed to load ${key}:`, error);
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
