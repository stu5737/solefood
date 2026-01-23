/**
 * TopHUD - 頂部 HUD 組件
 * 簡潔對稱設計：體力、背包、距離、速度
 * 設計理念：圖標清晰、數據明確、無需文字也能理解
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResourceBar } from './ResourceBar';
import { StaminaIcon } from './StaminaIcon';
import { BackpackIcon } from './BackpackIcon';
import { DistanceIcon } from './DistanceIcon';
import { SpeedIcon } from './SpeedIcon';

interface TopHUDProps {
  // 體力數據
  stamina: number;
  maxStamina: number;
  
  // 背包數據
  currentWeight: number;
  maxWeight: number;
  
  // 運動數據
  distance?: number; // 公里
  speed?: number; // 公里/小時
  
  // 可選：自定義圖標
  staminaIcon?: React.ReactNode;
  weightIcon?: React.ReactNode;
}

export const TopHUD: React.FC<TopHUDProps> = ({
  stamina,
  maxStamina,
  currentWeight,
  maxWeight,
  distance = 0,
  speed = 0,
  staminaIcon,
  weightIcon,
}) => {
  const insets = useSafeAreaInsets();
  
  const staminaPercentage = (stamina / maxStamina) * 100;
  const weightPercentage = (currentWeight / maxWeight) * 100;
  
  // 距離和速度的視覺百分比（用於進度條顯示）
  // 注意：totalDistance 實際存儲的是米（從 gpsHistory 服務獲取）
  // 需要轉換為 km 來計算百分比（10 km 滿格）
  const distanceInMeters = distance; // distance 參數實際是米
  const distanceInKm = distanceInMeters / 1000; // 轉換為 km 用於計算百分比
  const maxDisplayDistance = 10; // 最大顯示距離 10km
  const distancePercentage = Math.min((distanceInKm / maxDisplayDistance) * 100, 100);
  
  const maxDisplaySpeed = 20; // 最大顯示速度 20 km/h
  const speedPercentage = Math.min((speed / maxDisplaySpeed) * 100, 100);

  const iconSize = 10; // 縮小圖標尺寸
  const barHeight = 20; // 降低柱狀條高度

  return (
    <View style={[styles.container, { top: insets.top + 6 }]} pointerEvents="box-none">
      {/* 單排佈局：四個元素 - 統一使用 ResourceBar 設計 */}
      <View style={styles.singleRow} pointerEvents="box-none">
        {/* 距離 - 純文字顯示（無填充條） */}
        <View style={styles.barItem}>
          <View style={styles.textDisplay}>
            <View style={styles.iconWrapper}>
              <DistanceIcon size={iconSize} />
            </View>
            <Text style={styles.textLabel}>
              {distanceInMeters >= 10000 
                ? `${distanceInKm.toFixed(1)} km` // 10km 以上顯示 km
                : distanceInMeters >= 1000
                ? `${distanceInKm.toFixed(1)} km` // 1km 以上顯示 km（一位小數）
                : `${distanceInMeters.toFixed(0)} m`} {/* 1km 以下顯示米 */}
            </Text>
          </View>
        </View>

        {/* 速度 - 純文字顯示（無填充條） */}
        <View style={styles.barItem}>
          <View style={styles.textDisplay}>
            <View style={styles.iconWrapper}>
              <SpeedIcon size={iconSize} />
            </View>
            <Text style={styles.textLabel}>
              {speed >= 100
                ? `${(speed / 1000).toFixed(1)}k km/h`
                : speed >= 10 
                ? `${speed.toFixed(0)} km/h` 
                : `${speed.toFixed(1)} km/h`}
            </Text>
          </View>
        </View>

        {/* 推車容量 - 固定顯示最大容量 + 填充柱狀（日式配色：藍鼠色系 - 柔和的灰藍） */}
        <View style={styles.barItem}>
          <ResourceBar
            percentage={weightPercentage}
            color="#6B8FA3" // 日式藍鼠色 - 柔和的灰藍色，沉穩可靠
            icon={weightIcon || <BackpackIcon size={iconSize} />}
            label={`${maxWeight.toFixed(0)}kg`}
            height={barHeight}
          />
        </View>

        {/* 體力 - 百分比 + 填充柱狀（日式配色：柿色系 - 溫暖的橙紅） */}
        <View style={styles.barItem}>
          <ResourceBar
            percentage={staminaPercentage}
            color="#E67E5A" // 日式柿色 - 溫暖的橙紅色，與火焰圖標協調
            icon={staminaIcon || <StaminaIcon size={iconSize} />}
            label={`${Math.round(staminaPercentage)}%`}
            height={barHeight}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2000,
    paddingHorizontal: 16, // 增加左右外邊距，讓界面不那麼壓迫
  },
  singleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // 從左開始排列
    gap: 8, // 固定間距，確保四個 bar 之間間距一致
  },
  barItem: {
    flex: 1, // 每個 bar 平均分配空間
    minWidth: 0, // 允許縮小
  },
  textDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20, // 與 ResourceBar 高度一致
    paddingHorizontal: 6,
    paddingLeft: 4, // 減少左側 padding，讓圖標盡可能靠左
    paddingVertical: 2,
    borderRadius: 10, // 圓角（height / 2）
    backgroundColor: 'rgba(30, 30, 35, 0.6)', // 日式風格 - 柔和的深灰色背景
    borderWidth: 1.5, // 進一步減小邊框寬度，讓視覺更舒適
    borderColor: 'rgba(255, 255, 255, 0.25)', // 進一步降低邊框透明度，更柔和
    position: 'relative',
    overflow: 'hidden',
  },
  iconWrapper: {
    marginRight: 12, // 增加間距，讓文字更靠右（約兩個字元）
    alignItems: 'center',
    justifyContent: 'center',
  },
  textLabel: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.2,
  },
});
