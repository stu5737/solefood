/**
 * UnloadingChoiceModal - 卸貨二選一（全螢幕半透明遮罩 + 中央懸浮卡片）
 * Claymorphism 風格：黏土／3D 塑膠感，圓角、陰影、膨脹感
 * 無文字，僅圖示與數字傳達：自己搬（耗體力）vs 看廣告（免體力）
 */

import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(160, (SCREEN_WIDTH - 48) / 2 - 12);
const CARD_HEIGHT = 200;

export interface UnloadingChoiceModalProps {
  isVisible: boolean;
  onSelectManual: () => void;
  onSelectAd: () => void;
  onClose?: () => void;
  /** 手動搬運體力消耗（顯示用） */
  energyCost?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function UnloadingChoiceModal({
  isVisible,
  onSelectManual,
  onSelectAd,
  onClose,
  energyCost = 15,
}: UnloadingChoiceModalProps) {
  const scaleA = useSharedValue(1);
  const scaleB = useSharedValue(1);
  const glowB = useSharedValue(0.4);

  useEffect(() => {
    if (isVisible) {
      glowB.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 1200 }),
          withTiming(0.4, { duration: 1200 })
        ),
        -1,
        true
      );
    } else {
      glowB.value = withTiming(0.4, { duration: 200 });
    }
  }, [isVisible]);

  const handlePressIn = (scale: Animated.SharedValue<number>) => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
  };
  const handlePressOut = (scale: Animated.SharedValue<number>) => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const animatedCardA = useAnimatedStyle(() => ({
    transform: [{ scale: scaleA.value }],
  }));
  const animatedCardB = useAnimatedStyle(() => ({
    transform: [{ scale: scaleB.value }],
    shadowOpacity: 0.35 + glowB.value * 0.25,
    shadowRadius: 12 + glowB.value * 8,
    elevation: 8 + Math.round(glowB.value * 4),
  }));

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.centered}>
          <View style={styles.row}>
            {/* Option A: 自己搬（耗體力） */}
            <AnimatedPressable
              style={[styles.card, styles.cardManual, animatedCardA]}
              onPressIn={() => handlePressIn(scaleA)}
              onPressOut={() => handlePressOut(scaleA)}
              onPress={onSelectManual}
            >
              <View style={styles.mainIconWrap}>
                <Text style={styles.mainIcon}>💪</Text>
              </View>
              <View style={styles.badges}>
                <Text style={styles.badgeIcon}>🚫📺</Text>
                <Text style={[styles.badgeText, styles.badgeTextRed]}>
                  ⚡ -{energyCost}
                </Text>
              </View>
            </AnimatedPressable>

            {/* Option B: 看廣告（免體力）— 稍大、發光 */}
            <AnimatedPressable
              style={[styles.card, styles.cardAd, animatedCardB]}
              onPressIn={() => handlePressIn(scaleB)}
              onPressOut={() => handlePressOut(scaleB)}
              onPress={onSelectAd}
            >
              <View style={styles.mainIconWrap}>
                <Text style={styles.mainIcon}>☕</Text>
              </View>
              <View style={styles.badges}>
                <Text style={styles.badgeIcon}>▷ 30s</Text>
                <Text style={[styles.badgeText, styles.badgeTextGreen]}>
                  ⚡ Free
                </Text>
              </View>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  card: {
    width: CARD_WIDTH,
    minHeight: CARD_HEIGHT,
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  cardManual: {
    backgroundColor: '#FF8C42',
    shadowOpacity: 0.3,
    borderWidth: 0,
  },
  cardAd: {
    backgroundColor: '#4D96FF',
    width: CARD_WIDTH + 10,
    minHeight: CARD_HEIGHT + 8,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  mainIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainIcon: {
    fontSize: 40,
  },
  badges: {
    alignItems: 'center',
    gap: 6,
  },
  badgeIcon: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.7)',
    fontWeight: '700',
  },
  badgeText: {
    fontSize: 15,
    fontWeight: '800',
  },
  badgeTextRed: {
    color: '#8B0000',
  },
  badgeTextGreen: {
    color: '#0A5F0A',
  },
});
