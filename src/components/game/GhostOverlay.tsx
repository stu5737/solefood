/**
 * GhostOverlay 組件
 * 當玩家進入 Ghost Mode 時顯示全屏覆蓋層
 * Solefood MVP v8.7
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { usePlayerStore } from '../../stores/playerStore';
import { useSessionStore } from '../../stores/sessionStore';

export const GhostOverlay: React.FC = () => {
  const isGhost = usePlayerStore((state) => state.isGhost);
  const playerStore = usePlayerStore();
  const sessionStore = useSessionStore();
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  const handleWatchAdToRevive = async () => {
    if (isWatchingAd) {
      return; // 防止重複觸發
    }

    // 1. 檢查廣告上限（模擬檢查）
    const canWatchAd = sessionStore.triggerRescue('revival');
    
    if (!canWatchAd) {
      Alert.alert(
        'Ad Limit Reached',
        'You have reached the daily limit for revival ads. Please try again tomorrow.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsWatchingAd(true);

    try {
      // 2. 模擬觀看廣告（1 秒延遲）
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 3. 恢復體力（+30 點）
      playerStore.updateStamina(30);

      // 4. CRITICAL: 手動調用 checkZeroTolerance 以確保 isGhost 標誌被正確重置
      // 雖然 updateStamina 內部會調用，但為了確保狀態同步，我們再次調用
      playerStore.checkZeroTolerance();

      // 5. 顯示成功消息
      Alert.alert('Revived!', '+30 Stamina');
    } catch (error) {
      console.error('[GhostOverlay] Error during ad watch:', error);
      Alert.alert('Error', 'Failed to watch ad. Please try again.');
    } finally {
      setIsWatchingAd(false);
    }
  };

  if (!isGhost) {
    return null;
  }

  return (
    <Modal
      visible={isGhost}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Text style={styles.ghostIcon}>👻</Text>
          </View>
          
          <Text style={styles.title}>YOU ARE A GHOST</Text>
          
          <Text style={styles.subtitle}>
            Stamina Depleted. Cannot interact with the physical world.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              • 無法刷新新節點{'\n'}
              • 無法累積里程{'\n'}
              • 無法進行卸貨操作
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.rescueButton, isWatchingAd && styles.rescueButtonDisabled]}
            onPress={handleWatchAdToRevive}
            activeOpacity={0.8}
            disabled={isWatchingAd}
          >
            {isWatchingAd ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={[styles.rescueButtonText, { marginLeft: 8 }]}>Watching Ad...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.rescueButtonText}>📺 Watch Ad to Revive</Text>
                <Text style={styles.rescueButtonSubtext}>
                  (+30 Stamina)
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#4A4A4A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    marginBottom: 16,
  },
  ghostIcon: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  infoBox: {
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  infoText: {
    fontSize: 14,
    color: '#CCC',
    lineHeight: 20,
  },
  rescueButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  rescueButtonDisabled: {
    backgroundColor: '#66BB6A',
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rescueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  rescueButtonSubtext: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.9,
  },
});
