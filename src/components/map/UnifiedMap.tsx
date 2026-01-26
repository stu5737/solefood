/**
 * UnifiedMap - 統一地圖組件
 * 根據配置自動選擇 Mapbox 或 react-native-maps
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MAP_ENGINE } from '../../config/features';
import { RealTimeMap } from './RealTimeMap';
import { MapboxRealTimeMap, type MapboxRealTimeMapRef } from './MapboxRealTimeMap';

interface UnifiedMapProps {
  showTrail?: boolean;
  height?: number;
  isCollecting: boolean;
  selectedSessionId?: string | null;
  showHistoryTrail?: boolean;
  onCountdownComplete?: () => void;
}

export const UnifiedMap = React.forwardRef<MapboxRealTimeMapRef, UnifiedMapProps>((props, ref) => {
  // 根據配置選擇地圖引擎
  if (MAP_ENGINE === 'mapbox') {
    try {
      return <MapboxRealTimeMap {...props} ref={ref} />;
    } catch (error) {
      console.error('[UnifiedMap] Mapbox 載入失敗，回退到 react-native-maps:', error);
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
