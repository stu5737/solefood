/**
 * Session 相關類型定義
 * Solefood MVP v8.7 (Final Consolidated Edition)
 */

import { LuckGradient, DeepZoneState, PathfinderState, GoldenMistNode } from './game';

export interface Location {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface RescueAd {
  available: boolean;
  cap: number;
  used: number;
  distanceThreshold?: number;      // 廣告解鎖門檻（公里）
}

export interface RescueAvailability {
  adrenaline: RescueAd;            // 腎上腺素救援
  porter: RescueAd;                // 搬運工救援
  leave: RescueAd;                 // 休假救援
  ghost: RescueAd;                 // 靈魂救援
}

export interface SessionState {
  totalDistance: number;
  sessionDistance: number;
  currentSpeed: number;
  lastLocation: Location | null;
  estimatedValue: number;
  rescueAvailability: RescueAvailability;
  sessionStartTime: number;
  lastUpdateTime: number;
  
  // 新增：每日幸運梯度
  luckGradient: LuckGradient;
  
  // 新增：深層領域狀態
  deepZone: DeepZoneState;
  
  // 新增：開拓者狀態
  pathfinder: PathfinderState;
  
  // 新增：金霧節點列表
  goldenMistNodes: GoldenMistNode[];
  
  // 新增：當日累積里程（用於廣告解鎖）
  dailyDistance: number;
  lastDailyReset: string;          // 最後重置日期 (YYYY-MM-DD)
}

export type RescueAdType = 'adrenaline' | 'porter' | 'leave' | 'ghost';

export interface SessionActions {
  updateDistance: (distance: number) => void;
  updateLocation: (location: { lat: number; lng: number }) => void;
  updateSpeed: (speed: number) => void;
  calculateValue: () => number;
  triggerRescueAd: (type: RescueAdType) => boolean;
  resetSession: () => void;
  
  // 新增：幸運梯度管理
  updateStreak: (increment?: boolean) => void;
  useLeaveRescue: () => boolean;
  
  // 新增：深層領域檢查
  checkDeepZone: () => void;
  
  // 新增：開拓者檢查
  checkPathfinder: (h3Grid: string) => boolean;
  
  // 新增：金霧節點管理
  updateGoldenMistNodes: (nodes: GoldenMistNode[]) => void;
  markNodeAsVerified: (nodeId: string) => void;
  
  // 新增：每日重置
  resetDaily: () => void;
}

export type SessionStore = SessionState & SessionActions;

