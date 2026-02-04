/**
 * UnifiedMap - 統一地圖組件
 * 根據配置自動選擇 Mapbox 或 react-native-maps
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MAP_ENGINE } from '../../config/features';
import { RealTimeMap } from './RealTimeMap';

// 條件導入 Mapbox，避免在不需要時加載原生代碼
// 使用動態 require 來避免在 react-native-maps 模式下觸發 Mapbox 錯誤
let MapboxRealTimeMap: any = null;
let MapboxRealTimeMapRef: any = null;

if (MAP_ENGINE === 'mapbox') {
  try {
    const mapboxModule = require('./MapboxRealTimeMap');
    MapboxRealTimeMap = mapboxModule.MapboxRealTimeMap;
    MapboxRealTimeMapRef = mapboxModule.MapboxRealTimeMapRef;
  } catch (error) {
  }
}

interface UnifiedMapProps {
  showTrail?: boolean;
  height?: number;
  isCollecting: boolean;
  selectedSessionId?: string | null;
  showHistoryTrail?: boolean;
  onCountdownComplete?: () => void;
  /** 使用者點擊地圖上的餐廳標註時回調 */
  onRestaurantPress?: (restaurant: import('../../config/restaurants').RestaurantPoint) => void;
  /** 一次點到多個餐廳時回調（顯示選擇餐廳） */
  onRestaurantPressMultiple?: (restaurants: import('../../config/restaurants').RestaurantPoint[]) => void;
  /** 使用者點擊地圖空白處時回調（可關閉卸貨條） */
  onMapPress?: () => void;
  /** 選中的餐廳（在圖標正上方浮出卸貨按鈕，僅 Mapbox） */
  selectedRestaurantForUnload?: import('../../config/restaurants').RestaurantPoint | null;
  onUnload?: () => void;
  onCamera?: () => void;
  onCloseRestaurant?: () => void;
}

// 類型定義（用於 ref）
// 當使用 Mapbox 時是 MapboxRealTimeMapRef，否則為 any（react-native-maps 不支持 ref）
export type UnifiedMapRef = any;

export const UnifiedMap = React.forwardRef<UnifiedMapRef, UnifiedMapProps>((props, ref) => {
  // 根據配置選擇地圖引擎
  if (MAP_ENGINE === 'mapbox' && MapboxRealTimeMap) {
    try {
      return <MapboxRealTimeMap {...props} ref={ref} />;
    } catch (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ Mapbox 載入失敗</Text>
          <Text style={styles.errorHint}>
            請確保已設置 MAPBOX_ACCESS_TOKEN{'\n'}
            並重新編譯原生代碼
          </Text>
          <View style={styles.fallbackMap}>
            <RealTimeMap {...props} />
          </View>
        </View>
      );
    }
  }

  // 默認使用 react-native-maps（不轉傳 ref）
  return <RealTimeMap {...props} />;
});

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  errorText: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#F44336',
    fontSize: 16,
    fontWeight: '700',
    zIndex: 1000,
  },
  errorHint: {
    position: 'absolute',
    top: 130,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#FFF',
    fontSize: 12,
    zIndex: 1000,
    paddingHorizontal: 20,
  },
  fallbackMap: {
    flex: 1,
  },
});
