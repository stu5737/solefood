/**
 * FloatingTextSystem - 飄字反饋系統
 * 用於顯示物品拾取、體力變化等反饋
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export interface FloatingTextItem {
  id: string;
  text: string;
  color: string;
  x?: number; // 可選的 x 位置（百分比）
  y?: number; // 可選的 y 位置（百分比）
}

interface FloatingTextSystemProps {
  texts: FloatingTextItem[];
  onRemove: (id: string) => void;
}

const FloatingText: React.FC<{
  item: FloatingTextItem;
  onComplete: () => void;
}> = ({ item, onComplete }) => {
  const translateY = new Animated.Value(0);
  const opacity = new Animated.Value(1);

  useEffect(() => {
    // 飄字動畫：向上移動 + 淡出
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete();
    });
  }, []);

  return (
    <Animated.View
      style={[
        styles.floatingText,
        {
          transform: [{ translateY }],
          opacity,
          left: item.x ? `${item.x}%` : '50%',
          top: item.y ? `${item.y}%` : '50%',
        },
      ]}
    >
      <Text style={[styles.floatingTextContent, { color: item.color }]}>
        {item.text}
      </Text>
    </Animated.View>
  );
};

export const FloatingTextSystem: React.FC<FloatingTextSystemProps> = ({
  texts,
  onRemove,
}) => {
  return (
    <View style={styles.container} pointerEvents="none">
      {texts.map((item) => (
        <FloatingText
          key={item.id}
          item={item}
          onComplete={() => onRemove(item.id)}
        />
      ))}
    </View>
  );
};

// Hook for using floating text
export const useFloatingText = () => {
  const [texts, setTexts] = useState<FloatingTextItem[]>([]);

  const showFloatingText = useCallback(
    (text: string, color: string = '#FFFFFF', x?: number, y?: number) => {
      const id = `floating_${Date.now()}_${Math.random()}`;
      setTexts((prev) => [...prev, { id, text, color, x, y }]);
    },
    []
  );

  const removeText = useCallback((id: string) => {
    setTexts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    texts,
    showFloatingText,
    removeText,
  };
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  floatingText: {
    position: 'absolute',
    transform: [{ translateX: -50 }],
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  floatingTextContent: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
