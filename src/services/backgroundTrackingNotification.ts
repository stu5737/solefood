/**
 * 背景定位通知服務
 * 用於在背景模式下發送通知，確認 GPS 追蹤正在運作
 * 
 * 注意：在 Expo Go 中，通知功能不可用（SDK 53+），但服務仍會記錄點數
 */

import { AppState, AppStateStatus } from 'react-native';

// 動態導入 expo-notifications，在 Expo Go 中優雅降級
let Notifications: any = null;
let notificationsAvailable = false;

/**
 * 嘗試載入 expo-notifications（延遲載入，避免模組載入時錯誤）
 */
function loadNotificationsModule(): boolean {
  if (notificationsAvailable) {
    return true; // 已經載入成功
  }
  
  if (Notifications !== null) {
    return false; // 已經嘗試過但失敗了
  }
  
  try {
    Notifications = require('expo-notifications');
    notificationsAvailable = true;
    
    // 配置通知處理
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    
    return true;
  } catch (error) {
    // 在 Expo Go 中，require 會拋出錯誤，但我們捕獲它
    Notifications = null;
    notificationsAvailable = false;
    // 不輸出錯誤，因為這是預期的行為（Expo Go 不支持通知）
    return false;
  }
}

class BackgroundTrackingNotificationService {
  private appState: AppStateStatus = AppState.currentState;
  private backgroundPointCount: number = 0;
  private notificationInterval: NodeJS.Timeout | null = null;
  private isTracking: boolean = false;
  private appStateSubscription: any = null;

  constructor() {
    // 監聽 App 狀態變化
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      const wasBackground = this.appState.match(/inactive|background/);
      const isNowForeground = nextAppState === 'active';
      
      if (wasBackground && isNowForeground) {
        console.log('🟢 [BG-Notification] App entered FOREGROUND - Stopped notifications');
        this.stopNotifications();
        this.backgroundPointCount = 0;
      } else if (nextAppState.match(/inactive|background/) && this.isTracking) {
        console.log('🔴 [BG-Notification] App entered BACKGROUND - Starting notifications');
        this.startNotifications();
      }
      
      this.appState = nextAppState;
    });
  }

  /**
   * 請求通知權限
   */
  async requestPermissions(): Promise<boolean> {
    // 嘗試載入通知模組
    if (!loadNotificationsModule()) {
      return false; // Expo Go 中不可用
    }
    
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        console.log('[BG-Notification] Notification permissions granted');
        return true;
      } else {
        console.warn('[BG-Notification] Notification permissions denied');
        return false;
      }
    } catch (error) {
      console.warn('[BG-Notification] Failed to request notification permissions:', error);
      return false;
    }
  }

  /**
   * 開始追蹤（當採集開始時調用）
   */
  startTracking(): void {
    this.isTracking = true;
    this.backgroundPointCount = 0;
    if (this.appState.match(/inactive|background/)) {
      this.startNotifications();
    }
  }

  /**
   * 停止追蹤（當採集結束時調用）
   */
  stopTracking(): void {
    this.isTracking = false;
    this.stopNotifications();
    this.backgroundPointCount = 0;
  }

  /**
   * 記錄背景 GPS 點
   */
  recordBackgroundPoint(): void {
    if (this.appState.match(/inactive|background/)) {
      this.backgroundPointCount++;
    }
  }

  /**
   * 獲取背景點數
   */
  getBackgroundPointCount(): number {
    return this.backgroundPointCount;
  }

  /**
   * 獲取當前 App 狀態
   */
  getAppState(): AppStateStatus {
    return this.appState;
  }

  /**
   * 開始發送通知（在背景模式下）
   */
  private startNotifications(): void {
    // 嘗試載入通知模組
    if (!loadNotificationsModule()) {
      // Expo Go 中不可用，但背景追蹤仍會運作
      console.log('[BG-Notification] Notifications not available (Expo Go limitation). Background tracking will still work.');
      return;
    }
    
    // 先請求權限
    this.requestPermissions();
    
    // 每 30 秒發送一次通知（顯示背景定位正在工作）
    this.notificationInterval = setInterval(async () => {
      await this.sendNotification();
    }, 30000); // 30 秒
  }

  /**
   * 停止發送通知
   */
  private stopNotifications(): void {
    if (this.notificationInterval) {
      clearInterval(this.notificationInterval);
      this.notificationInterval = null;
    }
  }

  /**
   * 發送通知
   */
  private async sendNotification(): Promise<void> {
    // 嘗試載入通知模組
    if (!loadNotificationsModule()) {
      // 在 Expo Go 中，只記錄日誌，不發送通知
      console.log(`[BG-Notification] Background tracking active: ${this.backgroundPointCount} GPS points recorded (notifications unavailable in Expo Go)`);
      return;
    }
    
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📍 背景定位運作中',
          body: `已記錄 ${this.backgroundPointCount} 個 GPS 點`,
          data: { pointCount: this.backgroundPointCount },
        },
        trigger: null, // 立即發送
      });
    } catch (error) {
      console.warn('[BG-Notification] Failed to send notification:', error);
    }
  }

  /**
   * 發送測試通知
   */
  async sendTestNotification(): Promise<void> {
    if (!loadNotificationsModule()) {
      console.warn('[BG-Notification] Notifications not available (Expo Go limitation)');
      return;
    }
    
    await this.requestPermissions();
    await this.sendNotification();
  }
  
  /**
   * 檢查通知是否可用
   */
  isNotificationsAvailable(): boolean {
    return loadNotificationsModule();
  }

  /**
   * 清理資源
   */
  cleanup(): void {
    this.stopNotifications();
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
  }
}

export const bgTrackingNotification = new BackgroundTrackingNotificationService();
