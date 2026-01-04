/**
 * Root Layout
 * Solefood MVP v8.7
 */

import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false 
        }} 
      />
    </Stack>
  );
}

