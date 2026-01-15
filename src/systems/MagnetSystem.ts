/**
 * MagnetSystem - 磁吸系統 (完整白皮書邏輯)
 * 自動檢測附近物品並觸發拾取/救援邏輯
 * 
 * Solefood MVP v9.0 Plus
 */

import { Item, ItemTier } from '../types/item';
import { usePlayerStore } from '../stores/playerStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { useSessionStore } from '../stores/sessionStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { locationService } from '../services/location';
import { latLngToH3, H3_RESOLUTION } from '../core/math/h3';

export type MagnetEventType = 
  | 'T3_ENCOUNTER' 
  | 'STAMINA_SHORTAGE' 
  | 'BACKPACK_FULL_T2' 
  | 'BACKPACK_FULL_T1' 
  | 'NORMAL_PICKUP'
  | 'ITEM_IGNORED';

export interface MagnetEvent {
  type: MagnetEventType;
  item: Item;
  timestamp: number;
}

export interface MagnetSystemCallbacks {
  onT3Encounter: (item: Item) => void;
  onStaminaShortage: (item: Item) => void;
  onBackpackFullT2: (item: Item) => void;
  onNormalPickup: (item: Item) => void;
  onItemIgnored: (item: Item, reason: string) => void;
  showFloatingText: (text: string, color: string) => void;
}

/**
 * 磁吸系統類
 */
export class MagnetSystem {
  private isActive: boolean = false;
  private isPaused: boolean = false;
  private callbacks: MagnetSystemCallbacks | null = null;
  private detectionInterval: NodeJS.Timeout | null = null;

  /**
   * 初始化磁吸系統
   */
  initialize(callbacks: MagnetSystemCallbacks) {
    this.callbacks = callbacks;
    console.log('[MagnetSystem] 初始化完成');
  }

  /**
   * 啟動磁吸系統
   */
  start() {
    if (this.isActive) {
      console.warn('[MagnetSystem] 已經在運行中');
      return;
    }

    this.isActive = true;
    this.isPaused = false;
    console.log('[MagnetSystem] ✅ 啟動磁吸系統');

    // 實際應用中，這裡會監聽 GPS 位置變化
    // 目前使用定時檢測模擬
    this.startDetection();
  }

  /**
   * 停止磁吸系統
   */
  stop() {
    this.isActive = false;
    this.isPaused = false;
    
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    console.log('[MagnetSystem] ⏹️ 停止磁吸系統');
  }

  /**
   * 暫停磁吸系統（用於彈窗顯示時）
   */
  pause() {
    this.isPaused = true;
    console.log('[MagnetSystem] ⏸️ 暫停磁吸系統');
  }

  /**
   * 恢復磁吸系統
   */
  resume() {
    this.isPaused = false;
    console.log('[MagnetSystem] ▶️ 恢復磁吸系統');
  }

  /**
   * 檢查是否正在運行
   */
  isRunning(): boolean {
    return this.isActive && !this.isPaused;
  }

  /**
   * 開始檢測（模擬）
   */
  private startDetection() {
    // 實際應用中，這裡會基於 GPS 和熵引擎
    // 目前僅作為示例邏輯
    this.detectionInterval = setInterval(() => {
      if (!this.isActive || this.isPaused) {
        return;
      }

      // 這裡會實際調用熵引擎檢測物品
      // const item = entropyEngine.detectNearbyItem();
      // if (item) {
      //   this.onItemDetected(item);
      // }
    }, 2000);
  }

  /**
   * 物品檢測事件（核心邏輯）
   * 
   * 根據白皮書 v9.0 Plus 規範：
   * A. T3 大獎邏輯（原子保護）
   * B. 體力不足邏輯
   * C. 滿倉邏輯（T1 自動食用，T2 觸發廣告）
   * D. 正常拾取（Happy Path）
   */
  async onItemDetected(item: Item) {
    if (!this.callbacks) {
      console.error('[MagnetSystem] Callbacks 未初始化');
      return;
    }

    const playerState = usePlayerStore.getState();
    const inventoryState = useInventoryStore.getState();
    const sessionState = useSessionStore.getState();

    console.log('[MagnetSystem] 🎯 檢測到物品:', {
      tier: item.tier,
      weight: item.weight,
      pickupCost: item.pickupCost,
    });

    // ========== A. T3 大獎邏輯（原子保護） ==========
    if (item.tier === 3) {
      this.pause();

      // 寫入原子保護標記
      await AsyncStorage.setItem('PendingEncounter', item.id);

      // 觸發震動
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning
        );
      } catch (error) {
        console.warn('[MagnetSystem] 震動觸發失敗:', error);
      }

      // 觸發 T3 遭遇彈窗
      this.callbacks.onT3Encounter(item);
      return;
    }

    // ========== B. 體力不足邏輯 ==========
    if (playerState.stamina < item.pickupCost) {
      this.pause();

      // 觸發腎上腺素救援
      this.callbacks.onStaminaShortage(item);
      return;
    }

    // ========== C. 滿倉邏輯 ==========
    const effectiveMaxWeight = playerState.getEffectiveMaxWeight();
    const isFull = inventoryState.totalWeight + item.weight > effectiveMaxWeight;

    if (isFull) {
      // C-1: T1 自動食用（零干擾）
      if (item.tier === 1) {
        const netGain = item.restoreStamina - item.pickupCost; // 通常 +2
        playerState.updateStamina(netGain);

        this.callbacks.showFloatingText(`+${netGain} ⚡`, '#4CAF50');

        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
          console.warn('[MagnetSystem] 震動觸發失敗:', error);
        }

        console.log('[MagnetSystem] 🍬 T1 自動食用（滿倉）');
        return;
      }

      // C-2: T2 臨時擴容
      if (item.tier === 2) {
        this.pause();

        // 觸發臨時擴容救援
        this.callbacks.onBackpackFullT2(item);
        return;
      }
    }

    // ========== D. 正常拾取（Happy Path） ==========
    const success = inventoryState.addItem(item);

    if (success) {
      this.callbacks.onNormalPickup(item);

      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.warn('[MagnetSystem] 震動觸發失敗:', error);
      }

      // 🎯 Phase 1: 探索判定與漂浮文字反饋
      try {
        const currentLocation = await locationService.getCurrentLocation();
        if (currentLocation) {
          const h3Index = latLngToH3(
            currentLocation.latitude,
            currentLocation.longitude,
            H3_RESOLUTION
          );
          
          if (h3Index) {
            const sessionState = useSessionStore.getState();
            const explorationStatus = sessionState.discoverNewHex(h3Index);
            
            // ✨ 顯示探索狀態漂浮文字
            if (explorationStatus.hasNewDiscovery) {
              this.callbacks.showFloatingText(
                '🌫️ 發現未探索區域！\n✨ T2 掉落率 +10%',
                '#52C759'
              );
              console.log('[MagnetSystem] 🎊 開拓者模式觸發！');
            } else if (explorationStatus.explorationDetails.historicalHexes.length > 0) {
              // 可選：顯示已探索區域提示（較低優先級）
              // this.callbacks.showFloatingText('📍 已探索區域', '#888');
            }
          }
        }
      } catch (error) {
        console.warn('[MagnetSystem] 探索判定失敗:', error);
      }

      console.log('[MagnetSystem] ✅ 正常拾取成功');
    } else {
      this.callbacks.onItemIgnored(item, '拾取失敗（容量或體力不足）');
      console.warn('[MagnetSystem] ❌ 拾取失敗');
    }
  }

  /**
   * 處理 T3 確認拾取
   */
  async confirmT3Pickup(item: Item): Promise<boolean> {
    const playerState = usePlayerStore.getState();
    const inventoryState = useInventoryStore.getState();

    // 檢查體力
    if (playerState.stamina < 30) {
      console.warn('[MagnetSystem] T3 確認失敗：體力不足');
      return false;
    }

    // 嘗試拾取
    const success = inventoryState.addItem(item);

    if (success) {
      // 清除原子保護標記
      await AsyncStorage.removeItem('PendingEncounter');
      
      if (this.callbacks) {
        this.callbacks.showFloatingText('🟣 皇室純糖！', '#9C27B0');
      }

      // 🎯 Phase 1: 探索判定（T3 拾取時）
      try {
        const currentLocation = await locationService.getCurrentLocation();
        if (currentLocation) {
          const h3Index = latLngToH3(
            currentLocation.latitude,
            currentLocation.longitude,
            H3_RESOLUTION
          );
          
          if (h3Index) {
            const sessionState = useSessionStore.getState();
            const explorationStatus = sessionState.discoverNewHex(h3Index);
            
            if (explorationStatus.hasNewDiscovery && this.callbacks) {
              // T3 拾取時發現新區域，延遲顯示以免遮擋 T3 訊息
              setTimeout(() => {
                this.callbacks?.showFloatingText(
                  '🌫️ 發現未探索區域！',
                  '#52C759'
                );
              }, 1500);
            }
          }
        }
      } catch (error) {
        console.warn('[MagnetSystem] T3 探索判定失敗:', error);
      }

      this.resume();
      console.log('[MagnetSystem] 🟣 T3 拾取成功');
      return true;
    } else {
      console.warn('[MagnetSystem] T3 拾取失敗');
      return false;
    }
  }

  /**
   * 處理廣告成功後的邏輯
   */
  async handleAdSuccess(
    type: 'Adrenaline' | 'TempExpansion',
    item?: Item
  ): Promise<void> {
    const playerState = usePlayerStore.getState();
    const inventoryState = useInventoryStore.getState();

    if (type === 'Adrenaline') {
      // 腎上腺素：+30 體力
      playerState.updateStamina(30);
      
      if (this.callbacks) {
        this.callbacks.showFloatingText('+30 ⚡', '#4CAF50');
      }

      // 自動拾取物品
      if (item) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const pickupSuccess = inventoryState.addItem(item);
        
        // 🎯 Phase 1: 探索判定（腎上腺素拾取時）
        if (pickupSuccess) {
          try {
            const currentLocation = await locationService.getCurrentLocation();
            if (currentLocation) {
              const h3Index = latLngToH3(
                currentLocation.latitude,
                currentLocation.longitude,
                H3_RESOLUTION
              );
              
              if (h3Index) {
                const sessionState = useSessionStore.getState();
                const explorationStatus = sessionState.discoverNewHex(h3Index);
                
                if (explorationStatus.hasNewDiscovery && this.callbacks) {
                  setTimeout(() => {
                    this.callbacks?.showFloatingText(
                      '🌫️ 發現未探索區域！',
                      '#52C759'
                    );
                  }, 1000);
                }
              }
            }
          } catch (error) {
            console.warn('[MagnetSystem] 探索判定失敗:', error);
          }
        }
      }

      this.resume();
      console.log('[MagnetSystem] 💉 腎上腺素救援成功');
    } else if (type === 'TempExpansion') {
      // 臨時擴容：+50% 容量
      const sessionState = useSessionStore.getState();
      sessionState.setTempExpanded(true);

      if (this.callbacks) {
        this.callbacks.showFloatingText('📦 +50% 容量', '#2196F3');
      }

      // 自動拾取物品
      if (item) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const pickupSuccess = inventoryState.addItem(item);
        
        // 🎯 Phase 1: 探索判定（臨時擴容拾取時）
        if (pickupSuccess) {
          try {
            const currentLocation = await locationService.getCurrentLocation();
            if (currentLocation) {
              const h3Index = latLngToH3(
                currentLocation.latitude,
                currentLocation.longitude,
                H3_RESOLUTION
              );
              
              if (h3Index) {
                const explorationStatus = sessionState.discoverNewHex(h3Index);
                
                if (explorationStatus.hasNewDiscovery && this.callbacks) {
                  setTimeout(() => {
                    this.callbacks?.showFloatingText(
                      '🌫️ 發現未探索區域！',
                      '#52C759'
                    );
                  }, 1000);
                }
              }
            }
          } catch (error) {
            console.warn('[MagnetSystem] 探索判定失敗:', error);
          }
        }
      }

      this.resume();
      console.log('[MagnetSystem] 📦 臨時擴容救援成功');
    }
  }

  /**
   * 處理廣告取消
   */
  handleAdCancel(item: Item) {
    if (this.callbacks) {
      this.callbacks.onItemIgnored(item, '用戶取消廣告');
      this.callbacks.showFloatingText('已放棄物品', '#888');
    }

    this.resume();
    console.log('[MagnetSystem] ❌ 用戶取消廣告');
  }
}

// 全局實例
export const magnetSystem = new MagnetSystem();
