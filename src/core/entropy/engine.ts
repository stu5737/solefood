/**
 * 熵計算引擎
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 本模組實現遊戲循環的核心邏輯，連接輸入（移動）與狀態（Stores）
 * 
 * 職責：
 * 1. 接收移動事件（MovementInput）
 * 2. 使用數學函數計算各種衰減（Stamina, Durability, Hygiene）
 * 3. 更新對應的 Store
 * 4. 執行零容忍檢查
 */

import { MovementInput, EntropyResult, EntropyEvent, EntropyEventType, LootResult } from './events';
import { usePlayerStore } from '../../stores/playerStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { calculateContamination } from '../math/maintenance';
import { calculateMovementBurn, calculatePickupCost } from '../math/stamina';
import { calculateDecay } from '../math/durability';
import { calculateHygieneDecay } from '../math/hygiene';
// 注意：calculateContamination 不再在此處使用，衛生值污染改為卸貨時結算
import { ANTI_CHEAT, ITEM_DISTRIBUTION, ITEM_WEIGHTS, ITEM_VALUES, ITEM_PICKUP_COSTS, ITEM_CONSUME_RESTORE } from '../../utils/constants';
import { Item, ItemTier } from '../../types/item';

/**
 * 熵計算引擎類
 * 
 * 使用單例模式，確保全局只有一個引擎實例
 */
class EntropyEngine {
  private static instance: EntropyEngine | null = null;
  private lastProcessTime: number = Date.now();
  private eventListeners: Map<EntropyEventType, Array<(event: EntropyEvent) => void>> = new Map();
  
  /**
   * 距離累積器
   * 用於處理被動真空拾取機制
   * GPS 更新是細粒度的（例如 0.02km, 0.05km），需要累積到 0.1km 才觸發拾取
   */
  private pendingDistance: number = 0;

  /**
   * 獲取單例實例
   */
  static getInstance(): EntropyEngine {
    if (!EntropyEngine.instance) {
      EntropyEngine.instance = new EntropyEngine();
    }
    return EntropyEngine.instance;
  }

  /**
   * 私有構造函數（單例模式）
   */
  private constructor() {
    this.lastProcessTime = Date.now();
    this.pendingDistance = 0;
  }

  /**
   * 處理移動事件
   * 
   * 這是熵計算引擎的核心方法，實現被動真空拾取機制：
   * 
   * 1. 驗證輸入數據（防作弊檢查）
   * 2. 累積距離到 pendingDistance
   * 3. 基礎移動消耗（持續發生，不依賴拾取）
   * 4. 被動真空拾取循環（每 100m 觸發一次）
   *    - RNG 決定物品階層（85/14/1）
   *    - 自動檢查並拾取
   * 5. 計算耐久度和衛生值衰減
   * 6. 更新所有 Store
   * 7. 執行零容忍檢查
   * 
   * @param input - 移動輸入數據
   * @returns 熵計算結果
   */
  processMovement(input: MovementInput): EntropyResult {
    // 1. 驗證輸入數據
    this.validateInput(input);

    // 2. 獲取當前狀態
    const playerState = usePlayerStore.getState();
    const sessionState = useSessionStore.getState();
    const inventoryStore = useInventoryStore.getState();
    const currentTime = input.timestamp || Date.now();

    // 3. 累積距離到 pendingDistance
    // GPS 更新是細粒度的（例如 0.02km, 0.05km），需要累積
    this.pendingDistance += input.distance;

    // 3.1 計算並記錄耐久度債務（在拾取循環之前）
    // 使用「工業強化」數學模型：decay = distance × (1 + (currentWeight × 0.15)) × 0.1
    // 重要：這防止「負重卸載」作弊（玩家在卸貨前減輕負重以逃避維修成本）
    const sessionStore = useSessionStore.getState();
    const currentWeight = playerState.currentWeight;
    const weightCoefficient = 0.15; // 工業強化係數（低摩擦係數，適用於高端裝備）
    const scalingFactor = 0.1;      // 縮放因子，輸出用戶友好的百分比值
    const weightFactor = 1 + (currentWeight * weightCoefficient);
    const tickDecay = input.distance * weightFactor * scalingFactor;
    
    // 記錄耐久度債務（不立即扣除玩家耐久度，保持「安全旅程」）
    sessionStore.addDurabilityDebt(tickDecay);

    // 4. 批量計算體力變化（避免狀態覆蓋）
    // 創建一個累積變量，所有體力變化都在這裡累積，最後只應用一次
    let totalStaminaChange = 0;

    // 4.1 計算基礎移動消耗（持續發生，不依賴拾取）
    // 基礎消耗：1km = 10pts，即 100m = 1pt
    const baseStaminaBurn = calculateMovementBurn(input.distance);
    
    // 4.2 重量懲罰：負重越高，消耗越大
    // 懲罰係數 = 1.0 + (currentWeight / maxWeight)
    // 注意：重量懲罰只影響移動消耗，不影響拾取成本
    // 重要：重量懲罰必須始終應用，無論是拾取、食用還是忽略物品
    let staminaBurn = baseStaminaBurn;
    let weightMultiplier = 1.0;
    if (playerState.maxWeight > 0) {
      const weightRatio = playerState.currentWeight / playerState.maxWeight;
      weightMultiplier = 1.0 + weightRatio;
      staminaBurn = baseStaminaBurn * weightMultiplier;
    }
    
    // 4.3 確定最終移動消耗（在拾取循環之前計算，不會因溢出而改變）
    // 重要：無論拾取結果如何，移動消耗都必須包含重量懲罰
    const finalMoveBurn = staminaBurn;
    
    // 保存基礎消耗值和重量乘數（用於日誌顯示）
    const baseMovementBurn = baseStaminaBurn;

    // 5. 被動真空拾取循環
    // 每 100m (0.1km) 觸發一次拾取事件
    // 使用 while 循環處理快速移動或 GPS 漂移的情況（例如一次輸入 0.5km -> 觸發 5 次拾取）
    const LOOT_TRIGGER_DISTANCE = 0.1; // 100m = 0.1km
    let lootEventsCount = 0;
    
    // 累積本輪所有拾取事件的體力變化
    let totalLootStaminaChange = 0;

    while (this.pendingDistance >= LOOT_TRIGGER_DISTANCE) {
      // 從 pendingDistance 中扣除 0.1km
      this.pendingDistance -= LOOT_TRIGGER_DISTANCE;
      lootEventsCount++;

      // 觸發拾取邏輯，並累積體力變化（Step B: Loot Loop）
      // 如果指定了 forceLootTier，強制生成該階層的物品（調試用）
      const forceTier = input.forceLootTier;
      const lootStaminaChange = this.processLootEvent(currentTime, forceTier);
      totalLootStaminaChange += lootStaminaChange;
      
      // 累積拾取事件的體力變化
      totalStaminaChange += lootStaminaChange;
    }
    
    // 5.1 累積移動消耗（Step A: Move）
    // 重要：無論拾取結果如何，移動消耗都必須包含重量懲罰
    // 不應該因為溢出而重置為基礎值
    totalStaminaChange -= finalMoveBurn;

    // 6. 計算最終體力變化（已累積在 totalStaminaChange 中）
    // 公式：FinalChange = (-MovementBurn) + (LootChanges)
    // 對於轉換溢出：FinalChange = (-MovementBurn) + (-PickupCost) + (+EatRestore)
    // 對於正常拾取：FinalChange = (-MovementBurn) + (-PickupCost)
    // 
    // 重要：移動消耗始終包含重量懲罰，無論拾取結果如何
    // 這確保了物理邏輯的一致性：負重越高，移動消耗越大
    // 
    // 注意：totalStaminaChange 已經包含了移動消耗和拾取變化
    const finalStaminaChange = totalStaminaChange;
    
    // 6.1 處理 addItem 已消耗的體力（正常拾取時）
    // 如果 totalLootStaminaChange < 0，說明 addItem 內部已經消耗了體力
    // 我們需要撤銷這個消耗，因為我們要統一應用 totalStaminaChange
    if (totalLootStaminaChange < 0) {
      // 正常拾取：addItem 已經消耗了體力（例如 -3）
      // 我們需要撤銷這個消耗，因為 totalStaminaChange 已經包含了拾取成本
      const pickupCost = Math.abs(totalLootStaminaChange);
      playerState.updateStamina(pickupCost); // 撤銷 addItem 的消耗
    }
    
    // 6.2 增強日誌（顯示清晰的等式，幫助用戶理解「零和」情況）
    // 公式：FinalChange = (-MovementBurn) + (LootChanges)
    // 顯示重量懲罰的詳細信息：Base x Load Multiplier = Final Burn
    if (lootEventsCount > 0) {
      if (totalLootStaminaChange > 0) {
        // 轉換溢出情況：顯示完整的公式
        // netAmount = grossAmount - pickupCost
        // 從淨收益反推拾取成本和總恢復值
        const netAmount = totalLootStaminaChange;
        let pickupCost = 0;
        let eatRestore = 0;
        
        // 根據淨收益推斷階層（用於日誌顯示）
        if (netAmount === 2) {
          pickupCost = 3;
          eatRestore = 5;
        } else if (netAmount === 6) {
          pickupCost = 9;
          eatRestore = 15;
        } else if (netAmount === 70) {
          pickupCost = 30;
          eatRestore = 100;
        } else {
          // 未知情況，使用估算
          pickupCost = Math.abs(netAmount - eatRestore);
          eatRestore = netAmount + pickupCost;
        }
        
        // 轉換溢出時顯示移動消耗（包含重量懲罰）
        // 確保日誌清晰顯示：Move(-2.0) + Loot(+2.0) = Final(0.0)
        if (weightMultiplier > 1.0) {
          console.log(`[Settlement] Move(-${finalMoveBurn.toFixed(1)}) + Loot(+${netAmount.toFixed(1)}) = Final Change(${finalStaminaChange.toFixed(1)}) | [Details] Base ${baseMovementBurn.toFixed(1)} x Load ${weightMultiplier.toFixed(1)} = ${finalMoveBurn.toFixed(1)} | Work: -${pickupCost.toFixed(1)} | Food: +${eatRestore.toFixed(1)}`);
        } else {
          console.log(`[Settlement] Move(-${finalMoveBurn.toFixed(1)}) + Loot(+${netAmount.toFixed(1)}) = Final Change(${finalStaminaChange.toFixed(1)}) | [Details] Work: -${pickupCost.toFixed(1)} | Food: +${eatRestore.toFixed(1)}`);
        }
      } else if (totalLootStaminaChange < 0) {
        // 正常拾取情況（addItem 內部已消耗體力，返回負值）
        const pickupCost = Math.abs(totalLootStaminaChange);
        
        // 顯示詳細的重量懲罰信息和清晰的等式
        if (weightMultiplier > 1.0) {
          console.log(`[Settlement] Move(-${finalMoveBurn.toFixed(1)}) + Loot(-${pickupCost.toFixed(1)}) = Final Change(${finalStaminaChange.toFixed(1)}) | [Details] Base ${baseMovementBurn.toFixed(1)} x Load ${weightMultiplier.toFixed(1)} = ${finalMoveBurn.toFixed(1)}`);
        } else {
          console.log(`[Settlement] Move(-${finalMoveBurn.toFixed(1)}) + Loot(-${pickupCost.toFixed(1)}) = Final Change(${finalStaminaChange.toFixed(1)}) | [Details] Base ${baseMovementBurn.toFixed(1)} x Load ${weightMultiplier.toFixed(1)} = ${finalMoveBurn.toFixed(1)}`);
        }
      }
    } else {
      // 沒有拾取事件，只顯示移動消耗
      if (weightMultiplier > 1.0) {
        console.log(`[Settlement] Move(-${finalMoveBurn.toFixed(1)}) = Final Change(${finalStaminaChange.toFixed(1)}) | [Details] Base ${baseMovementBurn.toFixed(1)} x Load ${weightMultiplier.toFixed(1)} = ${finalMoveBurn.toFixed(1)}`);
      } else {
        console.log(`[Settlement] Move(-${finalMoveBurn.toFixed(1)}) = Final Change(${finalStaminaChange.toFixed(1)})`);
      }
    }
    
    // 6.3 一次性應用總體力變化（確保無狀態覆蓋）
    // 這是唯一一次調用 updateStamina，保證所有計算都已完成
    playerState.updateStamina(finalStaminaChange);
    
    // NOTE: 耐久度和衛生值衰減已改為「卸貨後結算」模式
    // 不再在移動過程中實時衰減，改為在卸貨時一次性結算
    // - 耐久度衰減：基於總移動距離，在卸貨時計算
    // - 衛生值衰減：基於拾取的物品污染，在卸貨時計算

    // 7. 更新 SessionStore
    // 添加距離（會自動重新計算估值）
    // 距離累積用於卸貨時的耐久度計算
    sessionState.addDistance(input.distance);

    // 8. 更新最後處理時間
    this.lastProcessTime = currentTime;

    // 9. 構建結果
    // 注意：durabilityDecay 和 hygieneDecay 設為 0，因為已改為卸貨後結算
    const result: EntropyResult = {
      staminaBurn,
      durabilityDecay: 0,  // 不再實時衰減
      hygieneDecay: 0,     // 不再實時衰減
      timestamp: currentTime,
    };

    // 10. 檢查臨界狀態並觸發事件
    // 注意：由於耐久度和衛生值不再實時衰減，durability_zero 和 hygiene_low 事件
    // 只會在卸貨結算後觸發
    this.checkCriticalStates(result);

    return result;
  }

  /**
   * 處理拾取事件（被動真空拾取）
   * 
   * 每 100m 觸發一次：
   * 1. RNG 決定物品階層（85% T1, 14% T2, 1% T3）
   * 2. 創建物品對象
   * 3. 檢查是否可以拾取（重量和體力）
   * 
   * 分支邏輯：
   * - Branch A: 正常拾取（未超載）
   *   - 添加物品到背包
   *   - 扣除拾取成本（體力）
   *   - 衛生值污染在卸貨時結算（見 unloading.ts）
   *   - 返回體力變化：-PickupCost
   * 
   * - Branch B: 通用轉換溢出（超載）
   *   - 適用於所有階層（T1/T2/T3）
   *   - 不添加物品到背包（物品價值丟失）
   *   - 不扣除衛生值（物品未進入背包）
   *   - 計算淨體力變化：NetGain = EatRestore - PickupCost
   *     * T1: +5 (Eat) - 3 (Pickup) = +2 Net
   *     * T2: +15 (Eat) - 9 (Pickup) = +6 Net
   *     * T3: +100 (Eat) - 30 (Pickup) = +70 Net
   *   - 返回淨體力變化（拾取動作仍然消耗體力）
   *   - 發射 'loot_converted' 事件（包含總恢復值、淨收益、拾取成本）
   * 
   * 注意：衛生值污染不再在拾取時實時扣除
   * - 衛生值將在卸貨結算時一次性扣除（見 unloading.ts）
   * - 這確保了「安全旅程」：移動過程中衛生值保持 100%
   * 
   * @param timestamp - 當前時間戳
   * @param forceTier - 調試用：強制生成指定階層的物品（可選）
   * @returns 體力變化值（正數為增加，負數為減少）
   */
  private processLootEvent(timestamp: number, forceTier?: 1 | 2 | 3): number {
    const playerState = usePlayerStore.getState();
    const inventoryStore = useInventoryStore.getState();

    // 檢查是否處於 Ghost Mode 或 Immobilized
    if (playerState.isGhost || playerState.isImmobilized) {
      this.emitEvent({
        type: 'loot_failed',
        data: {
          tier: 1, // 默認值，實際未生成物品
          success: false,
          reason: playerState.isGhost ? 'ghost_mode' : 'immobilized',
        } as LootResult,
        timestamp,
      });
      return 0; // 無體力變化
    }

    // 1. 決定物品階層
    // 如果指定了 forceTier（調試用），強制使用該階層
    // 否則使用 RNG（85/14/1 分布）
    const tier = forceTier !== undefined ? forceTier : this.rollItemTier();

    // 2. 創建物品對象
    const item: Item = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tier,
      weight: ITEM_WEIGHTS[`T${tier}` as 'T1' | 'T2' | 'T3'],
      value: ITEM_VALUES[`T${tier}` as 'T1' | 'T2' | 'T3'],
      pickupCost: ITEM_PICKUP_COSTS[`T${tier}` as 'T1' | 'T2' | 'T3'],
      timestamp,
      restoreStamina: ITEM_CONSUME_RESTORE[`T${tier}` as 'T1' | 'T2' | 'T3'],
    };

    // 3. 檢查是否可以拾取
    const canPickup = inventoryStore.canPickup(item);

    if (canPickup) {
      // 4. 成功拾取
      // addItem 內部會自動消耗體力並更新重量
      const success = inventoryStore.addItem(item);
      
      if (success) {
        // 5. 物品已成功添加到背包
        // 重要：記錄衛生值債務（累積債務模式）
        // 當物品進入背包時，立即記錄衛生值污染債務
        // 即使物品後來被食用，債務仍然存在
        const sessionStore = useSessionStore.getState();
        const contamination = calculateContamination(tier);
        sessionStore.addHygieneDebt(contamination);
        
        // 注意：不在此處扣除玩家衛生值（保持「安全旅程」）
        // 衛生值將在卸貨結算時一次性扣除（見 unloading.ts）
        // 這確保了「安全旅程」：移動過程中衛生值保持 100%
        
        // 發射拾取成功事件（用於 UI toast）
        this.emitEvent({
          type: 'loot_success',
          data: {
            tier,
            success: true,
            itemId: item.id,
          } as LootResult,
          timestamp,
        });
        
        // addItem 內部已經消耗了拾取成本
        // 但為了統一計算，我們需要返回拾取成本（負數）
        // 這樣 processMovement 可以正確計算：FinalChange = (-MovementBurn) + (-PickupCost)
        const pickupCost = ITEM_PICKUP_COSTS[`T${tier}` as 'T1' | 'T2' | 'T3'];
        return -pickupCost;
      } else {
        // 拾取失敗（雖然 canPickup 返回 true，但 addItem 失敗）
        // 這不應該發生，但為了安全起見還是處理
        this.emitEvent({
          type: 'loot_failed',
          data: {
            tier,
            success: false,
            reason: 'unknown',
          } as LootResult,
          timestamp,
        });
        return 0; // 無體力變化
      }
    } else {
      // 5. 拾取失敗（超載或體力不足）
      // 檢查具體原因（此時已經通過了 Ghost Mode 和 Immobilized 檢查）
      // 重要：優先級順序 - 先檢查空間，再檢查體力
      const currentPlayerState = usePlayerStore.getState();
      const currentInventoryState = useInventoryStore.getState();
      
      // Step 1: 檢查空間（優先級 #1）
      // 如果背包滿了，強制轉換溢出（Universal Overflow）
      // 物理法則：沒有空間就無法持有，廣告也無法解決重力/體積問題
      const wouldExceedWeight = currentInventoryState.totalWeight + item.weight > currentPlayerState.maxWeight;
      
      if (wouldExceedWeight) {
        // Branch B: 通用轉換溢出（Universal Conversion Overflow）
        // 硬核庫存管理規則：背包滿時，任何物品（T1/T2/T3）立即轉換為體力
        // 不嘗試通過吃T1來騰出空間，玩家需要自己管理背包空間
        
        // 不添加物品到背包（物品價值丟失）
        // 重要：不記錄衛生值債務（物品從未進入背包，無污染）
        // 但拾取動作仍然消耗體力（勞動成本）
        
        // 計算淨體力變化：NetGain = EatRestore - PickupCost
        const grossAmount = ITEM_CONSUME_RESTORE[`T${tier}` as 'T1' | 'T2' | 'T3']; // 總恢復值
        const pickupCost = ITEM_PICKUP_COSTS[`T${tier}` as 'T1' | 'T2' | 'T3'];    // 拾取成本
        const netAmount = grossAmount - pickupCost; // 淨收益
        
        // 不在此處應用體力變化，返回給 processMovement 統一計算
        // 這樣可以確保公式：FinalChange = (-MovementBurn) + (-PickupCost) + (+EatRestore)
        
        const itemValue = ITEM_VALUES[`T${tier}` as 'T1' | 'T2' | 'T3'];
        
        // 發射轉換事件（包含階層、總恢復值、淨收益、拾取成本和物品價值）
        const convertedData: LootResult = {
          tier,
          success: true,
          grossAmount: grossAmount,    // 總恢復值（食用恢復）
          netAmount: netAmount,        // 淨收益（總恢復 - 拾取成本）
          pickupCost: pickupCost,      // 拾取成本（勞動成本）
          itemValue: itemValue,        // 物品價值（用於警告提示）
          // 向後兼容
          restoredAmount: grossAmount,
        };
        this.emitEvent({
          type: 'loot_converted',
          data: convertedData,
          timestamp,
        });
        
        // 返回淨體力變化（不直接應用）
        return netAmount;
      }
      // Step 2: 檢查體力（優先級 #2）
      // 如果空間夠但體力不足，觸發廣告救援（特別是 T3）
      else if (currentPlayerState.stamina < item.pickupCost) {
        // 特殊處理：T3 物品且體力不足時，提供廣告救援機會
        if (tier === 3) {
          // 發射 T3 救援可用事件
          // UI 將顯示廣告救援模態框
          this.emitEvent({
            type: 'loot_rescue_available',
            data: {
              tier: 3,
              success: false,
              reason: 't3_rescue_available',
              item: item,  // 完整的物品對象
              itemId: item.id,
              itemValue: item.value,
              pickupCost: item.pickupCost,
              currentStamina: currentPlayerState.stamina,
              requiredStamina: item.pickupCost,
            } as LootResult,
            timestamp,
          });
        } else {
          // T1/T2 體力不足：發射普通攔截事件
          this.emitEvent({
            type: 'loot_intercept',
            data: {
              tier,
              success: false,
              reason: 'insufficient_stamina',
              itemId: item.id,
            } as LootResult,
            timestamp,
          });
        }
        return 0; // 無體力變化
      }
      // 這不應該發生（因為開頭已經檢查過），但為了安全起見
      else if (currentPlayerState.isGhost) {
        this.emitEvent({
          type: 'loot_intercept',
          data: {
            tier,
            success: false,
            reason: 'ghost_mode',
            itemId: item.id,
          } as LootResult,
          timestamp,
        });
        return 0; // 無體力變化
      } else {
        this.emitEvent({
          type: 'loot_intercept',
          data: {
            tier,
            success: false,
            reason: 'immobilized',
            itemId: item.id,
          } as LootResult,
          timestamp,
        });
        return 0; // 無體力變化
      }
    }
    
    // 如果沒有匹配任何分支，返回 0
    return 0;
  }

  /**
   * RNG 決定物品階層
   * 
   * 根據白皮書 v8.7 第四章：物品矩陣 (85/14/1)
   * - 85% T1 琥珀粗糖
   * - 14% T2 翡翠晶糖
   * - 1% T3 皇室純糖
   * 
   * @returns 物品階層 (1, 2, 3)
   */
  private rollItemTier(): ItemTier {
    const roll = Math.random() * 100; // 0-100

    if (roll < ITEM_DISTRIBUTION.T1_PERCENTAGE) {
      return 1; // 85% T1
    } else if (roll < ITEM_DISTRIBUTION.T1_PERCENTAGE + ITEM_DISTRIBUTION.T2_PERCENTAGE) {
      return 2; // 14% T2
    } else {
      return 3; // 1% T3
    }
  }

  /**
   * 驗證輸入數據（防作弊檢查）
   * 
   * @param input - 移動輸入數據
   * @throws 如果輸入數據異常
   */
  private validateInput(input: MovementInput): void {
    // 檢查距離
    if (input.distance < 0) {
      throw new Error('Distance cannot be negative');
    }
    if (input.distance > ANTI_CHEAT.MAX_DISTANCE_PER_UPDATE) {
      console.warn('[EntropyEngine] Suspicious distance detected:', input.distance);
      // 可以選擇拋出錯誤或標記異常
    }

    // 檢查速度
    if (input.speed < 0) {
      throw new Error('Speed cannot be negative');
    }
    if (input.speed > ANTI_CHEAT.MAX_HUMAN_SPEED) {
      console.warn('[EntropyEngine] Suspicious speed detected:', input.speed);
      // 可以選擇拋出錯誤或標記異常
    }

    // 檢查時間戳
    if (input.timestamp <= 0) {
      throw new Error('Invalid timestamp');
    }
  }

  /**
   * 檢查臨界狀態並觸發事件
   * 
   * @param result - 熵計算結果
   */
  private checkCriticalStates(result: EntropyResult): void {
    const playerState = usePlayerStore.getState();

    // 檢查體力耗盡
    if (playerState.stamina === 0 && playerState.isGhost) {
      this.emitEvent({
        type: 'stamina_depleted',
        data: result,
        timestamp: result.timestamp,
      });
    }

    // 檢查耐久度歸零
    if (playerState.durability === 0 && playerState.isImmobilized) {
      this.emitEvent({
        type: 'durability_zero',
        data: result,
        timestamp: result.timestamp,
      });
    }

    // 檢查衛生值過低
    if (playerState.hygiene < 30) {
      this.emitEvent({
        type: 'hygiene_low',
        data: { ...result, hygiene: playerState.hygiene },
        timestamp: result.timestamp,
      });
    }

    // 觸發移動處理事件
    this.emitEvent({
      type: 'movement_processed',
      data: result,
      timestamp: result.timestamp,
    });
  }

  /**
   * 註冊事件監聽器
   * 
   * @param type - 事件類型
   * @param listener - 監聽器函數
   */
  on(type: EntropyEventType, listener: (event: EntropyEvent) => void): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);
  }

  /**
   * 移除事件監聽器
   * 
   * @param type - 事件類型
   * @param listener - 監聽器函數
   */
  off(type: EntropyEventType, listener: (event: EntropyEvent) => void): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 觸發事件
   * 
   * @param event - 事件對象
   */
  private emitEvent(event: EntropyEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error('[EntropyEngine] Error in event listener:', error);
        }
      });
    }
  }

  /**
   * 重置引擎狀態
   * 
   * 用於測試或重新開始遊戲
   */
  reset(): void {
    this.lastProcessTime = Date.now();
    this.pendingDistance = 0;
    this.eventListeners.clear();
  }
}

/**
 * 導出單例實例
 * 
 * 使用方式：
 * ```typescript
 * import { entropyEngine } from './core/entropy/engine';
 * 
 * const result = entropyEngine.processMovement({
 *   distance: 1.0,
 *   speed: 5.0,
 *   timestamp: Date.now(),
 * });
 * ```
 */
export const entropyEngine = EntropyEngine.getInstance();

/**
 * 導出類（用於測試）
 */
export { EntropyEngine };

