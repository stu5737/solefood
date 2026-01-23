/**
 * SolefoodButton - 使用透明 PNG 圖片的按鈕組件
 * 支援點擊回饋效果和自定義樣式
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, Image, ImageSourcePropType, ViewStyle, ImageStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface SolefoodButtonProps {
  onPress: () => void;
  imageSource: ImageSourcePropType;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  disabled?: boolean;
}

export const SolefoodButton: React.FC<SolefoodButtonProps> = ({
  onPress,
  imageSource,
  style,
  imageStyle,
  disabled = false,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 10, stiffness: 200 });
    opacity.value = withSpring(0.8, { damping: 10, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 200 });
    opacity.value = withSpring(1, { damping: 10, stiffness: 200 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedTouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      disabled={disabled}
      style={[styles.container, style, animatedStyle]}
    >
      <Image
        source={imageSource}
        style={[styles.image, imageStyle]}
        resizeMode="contain"
      />
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', // 保持透明背景
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
