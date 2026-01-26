#!/bin/bash
# 双平台开发脚本
# 用法: ./scripts/dev-both.sh

echo "🚀 启动双平台开发..."
echo ""
echo "选项："
echo "1. iOS 原生构建 + Android Expo Go（推荐）"
echo "2. iOS 原生构建 + Android 原生构建（需要 Android SDK）"
echo "3. 仅启动 Expo 开发服务器（两个平台都用 Expo Go）"
echo ""
read -p "请选择 (1/2/3): " choice

case $choice in
  1)
    echo "📱 启动 iOS 原生构建..."
    npx expo run:ios &
    IOS_PID=$!
    
    echo "📱 启动 Expo 开发服务器（Android 用 Expo Go）..."
    npx expo start
    ;;
  2)
    echo "📱 启动 iOS 原生构建..."
    npx expo run:ios &
    IOS_PID=$!
    
    echo "📱 启动 Android 原生构建..."
    npx expo run:android
    ;;
  3)
    echo "📱 启动 Expo 开发服务器..."
    npx expo start
    ;;
  *)
    echo "无效选择"
    exit 1
    ;;
esac
