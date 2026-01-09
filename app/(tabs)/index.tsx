/**
 * 主遊戲畫面
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 本畫面整合熵計算引擎、狀態管理和調試功能
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Animated,
} from 'react-native';
import { StaminaBar, DurabilityBar, StatsPanel, GhostOverlay, AdRescueModal, UnloadModal } from '../../src/components/game';
import { RealTimeMap } from '../../src/components/map';
import { usePlayerStore } from '../../src/stores/playerStore';
import { useSessionStore } from '../../src/stores/sessionStore';
import { useInventoryStore } from '../../src/stores/inventoryStore';
import { entropyEngine } from '../../src/core/entropy/engine';
import { executeUnloadSettlement, calculateSettlement } from '../../src/core/game/unloading';
import { calculateContamination } from '../../src/core/math/maintenance';
import type { EntropyEvent, LootResult } from '../../src/core/entropy/events';
import type { Item } from '../../src/types/item';
import { ITEM_WEIGHTS, ITEM_VALUES, ITEM_PICKUP_COSTS, ITEM_CONSUME_RESTORE } from '../../src/utils/constants';
import { locationService } from '../../src/services/location';
import { explorationService } from '../../src/services/exploration';
import { gpsHistoryService } from '../../src/services/gpsHistory';
import { saveData, loadData, STORAGE_KEYS } from '../../src/utils/storage';

export default function GameScreen() {
  // 從 Store 獲取狀態
  const playerState = usePlayerStore();
  const sessionState = useSessionStore();
  const inventoryState = useInventoryStore();
  
  // 測試模態框狀態
  const [adRescueVisible, setAdRescueVisible] = useState(false);
  const [adRescueType, setAdRescueType] = useState<'adrenaline' | 'temporary_expansion'>('adrenaline');
  const [adRescueItem, setAdRescueItem] = useState<Item | null>(null);
  const [unloadModalVisible, setUnloadModalVisible] = useState(false);
  
  // 模式切換：戶外模式 vs 開發模式
  const [isOutdoorMode, setIsOutdoorMode] = useState(true); // 默認戶外模式
  
  // 戶外模式專用狀態
  const [lastPickedItem, setLastPickedItem] = useState<Item | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const pickupNotificationOpacity = useRef(new Animated.Value(0)).current;
  const previousItemCount = useRef(inventoryState.items.length);
  
  // 輔助函數：獲取耐久度顏色
  const getDurabilityColor = (durability: number): string => {
    if (durability >= 90) return '#4CAF50'; // 綠色
    if (durability >= 70) return '#FF9800'; // 橙色
    if (durability >= 50) return '#FF5722'; // 深橙
    return '#F44336'; // 紅色
  };
  
  // 計算庫存統計
  const t1Count = inventoryState.items.filter(i => i.tier === 1).length;
  const t2Count = inventoryState.items.filter(i => i.tier === 2).length;
  const t3Count = inventoryState.items.filter(i => i.tier === 3).length;
  
  // ========== 應用啟動時檢查登入狀態 ==========
  useEffect(() => {
    // 檢查登入狀態（只在首次啟動時檢查）
    if (!sessionState.hasCheckedLoginStatus) {
      const loginStatus = sessionState.checkLoginStatus();
      
      if (loginStatus.needsRescue && loginStatus.canRescue) {
        // 顯示休假救援模態框
        Alert.alert(
          '⚠️ 休假救援',
          `您已經 ${loginStatus.missedDays} 天沒有登入了！\n\n` +
          `您的 ${sessionState.luckGradient.streak} 天連續簽到和 ${(ITEM_DISTRIBUTION.T2_PERCENTAGE + sessionState.luckGradient.t2Bonus).toFixed(1)}% T2 幸運值面臨風險。\n\n` +
          `觀看廣告可以凍結連續簽到（最多 3 天緩衝）。\n\n` +
          `剩餘救援次數：${3 - sessionState.luckGradient.leaveDaysUsed}/3`,
          [
            {
              text: '稍後處理',
              style: 'cancel',
              onPress: () => {
                // 用戶選擇稍後處理，標記為已檢查
                useSessionStore.setState({ hasCheckedLoginStatus: true });
              },
            },
            {
              text: '📺 觀看廣告凍結',
              onPress: async () => {
                // 模擬觀看廣告
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const sessionStore = useSessionStore.getState();
                const success = sessionStore.useLeaveRescue();
                
                if (success) {
                  Alert.alert(
                    '✅ 救援成功',
                    `連續簽到已凍結！\n\n` +
                    `當前連續簽到：${sessionStore.luckGradient.streak} 天\n` +
                    `剩餘救援次數：${3 - sessionStore.luckGradient.leaveDaysUsed}/3`,
                    [{ text: '確定' }]
                  );
                } else {
                  Alert.alert(
                    '❌ 救援失敗',
                    '無法使用休假救援。可能已達到上限或超過緩衝期。',
                    [{ text: '確定' }]
                  );
                }
                
                // 標記為已檢查
                useSessionStore.setState({ hasCheckedLoginStatus: true });
              },
            },
          ]
        );
      } else if (loginStatus.needsRescue && !loginStatus.canRescue) {
        // 超過緩衝期，已進入衰減模式
        Alert.alert(
          '⚠️ 連續簽到已重置',
          `您已經 ${loginStatus.missedDays} 天沒有登入，超過了 3 天緩衝期。\n\n` +
          `連續簽到已重置為 0，T2 掉落率正在衰減中。\n\n` +
          `當前 T2 機率：${sessionState.luckGradient.currentT2Chance.toFixed(1)}%`,
          [{ text: '確定' }]
        );
        
        // 標記為已檢查
        const sessionStore = useSessionStore.getState();
        sessionStore.hasCheckedLoginStatus = true;
      } else {
        // 正常登入，處理登入邏輯
        sessionState.processLogin();
        const sessionStore = useSessionStore.getState();
        sessionStore.hasCheckedLoginStatus = true;
      }
    }
  }, []); // 只在組件掛載時執行一次
  
  // ========== 應用啟動時恢復待救援物品 ==========
  useEffect(() => {
    // 檢查是否有待救援的物品（通用型，支援所有階層）
    const currentEncounter = sessionState.currentEncounter;
    
    if (currentEncounter && currentEncounter.status === 'PENDING_AD') {
      const item = currentEncounter.item;
      const itemValue = item.value;
      const pickupCost = item.pickupCost;
      
      // 顯示恢復提示
      Alert.alert(
        '⚠️ Recovery Mode',
        `You were trying to rescue a **T${item.tier}** item ($${itemValue} SOLE) before the app closed.\n\n` +
        `Resume the ad rescue?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              // 清除待救援狀態（用戶放棄）
              const sessionStore = useSessionStore.getState();
              sessionStore.clearPendingEncounter();
              console.log('[GameScreen] User forfeited pending encounter');
            },
          },
          {
            text: 'Resume',
            onPress: () => {
              // 重新觸發廣告救援流程（直接傳遞 LootResult，不包裝成事件）
              // 注意：handleLootRescueAvailable 現在支援兩種調用方式
              const lootResult: LootResult = {
                tier: item.tier,
                success: false,
                reason: 'ad_rescue_available',
                item: item,
                itemId: item.id,
                itemValue: itemValue,
                pickupCost: pickupCost,
                currentStamina: playerState.stamina,
                requiredStamina: pickupCost,
              };
              
              // 直接調用處理函數（傳遞 LootResult 而不是 EntropyEvent）
              handleLootRescueAvailable(lootResult);
            },
          },
        ]
      );
    }
  }, []); // 只在組件掛載時執行一次

  // 事件監聽：訂閱熵引擎事件
  useEffect(() => {
    // 體力耗盡事件
    const handleStaminaDepleted = (event: EntropyEvent) => {
      Alert.alert(
        '體力耗盡',
        '您已進入靈魂模式！無法進行任何操作。請恢復體力。',
        [{ text: '確定' }]
      );
    };

    // 耐久度歸零事件
    const handleDurabilityZero = (event: EntropyEvent) => {
      Alert.alert(
        '背包崩塌',
        '耐久度歸零，背包已損壞！您已被定身。請進行緊急維修。',
        [{ text: '確定' }]
      );
    };

    // 衛生值過低事件
    const handleHygieneLow = (event: EntropyEvent) => {
      Alert.alert(
        '衛生值過低',
        '您的背包衛生值過低，收益將受到影響。建議進行清潔。',
        [{ text: '確定' }]
      );
    };

    // 通用廣告救援事件（空間夠但體力不足，支援所有階層）
    const handleLootRescueAvailable = (event: EntropyEvent | LootResult) => {
      // 支援兩種調用方式：
      // 1. 從事件系統調用（EntropyEvent）
      // 2. 從恢復流程調用（直接傳遞 LootResult）
      const lootData = 'data' in event ? (event.data as LootResult) : event;
      const { item, itemValue, pickupCost, currentStamina, requiredStamina, tier } = lootData;
      
      if (!item) {
        console.error('[GameScreen] Ad rescue event missing required data');
        return;
      }
      
      // 通用化：支援所有階層（T1/T2/T3），不限制於 T3
      const tierName = tier === 1 ? 'Sugar' : tier === 2 ? 'Energy Bar' : 'Royal Sugar';
      
      const playerStore = usePlayerStore.getState();
      const sessionStore = useSessionStore.getState();
      
      // 顯示廣告救援模態框（通用型，支援所有階層）
      Alert.alert(
        `💎 Found T${tier} ${tierName}!`,
        `You found a T${tier} item ($${itemValue} SOLE) but are too exhausted to lift it!\n\n` +
        `Current Stamina: ${currentStamina}/${requiredStamina}\n\n` +
        `Watch an Ad to inject Adrenaline (+30 Stamina) and pick it up?`,
        [
          {
            text: 'Give Up (Item Lost)',
            style: 'cancel',
            onPress: () => {
              // 清除待救援狀態（用戶放棄）
              const sessionStore = useSessionStore.getState();
              sessionStore.clearPendingEncounter();
              console.log(`[GameScreen] User gave up T${tier} item`);
            },
          },
          {
            text: '📺 Watch Ad',
            onPress: async () => {
              // 檢查廣告上限
              const canWatchAd = sessionStore.triggerRescue('stamina');
              
              if (!canWatchAd) {
                Alert.alert(
                  'Ad Limit Reached',
                  'You have reached the daily limit for adrenaline ads. Please try again tomorrow.',
                  [{ text: 'OK' }]
                );
                return;
              }
              
              // Step 3: 模擬觀看廣告（1 秒延遲）
              // 注意：這是應用最容易崩潰的時刻，但我們已經保存了待救援狀態
              console.log(`[Ad Rescue] Step 3: 開始觀看廣告... (T${tier})`);
              await new Promise((resolve) => setTimeout(resolve, 1000));
              
              // Step A: 恢復體力（+30 點）
              const staminaBeforeAd = playerStore.stamina;
              playerStore.updateStamina(30);
              
              // 獲取最新狀態（Zustand 狀態更新是同步的，所以應該立即反映）
              const updatedPlayerStore = usePlayerStore.getState();
              const staminaAfterAd = updatedPlayerStore.stamina;
              console.log(`[Ad Rescue] Step 3: 廣告觀看完畢 (+30)，當前體力: ${staminaAfterAd} (之前: ${staminaBeforeAd})`);
              
              // Step B: 強制執行拾取交易（原子操作）
              // 重要：在廣告救援場景中，我們已經驗證了空間，現在體力也足夠了
              if (staminaAfterAd >= pickupCost!) {
                const inventoryStore = useInventoryStore.getState();
                
                // 再次檢查空間（應該已經通過，但再次確認）
                const currentWeight = inventoryStore.totalWeight;
                const maxWeight = updatedPlayerStore.maxWeight;
                
                if (currentWeight + item.weight > maxWeight) {
                  Alert.alert(
                    'Error',
                    'Backpack is now full. Cannot pick up item.',
                    [{ text: 'OK' }]
                  );
                  return;
                }
                
                // 直接調用 addItem（此時體力已經足夠，應該能成功）
                // addItem 內部會：
                // 1. 檢查體力（應該通過）
                // 2. 扣除拾取成本
                // 3. 添加物品
                const success = inventoryStore.addItem(item);
                
                if (success) {
                  // 記錄衛生值債務（通用型，支援所有階層）
                  const sessionStore = useSessionStore.getState();
                  const contamination = calculateContamination(tier);
                  sessionStore.addHygieneDebt(contamination);
                  
                  // 清除待救援狀態（交易原子性：只有在物品成功添加後才清除）
                  sessionStore.clearPendingEncounter();
                  
                  // 獲取最終體力（用於日誌）
                  const finalStamina = usePlayerStore.getState().stamina;
                  console.log(`[Ad Rescue] Step 4: 自動扣除拾取體力 (-${pickupCost})`);
                  console.log(`[Ad Rescue] === 最終結算體力: ${finalStamina} ===`);
                  
                  Alert.alert(
                    'Success!',
                    `Adrenaline injected! Picked up T${tier} ${tierName} ($${itemValue} SOLE)!`,
                    [{ text: 'OK' }]
                  );
                } else {
                  // 如果 addItem 失敗，可能是狀態還沒完全同步
                  // 等待一小段時間後重試
                  await new Promise((resolve) => setTimeout(resolve, 100));
                  
                  // 再次獲取最新狀態
                  const retryPlayerStore = usePlayerStore.getState();
                  const retryStamina = retryPlayerStore.stamina;
                  
                  if (retryStamina >= pickupCost!) {
                    const retrySuccess = inventoryStore.addItem(item);
                    if (retrySuccess) {
                      const sessionStore = useSessionStore.getState();
                      const contamination = calculateContamination(tier);
                      sessionStore.addHygieneDebt(contamination);
                      
                      // 清除待救援狀態（交易原子性）
                      sessionStore.clearPendingEncounter();
                      
                      const finalStamina = usePlayerStore.getState().stamina;
                      console.log(`[Ad Rescue] Step 4 (Retry): 自動扣除拾取體力 (-${pickupCost})`);
                      console.log(`[Ad Rescue] === 最終結算體力: ${finalStamina} ===`);
                      
                      Alert.alert(
                        'Success!',
                        `Adrenaline injected! Picked up T${tier} ${tierName} ($${itemValue} SOLE)!`,
                        [{ text: 'OK' }]
                      );
                    } else {
                      Alert.alert(
                        'Error',
                        `Failed to pick up item after retry. Current stamina: ${retryStamina}, Required: ${pickupCost}`,
                        [{ text: 'OK' }]
                      );
                    }
                  } else {
                    Alert.alert(
                      'Error',
                      `Failed to pick up item. Stamina is ${retryStamina} but need ${pickupCost}.`,
                      [{ text: 'OK' }]
                    );
                  }
                }
              } else {
                // 這不應該發生，但如果發生了，顯示錯誤
                Alert.alert(
                  'Error',
                  `Unexpected: Stamina is ${staminaAfterAd} but need ${pickupCost}. Please report this bug.`,
                  [{ text: 'OK' }]
                );
              }
            },
          },
        ]
      );
    };

    // 拾取攔截事件（超載或體力不足）
    const handleLootIntercept = (event: EntropyEvent) => {
      const lootData = event.data as LootResult;
      
      // 處理智能超載交換
      if (lootData.reason === 'OVERLOAD_SOLVABLE') {
        const inventoryStore = useInventoryStore.getState();
        const { item, cost, currentWeight, maxWeight, tier } = lootData;
        
        if (!item || !cost) {
          console.error('[GameScreen] OVERLOAD_SOLVABLE event missing required data');
          return;
        }
        
        // 構建提示消息
        const weightText = item.weight.toFixed(1);
        const currentWeightText = currentWeight?.toFixed(1) || '0.0';
        const maxWeightText = maxWeight?.toFixed(1) || '0.0';
        
        Alert.alert(
          `Overload! Found T${tier} Item (${weightText}kg)`,
          `Backpack full (Weight: ${currentWeightText}/${maxWeightText}kg). Eat ${cost}x T1 Sugars immediately to make space?`,
          [
            {
              text: 'Ignore',
              style: 'cancel',
              onPress: () => {
                console.log('[GameScreen] User ignored overload prompt, item lost');
              },
            },
            {
              text: 'Eat & Pickup',
              onPress: () => {
                // 獲取所有 T1 物品
                const t1Items = inventoryStore.items.filter((i) => i.tier === 1);
                
                if (t1Items.length < cost) {
                  Alert.alert('Error', 'Not enough T1 items available!');
                  return;
                }
                
                // 消耗指定數量的 T1 物品
                let consumedCount = 0;
                for (let i = 0; i < cost && i < t1Items.length; i++) {
                  inventoryStore.consumeItem(t1Items[i].id);
                  consumedCount++;
                }
                
                // 等待狀態更新後，添加待拾取的物品
                setTimeout(() => {
                  const success = inventoryStore.addItem(item);
                  if (success) {
                    // 注意：衛生值已改為即時扣除（分時機制）
                    // 衛生值在 addItem 成功時已經即時扣除（見 engine.ts）
                    
                    Alert.alert('Success', `Consumed ${consumedCount}x T1 Sugars and picked up T${tier} item!`);
                  } else {
                    Alert.alert('Error', 'Failed to pick up item after consuming T1s.');
                  }
                }, 100);
              },
            },
          ]
        );
      } else if (lootData.reason === 'OVERLOAD_IMPOSSIBLE') {
        // 無法解決的超載問題
        Alert.alert(
          'Backpack Full!',
          'Not enough T1s to eat for space. Item lost.',
          [{ text: 'OK' }]
        );
      }
      // 其他原因（insufficient_stamina, ghost_mode, immobilized）保持原有邏輯
      else if (lootData.reason === 'overload') {
        // 舊版超載邏輯（向後兼容）
        const inventoryStore = useInventoryStore.getState();
        const firstT1Item = inventoryStore.items.find((item) => item.tier === 1);
        
        if (firstT1Item) {
          Alert.alert(
            'Backpack Full! (Overload)',
            'You cannot carry more. Eat a T1 Sugar to restore Stamina and free up space?',
            [
              {
                text: 'Ignore',
                style: 'cancel',
                onPress: () => {
                  console.log('[GameScreen] User ignored overload prompt');
                },
              },
              {
                text: 'Eat T1 Now',
                onPress: () => {
                  inventoryStore.consumeItem(firstT1Item.id);
                  Alert.alert('Success', 'T1 Sugar consumed! Stamina restored and space freed.');
                },
              },
            ]
          );
        } else {
          Alert.alert(
            'Backpack Full! (Overload)',
            'You cannot carry more items. No T1 Sugar available to consume.',
            [{ text: 'OK' }]
          );
        }
      }
    };

    // 拾取轉換事件（通用轉換溢出）
    const handleLootConverted = (event: EntropyEvent) => {
      // 安全地訪問事件數據
      const lootData = event.data as LootResult;
      
      // 檢查數據是否有效
      if (!lootData || typeof lootData !== 'object') {
        console.warn('[GameScreen] Invalid loot_converted event data');
        return;
      }
      
      const tier = lootData.tier ?? 1;
      
      // 優先使用新的字段（grossAmount, netAmount, pickupCost）
      // 如果不存在，則使用舊的 restoredAmount（向後兼容）
      const grossAmount = 'grossAmount' in lootData && typeof lootData.grossAmount === 'number'
        ? lootData.grossAmount
        : ('restoredAmount' in lootData && typeof lootData.restoredAmount === 'number'
          ? lootData.restoredAmount
          : 0);
      
      const pickupCost = 'pickupCost' in lootData && typeof lootData.pickupCost === 'number'
        ? lootData.pickupCost
        : 0;
      
      const netAmount = 'netAmount' in lootData && typeof lootData.netAmount === 'number'
        ? lootData.netAmount
        : grossAmount - pickupCost;
      
      const itemValue = 'itemValue' in lootData && typeof lootData.itemValue === 'number'
        ? lootData.itemValue
        : 0;
      
      // 構建消息：顯示勞動成本和淨收益
      const message = `Bag Full. Worked (-${pickupCost}) to eat T${tier} (+${grossAmount}). Net: +${netAmount} Stamina.`;
      
      // 根據物品階層顯示不同的提示
      if (tier === 1) {
        // T1: 正常提示（非侵入式）
        console.log(`[GameScreen] ${message}`);
      } else if (tier === 2 || tier === 3) {
        // T2/T3: 警告提示（高價值物品被消耗）
        const warningMessage = `⚠️ BAG FULL! ${message} You lost ${itemValue} SOLE value!`;
        console.warn(`[GameScreen] ${warningMessage}`);
        
        // 顯示警告 Alert（高價值物品需要明確警告）
        Alert.alert(
          '⚠️ Bag Full!',
          `You worked (-${pickupCost} Stamina) to eat a T${tier} item (+${grossAmount} Stamina).\n\nNet Gain: +${netAmount} Stamina\n\n⚠️ You lost ${itemValue} SOLE value! Clear your backpack space next time to avoid losing valuable items.`,
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        // 未知階層，使用通用提示
        console.log(`[GameScreen] ${message}`);
      }
    };

    // 註冊事件監聽器
    entropyEngine.on('stamina_depleted', handleStaminaDepleted);
    entropyEngine.on('durability_zero', handleDurabilityZero);
    entropyEngine.on('hygiene_low', handleHygieneLow);
    entropyEngine.on('loot_rescue_available', handleLootRescueAvailable);
    entropyEngine.on('loot_intercept', handleLootIntercept);
    entropyEngine.on('loot_converted', handleLootConverted);

    // 清理函數：組件卸載時移除監聽器
    return () => {
      entropyEngine.off('stamina_depleted', handleStaminaDepleted);
      entropyEngine.off('durability_zero', handleDurabilityZero);
      entropyEngine.off('hygiene_low', handleHygieneLow);
      entropyEngine.off('loot_rescue_available', handleLootRescueAvailable);
      entropyEngine.off('loot_intercept', handleLootIntercept);
      entropyEngine.off('loot_converted', handleLootConverted);
    };
  }, []);

  // ========== GPS 追蹤與探索系統整合 ==========
  useEffect(() => {
    let isMounted = true;

    // 初始化探索服務和 GPS 歷史服務
    const initializeServices = async () => {
      try {
        await explorationService.initialize();
        await gpsHistoryService.initialize();
        console.log('[GameScreen] Exploration and GPS history services initialized');
      } catch (error) {
        console.error('[GameScreen] Failed to initialize services:', error);
      }
    };

    initializeServices();

    // 開始 GPS 追蹤
    const startGPSTracking = async () => {
      try {
        const started = await locationService.startTracking((location, distance) => {
          if (!isMounted) return;

          // 驗證 GPS 數據
          const lastLocation = locationService.getLastLocation();
          const validation = locationService.validateGPSData(
            location,
            lastLocation || undefined
          );

          if (!validation.valid) {
            console.warn('[GameScreen] Invalid GPS data:', validation.reason);
            return;
          }

          // 更新開拓者狀態
          const isPathfinder = sessionState.checkPathfinder(
            location.latitude,
            location.longitude
          );

          if (isPathfinder) {
            console.log('[GameScreen] Pathfinder zone detected! T2 drop rate +10%');
          }

          // 觸發移動事件（整合到遊戲循環）
          entropyEngine.processMovement({
            distance: distance / 1000, // 轉換為 km
            speed: location.speed ? location.speed * 3.6 : undefined, // 轉換為 km/h
            timestamp: location.timestamp,
            gpsLocation: {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              speed: location.speed,
            },
          });
        });

        if (started) {
          console.log('[GameScreen] GPS tracking started');
        } else {
          console.warn('[GameScreen] Failed to start GPS tracking');
        }
      } catch (error) {
        console.error('[GameScreen] Error starting GPS tracking:', error);
      }
    };

    startGPSTracking();

    // 清理函數：組件卸載時停止 GPS 追蹤
    return () => {
      isMounted = false;
      locationService.stopTracking();
      // 強制保存 GPS 歷史
      gpsHistoryService.forceSave().catch(console.error);
      console.log('[GameScreen] GPS tracking stopped');
    };
  }, [sessionState]);

  // 調試功能：模擬移動 - 步行 100m
  const simulateWalk = () => {
    // A. 開始前警告（耐久度檢查）
    if (playerState.durability < 100) {
      const effectiveMaxWeight = playerState.getEffectiveMaxWeight();
      const { getTieredMultiplier, getTierStatus } = require('../../src/core/math/tiered');
      const multiplier = getTieredMultiplier(playerState.durability);
      const status = getTierStatus(playerState.durability);
      
      Alert.alert(
        '⚠️ Equipment Status',
        `Durability: ${playerState.durability.toFixed(1)}%\n` +
        `Status: ${status}\n` +
        `Capacity Multiplier: ${(multiplier * 100).toFixed(0)}%\n\n` +
        `Effective capacity: ${effectiveMaxWeight.toFixed(1)}kg\n\n` +
        `Repair now?`,
        [
          {
            text: 'Continue Anyway',
            style: 'cancel',
            onPress: () => {
              // 繼續執行移動
              try {
                entropyEngine.processMovement({
                  distance: 0.1, // 100m = 0.1km
                  speed: 5.0,   // 5 km/h (步行速度)
                  timestamp: Date.now(),
                });
              } catch (error) {
                Alert.alert('錯誤', `模擬移動失敗: ${error}`);
              }
            },
          },
          {
            text: 'Cancel',
            onPress: () => {
              // 取消移動
            },
          },
        ]
      );
      return;
    }
    
    // 耐久度正常，直接執行移動
    try {
      entropyEngine.processMovement({
        distance: 0.1, // 100m = 0.1km
        speed: 5.0,   // 5 km/h (步行速度)
        timestamp: Date.now(),
      });
    } catch (error) {
      Alert.alert('錯誤', `模擬移動失敗: ${error}`);
    }
  };

  // 調試功能：模擬移動 - 快跑 500m
  const simulateSprint = () => {
    // A. 開始前警告（耐久度檢查）
    if (playerState.durability < 100) {
      const effectiveMaxWeight = playerState.getEffectiveMaxWeight();
      const { getTieredMultiplier, getTierStatus } = require('../../src/core/math/tiered');
      const multiplier = getTieredMultiplier(playerState.durability);
      const status = getTierStatus(playerState.durability);
      
      Alert.alert(
        '⚠️ Equipment Status',
        `Durability: ${playerState.durability.toFixed(1)}%\n` +
        `Status: ${status}\n` +
        `Capacity Multiplier: ${(multiplier * 100).toFixed(0)}%\n\n` +
        `Effective capacity: ${effectiveMaxWeight.toFixed(1)}kg\n\n` +
        `Repair now?`,
        [
          {
            text: 'Continue Anyway',
            style: 'cancel',
            onPress: () => {
              // 繼續執行移動
              try {
                entropyEngine.processMovement({
                  distance: 0.5, // 500m = 0.5km
                  speed: 12.0,   // 12 km/h (快跑速度)
                  timestamp: Date.now(),
                });
              } catch (error) {
                Alert.alert('錯誤', `模擬移動失敗: ${error}`);
              }
            },
          },
          {
            text: 'Cancel',
            onPress: () => {
              // 取消移動
            },
          },
        ]
      );
      return;
    }
    
    // 耐久度正常，直接執行移動
    try {
      entropyEngine.processMovement({
        distance: 0.5, // 500m = 0.5km
        speed: 12.0,   // 12 km/h (快跑速度)
        timestamp: Date.now(),
      });
    } catch (error) {
      Alert.alert('錯誤', `模擬移動失敗: ${error}`);
    }
  };

  // 調試功能：重置玩家狀態
  const resetPlayer = () => {
    // 重置體力、耐久度和衛生值到 100
    const staminaDiff = 100 - playerState.stamina;
    const durabilityDiff = 100 - playerState.durability;
    const hygieneDiff = 100 - playerState.hygiene;
    
    playerState.updateStamina(staminaDiff);
    playerState.updateDurability(durabilityDiff);
    playerState.updateHygiene(hygieneDiff);
    
    Alert.alert('重置完成', '玩家狀態已重置為初始值');
  };

  // ========== Zone B: Inventory & Metabolism ==========
  // 手動食用 T1 物品
  const handleEatT1Manual = () => {
    const inventoryStore = useInventoryStore.getState();
    const t1Items = inventoryStore.items.filter((item) => item.tier === 1);
    
    if (t1Items.length === 0) {
      Alert.alert('無法食用', '背包中沒有 T1 物品可以食用。');
      return;
    }
    
    // 食用第一個 T1 物品
    const itemToEat = t1Items[0];
    inventoryStore.consumeItem(itemToEat.id);
    
    Alert.alert('食用成功', `已食用 T1 物品，恢復 +5 體力`);
  };

  // ========== Zone C: Economics ==========
  // 預覽結算（不應用狀態變更）
  const handlePreviewSettlement = () => {
    const inventoryStore = useInventoryStore.getState();
    
    if (inventoryStore.items.length === 0) {
      Alert.alert('無法預覽', '背包中沒有物品可以結算。');
      return;
    }
    
    if (sessionState.totalDistance === 0) {
      Alert.alert('無法預覽', '您還沒有移動任何距離。');
      return;
    }
    
    try {
      const result = calculateSettlement('normal');
      const constants = require('../../src/utils/constants');
      const ITEM_VALUES = constants.ITEM_VALUES;
      // 清潔費常數位於 HYGIENE 對象中，添加預設值作為安全網
      const CLEAN_COST_PER_PERCENT = constants.HYGIENE?.CLEAN_COST_PER_PERCENT ?? 2;
      
      // ========== 1. 計算總毛收益（所有物品的總價值）==========
      let totalGrossValue = 0;
      inventoryStore.items.forEach((item) => {
        const itemValue = ITEM_VALUES[`T${item.tier}` as 'T1' | 'T2' | 'T3'];
        totalGrossValue += itemValue;
      });
      
      // ========== 2. 確定質量狀態（90% 閾值規則）==========
      const currentHygiene = playerState.hygiene;
      const { getTieredMultiplier, getTierStatus } = require('../../src/core/math/tiered');
      const qualityMultiplier = getTieredMultiplier(currentHygiene);
      const status = getTierStatus(currentHygiene);
      const revenuePercentage = qualityMultiplier * 100;
      
      // ========== 3. 計算財務數據 ==========
      // 預期收益（應用質量倍率）
      const projectedRevenue = totalGrossValue * qualityMultiplier;
      
      // 收益損失（如果衛生值 < 90%）
      const revenuePenalty = totalGrossValue - projectedRevenue;
      
      // 清潔成本（恢復到 100% 的成本）
      const hygieneDeficit = 100 - currentHygiene;
      const cleaningCost = hygieneDeficit * CLEAN_COST_PER_PERCENT;
      
      // ========== 4. 計算其他成本 ==========
      // 維修費：每 1% 磨損 × 5 $SOLE × 背包容量（kg）
      const repairCost = result.durabilityLoss * (5 * playerState.baseMaxWeight);
      
      // ========== 5. 計算淨利潤 ==========
      const netProfit = projectedRevenue - cleaningCost - repairCost;
      
      // ========== 6. 構建詳細的結算預覽消息 ==========
      let message = `預期收益: $${projectedRevenue.toFixed(2)} SOLE\n\n`;
      
      // 質量狀態和收益損失
      message += `衛生狀態:\n`;
      message += `• 當前衛生值: ${currentHygiene.toFixed(1)}%\n`;
      message += `• 狀態: ${status}\n`;
      message += `• 收益倍率: ${revenuePercentage.toFixed(0)}%\n`;
      if (revenuePercentage < 100) {
        message += `• 收益損失: -$${revenuePenalty.toFixed(2)} SOLE\n`;
        message += `• 清潔成本: $${cleaningCost.toFixed(2)} SOLE (恢復到 100%)\n`;
        if (cleaningCost < revenuePenalty) {
          message += `💡 提示: 清潔成本 ($${cleaningCost.toFixed(2)}) < 收益損失 ($${revenuePenalty.toFixed(2)})，建議清潔！\n`;
        }
      } else {
        message += `• 收益損失: $0.00 SOLE\n`;
        if (currentHygiene < 100) {
          message += `• 清潔成本: $${cleaningCost.toFixed(2)} SOLE (恢復到 100%，可選)\n`;
        }
      }
      message += `\n`;
      
      // 成本明細
      message += `成本明細:\n`;
      // 使用預設值 2 作為安全網，確保顯示正常
      const displayRate = CLEAN_COST_PER_PERCENT ?? 2;
      message += `• 清潔費: -$${cleaningCost.toFixed(2)} (${hygieneDeficit.toFixed(1)}% × $${displayRate})\n`;
      message += `• 維修費: -$${repairCost.toFixed(2)} (${result.durabilityLoss.toFixed(1)}% × $5 × ${playerState.baseMaxWeight}kg)\n`;
      message += `─────────────────────\n`;
      message += `預估淨利: $${netProfit.toFixed(2)} SOLE\n\n`;
      
      // 其他資訊
      message += `其他資訊:\n`;
      message += `• 距離: ${result.totalDistance.toFixed(2)}km\n`;
      message += `• 物品數量: ${result.itemsDelivered}\n`;
      message += `• 總毛收益: $${totalGrossValue.toFixed(2)} SOLE\n`;
      message += `• 耐久度損失: -${result.durabilityLoss.toFixed(1)}%\n`;
      message += `• 當前衛生值: ${currentHygiene.toFixed(1)}%\n\n`;
      message += `點擊「UNLOAD / SETTLE」按鈕以應用結算。`;
      
      Alert.alert(
        '💰 結算預覽（未應用）',
        message,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[GameScreen] Preview settlement error:', error);
      Alert.alert('錯誤', `預覽結算失敗: ${error}`);
    }
  };

  // ========== Zone D: Chaos / Edge Cases ==========
  // 測試：速度作弊檢測
  const handleSpeedHackTest = () => {
    try {
      // 發送一個異常高速的移動事件（> 30km/h）
      entropyEngine.processMovement({
        distance: 0.5, // 500m
        speed: 50.0,   // 50 km/h（異常高速）
        timestamp: Date.now(),
      });
      
      Alert.alert(
        '⚡️ 速度作弊測試',
        '已發送異常高速移動事件（50 km/h）。\n\n檢查控制台日誌以查看是否被拒絕。',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('錯誤', `速度作弊測試失敗: ${error}`);
    }
  };

  // 測試：強制死亡（體力歸零）
  const handleForceDeath = () => {
    const currentStamina = playerState.stamina;
    playerState.updateStamina(-currentStamina); // 將體力設為 0
    
    Alert.alert(
      '💀 強制死亡',
      `已將體力設為 0。\n\n檢查 Ghost Overlay 是否出現。`,
      [{ text: 'OK' }]
    );
  };

  // 測試：強制崩塌（耐久度歸零）
  const handleForceCollapse = () => {
    const currentDurability = playerState.durability;
    playerState.updateDurability(-currentDurability); // 將耐久度設為 0
    
    Alert.alert(
      '🏚 強制崩塌',
      `已將耐久度設為 0。\n\n檢查 Immobilized 狀態是否啟用。`,
      [{ text: 'OK' }]
    );
  };

  // ========== Lab: Force Encounters ==========
  // 強制拾取調試功能（用於驗證數學邏輯）
  const handleForceLoot = (tier: 1 | 2 | 3) => {
    try {
      entropyEngine.processMovement({
        distance: 0.1, // 100m = 0.1km
        speed: 5.0,     // 5 km/h (步行速度)
        timestamp: Date.now(),
        forceLootTier: tier, // 強制生成指定階層的物品
      });
      
      const tierName = tier === 1 ? 'T1' : tier === 2 ? 'T2' : 'T3';
      console.log(`[Lab] Force Loot: Walked 100m and found ${tierName} item`);
    } catch (error) {
      Alert.alert('錯誤', `強制拾取失敗: ${error}`);
    }
  };

  // 卸貨結算功能
  const handleUnload = () => {
    const inventoryStore = useInventoryStore.getState();
    
    // 檢查是否有物品可以卸貨
    if (inventoryStore.items.length === 0) {
      Alert.alert('無法卸貨', '背包中沒有物品可以卸貨。');
      return;
    }

    // 檢查是否有移動距離
    if (sessionState.totalDistance === 0) {
      Alert.alert('無法卸貨', '您還沒有移動任何距離。');
      return;
    }

    // B. 卸貨前警告（衛生值檢查）
    if (playerState.hygiene < 100) {
      // 計算潛在損失
      const { ITEM_VALUES } = require('../../src/utils/constants');
      const { getTieredMultiplier, getTierStatus } = require('../../src/core/math/tiered');
      
      let totalValue = 0;
      inventoryStore.items.forEach((item) => {
        const itemValue = ITEM_VALUES[`T${item.tier}` as 'T1' | 'T2' | 'T3'];
        totalValue += itemValue;
      });
      
      const multiplier = getTieredMultiplier(playerState.hygiene);
      const status = getTierStatus(playerState.hygiene);
      const revenuePercentage = multiplier * 100;
      const potentialLoss = totalValue * (1 - multiplier);
      
      Alert.alert(
        '⚠️ Hygiene Warning',
        `Hygiene: ${playerState.hygiene.toFixed(1)}%\n` +
        `Status: ${status}\n` +
        `Revenue Multiplier: ${revenuePercentage.toFixed(0)}%\n\n` +
        `Vendors will pay ${revenuePercentage.toFixed(0)}% of value.\n` +
        `📉 Potential Loss: -$${potentialLoss.toFixed(2)} SOLE\n\n` +
        `🧼 Clean now to restore 100% Value?`,
        [
          {
            text: 'Continue Anyway',
            style: 'cancel',
            onPress: () => {
              // 繼續執行卸貨
              executeUnload();
            },
          },
          {
            text: 'Cancel',
            onPress: () => {
              // 取消卸貨
            },
          },
        ]
      );
      return;
    }

    // 衛生值正常，直接執行卸貨
    executeUnload();
  };

  // 實際執行卸貨的函數
  const executeUnload = () => {
    try {
      // 執行卸貨結算（使用 normal 模式，可以後續擴展為選擇模式）
      const result = executeUnloadSettlement('normal');

      // 計算成本（基於 v8.7 經濟模型）
      const constants = require('../../src/utils/constants');
      // 清潔費常數位於 HYGIENE 對象中，添加預設值作為安全網
      const CLEAN_COST_PER_PERCENT = constants.HYGIENE?.CLEAN_COST_PER_PERCENT ?? 2;
      
      // ========== 確定質量狀態（十進位階梯制）==========
      // 注意：結算時衛生值可能已經變化，所以我們使用結算後的衛生值
      const currentHygiene = playerState.hygiene;
      const { getTieredMultiplier, getTierStatus } = require('../../src/core/math/tiered');
      const qualityMultiplier = getTieredMultiplier(currentHygiene);
      const status = getTierStatus(currentHygiene);
      const revenuePercentage = qualityMultiplier * 100;
      
      // ========== 計算財務數據 ==========
      // 清潔成本（恢復到 100% 的成本）
      const hygieneDeficit = 100 - currentHygiene;
      const cleaningCost = hygieneDeficit * CLEAN_COST_PER_PERCENT;
      
      // 維修費：每 1% 磨損 × 5 $SOLE × 背包容量（kg）
      const repairCost = result.durabilityLoss * (5 * playerState.baseMaxWeight);
      
      // ========== 計算淨利潤 ==========
      const netProfit = result.revenue - cleaningCost - repairCost;
      
      // ========== 構建詳細的結算摘要消息 ==========
      let message = `收益: $${result.revenue.toFixed(2)} SOLE\n\n`;
      
      // 質量狀態
      message += `衛生狀態: ${status}\n`;
      message += `衛生值: ${currentHygiene.toFixed(1)}%\n`;
      message += `收益倍率: ${revenuePercentage.toFixed(0)}%\n\n`;
      
      // 成本明細
      message += `成本明細:\n`;
      // 使用預設值 2 作為安全網，確保顯示正常
      const displayRate = CLEAN_COST_PER_PERCENT ?? 2;
      message += `• 清潔費: -$${cleaningCost.toFixed(2)} (${hygieneDeficit.toFixed(1)}% × $${displayRate})\n`;
      message += `• 維修費: -$${repairCost.toFixed(2)} (${result.durabilityLoss.toFixed(1)}% × $5 × ${playerState.baseMaxWeight}kg)\n`;
      message += `─────────────────────\n`;
      message += `淨利潤: $${netProfit.toFixed(2)} SOLE\n\n`;
      
      // 其他資訊
      message += `其他資訊:\n`;
      message += `• 距離: ${result.totalDistance.toFixed(2)}km\n`;
      message += `• 物品數量: ${result.itemsDelivered}\n`;
      message += `• 耐久度損失: -${result.durabilityLoss.toFixed(1)}% (Calculated via Cumulative Debt)\n`;
      message += `• 當前衛生值: ${currentHygiene.toFixed(1)}%`;

      Alert.alert(
        'Delivery Complete!',
        message,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[GameScreen] Unload settlement error:', error);
      Alert.alert('錯誤', `卸貨結算失敗: ${error}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 模式切換按鈕 */}
      <View style={styles.modeToggleContainer}>
        <TouchableOpacity
          style={[styles.modeToggleButton, isOutdoorMode && styles.modeToggleActive]}
          onPress={() => setIsOutdoorMode(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.modeToggleText, isOutdoorMode && styles.modeToggleTextActive]}>
            🚶 戶外模式
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeToggleButton, !isOutdoorMode && styles.modeToggleActive]}
          onPress={() => setIsOutdoorMode(false)}
          activeOpacity={0.8}
        >
          <Text style={[styles.modeToggleText, !isOutdoorMode && styles.modeToggleTextActive]}>
            🔧 開發模式
          </Text>
        </TouchableOpacity>
      </View>

      {isOutdoorMode ? (
        // ========== 戶外模式 UI ==========
        <View style={outdoorStyles.container}>
          {/* 1. 頂部狀態條（固定） */}
          <View style={outdoorStyles.topBar}>
            {/* GPS 狀態指示器 */}
            <View style={outdoorStyles.gpsIndicator}>
              <Text style={outdoorStyles.gpsText}>
                {isTracking ? '🟢 GPS' : '🔴 GPS'}
              </Text>
            </View>
            
            {/* 開拓者狀態 */}
            {sessionState.pathfinder.isPathfinder && (
              <View style={outdoorStyles.pathfinderBadge}>
                <Text style={outdoorStyles.pathfinderText}>🗺️ 開拓者區域</Text>
              </View>
            )}
          </View>

          <ScrollView 
            style={outdoorStyles.scrollView}
            contentContainerStyle={outdoorStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 2. 主要狀態顯示區域（大號顯示） */}
            <View style={outdoorStyles.mainStats}>
              {/* 體力條（大號） */}
              <View style={outdoorStyles.staminaContainer}>
                <Text style={outdoorStyles.staminaLabel}>體力</Text>
                <View style={outdoorStyles.progressBarContainer}>
                  <View 
                    style={[
                      outdoorStyles.progressBar, 
                      { width: `${(playerState.stamina / playerState.maxStamina) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={outdoorStyles.staminaValue}>
                  {Math.round(playerState.stamina)} / {playerState.maxStamina}
                </Text>
              </View>

              {/* 負重顯示（大號） */}
              <View style={outdoorStyles.weightContainer}>
                <Text style={outdoorStyles.weightLabel}>負重</Text>
                <Text style={outdoorStyles.weightValue}>
                  {playerState.currentWeight.toFixed(1)} / {playerState.getEffectiveMaxWeight().toFixed(1)} kg
                </Text>
                {sessionState.isTempExpanded && (
                  <Text style={outdoorStyles.expandedBadge}>✨ 臨時擴容中</Text>
                )}
              </View>

              {/* 耐久度狀態（簡化顯示） */}
              <View style={outdoorStyles.durabilityContainer}>
                <Text style={outdoorStyles.durabilityLabel}>耐久度</Text>
                <View style={outdoorStyles.durabilityBar}>
                  <View 
                    style={[
                      outdoorStyles.durabilityFill,
                      { 
                        width: `${playerState.durability}%`,
                        backgroundColor: getDurabilityColor(playerState.durability)
                      }
                    ]} 
                  />
                </View>
                <Text style={outdoorStyles.durabilityValue}>
                  {Math.round(playerState.durability)}%
                </Text>
                {playerState.durability < 90 && (
                  <Text style={outdoorStyles.durabilityWarning}>
                    ⚠️ 容量降至 {Math.round((require('../../src/core/math/tiered').getTieredMultiplier(playerState.durability) * 100))}%
                  </Text>
                )}
              </View>
            </View>

            {/* 3. 實時統計卡片（簡化版） */}
            <View style={outdoorStyles.statsGrid}>
              <View style={outdoorStyles.statCard}>
                <Text style={outdoorStyles.statIcon}>📏</Text>
                <Text style={outdoorStyles.statValue}>{sessionState.totalDistance.toFixed(2)}</Text>
                <Text style={outdoorStyles.statUnit}>km</Text>
              </View>
              
              <View style={outdoorStyles.statCard}>
                <Text style={outdoorStyles.statIcon}>⚡</Text>
                <Text style={outdoorStyles.statValue}>
                  {(sessionState as any).currentSpeed?.toFixed(1) || '0.0'}
                </Text>
                <Text style={outdoorStyles.statUnit}>km/h</Text>
              </View>
              
              <View style={outdoorStyles.statCard}>
                <Text style={outdoorStyles.statIcon}>💰</Text>
                <Text style={outdoorStyles.statValue}>
                  ${sessionState.estimatedValue.toFixed(0)}
                </Text>
                <Text style={outdoorStyles.statUnit}>USD</Text>
              </View>
              
              <View style={outdoorStyles.statCard}>
                <Text style={outdoorStyles.statIcon}>📦</Text>
                <Text style={outdoorStyles.statValue}>
                  {inventoryState.items.length}
                </Text>
                <Text style={outdoorStyles.statUnit}>物品</Text>
              </View>
            </View>

            {/* 4. 庫存摘要（可摺疊） */}
            <TouchableOpacity 
              style={outdoorStyles.inventoryCard}
              onPress={() => setShowInventory(!showInventory)}
            >
              <View style={outdoorStyles.inventoryHeader}>
                <Text style={outdoorStyles.inventoryTitle}>📦 庫存</Text>
                <Text style={outdoorStyles.inventoryToggle}>
                  {showInventory ? '▲' : '▼'}
                </Text>
              </View>
              {showInventory && (
                <View style={outdoorStyles.inventoryContent}>
                  <View style={outdoorStyles.inventoryRow}>
                    <Text style={outdoorStyles.inventoryItem}>🍞 T1: {t1Count}</Text>
                    <Text style={outdoorStyles.inventoryItem}>🥩 T2: {t2Count}</Text>
                    <Text style={outdoorStyles.inventoryItem}>💎 T3: {t3Count}</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* 5. 實時地圖（可摺疊） */}
            <TouchableOpacity 
              style={outdoorStyles.mapCard}
              onPress={() => setShowMap(!showMap)}
            >
              <View style={outdoorStyles.mapCardHeader}>
                <Text style={outdoorStyles.mapCardTitle}>🗺️ 實時地圖</Text>
                <Text style={outdoorStyles.mapCardToggle}>
                  {showMap ? '▲' : '▼'}
                </Text>
              </View>
              {showMap && (
                <View style={outdoorStyles.mapCardContent}>
                  <RealTimeMap 
                    followUser={true}
                    showTrail={true}
                    height={300}
                  />
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>

          {/* 6. 底部操作按鈕（固定位置，大號按鈕） */}
          <View style={outdoorStyles.bottomActions}>
            {/* 臨時擴容按鈕 */}
            {!sessionState.isTempExpanded && (
              <TouchableOpacity
                style={[outdoorStyles.actionButton, outdoorStyles.expandButton]}
                onPress={async () => {
                  const canWatchAd = sessionState.triggerRescue('capacity');
                  if (!canWatchAd) {
                    Alert.alert('廣告上限已達', '您已達到今日臨時擴容廣告上限。');
                    return;
                  }
                  Alert.alert('觀看廣告', '即將播放 30 秒廣告...', [{ text: '確定' }]);
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  sessionState.setTempExpanded(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={outdoorStyles.actionButtonText}>📺 臨時擴容 +50%</Text>
                <Text style={outdoorStyles.actionButtonSubtext}>
                  {sessionState.adCaps?.capacity?.used || 0} / {sessionState.adCaps?.capacity?.cap || 3} 次
                </Text>
              </TouchableOpacity>
            )}

            {/* 卸貨按鈕（主要操作） */}
            <TouchableOpacity
              style={[
                outdoorStyles.actionButton, 
                outdoorStyles.unloadButton,
                inventoryState.items.length === 0 && outdoorStyles.actionButtonDisabled
              ]}
              onPress={() => setUnloadModalVisible(true)}
              activeOpacity={0.8}
              disabled={inventoryState.items.length === 0}
            >
              <Text style={outdoorStyles.actionButtonText}>🚚 卸貨變現</Text>
              <Text style={outdoorStyles.actionButtonSubtext}>
                ${sessionState.estimatedValue.toFixed(0)} USD
              </Text>
            </TouchableOpacity>
          </View>

          {/* 6. 拾取通知（類似 Pokemon Go 的彈窗） */}
          {lastPickedItem && (
            <Animated.View 
              style={[
                outdoorStyles.pickupNotification,
                { opacity: pickupNotificationOpacity }
              ]}
            >
              <Text style={outdoorStyles.pickupEmoji}>
                {lastPickedItem.tier === 1 ? '🍞' : lastPickedItem.tier === 2 ? '🥩' : '💎'}
              </Text>
              <Text style={outdoorStyles.pickupText}>
                拾取 {lastPickedItem.tier === 1 ? 'T1' : lastPickedItem.tier === 2 ? 'T2' : 'T3'} 物品
              </Text>
              <Text style={outdoorStyles.pickupValue}>
                +{lastPickedItem.value} $SOLE
              </Text>
            </Animated.View>
          )}
        </View>
      ) : (
        // ========== 開發模式 UI（現有代碼）==========
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 標題區域 */}
        <View style={styles.header}>
          <Text style={styles.title}>Solefood MVP</Text>
          <Text style={styles.subtitle}>Proof of Logistics</Text>
        </View>

        {/* 狀態條區域 */}
        <View style={styles.statusSection}>
          <StaminaBar
            value={playerState.stamina}
            maxValue={playerState.maxStamina}
          />
          <DurabilityBar
            value={playerState.durability}
            isFull={inventoryState.totalWeight >= playerState.getEffectiveMaxWeight()}
            isActive={sessionState.totalDistance > 0}
            value={playerState.durability}
          />
        </View>

        {/* 統計面板 - 自動從 Store 獲取數據 */}
        <StatsPanel />

        {/* ========== 控制面板 ========== */}
        <View style={styles.debugSection}>
          <Text style={styles.zoneTitle}>⚙️ 控制面板</Text>
          
          {/* 登入天數控制器（僅開發模式顯示） */}
          {!isOutdoorMode && (
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => {
                  const currentStreak = sessionState.luckGradient.streak;
                  if (currentStreak > 0) {
                    sessionState.setLoginDays(currentStreak - 1);
                  }
                }}
              >
                <Text style={styles.controlButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.controlLabel}>
                登入天數: {sessionState.luckGradient.streak}
              </Text>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => {
                  const currentStreak = sessionState.luckGradient.streak;
                  sessionState.setLoginDays(currentStreak + 1);
                }}
              >
                <Text style={styles.controlButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 當前掉落機率表格（僅開發模式顯示） */}
          {!isOutdoorMode && (
          <View style={styles.dropRateTable}>
            <Text style={styles.summaryTitle}>📊 當前掉落機率</Text>
            {(() => {
              const { calculateItemDropRate } = require('../../src/core/math/luck');
              const streak = sessionState.luckGradient.streak;
              const isPathfinder = sessionState.pathfinder.isPathfinder;
              const isInDeepZone = sessionState.deepZone.isInDeepZone;
              
              // 使用 currentT2Chance（考慮衰減）或 undefined（使用傳統計算）
              const currentT2Chance = sessionState.luckGradient.isDecaying 
                ? sessionState.luckGradient.currentT2Chance 
                : undefined;
              
              const t1Rate = calculateItemDropRate(1, streak, isPathfinder, isInDeepZone, currentT2Chance);
              const t2Rate = calculateItemDropRate(2, streak, isPathfinder, isInDeepZone, currentT2Chance);
              const t3Rate = calculateItemDropRate(3, streak, isPathfinder, isInDeepZone, currentT2Chance);
              
              return (
                <View style={styles.dropRateContent}>
                  <View style={styles.dropRateRow}>
                    <Text style={styles.dropRateLabel}>🍞 T1 機率:</Text>
                    <Text style={styles.dropRateValue}>{t1Rate.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.dropRateRow}>
                    <Text style={styles.dropRateLabel}>🥩 T2 機率:</Text>
                    <Text style={styles.dropRateValue}>{t2Rate.toFixed(1)}%</Text>
                    {sessionState.luckGradient.t2Bonus > 0 && !sessionState.luckGradient.isDecaying && (
                      <Text style={styles.dropRateBonus}>
                        (+{sessionState.luckGradient.t2Bonus.toFixed(1)}%)
                      </Text>
                    )}
                    {sessionState.luckGradient.isDecaying && (
                      <Text style={[styles.dropRateBonus, { color: '#F44336' }]}>
                        (衰減中)
                      </Text>
                    )}
                  </View>
                  <View style={styles.dropRateRow}>
                    <Text style={styles.dropRateLabel}>💎 T3 機率:</Text>
                    <Text style={styles.dropRateValue}>{t3Rate.toFixed(1)}%</Text>
                    {isInDeepZone && (
                      <Text style={styles.dropRateBonus}>(深層領域翻倍)</Text>
                    )}
                  </View>
                  {(isPathfinder || isInDeepZone) && (
                    <View style={styles.dropRateModifiers}>
                      {isPathfinder && (
                        <Text style={styles.modifierText}>📍 開拓者區域: T2 +10%</Text>
                      )}
                      {isInDeepZone && (
                        <Text style={styles.modifierText}>🌊 深層領域: T3 翻倍</Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })()}
          </View>
          )}

          {/* 庫存摘要 */}
          <View style={styles.inventorySummary}>
            <Text style={styles.summaryTitle}>📦 庫存摘要</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>
                🍞 T1: {inventoryState.items.filter(i => i.tier === 1).length}
              </Text>
              <Text style={styles.summaryText}>
                🥩 T2: {inventoryState.items.filter(i => i.tier === 2).length}
              </Text>
              <Text style={styles.summaryText}>
                💎 T3: {inventoryState.items.filter(i => i.tier === 3).length}
              </Text>
            </View>
          </View>

          {/* 臨時擴容按鈕 */}
          <TouchableOpacity
            style={[styles.button, sessionState.isTempExpanded ? styles.buttonActive : styles.buttonInactive]}
            onPress={async () => {
              // 如果已經擴容，直接關閉
              if (sessionState.isTempExpanded) {
                sessionState.setTempExpanded(false);
                Alert.alert('臨時擴容已關閉', '容量已恢復正常。');
                return;
              }
              
              // 檢查廣告上限
              const canWatchAd = sessionState.triggerRescue('capacity');
              
              if (!canWatchAd) {
                Alert.alert('廣告上限已達', '您已達到今日臨時擴容廣告上限。');
                return;
              }
              
              // 模擬觀看廣告（實際應用中應整合真實的廣告 SDK）
              Alert.alert(
                '觀看廣告',
                '即將播放 30 秒廣告...',
                [{ text: '確定' }]
              );
              
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // 啟用臨時擴容
              sessionState.setTempExpanded(true);
              
              // 獲取更新後的容量
              const newCapacity = playerState.getEffectiveMaxWeight();
              
              Alert.alert(
                '✅ 臨時擴容已啟用',
                `容量已臨時增加 50%！\n\n` +
                `新容量：${newCapacity.toFixed(1)}kg\n` +
                `（基礎 ${playerState.baseMaxWeight}kg × 1.5）`,
                [{ text: '確定' }]
              );
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              📺 {sessionState.isTempExpanded ? '關閉臨時擴容' : '觀看廣告：臨時擴容 +50%'}
            </Text>
            <Text style={styles.buttonSubtext}>
              當前容量: {playerState.getEffectiveMaxWeight().toFixed(1)}kg
              {sessionState.isTempExpanded && ' (已擴容)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ========== 開發模式：調試功能區域 ========== */}
        {!isOutdoorMode && (
          <>
        {/* ========== Zone A: Survival (Existing) ========== */}
        <View style={styles.debugSection}>
          <Text style={styles.zoneTitle}>Zone A: Survival</Text>
          <Text style={styles.zoneSubtitle}>模擬移動（測試用）</Text>

          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={simulateWalk}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>🚶 Walk 100m</Text>
            <Text style={styles.buttonSubtext}>速度: 5 km/h</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={simulateSprint}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>🏃 Sprint 500m</Text>
            <Text style={styles.buttonSubtext}>速度: 12 km/h</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonReset]}
            onPress={resetPlayer}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>🔄 Reset Player</Text>
            <Text style={styles.buttonSubtext}>恢復體力/耐久度</Text>
          </TouchableOpacity>
        </View>

        {/* ========== Zone B: Inventory & Metabolism ========== */}
        <View style={styles.debugSection}>
          <Text style={styles.zoneTitle}>Zone B: Inventory & Metabolism</Text>
          <Text style={styles.zoneSubtitle}>驗證手動食用功能</Text>

          <TouchableOpacity
            style={[styles.button, styles.buttonMetabolism]}
            onPress={handleEatT1Manual}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>🍬 Eat T1 (Manual)</Text>
            <Text style={styles.buttonSubtext}>食用 T1 物品，恢復 +5 體力</Text>
          </TouchableOpacity>
        </View>

        {/* ========== Zone C: Economics ========== */}
        <View style={styles.debugSection}>
          <Text style={styles.zoneTitle}>Zone C: Economics</Text>
          <Text style={styles.zoneSubtitle}>驗證結算功能</Text>

          <TouchableOpacity
            style={[styles.button, styles.buttonPreview]}
            onPress={handlePreviewSettlement}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>👁 Preview Settlement</Text>
            <Text style={styles.buttonSubtext}>預覽結算結果（不應用）</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonUnload]}
            onPress={handleUnload}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>💰 UNLOAD / SETTLE</Text>
            <Text style={styles.buttonSubtext}>完成交付並結算</Text>
          </TouchableOpacity>
        </View>

        {/* ========== Zone D: Chaos / Edge Cases ========== */}
        <View style={styles.debugSection}>
          <Text style={styles.zoneTitle}>Zone D: Chaos / Edge Cases</Text>
          <Text style={styles.zoneSubtitle}>驗證邊緣情況和限制</Text>

          <TouchableOpacity
            style={[styles.button, styles.buttonChaos]}
            onPress={handleSpeedHackTest}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>⚡️ Cheat: Speed Hack</Text>
            <Text style={styles.buttonSubtext}>測試速度作弊檢測（50 km/h）</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonDeath]}
            onPress={handleForceDeath}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>💀 Force Death</Text>
            <Text style={styles.buttonSubtext}>強制體力歸零（測試 Ghost Mode）</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonCollapse]}
            onPress={handleForceCollapse}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>🏚 Force Collapse</Text>
            <Text style={styles.buttonSubtext}>強制耐久度歸零（測試 Immobilized）</Text>
          </TouchableOpacity>
        </View>

        {/* ========== 🔬 Lab: Force Encounters (100m) ========== */}
        <View style={styles.debugSection}>
          <Text style={styles.zoneTitle}>🔬 Lab: Force Encounters (100m)</Text>
          <Text style={styles.zoneSubtitle}>強制生成指定物品，驗證數學邏輯（特別是零和邏輯）</Text>

          <TouchableOpacity
            style={[styles.button, styles.buttonLab]}
            onPress={() => handleForceLoot(1)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>🧪 Walk + T1</Text>
            <Text style={styles.buttonSubtext}>步行 100m + 強制 T1（驗證零和：-2 Move -3 Work +5 Food = 0）</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonLab]}
            onPress={() => handleForceLoot(2)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>🧪 Walk + T2</Text>
            <Text style={styles.buttonSubtext}>步行 100m + 強制 T2（驗證：-2 Move -9 Work +15 Food = +4）</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonLab]}
            onPress={() => handleForceLoot(3)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>🧪 Walk + T3</Text>
            <Text style={styles.buttonSubtext}>步行 100m + 強制 T3（驗證：-2 Move -30 Work +100 Food = +68）</Text>
          </TouchableOpacity>
        </View>

        {/* ========== 🧪 新功能測試區域 ========== */}
        <View style={styles.debugSection}>
          <Text style={styles.zoneTitle}>🧪 新功能測試</Text>
          <Text style={styles.zoneSubtitle}>測試已完成的核心功能</Text>

          {/* 廣告救援測試 */}
          <TouchableOpacity
            style={[styles.button, styles.buttonTest]}
            onPress={() => {
              // 測試腎上腺素救援（空間足夠但體力不足）
              const testItem: Item = {
                id: `test-item-${Date.now()}`,
                tier: 2,
                weight: ITEM_WEIGHTS.T2,
                value: ITEM_VALUES.T2,
                pickupCost: ITEM_PICKUP_COSTS.T2,
                timestamp: Date.now(),
                restoreStamina: ITEM_CONSUME_RESTORE.T2,
              };
              
              // 設置體力不足
              playerState.updateStamina(-playerState.stamina + 5); // 只保留 5 體力
              
              setAdRescueItem(testItem);
              setAdRescueType('adrenaline');
              setAdRescueVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>💉 測試：腎上腺素救援</Text>
            <Text style={styles.buttonSubtext}>空間足夠但體力不足時觸發</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonTest]}
            onPress={() => {
              // 測試臨時擴容救援（背包滿倉）
              const testItem: Item = {
                id: `test-item-${Date.now()}`,
                tier: 3,
                weight: ITEM_WEIGHTS.T3,
                value: ITEM_VALUES.T3,
                pickupCost: ITEM_PICKUP_COSTS.T3,
                timestamp: Date.now(),
                restoreStamina: ITEM_CONSUME_RESTORE.T3,
              };
              
              // 填滿背包（添加多個 T1 物品直到接近滿倉）
              const currentWeight = inventoryState.totalWeight;
              const maxWeight = playerState.maxWeight;
              const spaceLeft = maxWeight - currentWeight;
              
              if (spaceLeft > ITEM_WEIGHTS.T1) {
                // 添加多個 T1 物品填滿背包
                let remainingSpace = spaceLeft;
                while (remainingSpace >= ITEM_WEIGHTS.T1) {
                  const fillItem: Item = {
                    id: `fill-item-${Date.now()}-${Math.random()}`,
                    tier: 1,
                    weight: ITEM_WEIGHTS.T1,
                    value: ITEM_VALUES.T1,
                    pickupCost: ITEM_PICKUP_COSTS.T1,
                    timestamp: Date.now(),
                    restoreStamina: ITEM_CONSUME_RESTORE.T1,
                  };
                  if (inventoryState.addItem(fillItem)) {
                    remainingSpace -= ITEM_WEIGHTS.T1;
                  } else {
                    break; // 無法再添加
                  }
                }
              }
              
              setAdRescueItem(testItem);
              setAdRescueType('temporary_expansion');
              setAdRescueVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>📦 測試：臨時擴容救援</Text>
            <Text style={styles.buttonSubtext}>背包滿倉時觸發</Text>
          </TouchableOpacity>

          {/* 卸貨變現矩陣測試 */}
          <TouchableOpacity
            style={[styles.button, styles.buttonTest]}
            onPress={() => {
              // 確保有物品可以卸貨
              if (inventoryState.items.length === 0) {
                Alert.alert('提示', '請先拾取一些物品再測試卸貨功能');
                return;
              }
              setUnloadModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>💰 測試：卸貨變現矩陣</Text>
            <Text style={styles.buttonSubtext}>M Normal / M Ad / M Info 選項</Text>
          </TouchableOpacity>

          {/* 每日幸運梯度測試 */}
          <TouchableOpacity
            style={[styles.button, styles.buttonTest]}
            onPress={() => {
              const sessionStore = useSessionStore.getState();
              const streak = sessionStore.luckGradient?.streak || 0;
              const t2Bonus = sessionStore.luckGradient?.t2Bonus || 0;
              
              // 模擬增加簽到天數
              sessionStore.updateStreak();
              
              const newStreak = useSessionStore.getState().luckGradient.streak;
              const newT2Bonus = useSessionStore.getState().luckGradient.t2Bonus;
              
              Alert.alert(
                '每日幸運梯度測試',
                `簽到天數：${streak} → ${newStreak}\n` +
                `T2 加成：${t2Bonus.toFixed(1)}% → ${newT2Bonus.toFixed(1)}%\n\n` +
                `基礎 T2 機率：14%\n` +
                `最終 T2 機率：${(14 + newT2Bonus).toFixed(1)}%`,
                [{ text: '確定' }]
              );
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>🍀 測試：每日幸運梯度</Text>
            <Text style={styles.buttonSubtext}>簽到天數影響 T2 掉落率</Text>
          </TouchableOpacity>

          {/* 深層領域檢測測試 */}
          <TouchableOpacity
            style={[styles.button, styles.buttonTest]}
            onPress={() => {
              const sessionStore = useSessionStore.getState();
              const currentDistance = sessionStore.sessionDistance;
              const isInDeepZone = sessionStore.deepZone?.isInDeepZone || false;
              
              // 模擬增加距離到 10km
              if (currentDistance < 10) {
                sessionStore.addDistance(10 - currentDistance);
                sessionStore.checkDeepZone();
              }
              
              const newDistance = useSessionStore.getState().sessionDistance;
              const newIsInDeepZone = useSessionStore.getState().deepZone.isInDeepZone;
              const t3Multiplier = useSessionStore.getState().deepZone.t3Multiplier;
              
              Alert.alert(
                '深層領域檢測測試',
                `會話距離：${currentDistance.toFixed(2)}km → ${newDistance.toFixed(2)}km\n` +
                `深層領域：${isInDeepZone ? '是' : '否'} → ${newIsInDeepZone ? '是' : '否'}\n` +
                `T3 倍率：${t3Multiplier}x\n\n` +
                `${newIsInDeepZone ? '✅ 已進入深層領域！T3 掉落率翻倍（1% → 2%）' : '⏳ 尚未進入深層領域（需要 10km）'}`,
                [{ text: '確定' }]
              );
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>🌊 測試：深層領域檢測</Text>
            <Text style={styles.buttonSubtext}>10km 時 T3 掉落率翻倍</Text>
          </TouchableOpacity>

          {/* GPS 位置追蹤測試 */}
          <TouchableOpacity
            style={[styles.button, styles.buttonTest]}
            onPress={async () => {
              try {
                const hasPermission = await locationService.checkPermissions();
                if (!hasPermission) {
                  const granted = await locationService.requestPermissions();
                  if (!granted) {
                    Alert.alert('權限被拒絕', '需要位置權限才能測試 GPS 功能');
                    return;
                  }
                }
                
                const location = await locationService.getCurrentLocation();
                if (location) {
                  Alert.alert(
                    'GPS 位置追蹤測試',
                    `緯度：${location.latitude.toFixed(6)}\n` +
                    `經度：${location.longitude.toFixed(6)}\n` +
                    `精度：${location.accuracy ? `${location.accuracy.toFixed(0)}m` : '未知'}\n` +
                    `速度：${location.speed ? `${(location.speed * 3.6).toFixed(2)} km/h` : '未知'}`,
                    [{ text: '確定' }]
                  );
                } else {
                  Alert.alert('錯誤', '無法獲取位置信息');
                }
              } catch (error) {
                Alert.alert('錯誤', `GPS 測試失敗：${error}`);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>📍 測試：GPS 位置追蹤</Text>
            <Text style={styles.buttonSubtext}>獲取當前位置信息</Text>
          </TouchableOpacity>

          {/* 持久化存儲測試 */}
          <TouchableOpacity
            style={[styles.button, styles.buttonTest]}
            onPress={async () => {
              try {
                // 保存測試數據
                const testData = {
                  timestamp: Date.now(),
                  playerStamina: playerState.stamina,
                  playerDurability: playerState.durability,
                  inventoryCount: inventoryState.items.length,
                };
                
                await saveData(STORAGE_KEYS.PLAYER_STATE, testData);
                
                // 讀取測試數據
                const loadedData = await loadData<typeof testData>(STORAGE_KEYS.PLAYER_STATE);
                
                if (loadedData) {
                  Alert.alert(
                    '持久化存儲測試',
                    `✅ 保存成功！\n\n` +
                    `保存時間：${new Date(testData.timestamp).toLocaleString()}\n` +
                    `體力：${testData.playerStamina}\n` +
                    `耐久度：${testData.playerDurability}\n` +
                    `物品數量：${testData.inventoryCount}\n\n` +
                    `✅ 讀取成功！\n` +
                    `讀取時間：${new Date(loadedData.timestamp).toLocaleString()}`,
                    [{ text: '確定' }]
                  );
                } else {
                  Alert.alert('錯誤', '讀取失敗：數據為空');
                }
              } catch (error) {
                Alert.alert('錯誤', `持久化存儲測試失敗：${error}`);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>💾 測試：持久化存儲</Text>
            <Text style={styles.buttonSubtext}>保存和讀取遊戲狀態</Text>
          </TouchableOpacity>
        </View>
          </>
        )}

        {/* 狀態信息面板（僅開發模式顯示） */}
        {!isOutdoorMode && (
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>當前狀態</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ghost Mode:</Text>
            <Text style={[styles.infoValue, playerState.isGhost && styles.warning]}>
              {playerState.isGhost ? '啟用' : '未啟用'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Immobilized:</Text>
            <Text style={[styles.infoValue, playerState.isImmobilized && styles.error]}>
              {playerState.isImmobilized ? '已定身' : '正常'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>衛生值:</Text>
            <Text style={styles.infoValue}>
              {Math.round(playerState.hygiene)}%
            </Text>
          </View>
        </View>
        )}
      </ScrollView>
      )}

      {/* Ghost Overlay - 必須在最後，以便覆蓋所有內容 */}
      {/* 組件內部自動從 Store 獲取 isGhost 狀態 */}
      <GhostOverlay />

      {/* 廣告救援模態框 */}
      <AdRescueModal
        visible={adRescueVisible}
        type={adRescueType}
        item={adRescueItem}
        onClose={() => {
          setAdRescueVisible(false);
          setAdRescueItem(null);
        }}
        onSuccess={() => {
          Alert.alert('成功', '廣告救援測試完成！');
        }}
      />

      {/* 卸貨變現模態框 */}
      <UnloadModal
        visible={unloadModalVisible}
        onClose={() => setUnloadModalVisible(false)}
        onSuccess={(revenue) => {
          Alert.alert('成功', `卸貨完成！收益：$${revenue.toFixed(2)} SOLE`);
        }}
        isGoldenMistNode={false} // 可以改為 true 來測試 M Info
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    letterSpacing: 1,
  },
  statusSection: {
    marginBottom: 16,
  },
  debugSection: {
    marginTop: 24,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  debugSubtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  zoneTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  zoneSubtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonPrimary: {
    backgroundColor: '#4CAF50',
  },
  buttonSecondary: {
    backgroundColor: '#2196F3',
  },
  buttonReset: {
    backgroundColor: '#FF9800',
  },
  buttonUnload: {
    backgroundColor: '#9C27B0',
  },
  buttonMetabolism: {
    backgroundColor: '#FF5722',
  },
  buttonPreview: {
    backgroundColor: '#00BCD4',
  },
  buttonChaos: {
    backgroundColor: '#607D8B',
  },
  buttonDeath: {
    backgroundColor: '#424242',
  },
  buttonCollapse: {
    backgroundColor: '#795548',
  },
  buttonLab: {
    backgroundColor: '#9C27B0',
  },
  buttonTest: {
    backgroundColor: '#00BCD4',
  },
  buttonActive: {
    backgroundColor: '#4CAF50',
  },
  buttonInactive: {
    backgroundColor: '#9E9E9E',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  controlLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    minWidth: 120,
    textAlign: 'center',
  },
  inventorySummary: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dropRateTable: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  dropRateContent: {
    marginTop: 8,
  },
  dropRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dropRateLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 1,
  },
  dropRateValue: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'right',
  },
  dropRateBonus: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
    marginLeft: 8,
  },
  dropRateModifiers: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modifierText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.9,
  },
  infoSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  warning: {
    color: '#FF9800',
  },
  error: {
    color: '#F44336',
  },
  // 模式切換按鈕樣式
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modeToggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeToggleActive: {
    backgroundColor: '#2196F3',
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeToggleTextActive: {
    color: '#FFF',
  },
});

// ========== 戶外模式專用樣式 ==========
const outdoorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingBottom: 100, // 為底部按鈕留空間
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  gpsIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
  },
  gpsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  pathfinderBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
  },
  pathfinderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  mainStats: {
    padding: 20,
    backgroundColor: '#FFF',
    marginTop: 8,
  },
  staminaContainer: {
    marginBottom: 20,
  },
  staminaLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 24,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
  },
  staminaValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  weightContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  weightLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  weightValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2196F3',
  },
  expandedBadge: {
    marginTop: 4,
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
  },
  durabilityContainer: {
    marginBottom: 10,
  },
  durabilityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  durabilityBar: {
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  durabilityFill: {
    height: '100%',
    borderRadius: 8,
  },
  durabilityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  durabilityWarning: {
    fontSize: 12,
    color: '#FF9800',
    textAlign: 'center',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  statUnit: {
    fontSize: 12,
    color: '#666',
  },
  inventoryCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inventoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  inventoryToggle: {
    fontSize: 16,
    color: '#666',
  },
  inventoryContent: {
    marginTop: 12,
  },
  inventoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  inventoryItem: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  expandButton: {
    backgroundColor: '#FF9800',
  },
  unloadButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  actionButtonSubtext: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.9,
  },
  pickupNotification: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  pickupEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  pickupText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  pickupValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  mapCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  mapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  mapCardToggle: {
    fontSize: 16,
    color: '#666',
  },
  mapCardContent: {
    marginTop: 12,
  },
});
