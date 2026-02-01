/**
 * UserProfileModal - 滿版個人資料／使用者空間（寶可夢 GO 風格）
 * 從下往上滑入全螢幕，點擊頭像 HUD 開啟；底部顯示用戶碼（留存／訪談用）
 */

import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../../stores/playerStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const userCode = usePlayerStore((s) => s.userCode);

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(SCREEN_HEIGHT);
      usePlayerStore.getState().getOrCreateUserCode();
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 28,
        stiffness: 200,
      }).start();
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 280,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.outer}>
        <Animated.View
          style={[
            styles.panel,
            {
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.content} />
          <View style={[styles.bottomRow, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.userCodeText} selectable>
              用戶碼：{userCode ?? '載入中…'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={styles.closeSymbol}>×</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#121212',
  },
  content: {
    flex: 1,
  },
  bottomRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeSymbol: {
    fontSize: 32,
    fontWeight: '300',
    color: '#FFF',
    lineHeight: 36,
  },
  userCodeText: {
    marginBottom: 14,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
