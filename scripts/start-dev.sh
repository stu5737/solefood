#!/bin/bash
# 启动开发环境（Metro + iOS）

echo "🚀 启动开发环境..."
echo ""

# 检查 Metro 是否已在运行
if lsof -Pi :8081 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Metro bundler 已在运行 (端口 8081)"
    echo ""
    echo "直接运行 iOS 应用："
    echo "npx expo run:ios"
else
    echo "📦 启动 Metro bundler..."
    echo ""
    echo "请在另一个终端运行："
    echo "npx expo run:ios"
    echo ""
    echo "或者按 'i' 在 Metro bundler 界面中打开 iOS 模拟器"
    echo ""
    npx expo start --clear
fi
