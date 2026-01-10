/**
 * TopStatusBar Component
 * 頂部狀態欄 - 顯示時間、玩家信息、資源
 * 基於新的遊戲界面模板設計
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../../stores/playerStore';
import { useSessionStore } from '../../stores/sessionStore';

export const TopStatusBar: React.FC = () => {
  const insets = useSafeAreaInsets();
  const playerState = usePlayerStore();
  const sessionState = useSessionStore();

  // 獲取當前時間
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;

  // 計算有效容量
  const effectiveMaxWeight = playerState.getEffectiveMaxWeight();

  return (
    <View style={[styles.container, { paddingTop: insets.top || 8 }]}>
      {/* 左側：時間和玩家信息 */}
      <View style={styles.leftSection}>
        {/* 時間 */}
        <Text style={styles.timeText}>{timeString}</Text>

        {/* 玩家頭像和等級 */}
        <TouchableOpacity style={styles.playerCard} activeOpacity={0.8}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarEmoji}>👤</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>10</Text>
            </View>
          </View>
          <View style={styles.playerInfo}>
            <Text style={styles.username}>WaWaTao</Text>
            <Text style={styles.playerStats}>3,846</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* 中間：資源顯示 */}
      <View style={styles.resourcesSection}>
        {/* 資源條 */}
        <View style={styles.resourceBarContainer}>
          <View style={styles.resourceBar}>
            <View 
              style={[
                styles.resourceBarFill, 
                { width: `${Math.min((playerState.stamina / playerState.maxStamina) * 100, 100)}%` }
              ]} 
            />
          </View>
          <View style={styles.resourceTextRow}>
            <Text style={styles.resourceText}>
              {Math.round(playerState.stamina)}/{playerState.maxStamina}
            </Text>
            <Text style={styles.resourceSubText}>5/10min</Text>
          </View>
        </View>

        {/* 多種貨幣 */}
        <View style={styles.currencyRow}>
          <Text style={styles.currencyText}>62</Text>
          <Text style={styles.currencyText}>54K</Text>
          <View style={styles.starIcon}>
            <Text style={styles.starText}>⭐</Text>
            <Text style={styles.currencyText}>598</Text>
          </View>
          <View style={styles.rIcon}>
            <Text style={styles.rText}>R</Text>
            <Text style={styles.currencyText}>15</Text>
          </View>
        </View>
      </View>

      {/* 右側：網絡和狀態 */}
      <View style={styles.rightSection}>
        <View style={styles.signalContainer}>
          <Text style={styles.signalIcon}>📶</Text>
          <Text style={styles.signalText}>30</Text>
        </View>
        {/* 位置文字（暫時使用總距離） */}
        <Text style={styles.locationText}>
          {sessionState.totalDistance > 0 ? `${sessionState.totalDistance.toFixed(1)}km` : '定位中...'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 12,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 8,
  },
  avatarEmoji: {
    fontSize: 32,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  levelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  playerInfo: {
    alignItems: 'flex-start',
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  playerStats: {
    fontSize: 12,
    color: '#666',
  },
  resourcesSection: {
    flex: 2,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  resourceBarContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 4,
  },
  resourceBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 2,
  },
  resourceBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  resourceTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resourceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  resourceSubText: {
    fontSize: 9,
    color: '#666',
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  currencyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  starIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starText: {
    fontSize: 12,
  },
  rIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 2,
  },
  rText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  signalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  signalIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  signalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  locationText: {
    fontSize: 11,
    color: '#666',
  },
});
