/**
 * 卸貨變現矩陣模態框
 * Solefood MVP v8.7 (Final Consolidated Edition)
 * 
 * 提供三種卸貨選項：
 * 1. M Normal：自己搬（1.0x，扣除體力）
 * 2. M Ad：請人搬（2.0x，看廣告，免除體力）
 * 3. M Info：店家搬（10.0x，拍照上傳，僅金霧節點）
 */

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { usePlayerStore } from '../../stores/playerStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { executeUnloadSettlement, calculateSettlement } from '../../core/game/unloading';
import { calculateUnloadStaminaCost } from '../../core/math/unloading';
import { PAYOUT_MATRIX } from '../../utils/constants';
import type { PayoutMode } from '../../types/game';

export interface UnloadModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (revenue: number) => void;
  isGoldenMistNode?: boolean; // 是否為金霧節點
}

/**
 * 模擬觀看廣告（實際應用中應整合真實的廣告 SDK）
 */
async function watchAd(): Promise<boolean> {
  // TODO: 整合真實的廣告 SDK（如 Google AdMob）
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 1000); // 模擬 1 秒廣告
  });
}

export function UnloadModal({
  visible,
  onClose,
  onSuccess,
  isGoldenMistNode = false,
}: UnloadModalProps) {
  const [selectedMode, setSelectedMode] = useState<PayoutMode | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const playerState = usePlayerStore();
  const inventoryStore = useInventoryStore();

  const totalWeight = inventoryStore.totalWeight;
  const items = inventoryStore.items;

  // 計算卸貨體力成本
  const unloadStaminaCost = calculateUnloadStaminaCost(totalWeight);
  const canUnloadNormal = playerState.stamina >= unloadStaminaCost;

  // 計算各模式的收益預覽
  const normalPreview = calculateSettlement('normal');
  const porterPreview = calculateSettlement('porter');
  const dataPreview = isGoldenMistNode ? calculateSettlement('data') : null;

  const handleUnload = async (mode: PayoutMode) => {
    if (mode === 'normal' && !canUnloadNormal) {
      return; // 體力不足，按鈕應該已禁用
    }

    setSelectedMode(mode);
    setIsProcessing(true);

    try {
      if (mode === 'porter' || mode === 'data') {
        // 需要觀看廣告
        const success = await watchAd();
        if (!success) {
          // 廣告載入失敗
          setIsProcessing(false);
          setSelectedMode(null);
          return;
        }
      }

      // 執行卸貨結算
      const result = executeUnloadSettlement(mode);

      setIsProcessing(false);
      setSelectedMode(null);
      onClose();
      onSuccess?.(result.revenue);
    } catch (error) {
      console.error('[UnloadModal] Error unloading:', error);
      setIsProcessing(false);
      setSelectedMode(null);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>💰 卸貨變現</Text>
          
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* M Normal */}
            <TouchableOpacity
              style={[
                styles.option,
                !canUnloadNormal && styles.optionDisabled,
                selectedMode === 'normal' && styles.optionSelected,
              ]}
              onPress={() => handleUnload('normal')}
              disabled={!canUnloadNormal || isProcessing}
            >
              <View style={styles.optionHeader}>
                <Text style={styles.optionTitle}>M Normal</Text>
                <Text style={styles.optionMultiplier}>{PAYOUT_MATRIX.NORMAL}x</Text>
              </View>
              <Text style={styles.optionDescription}>自己搬運</Text>
              <View style={styles.optionDetails}>
                <Text style={styles.optionDetail}>
                  體力消耗：{unloadStaminaCost.toFixed(0)} pts
                </Text>
                <Text style={styles.optionDetail}>
                  預期收益：${normalPreview.revenue.toFixed(2)} SOLE
                </Text>
              </View>
              {!canUnloadNormal && (
                <Text style={styles.optionWarning}>
                  體力不足（需要 {unloadStaminaCost.toFixed(0)} pts）
                </Text>
              )}
              {isProcessing && selectedMode === 'normal' && (
                <ActivityIndicator style={styles.loader} color="#4CAF50" />
              )}
            </TouchableOpacity>

            {/* M Ad (Porter) */}
            <TouchableOpacity
              style={[
                styles.option,
                styles.optionRecommended,
                selectedMode === 'porter' && styles.optionSelected,
              ]}
              onPress={() => handleUnload('porter')}
              disabled={isProcessing}
            >
              <View style={styles.optionHeader}>
                <Text style={styles.optionTitle}>M Ad (Porter)</Text>
                <Text style={styles.optionMultiplier}>{PAYOUT_MATRIX.PORTER}x</Text>
              </View>
              <Text style={styles.optionDescription}>請人搬運（觀看廣告）</Text>
              <View style={styles.optionDetails}>
                <Text style={styles.optionDetail}>
                  體力消耗：免除
                </Text>
                <Text style={styles.optionDetail}>
                  預期收益：${porterPreview.revenue.toFixed(2)} SOLE
                </Text>
                <Text style={styles.optionBenefit}>
                  💡 收益翻倍 + 節省 {unloadStaminaCost.toFixed(0)} 體力
                </Text>
              </View>
              {isProcessing && selectedMode === 'porter' && (
                <ActivityIndicator style={styles.loader} color="#2196F3" />
              )}
            </TouchableOpacity>

            {/* M Info (Data) - 僅金霧節點 */}
            {isGoldenMistNode && dataPreview && (
              <TouchableOpacity
                style={[
                  styles.option,
                  styles.optionPremium,
                  selectedMode === 'data' && styles.optionSelected,
                ]}
                onPress={() => handleUnload('data')}
                disabled={isProcessing}
              >
                <View style={styles.optionHeader}>
                  <Text style={styles.optionTitle}>M Info (Data)</Text>
                  <Text style={styles.optionMultiplier}>{PAYOUT_MATRIX.DATA}x</Text>
                </View>
                <Text style={styles.optionDescription}>店家搬運（拍照上傳）</Text>
                <View style={styles.optionDetails}>
                  <Text style={styles.optionDetail}>
                    體力消耗：免除
                  </Text>
                  <Text style={styles.optionDetail}>
                    預期收益：${dataPreview.revenue.toFixed(2)} SOLE
                  </Text>
                  <Text style={styles.optionBenefit}>
                    ⭐ 極致暴利：收益 10 倍！
                  </Text>
                </View>
                {isProcessing && selectedMode === 'data' && (
                  <ActivityIndicator style={styles.loader} color="#FF9800" />
                )}
              </TouchableOpacity>
            )}

            {/* 物品摘要 */}
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>物品摘要</Text>
              <Text style={styles.summaryText}>
                總重量：{totalWeight.toFixed(1)}kg
              </Text>
              <Text style={styles.summaryText}>
                物品數量：{items.length}
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={isProcessing}
          >
            <Text style={styles.closeButtonText}>取消</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  content: {
    marginBottom: 16,
  },
  option: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionRecommended: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  optionPremium: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  optionMultiplier: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  optionDetails: {
    marginTop: 8,
  },
  optionDetail: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  optionBenefit: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 8,
  },
  optionWarning: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 8,
    fontStyle: 'italic',
  },
  loader: {
    marginTop: 8,
  },
  summary: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  closeButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
