/**
 * RescueModal - 救援彈窗系統 (廣告觸發)
 * 支持多種救援類型：腎上腺素、臨時擴容、靈魂復活
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

export type RescueType = 'Adrenaline' | 'TempExpansion' | 'GhostRevival';

interface RescueModalProps {
  visible: boolean;
  type: RescueType;
  title: string;
  desc: string;
  reward: string;
  onAdSuccess: () => void;
  onCancel: () => void;
  isLoadingAd?: boolean;
}

export const RescueModal: React.FC<RescueModalProps> = ({
  visible,
  type,
  title,
  desc,
  reward,
  onAdSuccess,
  onCancel,
  isLoadingAd = false,
}) => {
  // 圖示映射
  const getIcon = (): string => {
    switch (type) {
      case 'Adrenaline':
        return '💉';
      case 'TempExpansion':
        return '📦';
      case 'GhostRevival':
        return '👻';
      default:
        return '🎁';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* 圖示 */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{getIcon()}</Text>
          </View>

          {/* 標題 */}
          <Text style={styles.title}>{title}</Text>

          {/* 描述 */}
          <Text style={styles.desc}>{desc}</Text>

          {/* 獎勵 */}
          <View style={styles.rewardContainer}>
            <Text style={styles.rewardLabel}>觀看廣告獲得：</Text>
            <Text style={styles.rewardText}>{reward}</Text>
          </View>

          {/* 按鈕組 */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={isLoadingAd}
            >
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.adButton]}
              onPress={onAdSuccess}
              disabled={isLoadingAd}
            >
              {isLoadingAd ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.adButtonIcon}>📺</Text>
                  <Text style={styles.adButtonText}>觀看廣告</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* 提示文字 */}
          <Text style={styles.hint}>
            {type === 'GhostRevival'
              ? '體力歸零無法繼續探索'
              : '錯過這個物品將無法再次撿取'}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  desc: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 24,
  },
  rewardContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  rewardLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
    textAlign: 'center',
  },
  rewardText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  adButton: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  adButtonIcon: {
    fontSize: 20,
  },
  adButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 16,
    textAlign: 'center',
  },
});
