/**
 * NotificationPanel Component
 * 通知/聊天面板 - 顯示採集提示和聊天消息
 * 基於新的遊戲界面模板設計
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NotificationPanelProps {
  isCollecting?: boolean;
  messages?: Array<{
    id: string;
    username: string;
    message: string;
    timestamp?: number;
  }>;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isCollecting = false,
  messages = [],
}) => {
  const insets = useSafeAreaInsets();

  // 默認消息（示例）
  const defaultMessages = messages.length > 0 ? messages : [
    {
      id: '1',
      username: 'KevMinh',
      message: 'Ai có pet s 1 đỏ ko dính xám 38k đăng lên đi múc hết cho',
    },
    {
      id: '2',
      username: 'KevMinh',
      message: 'Đã múc ai có đăng tiếp nha',
    },
  ];

  return (
    <View style={[styles.container, { bottom: (insets.bottom || 0) + 80 }]}>
      {/* 採集提示橫幅 */}
      {!isCollecting && (
        <View style={styles.harvestBanner}>
          <Text style={styles.robotIcon}>🤖</Text>
          <Text style={styles.harvestText}>Not harvesting yet? -Tap and go!</Text>
        </View>
      )}

      {/* 聊天消息 */}
      <ScrollView 
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {defaultMessages.map((msg) => (
          <View key={msg.id} style={styles.messageItem}>
            <Text style={styles.username}>{msg.username}:</Text>
            <Text style={styles.message}>{msg.message}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 8,
    right: 60, // 為右側菜單留出空間
    zIndex: 85,
    maxHeight: 200,
  },
  harvestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEB3B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  robotIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  harvestText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  messagesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    padding: 8,
    maxHeight: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  messagesContent: {
    paddingBottom: 4,
  },
  messageItem: {
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  username: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 2,
  },
  message: {
    fontSize: 11,
    color: '#666',
    lineHeight: 16,
  },
});
