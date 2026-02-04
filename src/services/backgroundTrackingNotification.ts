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
        this.stopNotifications();
        this.backgroundPointCount = 0;
      } else if (nextAppState.match(/inactive|background/) && this.isTracking) {
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
      return status === 'granted';
    } catch {
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
    // 通知已停用，不再發送
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
    // 通知已停用
  }

  /**
   * 發送測試通知
   */
  async sendTestNotification(): Promise<void> {
    // 通知已停用
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
