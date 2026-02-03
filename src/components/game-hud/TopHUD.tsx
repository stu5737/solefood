/**
 * TopHUD - 頂部 HUD 組件
 * 整合：體力、背包、時間、速率、總距離、總步數
 * 極簡緊湊，不佔版面
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackedResourceBar } from './StackedResourceBar';
import { StaminaIcon } from './StaminaIcon';
import { BackpackIcon } from './BackpackIcon';
import { TimeIcon } from './TimeIcon';
import { SpeedIcon } from './SpeedIcon';
import { StepsIcon } from './StepsIcon';
import { DistanceIcon } from './DistanceIcon';

interface TopHUDProps {
  stamina: number;
  maxStamina: number;
  currentWeight: number;
  maxWeight: number;
  // 運動統計（可選，採集中顯示）
  exerciseTime?: number;
  speed?: number;
  totalDistanceKm?: number;
  steps?: number;
  staminaIcon?: React.ReactNode;
  weightIcon?: React.ReactNode;
}

export const TopHUD: React.FC<TopHUDProps> = React.memo(({
  stamina,
  maxStamina,
  currentWeight,
  maxWeight,
  exerciseTime = 0,
  speed = 0,
  totalDistanceKm = 0,
  steps = 0,
  staminaIcon,
  weightIcon,
}) => {
  const insets = useSafeAreaInsets();
  const staminaPercentage = (stamina / maxStamina) * 100;
  const weightPercentage = (currentWeight / maxWeight) * 100;

  const backpackIconSize = 56;
  const staminaIconSize = 44;
  const barWidth = Math.round(168 * 1.1); // 168 * 1.1 ≈ 185

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const distanceInM = totalDistanceKm * 1000;
  const distNum = distanceInM >= 1000 ? (distanceInM / 1000).toFixed(1) : String(Math.round(distanceInM));
  const distUnit = distanceInM >= 1000 ? 'km' : 'm';
  const stepsStr = steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : String(steps);

  return (
    <View style={[styles.container, { top: insets.top + 6 }]} pointerEvents="box-none">
      <View style={styles.hudContent} pointerEvents="box-none">
        {/* 第一排：火焰 bar 左半（對齊時鐘）、手推車 bar 右半（對齊總距離） */}
        <View style={styles.barsRow} pointerEvents="box-none">
          <View style={[styles.barItem, styles.barItemLeft]}>
            <StackedResourceBar
              percentage={staminaPercentage}
              color="#FF6B35"
              icon={staminaIcon || <StaminaIcon size={staminaIconSize} />}
              label={`${Math.round(stamina)}/${Math.round(maxStamina)}`}
              width={barWidth}
            />
          </View>
          <View style={[styles.barItem, styles.barItemRight]}>
            <StackedResourceBar
              percentage={weightPercentage}
              color="#FF4444"
              icon={weightIcon || <BackpackIcon size={backpackIconSize} />}
              label={`${currentWeight.toFixed(1)}/${maxWeight.toFixed(1)}`}
              width={barWidth}
            />
          </View>
        </View>

        {/* 第二排：1:1:1:1 四欄均分，第 1 個圖標對齊火焰、第 3 個圖標對齊手推車 */}
        <View style={styles.statsWrap} pointerEvents="box-none">
          <View style={styles.statsPill}>
            <View style={[styles.statItem, styles.statItemClock]}>
              <View style={[styles.iconWrap, styles.iconWrapClock]}>
                <TimeIcon size={40} />
              </View>
              <Text style={styles.statText} includeFontPadding={false}>{formatTime(exerciseTime)}</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.iconWrap}>
                <SpeedIcon size={40} />
              </View>
              <View style={[styles.textBlock, styles.textBlockSpeed]}>
                <Text style={styles.statText} includeFontPadding={false}>{speed >= 10 ? Math.round(speed) : speed.toFixed(1)}</Text>
                <Text style={styles.statUnit} includeFontPadding={false}>km/h</Text>
              </View>
            </View>
            <View style={[styles.statItem, styles.statItemDistance]}>
              <View style={[styles.iconWrap, styles.iconWrapDistance]}>
                <DistanceIcon size={40} />
              </View>
              <View style={[styles.textBlock, styles.textBlockDistance]}>
                <Text style={styles.statText} includeFontPadding={false}>{distNum}</Text>
                <Text style={styles.statUnit} includeFontPadding={false}>{distUnit}</Text>
              </View>
            </View>
            <View style={[styles.statItem, styles.statItemSteps]}>
              <View style={styles.iconWrap}>
                <StepsIcon size={40} />
              </View>
              <Text style={[styles.statText, styles.statTextSteps]} includeFontPadding={false}>{stepsStr}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // ✅ 自訂比較：只有這些值變化才重繪（避免地圖更新時無謂重繪）
  return prevProps.stamina === nextProps.stamina
    && prevProps.maxStamina === nextProps.maxStamina
    && prevProps.currentWeight === nextProps.currentWeight
    && prevProps.maxWeight === nextProps.maxWeight
    && prevProps.exerciseTime === nextProps.exerciseTime
    && prevProps.speed === nextProps.speed
    && prevProps.totalDistanceKm === nextProps.totalDistanceKm
    && prevProps.steps === nextProps.steps;
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2000,
    paddingHorizontal: 4,
  },
  hudContent: {
    paddingHorizontal: 4,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barItem: {
    flex: 1,
    minWidth: 0,
  },
  barItemLeft: {
    alignItems: 'flex-start',
  },
  barItemRight: {
    alignItems: 'flex-start',
  },
  statsWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
    width: '100%',
    alignSelf: 'stretch',
  },
  statsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    width: '100%',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
    minWidth: 0,
  },
  /** 時鐘圖標往右移，對齊火焰 */
  statItemClock: {
    paddingLeft: 6,
  },
  /** 時鐘圖標再左移 3px，對齊上方火焰 */
  iconWrapClock: {
    marginLeft: -6,
  },
  /** 總距離圖標往右移，對齊手推車 */
  statItemDistance: {
    paddingLeft: 15,
  },
  /** 距離（GPS）圖標再向右移 1px（原 4，整體左移 3 後） */
  iconWrapDistance: {
    marginLeft: 1,
  },
  /** 總步數圖標往右移 */
  statItemSteps: {
    paddingLeft: 8,
  },
  /** 速度：圖標與文字間距縮小 */
  statItemSpeed: {
    gap: 2,
  },
  /** 速度文字向左移 2px */
  textBlockSpeed: {
    marginLeft: -2,
  },
  /** 閃電圖標：右側空間縮小，讓文字可更靠近；左移 7px（-4 再左 3） */
  iconWrapSpeed: {
    marginRight: -10,
    marginLeft: -7,
  },
  /** 四枚 stat 圖標統一 40×40（32 放大 25%），視覺一致 */
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  /** 距離：文字離圖標向右 2px */
  textBlockDistance: {
    marginLeft: 2,
  },
  /** 部數（步數）：文字離圖標向右 2px */
  statTextSteps: {
    marginLeft: 2,
  },
  statText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: '#FFF',
    fontFamily: 'monospace',
  },
  statUnit: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: 'rgba(255,255,255,0.9)',
  },
});
