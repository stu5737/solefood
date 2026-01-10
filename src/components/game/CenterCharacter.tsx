/**
 * CenterCharacter Component
 * 中心角色/發光效果 - 顯示玩家當前位置的角色
 * 基於新的遊戲界面模板設計
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface CenterCharacterProps {
  isCollecting?: boolean;
}

export const CenterCharacter: React.FC<CenterCharacterProps> = ({
  isCollecting = false,
}) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isCollecting) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isCollecting, pulseAnim]);

  return (
    <View style={styles.container} pointerEvents="none">
      {/* 外層發光圓圈 */}
      <Animated.View
        style={[
          styles.outerGlow,
          {
            transform: [{ scale: pulseAnim }],
            opacity: pulseAnim.interpolate({
              inputRange: [1, 1.2],
              outputRange: [0.3, 0.6],
            }),
          },
        ]}
      />
      
      {/* 中間發光圓圈 */}
      <Animated.View
        style={[
          styles.middleGlow,
          {
            transform: [{ scale: pulseAnim }],
            opacity: pulseAnim.interpolate({
              inputRange: [1, 1.2],
              outputRange: [0.5, 0.8],
            }),
          },
        ]}
      />

      {/* 中心角色 */}
      <View style={styles.characterContainer}>
        <Text style={styles.characterEmoji}>🐸</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  outerGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4CAF50',
    opacity: 0.3,
  },
  middleGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8BC34A',
    opacity: 0.5,
  },
  characterContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#A5D6A7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  characterEmoji: {
    fontSize: 36,
  },
});
