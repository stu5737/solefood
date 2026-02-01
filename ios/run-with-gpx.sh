#!/bin/bash

# 自动更新 GPX 时间戳并运行应用
# 使用方法: ./ios/run-with-gpx.sh

set -e

echo "🚀 自動更新 GPX 時間戳並運行應用"
echo "================================================"
echo ""

# 更新 GPX 时间戳
echo "📍 步驟 1: 更新 GPX 時間戳..."
python3 ios/update_gpx_time.py

echo ""
echo "🧹 步驟 2: 清理構建緩存..."
cd ios
xcodebuild clean -workspace SolefoodMVP.xcworkspace -scheme SolefoodMVP > /dev/null 2>&1 || true
cd ..

echo ""
echo "▶️  步驟 3: 運行應用..."
npx expo run:ios

echo ""
echo "✅ 完成！"
