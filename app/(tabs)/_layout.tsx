/**
 * Tabs Layout
 * Solefood MVP v8.7
 */

import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // 隱藏頂部標題
        tabBarShowLabel: false, // 隱藏底部文字標籤
        tabBarStyle: { display: 'none' }, // 完全隱藏原生 TabBar（我們自己實現自定義 Dock）
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '遊戲',
          tabBarIcon: () => null,
        }}
      />
    </Tabs>
  );
}

