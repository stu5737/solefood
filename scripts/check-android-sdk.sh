#!/bin/bash
# 检查 Android SDK 配置

echo "🔍 检查 Android SDK 配置..."
echo ""

# 检查 ANDROID_HOME
if [ -z "$ANDROID_HOME" ]; then
    echo "❌ ANDROID_HOME 未设置"
else
    echo "✅ ANDROID_HOME: $ANDROID_HOME"
fi

# 检查默认路径
if [ -d "$HOME/Library/Android/sdk" ]; then
    echo "✅ Android SDK 目录存在: $HOME/Library/Android/sdk"
else
    echo "❌ Android SDK 目录不存在: $HOME/Library/Android/sdk"
fi

# 检查 adb
if command -v adb &> /dev/null; then
    echo "✅ adb 已安装: $(which adb)"
    adb version 2>/dev/null | head -1
else
    echo "❌ adb 未找到"
fi

echo ""
echo "📋 建议："
if [ -z "$ANDROID_HOME" ] || [ ! -d "$HOME/Library/Android/sdk" ]; then
    echo "1. 安装 Android Studio: https://developer.android.com/studio"
    echo "2. 配置环境变量（见 ANDROID_SETUP.md）"
    echo "3. 或者使用 Expo Go（无需 Android SDK）"
else
    echo "✅ Android SDK 已配置，可以运行: npx expo run:android"
fi
