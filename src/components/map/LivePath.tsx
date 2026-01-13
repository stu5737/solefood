/**
 * 即時 GPS 軌跡元件（終極防閃爍版 - 完全靜態渲染）
 * 
 * 核心策略：
 * - React Native Maps 的 Polyline 在原生層面更新 coordinates 時會重繪整條線
 * - 解決方案：使用多個獨立的 Polyline，每個只渲染一次，永不更新
 * - 每次新增點時，創建一個新的 Polyline 連接最後兩個點
 * - 這樣只有最新的線段會被渲染，其他線段永不重繪
 */

import React, { useMemo, memo } from 'react';
import { Polyline } from 'react-native-maps';

interface LivePathProps {
  coordinates: Array<{ latitude: number; longitude: number }>;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  zIndex?: number;
}

// ⚡️ 終極優化：將軌跡分解為多個獨立的 Polyline 段
// 每段只包含 2 個點（起點和終點），一旦創建就永不更新
const LivePath = memo<LivePathProps>(
  ({ coordinates, strokeColor = "rgba(255, 112, 67, 0.85)", strokeWidth = 5, opacity = 0.95, zIndex = 3 }) => {
    // ⚡️ 將完整軌跡分解為多個線段，每段只包含 2 個點
    const segments = useMemo(() => {
      if (!coordinates || coordinates.length < 2) {
        return [];
      }

      const result: Array<{ id: string; points: Array<{ latitude: number; longitude: number }> }> = [];
      
      // 為每對相鄰點創建一個線段
      for (let i = 0; i < coordinates.length - 1; i++) {
        result.push({
          id: `segment-${i}`, // 每個線段有唯一且穩定的 id
          points: [coordinates[i], coordinates[i + 1]],
        });
      }
      
      return result;
    }, [coordinates.length]); // ⚡️ 只在長度變化時重新計算

    if (!coordinates || coordinates.length < 2) {
      return null;
    }

    return (
      <>
        {segments.map((segment) => (
          <Polyline
            key={segment.id} // ⚡️ 每個線段有穩定的 key，一旦創建就永不更新
            coordinates={segment.points}
            strokeColor={strokeColor}
            strokeWidth={strokeWidth}
            lineCap="round"
            lineJoin="round"
            opacity={opacity}
            zIndex={zIndex}
          />
        ))}
      </>
    );
  },
  (prevProps, nextProps) => {
    // ⭐ 如果長度為 0，強制重新渲染（確保卸載所有 Polyline）
    if (nextProps.coordinates.length === 0 || prevProps.coordinates.length === 0) {
      return false; // 強制重新渲染
    }
    // 只比較長度，不比較內容
    return prevProps.coordinates.length === nextProps.coordinates.length;
  }
);

LivePath.displayName = 'LivePath';

export default LivePath;
