/**
 * 廣告救援模態框組件
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 處理兩種救援場景：
 * 1. 腎上腺素救援（Adrenaline Rescue）：空間足夠但體力不足
 * 2. 臨時擴容救援（Temporary Expansion）：背包滿倉時遇到物品
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { usePlayerStore } from '../../stores/playerStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { calculateContamination } from '../../core/math/maintenance';
import type { Item } from '../../types/item';
import { RESCUE_ADS, AD_UNLOCK_THRESHOLDS } from '../../utils/constants';

export type RescueType = 'adrenaline' | 'temporary_expansion';

export interface AdRescueModalProps {
  visible: boolean;
  type: RescueType;
  item: Item | null;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * 模擬觀看廣告（實際應用中應整合真實的廣告 SDK）
 */
async function watchAd(): Promise<boolean> {
  // TODO: 整合真實的廣告 SDK（如 Google AdMob）
  // 這裡使用模擬延遲
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 1000); // 模擬 1 秒廣告
  });
}

/**
 * 檢查廣告解鎖門檻
 */
function checkAdUnlockThreshold(adIndex: number, dailyDistance: number): boolean {
  const threshold = adIndex === 1 
    ? AD_UNLOCK_THRESHOLDS.FIRST 
    : AD_UNLOCK_THRESHOLDS.SECOND;
  
  return dailyDistance >= threshold;
}

export function AdRescueModal({
  visible,
  type,
  item,
  onClose,
  onSuccess,
}: AdRescueModalProps) {
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const playerState = usePlayerStore();
  const sessionStore = useSessionStore();
  const inventoryStore = useInventoryStore();

  if (!item) {
    return null;
  }

  const handleWatchAd = async () => {
    // 檢查廣告上限
    const rescueType = type === 'adrenaline' ? 'stamina' : 'capacity';
    const canWatchAd = sessionStore.triggerRescue(rescueType);

    if (!canWatchAd) {
      Alert.alert(
        '廣告上限已達',
        '您已達到今日廣告觀看上限，請明天再試。',
        [{ text: '確定' }]
      );
      return;
    }

    // 檢查廣告解鎖門檻（僅對前兩個廣告）
    const adUsed = sessionStore.adCaps[rescueType].used;
    if (adUsed <= 2) {
      const dailyDistance = sessionStore.totalDistance; // TODO: 使用實際的每日距離
      if (!checkAdUnlockThreshold(adUsed, dailyDistance)) {
        const threshold = adUsed === 1 
          ? AD_UNLOCK_THRESHOLDS.FIRST 
          : AD_UNLOCK_THRESHOLDS.SECOND;
        Alert.alert(
          '尚未解鎖',
          `需要累積 ${threshold}km 才能觀看此廣告。\n\n當前距離：${dailyDistance.toFixed(2)}km`,
          [{ text: '確定' }]
        );
        return;
      }
    }

    setIsWatchingAd(true);

    try {
      // 觀看廣告
      const success = await watchAd();

      if (!success) {
        Alert.alert('錯誤', '廣告載入失敗，請重試。', [{ text: '確定' }]);
        setIsWatchingAd(false);
        return;
      }

      // 根據救援類型執行不同邏輯
      if (type === 'adrenaline') {
        // 腎上腺素救援：恢復體力並拾取物品
        playerState.updateStamina(RESCUE_ADS.ADRENALINE.RESTORE);
        
        // 檢查空間（應該已經通過，但再次確認）
        const currentWeight = inventoryStore.totalWeight;
        const maxWeight = playerState.maxWeight;
        
        if (currentWeight + item.weight > maxWeight) {
          Alert.alert(
            '錯誤',
            '背包已滿，無法拾取物品。',
            [{ text: '確定' }]
          );
          setIsWatchingAd(false);
          return;
        }

        // 拾取物品
        const pickupSuccess = inventoryStore.addItem(item);
        
        if (pickupSuccess) {
          // 記錄衛生值污染
          const contamination = calculateContamination(item.tier);
          playerState.updateHygiene(-contamination);
          
          // 清除待救援狀態
          sessionStore.clearPendingEncounter();
          
          Alert.alert(
            '成功！',
            `腎上腺素注入成功！已拾取 T${item.tier} 物品。`,
            [
              {
                text: '確定',
                onPress: () => {
                  setIsWatchingAd(false);
                  onClose();
                  onSuccess?.();
                },
              },
            ]
          );
        } else {
          Alert.alert('錯誤', '拾取物品失敗，請重試。', [{ text: '確定' }]);
          setIsWatchingAd(false);
        }
      } else if (type === 'temporary_expansion') {
        // 臨時擴容救援：允許強制拾入（無視上限）
        // 實現「超載口袋」機制
        const currentWeight = inventoryStore.totalWeight;
        const maxWeight = playerState.maxWeight;
        
        // 檢查是否真的超載
        if (currentWeight + item.weight <= maxWeight) {
          // 實際上沒有超載，正常拾取
          const pickupSuccess = inventoryStore.addItem(item);
          
          if (pickupSuccess) {
            const contamination = calculateContamination(item.tier);
            playerStore.updateHygiene(-contamination);
            sessionStore.clearPendingEncounter();
            
            Alert.alert(
              '成功！',
              `已拾取 T${item.tier} 物品。`,
              [
                {
                  text: '確定',
                  onPress: () => {
                    setIsWatchingAd(false);
                    onClose();
                    onSuccess?.();
                  },
                },
              ]
            );
          } else {
            Alert.alert('錯誤', '拾取物品失敗，請重試。', [{ text: '確定' }]);
            setIsWatchingAd(false);
          }
        } else {
          // 確實超載，使用臨時擴容機制
          // 注意：這裡需要修改 inventoryStore 以支持臨時超載
          // 暫時使用警告提示
          Alert.alert(
            '⚠️ 臨時擴容',
            `背包已滿，但已啟用臨時擴容。\n\n物品將被強制拾入，直到下次卸貨為止。\n\n注意：超載狀態下無法拾取新物品。`,
            [
              {
                text: '確定',
                onPress: () => {
                  // TODO: 實現臨時擴容邏輯
                  // 這裡需要修改 inventoryStore 以支持臨時超載
                  setIsWatchingAd(false);
                  onClose();
                },
              },
            ]
          );
        }
      }
    } catch (error) {
      console.error('[AdRescueModal] Error watching ad:', error);
      Alert.alert('錯誤', '觀看廣告時發生錯誤，請重試。', [{ text: '確定' }]);
      setIsWatchingAd(false);
    }
  };

  const handleGiveUp = () => {
    Alert.alert(
      '確認放棄',
      '確定要放棄此物品嗎？物品將永久消失。',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '確定放棄',
          style: 'destructive',
          onPress: () => {
            sessionStore.clearPendingEncounter();
            onClose();
          },
        },
      ]
    );
  };

  const tierName = item.tier === 1 ? '琥珀粗糖' : item.tier === 2 ? '翡翠晶糖' : '皇室純糖';
  const itemValue = item.value;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>
            {type === 'adrenaline' ? '💉 腎上腺素救援' : '📦 臨時擴容救援'}
          </Text>
          
          <View style={styles.content}>
            <Text style={styles.description}>
              {type === 'adrenaline' 
                ? `發現 T${item.tier} ${tierName} ($${itemValue} SOLE)！\n\n體力不足，無法拾取。\n\n觀看廣告注入腎上腺素（+30 體力）？`
                : `發現 T${item.tier} ${tierName} ($${itemValue} SOLE)！\n\n背包已滿，無法拾取。\n\n觀看廣告啟用臨時擴容？`}
            </Text>

            {type === 'adrenaline' && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  當前體力：{playerState.stamina.toFixed(0)}/{item.pickupCost}
                </Text>
                <Text style={styles.infoText}>
                  需要體力：{item.pickupCost}
                </Text>
              </View>
            )}

            {type === 'temporary_expansion' && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  當前重量：{inventoryStore.totalWeight.toFixed(1)}/{playerState.maxWeight.toFixed(1)}kg
                </Text>
                <Text style={styles.infoText}>
                  物品重量：{item.weight.toFixed(1)}kg
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.buttonCancel]}
              onPress={handleGiveUp}
              disabled={isWatchingAd}
            >
              <Text style={styles.buttonText}>放棄</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleWatchAd}
              disabled={isWatchingAd}
            >
              {isWatchingAd ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>📺 觀看廣告</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  content: {
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonCancel: {
    backgroundColor: '#E0E0E0',
  },
  buttonPrimary: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
