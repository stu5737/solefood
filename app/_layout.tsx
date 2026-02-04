/**
 * Root Layout
 * Solefood MVP v9.0 Plus
 * 全螢幕地圖 + 懸浮 UI 布局
 */

import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// ⭐ 關鍵：必須導入 LocationTask 以註冊背景任務
// 這會執行 TaskManager.defineTask，確保背景任務在應用啟動時就被定義
import '../src/services/LocationTask';
// global.css 已暫時移除，因為當前組件使用純 StyleSheet
// import '../global.css';

// Android 部分裝置無法啟用「保持喚醒」，Expo 開發工具會拋出此錯誤，避免紅屏
if (__DEV__) {
  LogBox.ignoreLogs([/Unable to activate keep awake/]);
}

const KEEP_AWAKE_ERROR = 'Unable to activate keep awake';

export default function RootLayout() {
  useEffect(() => {
    // Android 部分裝置無法啟用「保持喚醒」，Expo 開發工具會拋出此錯誤，避免紅屏
    const orig = (global as any).ErrorUtils?.getGlobalHandler?.();
    if (typeof orig === 'function') {
      (global as any).ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes(KEEP_AWAKE_ERROR)) {
          return;
        }
        orig(error, isFatal);
      });
    }
    const onUnhandledRejection = (event: PromiseRejectionEvent | { reason?: unknown }) => {
      const reason = event?.reason ?? event;
      const msg = reason instanceof Error ? reason.message : String(reason);
      if (msg.includes(KEEP_AWAKE_ERROR)) {
        if (typeof (event as PromiseRejectionEvent).preventDefault === 'function') {
          (event as PromiseRejectionEvent).preventDefault();
        }
      }
    };
    if (typeof (global as any).addEventListener === 'function') {
      (global as any).addEventListener('unhandledrejection', onUnhandledRejection);
      return () => (global as any).removeEventListener?.('unhandledrejection', onUnhandledRejection);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false 
          }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}

