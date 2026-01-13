/**
 * Root Layout
 * Solefood MVP v9.0 Plus
 * 全螢幕地圖 + 懸浮 UI 布局
 */

import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// ⭐ 關鍵：必須導入 LocationTask 以註冊背景任務
// 這會執行 TaskManager.defineTask，確保背景任務在應用啟動時就被定義
import '../src/services/LocationTask';
// global.css 已暫時移除，因為當前組件使用純 StyleSheet
// import '../global.css';

export default function RootLayout() {
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

