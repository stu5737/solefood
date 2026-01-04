/**
 * 主遊戲畫面
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 本畫面整合熵計算引擎、狀態管理和調試功能
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { StaminaBar, DurabilityBar, StatsPanel, GhostOverlay } from '../../src/components/game';
import { usePlayerStore } from '../../src/stores/playerStore';
import { useSessionStore } from '../../src/stores/sessionStore';
import { useInventoryStore } from '../../src/stores/inventoryStore';
import { entropyEngine } from '../../src/core/entropy/engine';
import { executeUnloadSettlement, calculateSettlement } from '../../src/core/game/unloading';
import { calculateContamination } from '../../src/core/math/maintenance';
import type { EntropyEvent, LootResult } from '../../src/core/entropy/events';

export default function GameScreen() {
  // 從 Store 獲取狀態
  const playerState = usePlayerStore();
  const sessionState = useSessionStore();
  
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

  // 調試功能：模擬移動 - 步行 100m
  const simulateWalk = () => {
    // A. 開始前警告（耐久度檢查）
    if (playerState.durability < 90) {
      const effectiveMaxWeight = playerState.getEffectiveMaxWeight();
      Alert.alert(
        '⚠️ Equipment Worn',
        `Durability is ${playerState.durability.toFixed(1)}% (<90%).\n\n` +
        `Effective capacity reduced to ${effectiveMaxWeight.toFixed(1)}kg (90% of base).\n\n` +
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
    if (playerState.durability < 90) {
      const effectiveMaxWeight = playerState.getEffectiveMaxWeight();
      Alert.alert(
        '⚠️ Equipment Worn',
        `Durability is ${playerState.durability.toFixed(1)}% (<90%).\n\n` +
        `Effective capacity reduced to ${effectiveMaxWeight.toFixed(1)}kg (90% of base).\n\n` +
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
      const threshold = 90;
      const isGradeB = currentHygiene < threshold;
      const qualityMultiplier = isGradeB ? 0.9 : 1.0;
      const qualityGrade = isGradeB ? 'Grade B' : 'Grade A';
      
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
      if (isGradeB) {
        message += `⚠️ 質量警告:\n`;
        message += `• 當前衛生值: ${currentHygiene.toFixed(1)}% (<90%)\n`;
        message += `• 質量等級: ${qualityGrade} (10% 折損)\n`;
        message += `• 收益損失: -$${revenuePenalty.toFixed(2)} SOLE\n`;
        message += `• 清潔成本: $${cleaningCost.toFixed(2)} SOLE (恢復到 100%)\n`;
        if (cleaningCost < revenuePenalty) {
          message += `💡 提示: 清潔成本 ($${cleaningCost.toFixed(2)}) < 收益損失 ($${revenuePenalty.toFixed(2)})，建議清潔！\n`;
        }
        message += `\n`;
      } else {
        message += `✅ 質量狀態:\n`;
        message += `• 當前衛生值: ${currentHygiene.toFixed(1)}% (≥90%)\n`;
        message += `• 質量等級: ${qualityGrade} (100% 價值)\n`;
        message += `• 收益損失: $0.00 SOLE\n`;
        if (currentHygiene < 100) {
          message += `• 清潔成本: $${cleaningCost.toFixed(2)} SOLE (恢復到 100%，可選)\n`;
        }
        message += `\n`;
      }
      
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
    if (playerState.hygiene < 90) {
      // 計算潛在損失
      const { ITEM_VALUES } = require('../../src/utils/constants');
      let totalValue = 0;
      inventoryStore.items.forEach((item) => {
        const itemValue = ITEM_VALUES[`T${item.tier}` as 'T1' | 'T2' | 'T3'];
        totalValue += itemValue;
      });
      const potentialLoss = totalValue * 0.1; // 10% 折損
      
      Alert.alert(
        '⚠️ Quality Warning!',
        `Hygiene is ${playerState.hygiene.toFixed(1)}% (<90%).\n\n` +
        `Vendors will pay 10% less (Grade B Quality).\n` +
        `📉 Potential Loss: -$${potentialLoss.toFixed(2)} SOLE\n\n` +
        `🧼 Clean now to restore Grade A (100% Value)?`,
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
      
      // ========== 確定質量狀態（90% 閾值規則）==========
      // 注意：結算時衛生值可能已經變化，所以我們使用結算後的衛生值
      const currentHygiene = playerState.hygiene;
      const threshold = 90;
      const isGradeB = currentHygiene < threshold;
      const qualityGrade = isGradeB ? 'Grade B' : 'Grade A';
      
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
      if (isGradeB) {
        message += `⚠️ 質量狀態: ${qualityGrade} (衛生值 ${currentHygiene.toFixed(1)}% < 90%)\n`;
        message += `收益已應用 10% 折損\n\n`;
      } else {
        message += `✅ 質量狀態: ${qualityGrade} (衛生值 ${currentHygiene.toFixed(1)}% ≥ 90%)\n`;
        message += `收益為 100% 價值\n\n`;
      }
      
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
          />
        </View>

        {/* 統計面板 - 自動從 Store 獲取數據 */}
        <StatsPanel />

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

        {/* 狀態信息面板 */}
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
      </ScrollView>

      {/* Ghost Overlay - 必須在最後，以便覆蓋所有內容 */}
      {/* 組件內部自動從 Store 獲取 isGhost 狀態 */}
      <GhostOverlay />
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
});
