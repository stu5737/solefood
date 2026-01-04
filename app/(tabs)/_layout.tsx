/**
 * Tabs Layout
 * Solefood MVP v8.7
 */

import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
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

