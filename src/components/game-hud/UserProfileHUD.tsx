/**
 * UserProfileHUD - 左上角用戶頭像 HUD，與右側 token/stamina 同一列整合
 * 顯示：圓形頭像（useravator_icon）、距離 track（與右側外框一致）、紅色通知點
 */

import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface UserProfileHUDProps {
  /** 總累積距離（km），顯示於 track 內 */
  totalDistanceKm: number;
  /** 通知數量（右上角紅點數字），0 不顯示 */
  notificationCount?: number;
  /** 頭像圖片（可選，預設 useravator_icon） */
  avatarSource?: number | { uri: string };
  /** 點擊整個 HUD 時觸發 */
  onPress: () => void;
  /** 嵌入模式：不佔位，由外層與 IdleTopHUD 同一列排版 */
  embedded?: boolean;
}

const DEFAULT_AVATAR = require('../../../assets/images/useravator_icon.png');

export const UserProfileHUD: React.FC<UserProfileHUDProps> = React.memo(({
  totalDistanceKm,
  notificationCount = 0,
  avatarSource,
  onPress,
  embedded = false,
}) => {
  const insets = useSafeAreaInsets();
  const displayDistance = totalDistanceKm >= 1000
    ? `${(totalDistanceKm / 1000).toFixed(1)}k`
    : Math.round(totalDistanceKm).toString();
  const showBadge = notificationCount > 0;

  const content = (
    <View style={styles.wrapper} pointerEvents="auto">
      {/* 頭像（無白底）+ 通知紅點 */}
      <View style={styles.avatarWrap}>
        <Image
          source={avatarSource ?? DEFAULT_AVATAR}
          style={styles.avatar}
          resizeMode="cover"
        />
        {showBadge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {notificationCount > 99 ? '99+' : notificationCount}
            </Text>
          </View>
        )}
      </View>
      {/* 距離膠囊：純白底 */}
      <View style={styles.distanceTrack}>
        <Text style={styles.distanceText}>{displayDistance} km</Text>
      </View>
    </View>
  );

  if (embedded) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return (
    <Pressable
      style={[styles.container, { top: insets.top + 16, left: 16 }]}
      onPress={onPress}
      pointerEvents="box-none"
    >
      {content}
    </Pressable>
  );
}, (prevProps, nextProps) => {
  // ✅ 距離/通知數不變時不重繪
  return prevProps.totalDistanceKm === nextProps.totalDistanceKm
    && prevProps.notificationCount === nextProps.notificationCount
    && prevProps.embedded === nextProps.embedded;
});

const FRAME = 36;
const AVATAR = 46; // 比圓框大，頭像超出圓框
const TRACK_W = 48;
const TRACK_H = 16;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 2000,
    pointerEvents: 'box-none',
  },
  wrapper: {
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
    width: FRAME,
    height: FRAME,
    overflow: 'visible',
  },
  avatar: {
    position: 'absolute',
    left: (FRAME - AVATAR) / 2,
    top: (FRAME - AVATAR) / 2,
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
  },
  distanceTrack: {
    width: TRACK_W,
    height: TRACK_H,
    marginTop: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: TRACK_H / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'monospace',
  },
});
